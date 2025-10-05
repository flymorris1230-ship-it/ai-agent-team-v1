#!/bin/bash

# ==========================================
# Cloudflare Tunnel 完整連接測試
# ==========================================

set -e

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
DOMAIN="${TUNNEL_DOMAIN:-stic.shyangtsuen.xyz}"
TIMEOUT=10

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# 測試 1: DNS 解析
test_dns() {
    print_test "測試 DNS 解析..."

    if nslookup "$DOMAIN" > /dev/null 2>&1; then
        IP=$(nslookup "$DOMAIN" | grep -A1 "Name:" | tail -1 | awk '{print $2}')
        print_pass "DNS 解析成功: $DOMAIN → $IP"
        return 0
    else
        print_fail "DNS 解析失敗"
        return 1
    fi
}

# 測試 2: HTTPS 連接
test_https() {
    print_test "測試 HTTPS 連接..."

    if curl -s --max-time $TIMEOUT "https://$DOMAIN" > /dev/null 2>&1; then
        print_pass "HTTPS 連接成功"
        return 0
    else
        print_fail "HTTPS 連接失敗"
        return 1
    fi
}

# 測試 3: 健康檢查端點
test_health_endpoints() {
    print_test "測試健康檢查端點..."

    local endpoints=(
        "https://$DOMAIN/health"
        "https://$DOMAIN:8000/health"
        "http://$DOMAIN:8000/health"
    )

    local success=0

    for endpoint in "${endpoints[@]}"; do
        echo -n "  嘗試: $endpoint ... "

        response=$(curl -s --max-time 5 "$endpoint" 2>/dev/null || echo "failed")

        if echo "$response" | grep -q "healthy\|status\|ok"; then
            echo -e "${GREEN}✓${NC}"
            print_info "響應: ${response:0:100}"
            success=1
            export WORKING_ENDPOINT="$endpoint"
            break
        else
            echo -e "${RED}✗${NC}"
        fi
    done

    if [ $success -eq 1 ]; then
        print_pass "找到工作端點: $WORKING_ENDPOINT"
        return 0
    else
        print_fail "所有健康檢查端點失敗"
        return 1
    fi
}

# 測試 4: PostgreSQL Proxy
test_postgres_proxy() {
    print_test "測試 PostgreSQL HTTP Proxy..."

    if [ -z "$WORKING_ENDPOINT" ]; then
        print_info "跳過（沒有找到工作端點）"
        return 1
    fi

    local base_url="${WORKING_ENDPOINT%/health}"

    # 測試 pgvector 狀態（不需要 API Key 的端點）
    response=$(curl -s --max-time 5 "$base_url/health" 2>/dev/null || echo "failed")

    if echo "$response" | grep -q "status\|healthy"; then
        print_pass "PostgreSQL Proxy 響應正常"
        echo "$response" | head -5
        return 0
    else
        print_fail "PostgreSQL Proxy 未響應"
        return 1
    fi
}

# 測試 5: 端口可達性
test_port_reachability() {
    print_test "測試端口可達性..."

    local ports=(80 443 8000)

    for port in "${ports[@]}"; do
        echo -n "  Port $port ... "

        if timeout 5 bash -c "cat < /dev/null > /dev/tcp/$DOMAIN/$port" 2>/dev/null; then
            echo -e "${GREEN}✓ 開放${NC}"
        else
            echo -e "${RED}✗ 不可達${NC}"
        fi
    done
}

# 測試 6: SSL 證書
test_ssl_certificate() {
    print_test "測試 SSL 證書..."

    cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)

    if [ -n "$cert_info" ]; then
        print_pass "SSL 證書有效"
        echo "$cert_info" | while read line; do
            echo "  $line"
        done
        return 0
    else
        print_fail "無法獲取 SSL 證書信息"
        return 1
    fi
}

# 測試 7: Cloudflare Tunnel 狀態
test_tunnel_status() {
    print_test "檢查 Cloudflare Tunnel 特徵..."

    headers=$(curl -sI "https://$DOMAIN" 2>/dev/null)

    if echo "$headers" | grep -q "cf-ray\|cloudflare"; then
        print_pass "檢測到 Cloudflare Tunnel"
        echo "$headers" | grep -i "server\|cf-"
        return 0
    else
        print_info "未檢測到明顯的 Cloudflare 特徵"
        return 1
    fi
}

# 測試 8: 完整 HTTP 請求
test_full_http_request() {
    print_test "執行完整 HTTP 請求測試..."

    response=$(curl -v --max-time 10 "https://$DOMAIN/health" 2>&1)

    echo "$response" | head -20

    if echo "$response" | grep -q "200 OK\|healthy"; then
        print_pass "HTTP 請求成功"
        return 0
    else
        print_fail "HTTP 請求失敗"
        return 1
    fi
}

# 生成配置建議
generate_config_suggestion() {
    print_header "配置建議"

    if [ -n "$WORKING_ENDPOINT" ]; then
        local base_url="${WORKING_ENDPOINT%/health}"

        echo "根據測試結果，建議使用以下配置："
        echo ""
        echo "# .env 文件"
        echo "POSTGRES_HOST=$DOMAIN"
        echo "POSTGRES_PORT=443"
        echo "POSTGRES_PROXY_URL=$base_url"
        echo "USE_HTTPS=true"
        echo ""

        # 保存到文件
        cat > /tmp/tunnel_config_suggestion.env << EOF
# Cloudflare Tunnel 配置（自動生成）
POSTGRES_HOST=$DOMAIN
POSTGRES_PORT=443
POSTGRES_PROXY_URL=$base_url
USE_HTTPS=true
POSTGRES_DATABASE=postgres
POSTGRES_USER=postgres
EOF

        print_pass "配置建議已保存到: /tmp/tunnel_config_suggestion.env"
    else
        echo "⚠️  未找到工作端點，無法生成配置建議"
        echo ""
        echo "請檢查："
        echo "1. Cloudflare Tunnel 是否正在運行"
        echo "2. DNS 記錄是否正確配置"
        echo "3. NAS 上的服務（PostgreSQL Proxy）是否啟動"
    fi
}

# 主測試流程
main() {
    print_header "Cloudflare Tunnel 連接測試"

    echo "測試域名: $DOMAIN"
    echo "超時設置: ${TIMEOUT}s"
    echo ""

    local failed=0

    # 執行所有測試
    test_dns || ((failed++))
    test_https || ((failed++))
    test_port_reachability || true  # 不計入失敗
    test_ssl_certificate || ((failed++))
    test_tunnel_status || true  # 不計入失敗
    test_health_endpoints || ((failed++))
    test_postgres_proxy || ((failed++))

    # 總結
    echo ""
    print_header "測試總結"

    if [ $failed -eq 0 ]; then
        print_pass "所有關鍵測試通過！✓"
        generate_config_suggestion
    else
        print_fail "失敗測試數: $failed"
        echo ""
        echo "故障排除建議："
        echo "1. 檢查 NAS 上的 Cloudflare Tunnel 服務狀態"
        echo "   ssh admin@192.168.1.114 'sudo systemctl status cloudflared'"
        echo ""
        echo "2. 檢查 Tunnel 配置"
        echo "   ssh admin@192.168.1.114 'cat ~/.cloudflared/config.yml'"
        echo ""
        echo "3. 查看 Tunnel 日誌"
        echo "   ssh admin@192.168.1.114 'sudo journalctl -u cloudflared -n 50'"
        echo ""
        echo "4. 確認 PostgreSQL Proxy 運行"
        echo "   ssh admin@192.168.1.114 'docker ps | grep postgres'"
    fi

    return $failed
}

# 執行主流程
main "$@"
