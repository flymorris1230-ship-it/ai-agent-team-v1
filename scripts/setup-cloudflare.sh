#!/bin/bash

# ==========================================
# Cloudflare Resources Setup Script
# ==========================================

set -e  # Exit on error

echo "🚀 AI Agent Team - Cloudflare Resources Setup"
echo "=============================================="
echo ""

# Check if wrangler is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npm/npx not found. Please install Node.js first."
    exit 1
fi

# Check for API token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  Warning: CLOUDFLARE_API_TOKEN not set"
    echo "Please set your Cloudflare API token:"
    echo "  export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo ""
    echo "Get your token from: https://dash.cloudflare.com/profile/api-tokens"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Step 1: Creating D1 Databases..."
echo "-----------------------------------"

# Create production database
echo "Creating production database..."
PROD_DB_OUTPUT=$(npx wrangler d1 create ai-agent-db 2>&1)
echo "$PROD_DB_OUTPUT"

# Extract database ID from output
PROD_DB_ID=$(echo "$PROD_DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -n "$PROD_DB_ID" ]; then
    echo "✅ Production database created: $PROD_DB_ID"
else
    echo "⚠️  Could not extract production database ID. Please check output above."
fi

echo ""

# Create development database
echo "Creating development database..."
DEV_DB_OUTPUT=$(npx wrangler d1 create ai-agent-db-dev 2>&1)
echo "$DEV_DB_OUTPUT"

DEV_DB_ID=$(echo "$DEV_DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -n "$DEV_DB_ID" ]; then
    echo "✅ Development database created: $DEV_DB_ID"
else
    echo "⚠️  Could not extract development database ID. Please check output above."
fi

echo ""
echo "📊 Step 2: Initializing Database Schemas..."
echo "-------------------------------------------"

if [ -n "$PROD_DB_ID" ]; then
    echo "Initializing production database schema..."
    npx wrangler d1 execute ai-agent-db --file=src/main/js/database/schema.sql
    echo "✅ Production schema initialized"
else
    echo "⚠️  Skipping production schema initialization (no database ID)"
fi

echo ""

if [ -n "$DEV_DB_ID" ]; then
    echo "Initializing development database schema..."
    npx wrangler d1 execute ai-agent-db-dev --file=src/main/js/database/schema.sql --env development
    echo "✅ Development schema initialized"
else
    echo "⚠️  Skipping development schema initialization (no database ID)"
fi

echo ""
echo "🔍 Step 3: Creating Vectorize Index..."
echo "---------------------------------------"

VECTORIZE_OUTPUT=$(npx wrangler vectorize create ai-agent-vectors --dimensions=1536 --metric=cosine 2>&1)
echo "$VECTORIZE_OUTPUT"

if echo "$VECTORIZE_OUTPUT" | grep -q "Successfully created"; then
    echo "✅ Vectorize index created"
else
    echo "⚠️  Vectorize index may already exist or creation failed"
fi

echo ""
echo "🪣 Step 4: Creating R2 Bucket..."
echo "---------------------------------"

R2_OUTPUT=$(npx wrangler r2 bucket create ai-agent-files 2>&1)
echo "$R2_OUTPUT"

if echo "$R2_OUTPUT" | grep -q "Created bucket"; then
    echo "✅ R2 bucket created"
else
    echo "⚠️  R2 bucket may already exist or creation failed"
fi

echo ""
echo "💾 Step 5: Creating KV Namespace..."
echo "------------------------------------"

KV_OUTPUT=$(npx wrangler kv:namespace create CACHE 2>&1)
echo "$KV_OUTPUT"

KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+' || echo "")

if [ -n "$KV_ID" ]; then
    echo "✅ KV namespace created: $KV_ID"
else
    echo "⚠️  Could not extract KV namespace ID. Please check output above."
fi

echo ""
echo "📬 Step 6: Creating Queues..."
echo "------------------------------"

echo "Creating task queue..."
TASK_QUEUE_OUTPUT=$(npx wrangler queues create ai-agent-tasks 2>&1)
echo "$TASK_QUEUE_OUTPUT"

echo ""
echo "Creating backup queue..."
BACKUP_QUEUE_OUTPUT=$(npx wrangler queues create ai-agent-backups 2>&1)
echo "$BACKUP_QUEUE_OUTPUT"

if echo "$TASK_QUEUE_OUTPUT" | grep -q "Created"; then
    echo "✅ Task queue created"
fi

if echo "$BACKUP_QUEUE_OUTPUT" | grep -q "Created"; then
    echo "✅ Backup queue created"
fi

echo ""
echo "📝 Step 7: Configuration Summary"
echo "---------------------------------"
echo ""
echo "Please update your wrangler.toml with the following values:"
echo ""

if [ -n "$PROD_DB_ID" ]; then
    echo "Production Database ID (line 16):"
    echo "  database_id = \"$PROD_DB_ID\""
    echo ""
fi

if [ -n "$DEV_DB_ID" ]; then
    echo "Development Database ID (line 66):"
    echo "  database_id = \"$DEV_DB_ID\""
    echo ""
fi

if [ -n "$KV_ID" ]; then
    echo "KV Namespace ID (line 31):"
    echo "  id = \"$KV_ID\""
    echo ""
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Update wrangler.toml with the IDs shown above"
echo "2. Run 'npm run dev' to start local development"
echo "3. Run 'npm run deploy' to deploy to Cloudflare"
echo ""
echo "For detailed instructions, see docs/setup-guide.md"
