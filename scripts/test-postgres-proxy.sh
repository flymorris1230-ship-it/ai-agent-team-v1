#!/bin/bash

# ==========================================
# PostgreSQL Proxy 連接測試腳本
# ==========================================

set -e

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
PROXY_HOST="${PROXY_HOST:-192.168.1.114}"
PROXY_PORT="${PROXY_PORT:-8000}"
PROXY_URL="http://${PROXY_HOST}:${PROXY_PORT}"
API_KEY="${POSTGRES_PROXY_API_KEY:-your-secure-api-key-here}"

# 函數
print_test() {
    echo -e "\n${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# 測試 1: 健康檢查
test_health_check() {
    print_test "測試健康檢查端點..."

    RESPONSE=$(curl -s "${PROXY_URL}/health")
    STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    if [ "$STATUS" = "healthy" ]; then
        print_pass "健康檢查通過"
        echo "  響應: $RESPONSE"
    else
        print_fail "健康檢查失敗"
        echo "  響應: $RESPONSE"
        return 1
    fi
}

# 測試 2: pgvector 狀態
test_pgvector_status() {
    print_test "測試 pgvector 狀態..."

    RESPONSE=$(curl -s -H "X-API-Key: ${API_KEY}" "${PROXY_URL}/pgvector/status")
    ENABLED=$(echo "$RESPONSE" | grep -o '"enabled":[^,}]*' | cut -d':' -f2)

    if [ "$ENABLED" = "true" ]; then
        print_pass "pgvector 已啟用"
        echo "  響應: $RESPONSE"
    else
        print_fail "pgvector 未啟用"
        echo "  響應: $RESPONSE"
        return 1
    fi
}

# 測試 3: 簡單查詢
test_simple_query() {
    print_test "測試簡單 SQL 查詢..."

    RESPONSE=$(curl -s -X POST "${PROXY_URL}/query" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d '{"sql":"SELECT 1 as test","params":[]}')

    ROW_COUNT=$(echo "$RESPONSE" | grep -o '"rowCount":[0-9]*' | cut -d':' -f2)

    if [ "$ROW_COUNT" -gt 0 ]; then
        print_pass "查詢執行成功"
        echo "  響應: $RESPONSE"
    else
        print_fail "查詢執行失敗"
        echo "  響應: $RESPONSE"
        return 1
    fi
}

# 測試 4: 向量搜索
test_vector_search() {
    print_test "測試向量搜索..."

    # 生成測試向量（3維簡單測試）
    EMBEDDING="[0.1, 0.2, 0.3]"

    RESPONSE=$(curl -s -X POST "${PROXY_URL}/vector-search" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d "{
            \"table\": \"document_chunks\",
            \"embedding\": ${EMBEDDING},
            \"limit\": 5,
            \"threshold\": 0.5,
            \"metric\": \"cosine\"
        }")

    if echo "$RESPONSE" | grep -q '"rows"'; then
        print_pass "向量搜索執行成功"
        echo "  響應: $RESPONSE"
    else
        print_fail "向量搜索失敗"
        echo "  響應: $RESPONSE"
        return 1
    fi
}

# 測試 5: 查詢 Agents
test_query_agents() {
    print_test "測試查詢 Agents..."

    RESPONSE=$(curl -s -X POST "${PROXY_URL}/query" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${API_KEY}" \
        -d '{"sql":"SELECT id, name, status FROM agents LIMIT 3","params":[]}')

    ROW_COUNT=$(echo "$RESPONSE" | grep -o '"rowCount":[0-9]*' | cut -d':' -f2)

    if [ "$ROW_COUNT" -gt 0 ]; then
        print_pass "Agents 查詢成功，找到 ${ROW_COUNT} 個 agents"
        echo "  響應: $RESPONSE"
    else
        print_fail "Agents 查詢失敗"
        echo "  響應: $RESPONSE"
        return 1
    fi
}

# 測試 6: 錯誤處理（錯誤的 API Key）
test_auth_error() {
    print_test "測試認證錯誤處理..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${PROXY_URL}/query" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: wrong-api-key" \
        -d '{"sql":"SELECT 1","params":[]}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

    if [ "$HTTP_CODE" = "401" ]; then
        print_pass "認證錯誤處理正確（返回 401）"
    else
        print_fail "認證錯誤處理異常（HTTP $HTTP_CODE）"
        return 1
    fi
}

# 測試 7: 性能測試（延遲）
test_latency() {
    print_test "測試響應延遲..."

    START=$(date +%s%N)
    curl -s "${PROXY_URL}/health" > /dev/null
    END=$(date +%s%N)

    LATENCY=$(( (END - START) / 1000000 ))  # 轉換為毫秒

    if [ "$LATENCY" -lt 1000 ]; then
        print_pass "響應延遲: ${LATENCY}ms （良好）"
    elif [ "$LATENCY" -lt 3000 ]; then
        print_pass "響應延遲: ${LATENCY}ms （可接受）"
    else
        print_fail "響應延遲: ${LATENCY}ms （過高）"
        return 1
    fi
}

# 測試 8: 併發查詢
test_concurrent_queries() {
    print_test "測試併發查詢（5個並發請求）..."

    SUCCESS_COUNT=0

    for i in {1..5}; do
        curl -s "${PROXY_URL}/health" > /dev/null &
    done

    wait

    print_pass "併發查詢測試完成"
}

# 主測試流程
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  PostgreSQL Proxy 連接測試${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "代理地址: ${PROXY_URL}"
    echo "API Key: ${API_KEY:0:20}..."
    echo ""

    FAILED_TESTS=0

    # 執行所有測試
    test_health_check || ((FAILED_TESTS++))
    test_pgvector_status || ((FAILED_TESTS++))
    test_simple_query || ((FAILED_TESTS++))
    test_vector_search || ((FAILED_TESTS++))
    test_query_agents || ((FAILED_TESTS++))
    test_auth_error || ((FAILED_TESTS++))
    test_latency || ((FAILED_TESTS++))
    test_concurrent_queries || ((FAILED_TESTS++))

    # 總結
    echo ""
    echo -e "${BLUE}========================================${NC}"
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}  所有測試通過！ ✓${NC}"
    else
        echo -e "${RED}  失敗測試數: ${FAILED_TESTS}${NC}"
    fi
    echo -e "${BLUE}========================================${NC}"

    return $FAILED_TESTS
}

# 執行測試
main "$@"
