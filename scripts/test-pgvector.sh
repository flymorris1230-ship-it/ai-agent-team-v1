#!/bin/bash
# Test pgvector installation via PostgreSQL HTTP Proxy
# This script will:
# 1. Check if pgvector extension exists
# 2. Create the extension if needed
# 3. Test vector operations
# 4. Clean up test data

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

PROXY_URL="${POSTGRES_PROXY_URL:-https://postgres-ai-agent.shyangtsuen.xyz}"
API_KEY="${POSTGRES_PROXY_API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "❌ Error: POSTGRES_PROXY_API_KEY not set in .env"
    exit 1
fi

echo "=========================================="
echo "🧮 pgvector Installation Test"
echo "=========================================="
echo "Proxy URL: $PROXY_URL"
echo ""

# Function to execute SQL query
query_sql() {
    local sql="$1"
    local description="$2"

    echo "📝 $description"
    echo "SQL: $sql"

    response=$(curl -s -X POST "$PROXY_URL/query" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "{\"query\": \"$sql\"}")

    echo "$response" | python3 -m json.tool
    echo ""

    # Check if query was successful
    success=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))")
    if [ "$success" != "True" ]; then
        echo "❌ Query failed!"
        return 1
    fi

    return 0
}

# Step 1: Check if pgvector extension exists
echo "Step 1: Checking pgvector extension status..."
query_sql "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'" \
    "Check if pgvector extension is installed" || true

# Step 2: Create extension if not exists
echo "Step 2: Creating pgvector extension (if not exists)..."
query_sql "CREATE EXTENSION IF NOT EXISTS vector" \
    "Create pgvector extension"

# Step 3: Verify installation
echo "Step 3: Verifying pgvector installation..."
query_sql "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'" \
    "Verify pgvector extension"

# Step 4: Create test table
echo "Step 4: Creating test table..."
query_sql "DROP TABLE IF EXISTS vector_test" \
    "Drop existing test table if any"

query_sql "CREATE TABLE vector_test (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)
)" "Create test table with vector column"

# Step 5: Insert test data
echo "Step 5: Inserting test data..."
query_sql "INSERT INTO vector_test (content, embedding) VALUES
    ('Test document 1', array_fill(0.1, ARRAY[1536])::vector),
    ('Test document 2', array_fill(0.2, ARRAY[1536])::vector),
    ('Test document 3', array_fill(0.3, ARRAY[1536])::vector)" \
    "Insert 3 test documents"

# Step 6: Test vector similarity search
echo "Step 6: Testing vector similarity search..."
query_sql "SELECT
    id,
    content,
    embedding <=> array_fill(0.15, ARRAY[1536])::vector AS distance
FROM vector_test
ORDER BY distance
LIMIT 3" "Execute cosine similarity search"

# Step 7: Test vector operations
echo "Step 7: Testing different distance metrics..."

echo "7.1: L2 Distance (Euclidean)"
query_sql "SELECT
    id,
    content,
    embedding <-> array_fill(0.15, ARRAY[1536])::vector AS l2_distance
FROM vector_test
ORDER BY l2_distance
LIMIT 3" "L2 distance query"

echo "7.2: Inner Product"
query_sql "SELECT
    id,
    content,
    embedding <#> array_fill(0.15, ARRAY[1536])::vector AS inner_product
FROM vector_test
ORDER BY inner_product
LIMIT 3" "Inner product query"

# Step 8: Clean up (optional)
echo "Step 8: Cleaning up test data..."
read -p "Do you want to delete the test table? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    query_sql "DROP TABLE vector_test" "Drop test table"
    echo "✅ Test table deleted"
else
    echo "ℹ️  Test table kept for manual inspection"
    echo "   You can delete it later with: DROP TABLE vector_test;"
fi

echo ""
echo "=========================================="
echo "✅ pgvector Installation Test Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ pgvector extension installed"
echo "  ✅ Vector table created successfully"
echo "  ✅ Vector data inserted successfully"
echo "  ✅ Cosine similarity search works"
echo "  ✅ L2 distance search works"
echo "  ✅ Inner product search works"
echo ""
echo "Next steps:"
echo "  1. Create production vector tables"
echo "  2. Integrate with RAG engine"
echo "  3. Test with real embeddings"
echo ""
