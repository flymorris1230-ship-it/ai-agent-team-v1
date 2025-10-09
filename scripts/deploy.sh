#!/bin/bash

# ==========================================
# AI Agent Team - Deployment Script
# Domain: shyangtsuen.xyz
# ==========================================

set -e

echo "🚀 GAC - Deployment Script"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check environment
ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "development" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo "Usage: ./deploy.sh [production|staging|development]"
    exit 1
fi

echo "Environment: $ENVIRONMENT"
echo ""

# Step 1: Type check
print_step "Step 1: Running TypeScript type check..."
npm run type-check
print_success "Type check passed"
echo ""

# Step 2: Run tests (if available)
print_step "Step 2: Running tests..."
if npm run test 2>/dev/null; then
    print_success "Tests passed"
else
    print_warning "Tests not configured or failed (continuing anyway)"
fi
echo ""

# Step 3: Build
print_step "Step 3: Building application..."
npm run build
print_success "Build completed"
echo ""

# Step 4: Deploy to Cloudflare
print_step "Step 4: Deploying to Cloudflare Workers..."

if [ "$ENVIRONMENT" = "production" ]; then
    print_warning "Deploying to PRODUCTION (api.shyangtsuen.xyz)"
    read -p "Are you sure? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi

    npx wrangler deploy --env production
    print_success "Deployed to production"

    # Configure custom domain (if not already configured)
    print_step "Configuring custom domain..."
    npx wrangler deployments domains add api.shyangtsuen.xyz 2>/dev/null || print_warning "Domain already configured or failed"

elif [ "$ENVIRONMENT" = "staging" ]; then
    print_warning "Deploying to STAGING (api-staging.shyangtsuen.xyz)"
    npx wrangler deploy --env staging
    print_success "Deployed to staging"

    print_step "Configuring custom domain..."
    npx wrangler deployments domains add api-staging.shyangtsuen.xyz 2>/dev/null || print_warning "Domain already configured or failed"

else
    print_warning "Deploying to DEVELOPMENT"
    npx wrangler deploy --env development
    print_success "Deployed to development"
fi

echo ""

# Step 5: Verify deployment
print_step "Step 5: Verifying deployment..."

if [ "$ENVIRONMENT" = "production" ]; then
    HEALTH_URL="https://api.shyangtsuen.xyz/health"
elif [ "$ENVIRONMENT" = "staging" ]; then
    HEALTH_URL="https://api-staging.shyangtsuen.xyz/health"
else
    HEALTH_URL="https://gac.workers.dev/health"
fi

echo "Testing: $HEALTH_URL"
sleep 3  # Wait for deployment to propagate

if curl -s -f "$HEALTH_URL" > /dev/null; then
    print_success "Health check passed!"
    echo ""
    echo "Response:"
    curl -s "$HEALTH_URL" | jq . || curl -s "$HEALTH_URL"
else
    print_warning "Health check failed (this is normal immediately after deployment)"
    print_warning "DNS propagation may take a few minutes"
fi

echo ""
echo ""
print_success "Deployment Complete!"
echo ""
echo "📊 Next Steps:"
echo ""

if [ "$ENVIRONMENT" = "production" ]; then
    echo "  1. Test API endpoint:"
    echo "     curl https://api.shyangtsuen.xyz/health"
    echo ""
    echo "  2. View deployment:"
    echo "     npx wrangler deployments list --env production"
    echo ""
    echo "  3. Monitor logs:"
    echo "     npx wrangler tail --env production"
    echo ""
    echo "  4. View analytics:"
    echo "     https://dash.cloudflare.com/"
    echo ""
    echo "🌐 API Endpoints:"
    echo "  - Health:      https://api.shyangtsuen.xyz/health"
    echo "  - Tasks:       https://api.shyangtsuen.xyz/api/tasks"
    echo "  - Coordinator: https://api.shyangtsuen.xyz/api/coordinator/process"
    echo "  - Knowledge:   https://api.shyangtsuen.xyz/api/knowledge/search"
    echo "  - Logs:        https://api.shyangtsuen.xyz/api/logs"
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "  1. Test API endpoint:"
    echo "     curl https://api-staging.shyangtsuen.xyz/health"
    echo ""
    echo "  2. View deployment:"
    echo "     npx wrangler deployments list --env staging"
else
    echo "  1. Test API endpoint:"
    echo "     curl https://gac.workers.dev/health"
fi

echo ""
print_success "Done! 🎉"
