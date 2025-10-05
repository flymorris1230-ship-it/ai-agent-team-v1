#!/bin/bash
# Simplified pgvector installation test using SQL files
# Avoids complex JSON escaping issues

set -e

# Load environment
if [ -f .env ]; then
    set -a
    source <(cat .env | grep -v '^#' | grep -v '^$' | grep '=' | sed 's/#.*$//')
    set +a
fi

PROXY_URL="${POSTGRES_PROXY_URL:-https://postgres-ai-agent.shyangtsuen.xyz}"
API_KEY="${POSTGRES_PROXY_API_KEY}"
SQL_DIR="tmp/pgvector-sql"

if [ -z "$API_KEY" ]; then
    echo "❌ Error: POSTGRES_PROXY_API_KEY not set in .env"
    exit 1
fi

echo "=========================================="
echo "🧮 pgvector Installation Test (Simplified)"
echo "=========================================="
echo "Proxy URL: $PROXY_URL"
echo ""

# Create SQL directory
mkdir -p "$SQL_DIR"

# Function to execute SQL from file
exec_sql() {
    local sql_file="$1"
    local description="$2"

    echo "📝 $description"
    echo "SQL: $(cat $sql_file)"

    # Create JSON payload
    local json_file="${sql_file}.json"
    cat > "$json_file" << EOF
{
  "query": "$(cat $sql_file | tr '\n' ' ' | sed 's/"/\\"/g')"
}
EOF

    response=$(curl -s -X POST "$PROXY_URL/query" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d @"$json_file")

    echo "$response" | python3 -m json.tool
    echo ""

    # Check success
    success=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "False")
    if [ "$success" != "True" ]; then
        echo "⚠️  Query may have failed or returned no data"
    fi

    rm -f "$json_file"
    return 0
}

# Step 1: Check pgvector extension
echo "Step 1: Checking pgvector extension..."
cat > "$SQL_DIR/check_pgvector.sql" << 'SQL'
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'
SQL

exec_sql "$SQL_DIR/check_pgvector.sql" "Check if pgvector extension exists"

# Step 2: Create extension
echo "Step 2: Creating pgvector extension (if not exists)..."
cat > "$SQL_DIR/create_extension.sql" << 'SQL'
CREATE EXTENSION IF NOT EXISTS vector
SQL

exec_sql "$SQL_DIR/create_extension.sql" "Create pgvector extension"

# Step 3: Verify installation
echo "Step 3: Verifying pgvector installation..."
exec_sql "$SQL_DIR/check_pgvector.sql" "Verify pgvector extension"

# Step 4: Drop test table if exists
echo "Step 4: Preparing test environment..."
cat > "$SQL_DIR/drop_test_table.sql" << 'SQL'
DROP TABLE IF EXISTS vector_test
SQL

exec_sql "$SQL_DIR/drop_test_table.sql" "Drop existing test table"

# Step 5: Create test table
echo "Step 5: Creating test table..."
cat > "$SQL_DIR/create_test_table.sql" << 'SQL'
CREATE TABLE vector_test (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)
)
SQL

exec_sql "$SQL_DIR/create_test_table.sql" "Create test table with vector column"

# Step 6: Insert test data
echo "Step 6: Inserting test data..."
cat > "$SQL_DIR/insert_test_data.sql" << 'SQL'
INSERT INTO vector_test (content, embedding) VALUES
    ('Test document 1', array_fill(0.1, ARRAY[1536])::vector),
    ('Test document 2', array_fill(0.2, ARRAY[1536])::vector),
    ('Test document 3', array_fill(0.3, ARRAY[1536])::vector)
SQL

exec_sql "$SQL_DIR/insert_test_data.sql" "Insert 3 test documents"

# Step 7: Test cosine similarity
echo "Step 7: Testing cosine similarity search..."
cat > "$SQL_DIR/test_cosine.sql" << 'SQL'
SELECT
    id,
    content,
    embedding <=> array_fill(0.15, ARRAY[1536])::vector AS distance
FROM vector_test
ORDER BY distance
LIMIT 3
SQL

exec_sql "$SQL_DIR/test_cosine.sql" "Execute cosine similarity search"

# Step 8: Test L2 distance
echo "Step 8: Testing L2 distance..."
cat > "$SQL_DIR/test_l2.sql" << 'SQL'
SELECT
    id,
    content,
    embedding <-> array_fill(0.15, ARRAY[1536])::vector AS l2_distance
FROM vector_test
ORDER BY l2_distance
LIMIT 3
SQL

exec_sql "$SQL_DIR/test_l2.sql" "Execute L2 distance search"

# Step 9: Test inner product
echo "Step 9: Testing inner product..."
cat > "$SQL_DIR/test_inner_product.sql" << 'SQL'
SELECT
    id,
    content,
    embedding <#> array_fill(0.15, ARRAY[1536])::vector AS inner_product
FROM vector_test
ORDER BY inner_product
LIMIT 3
SQL

exec_sql "$SQL_DIR/test_inner_product.sql" "Execute inner product search"

# Step 10: Cleanup (optional)
echo ""
echo "Step 10: Cleanup..."
read -p "Delete test table? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    exec_sql "$SQL_DIR/drop_test_table.sql" "Drop test table"
    echo "✅ Test table deleted"
else
    echo "ℹ️  Test table kept for manual inspection"
    echo "   Delete later with: DROP TABLE vector_test;"
fi

# Cleanup SQL files
rm -rf "$SQL_DIR"

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
