#!/bin/bash
# ==========================================
# Quick Deployment Script
# ==========================================
# 一鍵部署到 Cloudflare Workers
# Usage: ./scripts/quick-deploy.sh [environment]
#   environment: development | staging | production (default: production)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get environment argument
ENV=${1:-production}

echo ""
echo "======================================"
echo "🚀 Quick Deployment Script"
echo "======================================"
echo ""
echo -e "Target Environment: ${CYAN}$ENV${NC}"
echo ""

# ==========================================
# Step 1: Pre-deployment Check
# ==========================================
echo -e "${BLUE}[Step 1/5]${NC} Running pre-deployment checks..."
echo ""

if [ -f "scripts/pre-deployment-check.sh" ]; then
    if ./scripts/pre-deployment-check.sh; then
        echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
    else
        echo -e "${RED}❌ Pre-deployment checks failed${NC}"
        echo ""
        echo "Please fix the issues and try again."
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Pre-deployment check script not found, skipping...${NC}"
fi

echo ""

# ==========================================
# Step 2: TypeScript Compilation
# ==========================================
echo -e "${BLUE}[Step 2/5]${NC} Compiling TypeScript..."
echo ""

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript compiled successfully${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    npm run build
    exit 1
fi

echo ""

# ==========================================
# Step 3: Run Tests (optional)
# ==========================================
echo -e "${BLUE}[Step 3/5]${NC} Running tests..."
echo ""

# Uncomment if you want to run tests before deployment
# if npm test; then
#     echo -e "${GREEN}✅ All tests passed${NC}"
# else
#     echo -e "${RED}❌ Tests failed${NC}"
#     exit 1
# fi

echo -e "${CYAN}ℹ️  Tests skipped (run manually: npm test)${NC}"
echo ""

# ==========================================
# Step 4: Deploy to Cloudflare
# ==========================================
echo -e "${BLUE}[Step 4/5]${NC} Deploying to Cloudflare Workers..."
echo ""

case $ENV in
    development)
        DEPLOY_CMD="npm run deploy"
        ;;
    staging)
        DEPLOY_CMD="npm run deploy:staging"
        ;;
    production)
        DEPLOY_CMD="npm run deploy:production"
        ;;
    *)
        echo -e "${RED}Error: Invalid environment '$ENV'${NC}"
        echo "Valid options: development, staging, production"
        exit 1
        ;;
esac

echo "Running: $DEPLOY_CMD"
echo ""

if $DEPLOY_CMD; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""

# ==========================================
# Step 5: Post-deployment Verification
# ==========================================
echo -e "${BLUE}[Step 5/5]${NC} Post-deployment verification..."
echo ""

# Get deployed URL
if [ "$ENV" = "production" ]; then
    WORKER_URL="https://api.shyangtsuen.xyz"
elif [ "$ENV" = "staging" ]; then
    WORKER_URL="https://api-staging.shyangtsuen.xyz"
else
    WORKER_URL="https://ai-agent-team.your-subdomain.workers.dev"
fi

echo "Testing health endpoint: $WORKER_URL/health"
echo ""

# Try to curl the health endpoint
if command -v curl &> /dev/null; then
    if curl -s -f "$WORKER_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed or endpoint not ready yet${NC}"
        echo "   This is normal if it's the first deployment."
    fi
else
    echo -e "${YELLOW}⚠️  curl not found, skipping health check${NC}"
fi

echo ""

# ==========================================
# Summary
# ==========================================
echo "======================================"
echo "📊 Deployment Summary"
echo "======================================"
echo ""
echo -e "Environment:    ${CYAN}$ENV${NC}"
echo -e "Worker URL:     ${CYAN}$WORKER_URL${NC}"
echo -e "Status:         ${GREEN}✅ Deployed${NC}"
echo ""

# ==========================================
# Next Steps
# ==========================================
echo -e "${YELLOW}🎯 Next Steps:${NC}"
echo ""
echo "1. Monitor logs:"
echo "   npx wrangler tail"
echo ""
echo "2. Test API endpoints:"
echo "   curl $WORKER_URL/health"
echo "   curl $WORKER_URL/api/v1/agents"
echo ""
echo "3. Check Cron Triggers:"
echo "   Wait 5 minutes and check logs for sync activity"
echo ""
echo "4. Monitor costs:"
echo "   ./scripts/monitor-costs.sh"
echo ""
echo "5. View in Dashboard:"
echo "   https://dash.cloudflare.com"
echo ""

# Save deployment log
DEPLOY_LOG="deployment-$(date '+%Y-%m-%d-%H%M%S').log"
{
    echo "Deployment Log"
    echo "=============="
    echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Environment: $ENV"
    echo "Worker URL: $WORKER_URL"
    echo "Status: Success"
} > "$DEPLOY_LOG"

echo -e "${GREEN}✅ Deployment log saved: $DEPLOY_LOG${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
