#!/bin/bash

# ==========================================
# Cloudflare Tunnel 自動部署腳本
# Domain: stic.shyangtsuen.xyz
# ==========================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置變數
DOMAIN="stic.shyangtsuen.xyz"
TUNNEL_NAME="stic-nas"
NAS_HOST="${NAS_HOST:-stic.shyangtsuen.xyz}"
NAS_USER="${NAS_USER:-admin}"

# 子域名配置
POSTGRES_SUBDOMAIN="postgres.${DOMAIN}"
DB_SUBDOMAIN="db.${DOMAIN}"
HEALTH_SUBDOMAIN="health.${DOMAIN}"

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

# 檢查 SSH 連接
check_ssh() {
    print_step "檢查 NAS SSH 連接..."

    if ssh -o ConnectTimeout=5 -o BatchMode=yes ${NAS_USER}@${NAS_HOST} exit 2>/dev/null; then
        print_success "SSH 連接成功"
    else
        print_error "SSH 連接失敗"
        print_warning "請確認："
        echo "  1. NAS SSH 服務已啟用"
        echo "  2. SSH 密鑰已配置（執行：ssh-copy-id ${NAS_USER}@${NAS_HOST}）"
        echo "  3. 或準備好輸入密碼"

        read -p "是否繼續？(需要輸入密碼) [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 安裝 cloudflared
install_cloudflared() {
    print_step "在 NAS 上安裝 cloudflared..."

    ssh ${NAS_USER}@${NAS_HOST} 'bash -s' << 'ENDSSH'
        # 檢查是否已安裝
        if command -v cloudflared &> /dev/null; then
            echo "cloudflared 已安裝，版本："
            cloudflared --version
            exit 0
        fi

        # 下載 cloudflared
        echo "下載 cloudflared..."
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

        # 安裝
        chmod +x cloudflared-linux-amd64
        sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

        # 驗證
        cloudflared --version
ENDSSH

    print_success "cloudflared 安裝完成"
}

# 登入 Cloudflare 並創建 Tunnel
create_tunnel() {
    print_step "創建 Cloudflare Tunnel..."

    ssh ${NAS_USER}@${NAS_HOST} "bash -s" << ENDSSH
        # 檢查 Tunnel 是否已存在
        if cloudflared tunnel list 2>/dev/null | grep -q "${TUNNEL_NAME}"; then
            echo "Tunnel '${TUNNEL_NAME}' 已存在"
            cloudflared tunnel list | grep "${TUNNEL_NAME}"
            exit 0
        fi

        # 登入 Cloudflare（會開啟瀏覽器）
        echo ""
        echo "========================================"
        echo "  請在瀏覽器中完成 Cloudflare 授權"
        echo "========================================"
        echo ""
        cloudflared tunnel login

        # 創建 Tunnel
        cloudflared tunnel create ${TUNNEL_NAME}

        # 顯示 Tunnel 資訊
        cloudflared tunnel list
ENDSSH

    print_success "Tunnel 創建完成"
}

# 獲取 Tunnel ID
get_tunnel_id() {
    print_step "獲取 Tunnel ID..."

    TUNNEL_ID=$(ssh ${NAS_USER}@${NAS_HOST} "cloudflared tunnel list | grep ${TUNNEL_NAME} | awk '{print \$1}'")

    if [ -z "$TUNNEL_ID" ]; then
        print_error "無法獲取 Tunnel ID"
        exit 1
    fi

    print_success "Tunnel ID: $TUNNEL_ID"
    echo "$TUNNEL_ID" > /tmp/tunnel_id.txt
}

# 配置 Tunnel
configure_tunnel() {
    print_step "配置 Tunnel 路由規則..."

    TUNNEL_ID=$(cat /tmp/tunnel_id.txt)

    ssh ${NAS_USER}@${NAS_HOST} "bash -s" << ENDSSH
        # 創建配置目錄
        mkdir -p ~/.cloudflared

        # 創建配置文件
        cat > ~/.cloudflared/config.yml << 'EOF'
# Cloudflare Tunnel 配置
tunnel: ${TUNNEL_ID}
credentials-file: /home/\${USER}/.cloudflared/${TUNNEL_ID}.json

# 路由規則
ingress:
  # PostgreSQL HTTP Proxy - 主要訪問點
  - hostname: ${POSTGRES_SUBDOMAIN}
    service: http://localhost:8000
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s

  # PostgreSQL 數據庫直連（TCP）
  - hostname: ${DB_SUBDOMAIN}
    service: tcp://localhost:5532

  # 健康檢查端點
  - hostname: ${HEALTH_SUBDOMAIN}
    service: http://localhost:8000/health

  # 捕獲所有其他請求（404）
  - service: http_status:404

# 日誌配置
loglevel: info
EOF

        echo "配置文件已創建："
        cat ~/.cloudflared/config.yml
ENDSSH

    print_success "Tunnel 配置完成"
}

# 設置 DNS 路由
setup_dns() {
    print_step "設置 DNS 路由..."

    ssh ${NAS_USER}@${NAS_HOST} "bash -s" << ENDSSH
        # 為每個子域名創建 DNS 記錄
        echo "設置 DNS 記錄..."

        cloudflared tunnel route dns ${TUNNEL_NAME} ${POSTGRES_SUBDOMAIN} || true
        cloudflared tunnel route dns ${TUNNEL_NAME} ${DB_SUBDOMAIN} || true
        cloudflared tunnel route dns ${TUNNEL_NAME} ${HEALTH_SUBDOMAIN} || true

        # 顯示路由列表
        echo ""
        echo "DNS 路由列表："
        cloudflared tunnel route list
ENDSSH

    print_success "DNS 路由設置完成"
}

# 測試 Tunnel
test_tunnel() {
    print_step "測試 Tunnel（前台運行 10 秒）..."

    ssh ${NAS_USER}@${NAS_HOST} "timeout 10 cloudflared tunnel run ${TUNNEL_NAME} 2>&1 | head -20 || true"

    print_success "Tunnel 測試完成"
}

# 安裝為系統服務
install_service() {
    print_step "安裝 Tunnel 為系統服務..."

    ssh ${NAS_USER}@${NAS_HOST} "bash -s" << ENDSSH
        # 安裝服務
        sudo cloudflared service install

        # 啟動服務
        sudo systemctl start cloudflared

        # 設置開機自動啟動
        sudo systemctl enable cloudflared

        # 檢查服務狀態
        echo ""
        echo "服務狀態："
        sudo systemctl status cloudflared --no-pager | head -15
ENDSSH

    print_success "系統服務安裝完成"
}

# 驗證部署
verify_deployment() {
    print_step "驗證部署..."

    echo "等待 5 秒讓服務完全啟動..."
    sleep 5

    # 測試健康檢查端點
    echo ""
    echo "測試健康檢查端點..."
    if curl -s --max-time 10 "https://${HEALTH_SUBDOMAIN}" | grep -q "healthy"; then
        print_success "健康檢查端點正常"
    else
        print_warning "健康檢查端點未響應（可能需要等待 DNS 傳播）"
    fi

    # 測試 PostgreSQL Proxy
    echo ""
    echo "測試 PostgreSQL Proxy 端點..."
    if curl -s --max-time 10 "https://${POSTGRES_SUBDOMAIN}/health" | grep -q "status"; then
        print_success "PostgreSQL Proxy 端點正常"
    else
        print_warning "PostgreSQL Proxy 端點未響應（可能需要等待 DNS 傳播）"
    fi
}

# 顯示部署信息
show_deployment_info() {
    TUNNEL_ID=$(cat /tmp/tunnel_id.txt)

    print_header "部署完成！"

    echo -e "${GREEN}Cloudflare Tunnel 已成功部署${NC}"
    echo ""
    echo -e "${BLUE}Tunnel 資訊：${NC}"
    echo "  名稱: ${TUNNEL_NAME}"
    echo "  ID: ${TUNNEL_ID}"
    echo "  域名: ${DOMAIN}"
    echo ""
    echo -e "${BLUE}訪問端點：${NC}"
    echo "  PostgreSQL Proxy: https://${POSTGRES_SUBDOMAIN}"
    echo "  PostgreSQL 直連:  https://${DB_SUBDOMAIN}"
    echo "  健康檢查:        https://${HEALTH_SUBDOMAIN}"
    echo ""
    echo -e "${BLUE}測試命令：${NC}"
    echo "  # 健康檢查"
    echo "  curl https://${HEALTH_SUBDOMAIN}"
    echo ""
    echo "  # PostgreSQL Proxy 健康檢查"
    echo "  curl https://${POSTGRES_SUBDOMAIN}/health"
    echo ""
    echo "  # pgvector 狀態（需要 API Key）"
    echo "  curl -H \"X-API-Key: your-api-key\" https://${POSTGRES_SUBDOMAIN}/pgvector/status"
    echo ""
    echo -e "${BLUE}管理命令（在 NAS 上執行）：${NC}"
    echo "  # 查看服務狀態"
    echo "  sudo systemctl status cloudflared"
    echo ""
    echo "  # 查看實時日誌"
    echo "  sudo journalctl -u cloudflared -f"
    echo ""
    echo "  # 重啟服務"
    echo "  sudo systemctl restart cloudflared"
    echo ""
    echo -e "${BLUE}Mac 專案配置：${NC}"
    echo "  更新 .env 文件："
    echo "  POSTGRES_HOST=${POSTGRES_SUBDOMAIN}"
    echo "  POSTGRES_PORT=443"
    echo "  POSTGRES_PROXY_URL=https://${POSTGRES_SUBDOMAIN}"
    echo ""
    echo -e "${YELLOW}注意事項：${NC}"
    echo "  1. DNS 記錄可能需要幾分鐘才能生效"
    echo "  2. 請確保 NAS 上的 PostgreSQL Proxy 已運行"
    echo "  3. 保存好您的 Tunnel ID: ${TUNNEL_ID}"
    echo ""

    # 保存配置到文件
    cat > /tmp/tunnel_config.txt << EOF
# Cloudflare Tunnel 配置信息
TUNNEL_NAME=${TUNNEL_NAME}
TUNNEL_ID=${TUNNEL_ID}
POSTGRES_ENDPOINT=https://${POSTGRES_SUBDOMAIN}
DB_ENDPOINT=https://${DB_SUBDOMAIN}
HEALTH_ENDPOINT=https://${HEALTH_SUBDOMAIN}
EOF

    print_success "配置信息已保存到 /tmp/tunnel_config.txt"
}

# 主流程
main() {
    print_header "Cloudflare Tunnel 自動部署"

    echo "配置資訊："
    echo "  NAS: ${NAS_USER}@${NAS_HOST}"
    echo "  域名: ${DOMAIN}"
    echo "  Tunnel: ${TUNNEL_NAME}"
    echo ""

    # 確認執行
    read -p "確認開始部署？[y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "部署已取消"
        exit 0
    fi

    # 執行部署步驟
    check_ssh
    install_cloudflared
    create_tunnel
    get_tunnel_id
    configure_tunnel
    setup_dns
    test_tunnel
    install_service
    verify_deployment
    show_deployment_info

    print_success "所有步驟完成！"
}

# 執行主流程
main "$@"
