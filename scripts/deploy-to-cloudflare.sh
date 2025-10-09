#!/bin/bash

# ==========================================
# Cloudflare Workers 一鍵部署腳本
# ==========================================

set -e

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
ENVIRONMENT="${1:-staging}"  # staging or production

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 檢查必要工具
check_requirements() {
    print_step "檢查必要工具..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安裝"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm 未安裝"
        exit 1
    fi

    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI 未安裝"
        print_warning "請執行: npm install -g wrangler"
        exit 1
    fi

    print_success "所有必要工具已安裝"
}

# 檢查登入狀態
check_auth() {
    print_step "檢查 Cloudflare 登入狀態..."

    if ! wrangler whoami &> /dev/null; then
        print_error "未登入 Cloudflare"
        print_warning "請執行: wrangler login"
        exit 1
    fi

    print_success "已登入 Cloudflare"
}

# 檢查環境變數
check_env() {
    print_step "檢查環境變數..."

    if [ ! -f ".env" ]; then
        print_warning ".env 文件不存在"
        print_warning "從 .env.example 創建 .env 文件..."
        cp .env.example .env
        print_warning "請編輯 .env 文件並填入實際值"
        exit 1
    fi

    # 載入環境變數
    source .env

    # 檢查必要變數
    REQUIRED_VARS=("OPENAI_API_KEY" "POSTGRES_PASSWORD" "POSTGRES_PROXY_API_KEY")

    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "環境變數 $var 未設置"
            exit 1
        fi
    done

    print_success "環境變數檢查通過"
}

# 安裝依賴
install_deps() {
    print_step "安裝依賴..."

    npm install

    print_success "依賴安裝完成"
}

# 類型檢查
type_check() {
    print_step "執行類型檢查..."

    npm run type-check

    print_success "類型檢查通過"
}

# 初始化資料庫
init_database() {
    print_step "初始化 D1 資料庫..."

    if [ "$ENVIRONMENT" = "production" ]; then
        npm run db:init
    else
        npm run db:init:dev
    fi

    print_success "資料庫初始化完成"
}

# 設置 Secrets
setup_secrets() {
    print_step "設置 Cloudflare Secrets..."

    # 載入環境變數
    source .env

    # OpenAI API Key
    echo "$OPENAI_API_KEY" | wrangler secret put OPENAI_API_KEY --env $ENVIRONMENT

    # PostgreSQL Password
    echo "$POSTGRES_PASSWORD" | wrangler secret put POSTGRES_PASSWORD --env $ENVIRONMENT

    # Proxy API Key
    echo "$POSTGRES_PROXY_API_KEY" | wrangler secret put POSTGRES_PROXY_API_KEY --env $ENVIRONMENT

    print_success "Secrets 設置完成"
}

# 部署 Worker
deploy_worker() {
    print_step "部署到 Cloudflare Workers ($ENVIRONMENT)..."

    if [ "$ENVIRONMENT" = "production" ]; then
        npm run deploy:production
    else
        npm run deploy:staging
    fi

    print_success "Worker 部署完成"
}

# 驗證部署
verify_deployment() {
    print_step "驗證部署..."

    # 獲取 Worker URL
    if [ "$ENVIRONMENT" = "production" ]; then
        WORKER_URL=$(wrangler deployments list --name gac-prod | grep "https://" | head -1 | awk '{print $1}')
    else
        WORKER_URL=$(wrangler deployments list --name gac-staging | grep "https://" | head -1 | awk '{print $1}')
    fi

    if [ -z "$WORKER_URL" ]; then
        print_error "無法獲取 Worker URL"
        exit 1
    fi

    print_success "Worker URL: $WORKER_URL"

    # 測試健康檢查
    print_step "測試健康檢查端點..."

    HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")

    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        print_success "健康檢查通過"
    else
        print_error "健康檢查失敗"
        echo "$HEALTH_RESPONSE"
        exit 1
    fi

    # 測試完整系統檢查
    print_step "測試完整系統檢查..."

    FULL_HEALTH=$(curl -s "$WORKER_URL/health/full")

    if echo "$FULL_HEALTH" | grep -q '"status":"healthy"'; then
        print_success "完整系統檢查通過"
    else
        print_warning "部分系統檢查異常"
        echo "$FULL_HEALTH" | jq '.' || echo "$FULL_HEALTH"
    fi
}

# 顯示部署信息
show_deployment_info() {
    # 獲取 Worker URL
    if [ "$ENVIRONMENT" = "production" ]; then
        WORKER_URL=$(wrangler deployments list --name gac-prod | grep "https://" | head -1 | awk '{print $1}')
    else
        WORKER_URL=$(wrangler deployments list --name gac-staging | grep "https://" | head -1 | awk '{print $1}')
    fi

    echo ""
    print_header "部署成功！"

    echo -e "${BLUE}環境:${NC} $ENVIRONMENT"
    echo -e "${BLUE}Worker URL:${NC} $WORKER_URL"
    echo ""
    echo -e "${BLUE}API 端點:${NC}"
    echo "  健康檢查: $WORKER_URL/health"
    echo "  完整檢查: $WORKER_URL/health/full"
    echo "  Agents: $WORKER_URL/api/v1/agents"
    echo "  Tasks: $WORKER_URL/api/v1/tasks"
    echo "  Chat: $WORKER_URL/api/v1/chat"
    echo ""
    echo -e "${BLUE}管理命令:${NC}"
    echo "  查看日誌: wrangler tail --env $ENVIRONMENT"
    echo "  查看部署: wrangler deployments list"
    echo "  查看 Secrets: wrangler secret list --env $ENVIRONMENT"
    echo ""
    echo -e "${BLUE}下一步:${NC}"
    echo "  1. 測試 API 端點"
    echo "  2. 配置自定義域名（如需要）"
    echo "  3. 啟用 Cron triggers（需付費方案）"
    echo "  4. 設置監控告警"
    echo ""
}

# 主流程
main() {
    print_header "Cloudflare Workers 部署腳本"

    echo "環境: $ENVIRONMENT"
    echo ""

    # 確認部署
    read -p "確認要部署到 $ENVIRONMENT 環境? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "部署已取消"
        exit 0
    fi

    # 執行部署步驟
    check_requirements
    check_auth
    check_env
    install_deps
    type_check
    init_database
    setup_secrets
    deploy_worker
    verify_deployment
    show_deployment_info

    print_success "所有步驟完成！"
}

# 執行主流程
main "$@"
