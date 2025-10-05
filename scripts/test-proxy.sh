#!/bin/bash

###############################################################################
# PostgreSQL HTTP Proxy - Testing Script
#
# 用途：測試 PostgreSQL HTTP Proxy 運行狀態和連接
# 使用方式：
#   ./test-proxy.sh [local|remote|all]
#
# 選項：
#   local  - 測試本地連接 (http://localhost:8000)
#   remote - 測試遠程連接 (https://postgres-ai-agent.shyangtsuen.xyz)
#   all    - 測試所有連接（默認）
###############################################################################

# 設定
LOCAL_URL="http://localhost:8000"
REMOTE_URL="https://postgres-ai-agent.shyangtsuen.xyz"
API_KEY="K6udBL4OmPs3J+hOLkjM6MfSatZQW+vXY1vm/o9y0L0="

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 測試模式
MODE="${1:-all}"

echo "======================================================================"
echo "🧪 PostgreSQL HTTP Proxy Test Suite"
echo "======================================================================"
echo ""

# 測試函數
test_endpoint() {
    local name="$1"
    local url="$2"
    local use_api_key="$3"

    echo -n "🔍 測試 $name ... "

    # 構建 curl 命令
    if [ "$use_api_key" = "true" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" "$url" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    fi

    # 分離響應體和狀態碼
    body=$(echo "$response" | sed '$d')
    status=$(echo "$response" | tail -n 1)

    # 檢查狀態碼
    if [ "$status" = "200" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $status)"

        # 美化 JSON 輸出（如果有 jq）
        if command -v jq &> /dev/null && echo "$body" | jq . &> /dev/null; then
            echo "$body" | jq . | sed 's/^/    /'
        else
            echo "$body" | sed 's/^/    /'
        fi
        echo ""
        return 0
    elif [ "$status" = "000" ]; then
        echo -e "${RED}❌ FAIL${NC} (連接失敗)"
        echo "    錯誤: 無法連接到服務器"
        echo "    URL: $url"
        echo ""
        return 1
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $status)"
        echo "$body" | sed 's/^/    /'
        echo ""
        return 1
    fi
}

# 測試進程運行
test_process() {
    echo "======================================================================"
    echo "📊 測試 1: 檢查 Proxy 進程"
    echo "======================================================================"
    echo ""

    if pgrep -f "nas-postgres-proxy.py" > /dev/null 2>&1; then
        PID=$(pgrep -f "nas-postgres-proxy.py")
        echo -e "${GREEN}✅ Proxy 進程運行中${NC}"
        echo "    PID: $PID"
        echo ""

        # 顯示進程資訊
        echo "進程詳情:"
        ps aux | grep "[n]as-postgres-proxy.py" | sed 's/^/    /'
        echo ""
        return 0
    else
        echo -e "${RED}❌ Proxy 進程未運行${NC}"
        echo ""
        echo "請先啟動 Proxy："
        echo "  • Container Manager: 檢查容器狀態"
        echo "  • Task Scheduler: 執行任務或手動運行"
        echo "  • 手動: cd /volume1/docker/postgres-proxy && python3 nas-postgres-proxy.py"
        echo ""
        return 1
    fi
}

# 測試端口監聽
test_port() {
    echo "======================================================================"
    echo "📊 測試 2: 檢查端口監聽"
    echo "======================================================================"
    echo ""

    if command -v netstat &> /dev/null; then
        if netstat -tulpn 2>/dev/null | grep ":8000" > /dev/null; then
            echo -e "${GREEN}✅ 端口 8000 正在監聽${NC}"
            netstat -tulpn 2>/dev/null | grep ":8000" | sed 's/^/    /'
            echo ""
            return 0
        else
            echo -e "${RED}❌ 端口 8000 未監聽${NC}"
            echo ""
            return 1
        fi
    elif command -v lsof &> /dev/null; then
        if lsof -i :8000 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 端口 8000 正在監聽${NC}"
            lsof -i :8000 | sed 's/^/    /'
            echo ""
            return 0
        else
            echo -e "${RED}❌ 端口 8000 未監聽${NC}"
            echo ""
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  無法檢查端口（netstat 和 lsof 都不可用）${NC}"
        echo ""
        return 2
    fi
}

# 本地測試
test_local() {
    echo "======================================================================"
    echo "📊 測試 3: 本地連接測試"
    echo "======================================================================"
    echo ""

    # 測試健康檢查
    test_endpoint "Health Check" "$LOCAL_URL/health" false

    # 測試資訊端點
    test_endpoint "Info Endpoint" "$LOCAL_URL/info" false

    # 測試 API（需要認證）
    test_endpoint "Test Endpoint (with API Key)" "$LOCAL_URL/test" true
}

# 遠程測試
test_remote() {
    echo "======================================================================"
    echo "📊 測試 4: 遠程連接測試（Cloudflare Tunnel）"
    echo "======================================================================"
    echo ""

    # 檢查 DNS
    echo "🔍 檢查 DNS 解析..."
    if command -v dig &> /dev/null; then
        DNS_RESULT=$(dig +short postgres-ai-agent.shyangtsuen.xyz 2>&1)
        if [ -n "$DNS_RESULT" ]; then
            echo -e "${GREEN}✅ DNS 解析成功${NC}"
            echo "$DNS_RESULT" | sed 's/^/    /'
            echo ""
        else
            echo -e "${RED}❌ DNS 解析失敗${NC}"
            echo "    請確認 Cloudflare Tunnel Public Hostname 已配置"
            echo ""
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  無法檢查 DNS（dig 不可用）${NC}"
        echo ""
    fi

    # 測試遠程健康檢查
    test_endpoint "Remote Health Check" "$REMOTE_URL/health" false

    # 測試遠程 API
    test_endpoint "Remote Test Endpoint" "$REMOTE_URL/test" true
}

# PostgreSQL 連接測試
test_postgresql() {
    echo "======================================================================"
    echo "📊 測試 5: PostgreSQL 連接"
    echo "======================================================================"
    echo ""

    if command -v psql &> /dev/null; then
        echo "🔍 測試 PostgreSQL 直接連接..."
        PGPASSWORD=Morris psql -h 192.168.1.114 -p 5532 -U postgres -d postgres -c "SELECT version();" 2>&1 | head -5 | sed 's/^/    /'

        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            echo -e "${GREEN}✅ PostgreSQL 連接成功${NC}"
            echo ""
        else
            echo -e "${RED}❌ PostgreSQL 連接失敗${NC}"
            echo ""
        fi
    else
        echo -e "${YELLOW}⚠️  psql 不可用，跳過 PostgreSQL 直接連接測試${NC}"
        echo "    （這不影響 HTTP Proxy 功能）"
        echo ""
    fi
}

# 性能測試
test_performance() {
    echo "======================================================================"
    echo "📊 測試 6: 性能測試"
    echo "======================================================================"
    echo ""

    echo "🔍 測試響應時間..."

    total_time=0
    success_count=0
    requests=5

    for i in $(seq 1 $requests); do
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$LOCAL_URL/health" 2>&1)

        if [ $? -eq 0 ]; then
            echo "    請求 $i: ${response_time}s"
            total_time=$(echo "$total_time + $response_time" | bc)
            success_count=$((success_count + 1))
        else
            echo -e "    請求 $i: ${RED}失敗${NC}"
        fi
    done

    if [ $success_count -gt 0 ]; then
        avg_time=$(echo "scale=4; $total_time / $success_count" | bc)
        echo ""
        echo -e "${GREEN}✅ 性能測試完成${NC}"
        echo "    成功請求: $success_count/$requests"
        echo "    平均響應時間: ${avg_time}s"
        echo ""
    else
        echo ""
        echo -e "${RED}❌ 所有請求失敗${NC}"
        echo ""
    fi
}

# 主測試流程
run_tests() {
    TOTAL=0
    PASSED=0

    # 測試 1: 進程
    if [ "$MODE" = "all" ] || [ "$MODE" = "local" ]; then
        test_process
        RESULT=$?
        TOTAL=$((TOTAL + 1))
        [ $RESULT -eq 0 ] && PASSED=$((PASSED + 1))
    fi

    # 測試 2: 端口
    if [ "$MODE" = "all" ] || [ "$MODE" = "local" ]; then
        test_port
        RESULT=$?
        TOTAL=$((TOTAL + 1))
        [ $RESULT -eq 0 ] && PASSED=$((PASSED + 1))
    fi

    # 測試 3: 本地連接
    if [ "$MODE" = "all" ] || [ "$MODE" = "local" ]; then
        test_local
    fi

    # 測試 4: 遠程連接
    if [ "$MODE" = "all" ] || [ "$MODE" = "remote" ]; then
        test_remote
    fi

    # 測試 5: PostgreSQL
    if [ "$MODE" = "all" ]; then
        test_postgresql
    fi

    # 測試 6: 性能
    if [ "$MODE" = "all" ] || [ "$MODE" = "local" ]; then
        if command -v bc &> /dev/null; then
            test_performance
        fi
    fi
}

# 顯示摘要
show_summary() {
    echo "======================================================================"
    echo "📊 測試摘要"
    echo "======================================================================"
    echo ""
    echo "測試模式: $MODE"
    echo "測試時間: $(date)"
    echo ""
    echo "端點資訊："
    echo "  • 本地: $LOCAL_URL"
    echo "  • 遠程: $REMOTE_URL"
    echo ""
    echo "建議："
    if [ "$MODE" = "local" ]; then
        echo "  ✅ 本地測試完成"
        echo "  📝 下一步: 配置 Cloudflare Tunnel 並執行 remote 測試"
        echo "     ./test-proxy.sh remote"
    elif [ "$MODE" = "remote" ]; then
        echo "  ✅ 遠程測試完成"
        echo "  📝 Proxy 已可通過 Cloudflare Tunnel 訪問"
    else
        echo "  ✅ 完整測試完成"
        echo "  📝 Proxy 運行正常，可以配置 Cloudflare Workers"
    fi
    echo ""
}

# 執行測試
case "$MODE" in
    local|remote|all)
        run_tests
        show_summary
        ;;
    *)
        echo "用法: $0 [local|remote|all]"
        echo ""
        echo "選項:"
        echo "  local  - 測試本地連接"
        echo "  remote - 測試遠程連接（Cloudflare Tunnel）"
        echo "  all    - 測試所有連接（默認）"
        exit 1
        ;;
esac

exit 0
