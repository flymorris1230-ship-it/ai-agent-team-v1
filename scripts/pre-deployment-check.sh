#!/bin/bash
# ==========================================
# Pre-Deployment Checklist Script
# ==========================================
# 部署前完整檢查，確保所有配置正確
# Usage: ./scripts/pre-deployment-check.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "======================================"
echo "🚀 Pre-Deployment Checklist"
echo "======================================"
echo ""

# Track overall status
ERRORS=0
WARNINGS=0

# ==========================================
# 1. Environment Variables Check
# ==========================================
echo -e "${BLUE}[1/7]${NC} Checking Environment Variables..."

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "   Run: cp .env.example .env"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ .env file exists${NC}"

    # Check required variables
    REQUIRED_VARS=(
        "OPENAI_API_KEY"
        "GEMINI_API_KEY"
        "CLOUDFLARE_API_TOKEN"
        "CLOUDFLARE_ACCOUNT_ID"
        "JWT_SECRET"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=.\+" .env 2>/dev/null; then
            echo -e "   ${GREEN}✅${NC} $var configured"
        else
            echo -e "   ${YELLOW}⚠️${NC}  $var not configured"
            WARNINGS=$((WARNINGS + 1))
        fi
    done
fi

echo ""

# ==========================================
# 2. TypeScript Compilation Check
# ==========================================
echo -e "${BLUE}[2/7]${NC} Checking TypeScript Compilation..."

if npm run typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    echo "   Run: npm run typecheck"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==========================================
# 3. Dependencies Check
# ==========================================
echo -e "${BLUE}[3/7]${NC} Checking Dependencies..."

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules exists${NC}"
else
    echo -e "${RED}❌ node_modules not found${NC}"
    echo "   Run: npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check for outdated packages
OUTDATED=$(npm outdated 2>/dev/null | wc -l | tr -d ' ')
if [ "$OUTDATED" -gt 1 ]; then
    echo -e "   ${YELLOW}⚠️${NC}  $((OUTDATED - 1)) outdated packages found"
    echo "   Run: npm outdated"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ==========================================
# 4. Cloudflare Configuration Check
# ==========================================
echo -e "${BLUE}[4/7]${NC} Checking Cloudflare Configuration..."

# Check wrangler.toml
if [ -f "wrangler.toml" ]; then
    echo -e "${GREEN}✅ wrangler.toml exists${NC}"

    # Check Cron Triggers
    if grep -q "^\[triggers\]" wrangler.toml; then
        echo -e "   ${GREEN}✅${NC} Cron Triggers enabled"
    else
        echo -e "   ${YELLOW}⚠️${NC}  Cron Triggers disabled (using NAS cron)"
    fi

    # Check R2 Buckets
    if grep -q "^\[\[r2_buckets\]\]" wrangler.toml; then
        echo -e "   ${GREEN}✅${NC} R2 Storage enabled"
    else
        echo -e "   ${YELLOW}⚠️${NC}  R2 Storage disabled"
    fi

    # Check Queues
    if grep -q "^\[\[queues.producers\]\]" wrangler.toml; then
        echo -e "   ${GREEN}✅${NC} Queues enabled"
    else
        echo -e "   ${YELLOW}⚠️${NC}  Queues disabled"
    fi
else
    echo -e "${RED}❌ wrangler.toml not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==========================================
# 5. Database Schema Check
# ==========================================
echo -e "${BLUE}[5/7]${NC} Checking Database Schema..."

if [ -f "scripts/schema.sql" ]; then
    echo -e "${GREEN}✅ Database schema file exists${NC}"

    # Count tables
    TABLE_COUNT=$(grep -c "CREATE TABLE" scripts/schema.sql)
    echo -e "   ${GREEN}✅${NC} $TABLE_COUNT tables defined"
else
    echo -e "${RED}❌ Database schema not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ==========================================
# 6. Test Suite Check
# ==========================================
echo -e "${BLUE}[6/7]${NC} Checking Test Suite..."

# Count test files
TEST_COUNT=$(find src -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
echo -e "   ${GREEN}✅${NC} $TEST_COUNT test files found"

# Try to run tests (optional, can be slow)
# if npm test > /dev/null 2>&1; then
#     echo -e "${GREEN}✅ All tests passed${NC}"
# else
#     echo -e "${YELLOW}⚠️  Some tests failed or skipped${NC}"
#     WARNINGS=$((WARNINGS + 1))
# fi

echo ""

# ==========================================
# 7. Documentation Check
# ==========================================
echo -e "${BLUE}[7/7]${NC} Checking Documentation..."

DOCS=(
    "README.md"
    "COST-ANALYSIS.md"
    "PROJECT-CONTINUATION.md"
    "docs/multi-llm-guide.md"
    "docs/cloudflare-paid-deployment.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "   ${GREEN}✅${NC} $doc"
    else
        echo -e "   ${YELLOW}⚠️${NC}  $doc missing"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""
echo "======================================"
echo "📊 Summary"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Ensure Cloudflare Dashboard setup is complete"
    echo "  2. Run: npm run deploy"
    echo "  3. Monitor: npx wrangler tail"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warnings found${NC}"
    echo ""
    echo "You can proceed with deployment, but review warnings above."
    exit 0
else
    echo -e "${RED}❌ $ERRORS errors found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warnings found${NC}"
    fi
    echo ""
    echo "Please fix errors before deployment."
    exit 1
fi
