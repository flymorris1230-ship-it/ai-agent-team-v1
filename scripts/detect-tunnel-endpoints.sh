#!/bin/bash

# ==========================================
# 檢測 Cloudflare Tunnel 端點
# ==========================================

set -e

# 顏色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

DOMAIN="stic.shyangtsuen.xyz"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  檢測 Cloudflare Tunnel 端點${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 測試端點列表
ENDPOINTS=(
    "https://${DOMAIN}/health"
    "https://${DOMAIN}:8000/health"
    "http://${DOMAIN}:8000/health"
    "https://postgres.${DOMAIN}/health"
    "https://db.${DOMAIN}/health"
    "https://health.${DOMAIN}"
    "https://api.${DOMAIN}/health"
    "https://proxy.${DOMAIN}/health"
)

echo "測試以下端點..."
echo ""

for endpoint in "${ENDPOINTS[@]}"; do
    echo -n "測試: $endpoint ... "

    response=$(curl -s --max-time 3 "$endpoint" 2>/dev/null || echo "failed")

    if echo "$response" | grep -q "healthy\|status\|database"; then
        echo -e "${GREEN}✓ 成功${NC}"
        echo "  響應: ${response:0:100}..."
        echo ""
    else
        echo "✗ 失敗"
    fi
done

echo -e "\n${BLUE}========================================${NC}"
echo -e "${YELLOW}請檢查上面成功的端點，然後更新專案配置${NC}"
echo -e "${BLUE}========================================${NC}"
