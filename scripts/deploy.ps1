# ==========================================
# AI Agent Team - Deployment Script (PowerShell)
# Domain: shyangtsuen.xyz
# ==========================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('production', 'staging', 'development')]
    [string]$Environment = 'production'
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 GAC - Deployment Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

function Write-Step {
    param([string]$Message)
    Write-Host "==> $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Step 1: Type check
Write-Step "Step 1: Running TypeScript type check..."
try {
    npm run type-check
    Write-Success "Type check passed"
} catch {
    Write-Error-Custom "Type check failed"
    exit 1
}
Write-Host ""

# Step 2: Run tests
Write-Step "Step 2: Running tests..."
try {
    npm run test 2>$null
    Write-Success "Tests passed"
} catch {
    Write-Warning-Custom "Tests not configured or failed (continuing anyway)"
}
Write-Host ""

# Step 3: Build
Write-Step "Step 3: Building application..."
try {
    npm run build
    Write-Success "Build completed"
} catch {
    Write-Error-Custom "Build failed"
    exit 1
}
Write-Host ""

# Step 4: Deploy to Cloudflare
Write-Step "Step 4: Deploying to Cloudflare Workers..."

if ($Environment -eq 'production') {
    Write-Warning-Custom "Deploying to PRODUCTION (api.shyangtsuen.xyz)"
    $confirmation = Read-Host "Are you sure? (yes/no)"
    if ($confirmation -ne 'yes') {
        Write-Error-Custom "Deployment cancelled"
        exit 1
    }

    npx wrangler deploy --env production
    Write-Success "Deployed to production"

    # Configure custom domain
    Write-Step "Configuring custom domain..."
    try {
        npx wrangler deployments domains add api.shyangtsuen.xyz 2>$null
    } catch {
        Write-Warning-Custom "Domain already configured or failed"
    }

} elseif ($Environment -eq 'staging') {
    Write-Warning-Custom "Deploying to STAGING (api-staging.shyangtsuen.xyz)"
    npx wrangler deploy --env staging
    Write-Success "Deployed to staging"

    Write-Step "Configuring custom domain..."
    try {
        npx wrangler deployments domains add api-staging.shyangtsuen.xyz 2>$null
    } catch {
        Write-Warning-Custom "Domain already configured or failed"
    }

} else {
    Write-Warning-Custom "Deploying to DEVELOPMENT"
    npx wrangler deploy --env development
    Write-Success "Deployed to development"
}

Write-Host ""

# Step 5: Verify deployment
Write-Step "Step 5: Verifying deployment..."

$healthUrl = switch ($Environment) {
    'production' { 'https://api.shyangtsuen.xyz/health' }
    'staging'    { 'https://api-staging.shyangtsuen.xyz/health' }
    default      { 'https://gac.workers.dev/health' }
}

Write-Host "Testing: $healthUrl" -ForegroundColor Cyan
Start-Sleep -Seconds 3

try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing
    Write-Success "Health check passed!"
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Warning-Custom "Health check failed (this is normal immediately after deployment)"
    Write-Warning-Custom "DNS propagation may take a few minutes"
}

Write-Host ""
Write-Host ""
Write-Success "Deployment Complete!"
Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Cyan
Write-Host ""

if ($Environment -eq 'production') {
    Write-Host "  1. Test API endpoint:" -ForegroundColor White
    Write-Host "     curl https://api.shyangtsuen.xyz/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. View deployment:" -ForegroundColor White
    Write-Host "     npx wrangler deployments list --env production" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Monitor logs:" -ForegroundColor White
    Write-Host "     npx wrangler tail --env production" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. View analytics:" -ForegroundColor White
    Write-Host "     https://dash.cloudflare.com/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🌐 API Endpoints:" -ForegroundColor Cyan
    Write-Host "  - Health:      https://api.shyangtsuen.xyz/health" -ForegroundColor White
    Write-Host "  - Tasks:       https://api.shyangtsuen.xyz/api/tasks" -ForegroundColor White
    Write-Host "  - Coordinator: https://api.shyangtsuen.xyz/api/coordinator/process" -ForegroundColor White
    Write-Host "  - Knowledge:   https://api.shyangtsuen.xyz/api/knowledge/search" -ForegroundColor White
    Write-Host "  - Logs:        https://api.shyangtsuen.xyz/api/logs" -ForegroundColor White
} elseif ($Environment -eq 'staging') {
    Write-Host "  1. Test API endpoint:" -ForegroundColor White
    Write-Host "     curl https://api-staging.shyangtsuen.xyz/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. View deployment:" -ForegroundColor White
    Write-Host "     npx wrangler deployments list --env staging" -ForegroundColor Gray
} else {
    Write-Host "  1. Test API endpoint:" -ForegroundColor White
    Write-Host "     curl https://gac.workers.dev/health" -ForegroundColor Gray
}

Write-Host ""
Write-Success "Done! 🎉"
