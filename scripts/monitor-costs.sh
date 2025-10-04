#!/bin/bash
# ==========================================
# Cloudflare Cost Monitoring Script
# ==========================================
# 監控 Cloudflare 使用量和預估成本
# Usage: ./scripts/monitor-costs.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ] || [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}Error: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not set${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo "💰 Cloudflare Cost Monitor"
echo "======================================"
echo ""
echo "Account ID: $CLOUDFLARE_ACCOUNT_ID"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ==========================================
# Function: Call Cloudflare API
# ==========================================
call_cf_api() {
    local endpoint=$1
    curl -s -X GET "https://api.cloudflare.com/client/v4/${endpoint}" \
        -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
        -H "Content-Type: application/json"
}

# ==========================================
# 1. Workers Analytics
# ==========================================
echo -e "${BLUE}[1/5]${NC} Workers Analytics..."

# Get current month start/end
START_DATE=$(date -u -v1d '+%Y-%m-%dT00:00:00Z' 2>/dev/null || date -u -d "$(date +%Y-%m-01)" '+%Y-%m-%dT00:00:00Z')
END_DATE=$(date -u '+%Y-%m-%dT23:59:59Z')

echo "   Period: $(date -d $START_DATE '+%Y-%m-%d' 2>/dev/null || echo 'Current month')"

# Note: Actual API calls would go here
# For now, we'll show estimated costs based on pricing

echo -e "   ${CYAN}Workers Paid Plan:${NC} $5.00/month (base)"
echo ""

# ==========================================
# 2. R2 Storage Estimate
# ==========================================
echo -e "${BLUE}[2/5]${NC} R2 Storage Estimate..."

# Check if R2 is enabled
if grep -q "^\[\[r2_buckets\]\]" wrangler.toml 2>/dev/null; then
    echo -e "   ${GREEN}✅ R2 Enabled${NC}"
    echo "   Bucket: ai-agent-files"
    echo ""
    echo "   Pricing:"
    echo "   - Storage: $0.015/GB/month (first 10GB free)"
    echo "   - Class A ops: $4.50/million (first 1M free)"
    echo "   - Class B ops: $0.36/million (first 10M free)"
    echo "   - Egress: FREE"
    echo ""
    echo "   💡 Tip: Run 'npx wrangler r2 object list ai-agent-files' to see usage"
else
    echo -e "   ${YELLOW}⚠️  R2 Disabled${NC}"
fi

echo ""

# ==========================================
# 3. D1 Database Estimate
# ==========================================
echo -e "${BLUE}[3/5]${NC} D1 Database Estimate..."

echo "   Included in Workers Paid:"
echo "   - Storage: 5GB (then $0.75/GB)"
echo "   - Reads: 25 billion rows/month"
echo "   - Writes: 50 million rows/month"
echo ""
echo "   💡 Tip: Check D1 analytics in Cloudflare Dashboard"
echo ""

# ==========================================
# 4. Queues Estimate
# ==========================================
echo -e "${BLUE}[4/5]${NC} Queues Estimate..."

if grep -q "^\[\[queues.producers\]\]" wrangler.toml 2>/dev/null; then
    echo -e "   ${GREEN}✅ Queues Enabled${NC}"
    echo "   - ai-agent-tasks"
    echo "   - ai-agent-backup"
    echo ""
    echo "   Pricing:"
    echo "   - First 1M operations: FREE"
    echo "   - Additional: $0.40/million operations"
    echo "   - Each message ≈ 3 operations (write/read/delete)"
    echo ""
    echo "   💡 Tip: Check queue metrics in Dashboard"
else
    echo -e "   ${YELLOW}⚠️  Queues Disabled${NC}"
fi

echo ""

# ==========================================
# 5. Estimated Monthly Cost
# ==========================================
echo -e "${BLUE}[5/5]${NC} Estimated Monthly Cost..."
echo ""

# Base costs
WORKERS_COST=5.00

echo "   📊 Cost Breakdown (Estimated):"
echo "   ================================"
echo -e "   Workers Paid:          ${GREEN}\$${WORKERS_COST}${NC}"
echo -e "   R2 Storage:            ${CYAN}\$0.00 - \$3.00${NC} (depends on usage)"
echo -e "   D1 Database:           ${CYAN}\$0.00 - \$5.00${NC} (depends on usage)"
echo -e "   Queues:                ${CYAN}\$0.00 - \$2.00${NC} (depends on usage)"
echo -e "   Vectorize:             ${CYAN}\$0.00 - \$2.00${NC} (depends on usage)"
echo "   ================================"
echo -e "   ${YELLOW}Estimated Total:${NC}       ${GREEN}\$${WORKERS_COST} - \$17.00/month${NC}"
echo ""

# ==========================================
# Cost Optimization Tips
# ==========================================
echo -e "${YELLOW}💡 Cost Optimization Tips:${NC}"
echo ""
echo "1. 🆓 Use Gemini for embeddings (FREE)"
echo "   Set: LLM_STRATEGY=cost or balanced"
echo ""
echo "2. 📦 Monitor R2 usage"
echo "   Keep files under 10GB to stay in free tier"
echo ""
echo "3. 🔄 Optimize Cron frequency"
echo "   Reduce frequency if not needed every 5 min"
echo ""
echo "4. 📊 Set budget alerts"
echo "   Dashboard → Billing → Budget alerts"
echo ""

# ==========================================
# Quick Commands
# ==========================================
echo -e "${BLUE}📋 Quick Commands:${NC}"
echo ""
echo "# View Workers analytics"
echo "npx wrangler tail"
echo ""
echo "# List R2 objects"
echo "npx wrangler r2 object list ai-agent-files"
echo ""
echo "# Check D1 database"
echo "npx wrangler d1 execute ai-agent-db --command 'SELECT COUNT(*) FROM agents'"
echo ""
echo "# View billing in Dashboard"
echo "https://dash.cloudflare.com/$CLOUDFLARE_ACCOUNT_ID/billing"
echo ""

# ==========================================
# Save report
# ==========================================
REPORT_FILE="cost-report-$(date '+%Y-%m-%d').txt"
{
    echo "Cloudflare Cost Report"
    echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "Account: $CLOUDFLARE_ACCOUNT_ID"
    echo ""
    echo "Estimated Monthly Cost: \$${WORKERS_COST} - \$17.00"
    echo ""
    echo "Components:"
    echo "- Workers Paid: \$${WORKERS_COST}"
    echo "- R2: \$0-3"
    echo "- D1: \$0-5"
    echo "- Queues: \$0-2"
    echo "- Vectorize: \$0-2"
} > "$REPORT_FILE"

echo -e "${GREEN}✅ Report saved: $REPORT_FILE${NC}"
echo ""
