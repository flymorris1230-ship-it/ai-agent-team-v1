#!/bin/bash

# 🚀 Cloudflare Tunnel 快速設置腳本
# 此腳本會引導你完成 Tunnel 設置

set -e

echo "🚀 Cloudflare Tunnel 快速設置"
echo "================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置資訊
NAS_IP="192.168.1.114"
NAS_URL="https://stic.tw3.quickconnect.to/"
DOMAIN="shyangtsuen.xyz"
POSTGRES_PORT="5532"
POSTGRES_PASSWORD="Morris1230"
API_KEY="K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0="

echo "📋 你的配置資訊："
echo "  NAS IP: $NAS_IP"
echo "  NAS URL: $NAS_URL"
echo "  Domain: $DOMAIN"
echo ""

# 步驟 1
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 步驟 1: 創建 Cloudflare Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 訪問: ${YELLOW}https://one.dash.cloudflare.com/${NC}"
echo "2. Networks → Tunnels → Create a tunnel"
echo "3. 選擇 Cloudflared"
echo "4. 名稱: ${GREEN}stic-nas${NC}"
echo "5. 選擇環境: ${GREEN}Docker${NC}"
echo ""
echo "你會看到類似這樣的命令："
echo "${YELLOW}docker run -d --restart=unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoixxx${NC}"
echo ""
read -p "請複製完整的 Docker 命令並按 Enter 繼續..."
read -p "貼上你複製的 Docker 命令: " DOCKER_CMD

if [[ -z "$DOCKER_CMD" ]]; then
    echo "${RED}錯誤: 未提供 Docker 命令${NC}"
    exit 1
fi

echo ""
echo "${GREEN}✓ Docker 命令已保存${NC}"

# 步驟 2
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 步驟 2: 在 NAS 部署 Cloudflare Tunnel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 訪問 NAS: ${YELLOW}$NAS_URL${NC}"
echo "2. 控制台 → 任務排程器"
echo "3. 新增 → 觸發的任務 → 用戶定義的腳本"
echo ""
echo "配置如下："
echo "  - 任務名稱: ${GREEN}Cloudflare Tunnel${NC}"
echo "  - 使用者: ${GREEN}root${NC}"
echo "  - 排程: ${GREEN}開機時${NC}"
echo ""
echo "執行命令（複製以下內容）："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'
docker stop cloudflare-tunnel 2>/dev/null || true
docker rm cloudflare-tunnel 2>/dev/null || true
EOF
echo "$DOCKER_CMD" | sed 's/docker run -d/docker run -d --name cloudflare-tunnel/'
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4. 點擊確定"
echo "5. 右鍵該任務 → 執行"
echo "6. Container Manager → 容器 → 確認 ${GREEN}cloudflare-tunnel${NC} 運行中"
echo ""
read -p "完成後按 Enter 繼續..."

# 步驟 3
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 步驟 3: 配置 Public Hostname"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "回到 Cloudflare Dashboard，找到你的 Tunnel ${GREEN}stic-nas${NC}"
echo ""
echo "${YELLOW}配置 1: PostgreSQL Proxy${NC}"
echo "  - Subdomain: ${GREEN}postgres-ai-agent${NC}"
echo "  - Domain: ${GREEN}$DOMAIN${NC}"
echo "  - Type: ${GREEN}HTTP${NC}"
echo "  - URL: ${GREEN}http://$NAS_IP:8000${NC}"
echo ""
echo "${YELLOW}配置 2: 健康檢查（可選）${NC}"
echo "  - Subdomain: ${GREEN}health.stic${NC}"
echo "  - Domain: ${GREEN}$DOMAIN${NC}"
echo "  - Type: ${GREEN}HTTP${NC}"
echo "  - URL: ${GREEN}http://$NAS_IP:8000/health${NC}"
echo ""
echo "${YELLOW}配置 3: NAS 管理界面（可選）${NC}"
echo "  - Subdomain: ${GREEN}nas.stic${NC}"
echo "  - Domain: ${GREEN}$DOMAIN${NC}"
echo "  - Type: ${GREEN}HTTPS${NC}"
echo "  - URL: ${GREEN}https://$NAS_IP:5001${NC}"
echo "  - ✅ 勾選 ${GREEN}No TLS Verify${NC}"
echo ""
read -p "完成後按 Enter 繼續..."

# 步驟 4
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 步驟 4: 部署 PostgreSQL HTTP Proxy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "4.1 上傳文件到 NAS"
echo "  - 訪問 NAS File Station"
echo "  - 創建目錄: ${GREEN}docker/postgres-proxy${NC}"
echo "  - 上傳文件: ${GREEN}nas-postgres-proxy.py${NC}"
echo "    從: $(pwd)/nas-postgres-proxy.py"
echo ""
read -p "完成後按 Enter 繼續..."

echo ""
echo "4.2 創建 Docker 容器"
echo "  1. Container Manager → 映像 → 搜索並下載: ${GREEN}python:3.11-slim${NC}"
echo "  2. Container Manager → 容器 → 新增"
echo ""
echo "  ${YELLOW}常規設定:${NC}"
echo "    - 容器名稱: ${GREEN}postgres-proxy${NC}"
echo "    - ✅ 啟用自動重新啟動"
echo ""
echo "  ${YELLOW}端口設定:${NC}"
echo "    - 本地端口: ${GREEN}8000${NC}"
echo "    - 容器端口: ${GREEN}8000${NC}"
echo ""
echo "  ${YELLOW}儲存空間（掛載檔案）:${NC}"
echo "    - 檔案: ${GREEN}/volume1/docker/postgres-proxy/nas-postgres-proxy.py${NC}"
echo "    - 掛載路徑: ${GREEN}/app/proxy.py${NC}"
echo ""
echo "  ${YELLOW}環境變數:${NC}"
cat << EOF
    POSTGRES_HOST=$NAS_IP
    POSTGRES_PORT=$POSTGRES_PORT
    POSTGRES_DB=postgres
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=$POSTGRES_PASSWORD
    PROXY_API_KEY=$API_KEY
    SERVER_PORT=8000
EOF
echo ""
echo "  ${YELLOW}執行命令:${NC}"
echo "    ${GREEN}sh -c \"pip install psycopg2-binary && python /app/proxy.py\"${NC}"
echo ""
read -p "完成後按 Enter 繼續..."

# 步驟 5
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 步驟 5: 測試連接"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "等待 DNS 傳播 (30 秒)..."
sleep 30

echo ""
echo "測試健康檢查..."
HEALTH_ENDPOINT="https://postgres-ai-agent.$DOMAIN/health"
echo "curl $HEALTH_ENDPOINT"
if curl -s -f "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
    echo "${GREEN}✓ 健康檢查通過！${NC}"
    curl -s "$HEALTH_ENDPOINT" | jq . 2>/dev/null || curl -s "$HEALTH_ENDPOINT"
else
    echo "${YELLOW}⚠ 健康檢查失敗（可能需要更多時間傳播 DNS）${NC}"
fi

echo ""
echo "測試 PostgreSQL 查詢..."
QUERY_ENDPOINT="https://postgres-ai-agent.$DOMAIN/query"
curl -X POST "$QUERY_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"sql": "SELECT version()"}' 2>/dev/null | jq . || echo "${YELLOW}查詢測試失敗${NC}"

# 步驟 6
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 步驟 6: 配置 Cloudflare Workers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "設定 Workers Secrets..."

PROXY_URL="https://postgres-ai-agent.$DOMAIN"

echo "$PROXY_URL" | npx wrangler secret put POSTGRES_PROXY_URL --env production
echo "$API_KEY" | npx wrangler secret put POSTGRES_PROXY_API_KEY --env production

echo ""
echo "${GREEN}✓ Workers Secrets 已設定${NC}"

# 更新本地配置
echo ""
echo "更新本地 .env 文件..."
if grep -q "POSTGRES_PROXY_URL" .env 2>/dev/null; then
    sed -i "s|POSTGRES_PROXY_URL=.*|POSTGRES_PROXY_URL=$PROXY_URL|" .env
    sed -i "s|POSTGRES_PROXY_API_KEY=.*|POSTGRES_PROXY_API_KEY=$API_KEY|" .env
else
    cat >> .env << EOF

# PostgreSQL Proxy (通過 Cloudflare Tunnel)
POSTGRES_PROXY_URL=$PROXY_URL
POSTGRES_PROXY_API_KEY=$API_KEY
ENABLE_POSTGRES_VECTOR=true
EOF
fi

echo "${GREEN}✓ .env 已更新${NC}"

# 完成
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 設置完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "${GREEN}✓ Cloudflare Tunnel 已創建並運行${NC}"
echo "${GREEN}✓ PostgreSQL Proxy 已部署${NC}"
echo "${GREEN}✓ Workers Secrets 已配置${NC}"
echo ""
echo "訪問端點："
echo "  - PostgreSQL Proxy: ${YELLOW}https://postgres-ai-agent.$DOMAIN${NC}"
echo "  - 健康檢查: ${YELLOW}https://health.stic.$DOMAIN${NC}"
echo "  - NAS 管理: ${YELLOW}https://nas.stic.$DOMAIN${NC}"
echo ""
echo "測試命令："
echo "  ${YELLOW}curl https://postgres-ai-agent.$DOMAIN/health${NC}"
echo ""
echo "如果需要重新部署 Workers："
echo "  ${YELLOW}npm run deploy:production${NC}"
echo ""
