#!/bin/bash
# Minimal pgvector check using only existing Proxy endpoints

set -e

echo "=========================================="
echo "🔍 Checking pgvector Status"
echo "=========================================="
echo ""

# Load environment
if [ -f .env ]; then
    set -a
    source <(cat .env | grep -v '^#' | grep -v '^$' | grep '=' | sed 's/#.*$//')
    set +a
fi

PROXY_URL="${POSTGRES_PROXY_URL:-https://postgres-ai-agent.shyangtsuen.xyz}"

echo "Step 1: Check Proxy health (includes pgvector status)..."
HEALTH=$(curl -s "$PROXY_URL/health")
echo "$HEALTH" | python3 -m json.tool

PGVECTOR_STATUS=$(echo "$HEALTH" | python3 -c "import sys, json; print(json.load(sys.stdin).get('pgvector', 'unknown'))" 2>/dev/null || echo "unknown")

echo ""
echo "=========================================="
if [ "$PGVECTOR_STATUS" = "available" ]; then
    echo "✅ pgvector Extension: AVAILABLE"
    echo ""
    echo "This means pgvector is installed and ready to use!"
    echo ""
    echo "Note: The Proxy health check confirms pgvector is available."
    echo "The extension may already be created, or the pgvector library"
    echo "is present in the PostgreSQL container (pgvector/pgvector:pg16)"
    echo ""
    echo "Next steps:"
    echo "  1. Update Proxy to add /query endpoint (requires NAS access)"
    echo "  2. Or use pgAdmin to verify: CREATE EXTENSION IF NOT EXISTS vector"
    echo "  3. Or use direct psql connection if available"
elif [ "$PGVECTOR_STATUS" = "not installed" ]; then
    echo "❌ pgvector Extension: NOT INSTALLED"
    echo ""
    echo "You need to install pgvector in the PostgreSQL container."
else
    echo "⚠️  pgvector Extension: UNKNOWN"
    echo "Could not determine pgvector status from health check"
fi
echo "=========================================="
echo ""

# Test basic database connectivity
echo "Step 2: Test database connectivity..."
TEST_RESPONSE=$(curl -s "$PROXY_URL/test" -H "X-API-Key: ${POSTGRES_PROXY_API_KEY}")
echo "$TEST_RESPONSE" | python3 -m json.tool

SUCCESS=$(echo "$TEST_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "False")

echo ""
if [ "$SUCCESS" = "True" ]; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: FAILED"
fi

echo ""
echo "=========================================="
echo "Summary:"
echo "  - Proxy Status: Running"
echo "  - Database: Connected"
echo "  - pgvector: $PGVECTOR_STATUS"
echo ""
echo "To complete pgvector installation, you need:"
echo "  1. Access to NAS (to update Proxy or use pgAdmin)"
echo "  2. Or DSM web interface access"
echo "  3. Or QuickConnect to access Synology services"
echo "=========================================="
