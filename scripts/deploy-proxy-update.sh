#!/bin/bash
# Deploy PostgreSQL Proxy update to NAS
# This script updates the Proxy on NAS with the latest version

set -e

# Load environment variables
if [ -f .env ]; then
    set -a
    source <(cat .env | grep -v '^#' | grep -v '^$' | grep '=' | sed 's/#.*$//')
    set +a
fi

NAS_HOST="${NAS_HOST:-192.168.1.114}"
NAS_USER="${NAS_USER:-admin}"
NAS_PATH="${NAS_PATH:-/volume1/docker/ai-agent-backup}"

echo "=========================================="
echo "🚀 Deploying Proxy Update to NAS"
echo "=========================================="
echo "NAS Host: $NAS_HOST"
echo "NAS User: $NAS_USER"
echo "NAS Path: $NAS_PATH"
echo ""

# Step 1: Copy updated Proxy script to NAS
echo "Step 1: Copying updated Proxy script to NAS..."
scp nas-postgres-proxy.py "${NAS_USER}@${NAS_HOST}:${NAS_PATH}/"
echo "✅ Proxy script uploaded"
echo ""

# Step 2: Restart Proxy service on NAS
echo "Step 2: Restarting Proxy service on NAS..."
ssh "${NAS_USER}@${NAS_HOST}" << 'ENDSSH'
cd /volume1/docker/ai-agent-backup

# Kill existing Proxy process
echo "🛑 Stopping existing Proxy..."
pkill -f nas-postgres-proxy.py || echo "No existing Proxy process found"

# Wait for process to terminate
sleep 2

# Start new Proxy
echo "🚀 Starting new Proxy..."
nohup python3 nas-postgres-proxy.py > proxy.log 2>&1 &

# Wait for startup
sleep 3

# Check if Proxy is running
if pgrep -f nas-postgres-proxy.py > /dev/null; then
    echo "✅ Proxy started successfully"
    echo ""
    echo "Latest log entries:"
    tail -10 proxy.log
else
    echo "❌ Proxy failed to start"
    echo "Error log:"
    tail -20 proxy.log
    exit 1
fi
ENDSSH

echo ""
echo "Step 3: Verifying Proxy update..."

# Wait for Proxy to be fully ready
sleep 2

# Test /info endpoint to see if /query is listed
INFO_RESPONSE=$(curl -s https://postgres-ai-agent.shyangtsuen.xyz/info)

if echo "$INFO_RESPONSE" | grep -q "/query"; then
    echo "✅ Proxy updated successfully!"
    echo ""
    echo "Available endpoints:"
    echo "$INFO_RESPONSE" | python3 -m json.tool | grep -A 6 '"endpoints"'
else
    echo "⚠️  Warning: /query endpoint not found in /info response"
    echo "Response:"
    echo "$INFO_RESPONSE" | python3 -m json.tool
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Proxy Update Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Test /query endpoint: ./scripts/test-pgvector.sh"
echo "  2. Verify pgvector installation"
echo "  3. Run vector operations tests"
echo ""
