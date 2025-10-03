#!/bin/bash

# ==========================================
# PostgreSQL Proxy 自動部署腳本
# ==========================================

set -e  # Exit on error

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置變數
NAS_HOST="${NAS_HOST:-192.168.1.114}"
NAS_USER="${NAS_USER:-your-nas-user}"
NAS_DEPLOY_PATH="${NAS_DEPLOY_PATH:-/volume1/docker/postgres-proxy}"
PROXY_API_KEY="${PROXY_API_KEY:-}"

# 函數定義
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查必要工具
check_requirements() {
    print_info "檢查必要工具..."

    if ! command -v ssh &> /dev/null; then
        print_error "SSH 未安裝"
        exit 1
    fi

    if ! command -v scp &> /dev/null; then
        print_error "SCP 未安裝"
        exit 1
    fi

    print_success "必要工具檢查完成"
}

# 測試 SSH 連接
test_ssh_connection() {
    print_info "測試 SSH 連接到 ${NAS_HOST}..."

    if ssh -o ConnectTimeout=5 -o BatchMode=yes ${NAS_USER}@${NAS_HOST} exit 2>/dev/null; then
        print_success "SSH 連接成功"
    else
        print_error "SSH 連接失敗，請檢查："
        print_error "  1. NAS IP 是否正確: ${NAS_HOST}"
        print_error "  2. SSH 服務是否啟用"
        print_error "  3. SSH 密鑰是否配置"
        print_error ""
        print_info "如需配置 SSH 密鑰："
        print_info "  ssh-copy-id ${NAS_USER}@${NAS_HOST}"
        exit 1
    fi
}

# 創建部署目錄
create_deploy_directory() {
    print_info "創建部署目錄..."

    ssh ${NAS_USER}@${NAS_HOST} "sudo mkdir -p ${NAS_DEPLOY_PATH}"
    ssh ${NAS_USER}@${NAS_HOST} "sudo chown ${NAS_USER}:users ${NAS_DEPLOY_PATH}"

    print_success "部署目錄創建完成: ${NAS_DEPLOY_PATH}"
}

# 上傳文件
upload_files() {
    print_info "上傳應用文件..."

    # 檢查文件是否存在
    if [ ! -f "src/main/python/postgres_proxy.py" ]; then
        print_error "找不到 postgres_proxy.py"
        exit 1
    fi

    # 上傳 Python 文件
    scp src/main/python/postgres_proxy.py ${NAS_USER}@${NAS_HOST}:${NAS_DEPLOY_PATH}/
    scp src/main/python/requirements.txt ${NAS_USER}@${NAS_HOST}:${NAS_DEPLOY_PATH}/
    scp src/main/python/Dockerfile ${NAS_USER}@${NAS_HOST}:${NAS_DEPLOY_PATH}/
    scp src/main/python/docker-compose.yml ${NAS_USER}@${NAS_HOST}:${NAS_DEPLOY_PATH}/

    print_success "文件上傳完成"
}

# 配置環境變數
configure_environment() {
    print_info "配置環境變數..."

    # 生成 API Key（如果未提供）
    if [ -z "$PROXY_API_KEY" ]; then
        PROXY_API_KEY=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
        print_warning "已生成新的 API Key: ${PROXY_API_KEY}"
        print_warning "請將此 Key 保存到 .env 文件中的 POSTGRES_PROXY_API_KEY"
    fi

    # 創建 .env 文件
    ssh ${NAS_USER}@${NAS_HOST} "cat > ${NAS_DEPLOY_PATH}/.env" << EOF
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Morris1230
PROXY_API_KEY=${PROXY_API_KEY}
EOF

    # 設置安全權限
    ssh ${NAS_USER}@${NAS_HOST} "chmod 600 ${NAS_DEPLOY_PATH}/.env"

    print_success "環境變數配置完成"
}

# 構建並啟動容器
deploy_container() {
    print_info "構建並啟動 Docker 容器..."

    # 檢查 Docker 是否可用
    if ! ssh ${NAS_USER}@${NAS_HOST} "command -v docker &> /dev/null"; then
        print_error "NAS 上未安裝 Docker"
        exit 1
    fi

    # 停止舊容器（如果存在）
    ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DEPLOY_PATH} && docker-compose down 2>/dev/null || true"

    # 構建並啟動新容器
    ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DEPLOY_PATH} && docker-compose up -d --build"

    print_success "容器部署完成"
}

# 驗證部署
verify_deployment() {
    print_info "驗證部署..."

    # 等待容器啟動
    sleep 5

    # 檢查容器狀態
    print_info "檢查容器狀態..."
    ssh ${NAS_USER}@${NAS_HOST} "docker ps | grep postgres-proxy" || {
        print_error "容器未運行"
        print_info "查看日誌："
        ssh ${NAS_USER}@${NAS_HOST} "cd ${NAS_DEPLOY_PATH} && docker-compose logs --tail 50"
        exit 1
    }

    # 測試健康檢查端點
    print_info "測試健康檢查端點..."
    HEALTH_CHECK=$(curl -s http://${NAS_HOST}:8000/health || echo '{"status":"error"}')

    if echo "$HEALTH_CHECK" | grep -q '"status":"healthy"'; then
        print_success "健康檢查通過"
    else
        print_error "健康檢查失敗"
        print_info "響應: ${HEALTH_CHECK}"
        exit 1
    fi

    # 測試 pgvector 狀態
    print_info "測試 pgvector 狀態..."
    PGVECTOR_STATUS=$(curl -s -H "X-API-Key: ${PROXY_API_KEY}" \
                           http://${NAS_HOST}:8000/pgvector/status || echo '{"error":"failed"}')

    if echo "$PGVECTOR_STATUS" | grep -q '"enabled":true'; then
        print_success "pgvector 已啟用並可用"
    else
        print_warning "pgvector 狀態檢查異常"
        print_info "響應: ${PGVECTOR_STATUS}"
    fi

    print_success "部署驗證完成"
}

# 顯示部署信息
show_deployment_info() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  PostgreSQL Proxy 部署成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}部署信息：${NC}"
    echo "  NAS 主機: ${NAS_HOST}"
    echo "  部署路徑: ${NAS_DEPLOY_PATH}"
    echo "  API 端點: http://${NAS_HOST}:8000"
    echo "  API Key: ${PROXY_API_KEY}"
    echo ""
    echo -e "${BLUE}測試命令：${NC}"
    echo "  # 健康檢查"
    echo "  curl http://${NAS_HOST}:8000/health"
    echo ""
    echo "  # pgvector 狀態"
    echo "  curl -H \"X-API-Key: ${PROXY_API_KEY}\" \\"
    echo "       http://${NAS_HOST}:8000/pgvector/status"
    echo ""
    echo -e "${BLUE}管理命令：${NC}"
    echo "  # 查看日誌"
    echo "  ssh ${NAS_USER}@${NAS_HOST} 'cd ${NAS_DEPLOY_PATH} && docker-compose logs -f'"
    echo ""
    echo "  # 重啟服務"
    echo "  ssh ${NAS_USER}@${NAS_HOST} 'cd ${NAS_DEPLOY_PATH} && docker-compose restart'"
    echo ""
    echo -e "${YELLOW}重要提示：${NC}"
    echo "  請將 API Key 添加到專案的 .env 文件："
    echo "  POSTGRES_PROXY_API_KEY=${PROXY_API_KEY}"
    echo ""
}

# 主流程
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  PostgreSQL Proxy 自動部署${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # 執行部署步驟
    check_requirements
    test_ssh_connection
    create_deploy_directory
    upload_files
    configure_environment
    deploy_container
    verify_deployment
    show_deployment_info

    print_success "所有步驟完成！"
}

# 執行主流程
main "$@"
