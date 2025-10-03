#!/bin/bash

# ==========================================
# RAG 系統完整測試腳本
# ==========================================

set -e

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
API_URL="${API_URL:-http://localhost:8787}"
API_KEY="${API_KEY:-test-key}"

print_test() {
    echo -e "\n${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# 測試 1: 上傳文檔到知識庫
test_document_upload() {
    print_test "測試文檔上傳..."

    RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/documents" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_KEY}" \
        -d '{
            "title": "AI Agent Team 系統架構",
            "content": "AI Agent Team 是一個多代理協作系統，包含9個專業 Agent：\n1. Coordinator - 任務協調\n2. Product Manager - 需求分析\n3. Solution Architect - 系統設計\n4. Backend Developer - API 開發\n5. Frontend Developer - UI 實作\n6. QA Engineer - 測試與品質\n7. DevOps Engineer - 部署運維\n8. Data Analyst - 數據分析\n9. Knowledge Manager - 知識管理",
            "content_type": "text",
            "source": "manual_upload",
            "tags": ["architecture", "agents", "system"],
            "metadata": {
                "version": "1.0",
                "author": "Test User"
            }
        }')

    DOCUMENT_ID=$(echo "$RESPONSE" | grep -o '"document_id":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$DOCUMENT_ID" ]; then
        print_pass "文檔上傳成功，ID: $DOCUMENT_ID"
        echo "$DOCUMENT_ID" > /tmp/test_document_id.txt
    else
        print_fail "文檔上傳失敗"
        echo "響應: $RESPONSE"
        return 1
    fi
}

# 測試 2: RAG 查詢
test_rag_query() {
    print_test "測試 RAG 查詢..."

    RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_KEY}" \
        -d '{
            "message": "請說明 Coordinator Agent 的主要功能",
            "use_rag": true,
            "conversation_id": null
        }')

    ANSWER=$(echo "$RESPONSE" | grep -o '"answer":"[^"]*"' | cut -d'"' -f4)
    SOURCES=$(echo "$RESPONSE" | grep -o '"sources":\[[^]]*\]')

    if [ -n "$ANSWER" ]; then
        print_pass "RAG 查詢成功"
        echo "  答案: $ANSWER"
        echo "  來源: $SOURCES"
    else
        print_fail "RAG 查詢失敗"
        echo "響應: $RESPONSE"
        return 1
    fi
}

# 測試 3: 向量相似度搜索
test_vector_search() {
    print_test "測試向量相似度搜索..."

    RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/documents/search" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_KEY}" \
        -d '{
            "query": "Backend Developer 做什麼？",
            "top_k": 3,
            "threshold": 0.7
        }')

    RESULT_COUNT=$(echo "$RESPONSE" | grep -o '"results":\[[^]]*' | grep -o '{' | wc -l)

    if [ "$RESULT_COUNT" -gt 0 ]; then
        print_pass "找到 ${RESULT_COUNT} 個相關文檔"
        echo "$RESPONSE" | jq '.results[] | {title, score}' 2>/dev/null || echo "$RESPONSE"
    else
        print_fail "向量搜索失敗"
        echo "響應: $RESPONSE"
        return 1
    fi
}

# 測試 4: 批量文檔上傳
test_batch_upload() {
    print_test "測試批量文檔上傳..."

    DOCS=(
        '{"title":"PostgreSQL with pgvector","content":"PostgreSQL 是一個強大的關係型資料庫，pgvector 擴展提供向量存儲和相似度搜索功能。"}'
        '{"title":"Cloudflare Workers","content":"Cloudflare Workers 是邊緣計算平台，支援 D1 資料庫和 Vectorize 向量搜索。"}'
        '{"title":"RAG 系統","content":"RAG (Retrieval-Augmented Generation) 結合檢索和生成，提供準確的知識問答。"}'
    )

    SUCCESS_COUNT=0

    for doc in "${DOCS[@]}"; do
        RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/documents" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${API_KEY}" \
            -d "$doc")

        if echo "$RESPONSE" | grep -q '"document_id"'; then
            ((SUCCESS_COUNT++))
        fi
    done

    if [ "$SUCCESS_COUNT" -eq "${#DOCS[@]}" ]; then
        print_pass "批量上傳成功 ($SUCCESS_COUNT/${#DOCS[@]})"
    else
        print_fail "批量上傳部分失敗 ($SUCCESS_COUNT/${#DOCS[@]})"
        return 1
    fi
}

# 測試 5: 對話式 RAG
test_conversational_rag() {
    print_test "測試對話式 RAG..."

    # 第一輪對話
    RESPONSE1=$(curl -s -X POST "${API_URL}/api/v1/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_KEY}" \
        -d '{
            "message": "什麼是 RAG 系統？",
            "use_rag": true
        }')

    CONVERSATION_ID=$(echo "$RESPONSE1" | grep -o '"conversation_id":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$CONVERSATION_ID" ]; then
        print_fail "無法創建對話"
        return 1
    fi

    # 第二輪對話（帶上下文）
    RESPONSE2=$(curl -s -X POST "${API_URL}/api/v1/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_KEY}" \
        -d "{
            \"message\": \"它是如何工作的？\",
            \"use_rag\": true,
            \"conversation_id\": \"$CONVERSATION_ID\"
        }")

    if echo "$RESPONSE2" | grep -q '"answer"'; then
        print_pass "對話式 RAG 測試成功"
        echo "  對話 ID: $CONVERSATION_ID"
    else
        print_fail "對話式 RAG 測試失敗"
        return 1
    fi
}

# 測試 6: RAG 性能測試
test_rag_performance() {
    print_test "測試 RAG 響應時間..."

    START=$(date +%s%N)

    curl -s -X POST "${API_URL}/api/v1/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_KEY}" \
        -d '{
            "message": "請總結系統的主要功能",
            "use_rag": true
        }' > /dev/null

    END=$(date +%s%N)
    LATENCY=$(( (END - START) / 1000000 ))

    if [ "$LATENCY" -lt 5000 ]; then
        print_pass "響應時間: ${LATENCY}ms （優秀）"
    elif [ "$LATENCY" -lt 10000 ]; then
        print_pass "響應時間: ${LATENCY}ms （良好）"
    else
        print_fail "響應時間: ${LATENCY}ms （需優化）"
        return 1
    fi
}

# 測試 7: 清理測試數據
cleanup_test_data() {
    print_test "清理測試數據..."

    if [ -f "/tmp/test_document_id.txt" ]; then
        DOCUMENT_ID=$(cat /tmp/test_document_id.txt)

        curl -s -X DELETE "${API_URL}/api/v1/documents/${DOCUMENT_ID}" \
            -H "Authorization: Bearer ${API_KEY}" > /dev/null

        rm /tmp/test_document_id.txt
        print_pass "測試數據已清理"
    fi
}

# 主測試流程
main() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  RAG 系統完整測試${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "API URL: ${API_URL}"
    echo ""

    FAILED_TESTS=0

    # 執行所有測試
    test_document_upload || ((FAILED_TESTS++))
    sleep 2  # 等待索引完成

    test_rag_query || ((FAILED_TESTS++))
    test_vector_search || ((FAILED_TESTS++))
    test_batch_upload || ((FAILED_TESTS++))
    test_conversational_rag || ((FAILED_TESTS++))
    test_rag_performance || ((FAILED_TESTS++))

    # 清理
    cleanup_test_data

    # 總結
    echo ""
    echo -e "${BLUE}========================================${NC}"
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}  所有 RAG 測試通過！ ✓${NC}"
    else
        echo -e "${RED}  失敗測試數: ${FAILED_TESTS}${NC}"
    fi
    echo -e "${BLUE}========================================${NC}"

    return $FAILED_TESTS
}

# 執行測試
main "$@"
