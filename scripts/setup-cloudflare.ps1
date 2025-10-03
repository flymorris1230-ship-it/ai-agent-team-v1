# ==========================================
# Cloudflare Resources Setup Script (PowerShell)
# ==========================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 AI Agent Team - Cloudflare Resources Setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is installed
try {
    $null = Get-Command npx -ErrorAction Stop
} catch {
    Write-Host "❌ Error: npm/npx not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check for API token
if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "⚠️  Warning: CLOUDFLARE_API_TOKEN not set" -ForegroundColor Yellow
    Write-Host "Please set your Cloudflare API token:" -ForegroundColor Yellow
    Write-Host '  $env:CLOUDFLARE_API_TOKEN="your-token-here"' -ForegroundColor White
    Write-Host ""
    Write-Host "Get your token from: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host "📦 Step 1: Creating D1 Databases..." -ForegroundColor Green
Write-Host "-----------------------------------" -ForegroundColor Green

# Create production database
Write-Host "Creating production database..."
$prodDbOutput = npx wrangler d1 create ai-agent-db 2>&1 | Out-String
Write-Host $prodDbOutput

# Extract database ID from output
$prodDbId = ""
if ($prodDbOutput -match 'database_id = "([^"]+)"') {
    $prodDbId = $matches[1]
    Write-Host "✅ Production database created: $prodDbId" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not extract production database ID. Please check output above." -ForegroundColor Yellow
}

Write-Host ""

# Create development database
Write-Host "Creating development database..."
$devDbOutput = npx wrangler d1 create ai-agent-db-dev 2>&1 | Out-String
Write-Host $devDbOutput

$devDbId = ""
if ($devDbOutput -match 'database_id = "([^"]+)"') {
    $devDbId = $matches[1]
    Write-Host "✅ Development database created: $devDbId" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not extract development database ID. Please check output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 Step 2: Initializing Database Schemas..." -ForegroundColor Green
Write-Host "-------------------------------------------" -ForegroundColor Green

if ($prodDbId) {
    Write-Host "Initializing production database schema..."
    npx wrangler d1 execute ai-agent-db --file=src/main/js/database/schema.sql
    Write-Host "✅ Production schema initialized" -ForegroundColor Green
} else {
    Write-Host "⚠️  Skipping production schema initialization (no database ID)" -ForegroundColor Yellow
}

Write-Host ""

if ($devDbId) {
    Write-Host "Initializing development database schema..."
    npx wrangler d1 execute ai-agent-db-dev --file=src/main/js/database/schema.sql --env development
    Write-Host "✅ Development schema initialized" -ForegroundColor Green
} else {
    Write-Host "⚠️  Skipping development schema initialization (no database ID)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔍 Step 3: Creating Vectorize Index..." -ForegroundColor Green
Write-Host "---------------------------------------" -ForegroundColor Green

$vectorizeOutput = npx wrangler vectorize create ai-agent-vectors --dimensions=1536 --metric=cosine 2>&1 | Out-String
Write-Host $vectorizeOutput

if ($vectorizeOutput -match "Successfully created") {
    Write-Host "✅ Vectorize index created" -ForegroundColor Green
} else {
    Write-Host "⚠️  Vectorize index may already exist or creation failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🪣 Step 4: Creating R2 Bucket..." -ForegroundColor Green
Write-Host "---------------------------------" -ForegroundColor Green

$r2Output = npx wrangler r2 bucket create ai-agent-files 2>&1 | Out-String
Write-Host $r2Output

if ($r2Output -match "Created bucket") {
    Write-Host "✅ R2 bucket created" -ForegroundColor Green
} else {
    Write-Host "⚠️  R2 bucket may already exist or creation failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💾 Step 5: Creating KV Namespace..." -ForegroundColor Green
Write-Host "------------------------------------" -ForegroundColor Green

$kvOutput = npx wrangler kv:namespace create CACHE 2>&1 | Out-String
Write-Host $kvOutput

$kvId = ""
if ($kvOutput -match 'id = "([^"]+)"') {
    $kvId = $matches[1]
    Write-Host "✅ KV namespace created: $kvId" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not extract KV namespace ID. Please check output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📬 Step 6: Creating Queues..." -ForegroundColor Green
Write-Host "------------------------------" -ForegroundColor Green

Write-Host "Creating task queue..."
$taskQueueOutput = npx wrangler queues create ai-agent-tasks 2>&1 | Out-String
Write-Host $taskQueueOutput

Write-Host ""
Write-Host "Creating backup queue..."
$backupQueueOutput = npx wrangler queues create ai-agent-backups 2>&1 | Out-String
Write-Host $backupQueueOutput

if ($taskQueueOutput -match "Created") {
    Write-Host "✅ Task queue created" -ForegroundColor Green
}

if ($backupQueueOutput -match "Created") {
    Write-Host "✅ Backup queue created" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Step 7: Configuration Summary" -ForegroundColor Cyan
Write-Host "---------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please update your wrangler.toml with the following values:" -ForegroundColor White
Write-Host ""

if ($prodDbId) {
    Write-Host "Production Database ID (line 16):" -ForegroundColor Yellow
    Write-Host "  database_id = `"$prodDbId`"" -ForegroundColor White
    Write-Host ""
}

if ($devDbId) {
    Write-Host "Development Database ID (line 66):" -ForegroundColor Yellow
    Write-Host "  database_id = `"$devDbId`"" -ForegroundColor White
    Write-Host ""
}

if ($kvId) {
    Write-Host "KV Namespace ID (line 31):" -ForegroundColor Yellow
    Write-Host "  id = `"$kvId`"" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update wrangler.toml with the IDs shown above" -ForegroundColor White
Write-Host "2. Run 'npm run dev' to start local development" -ForegroundColor White
Write-Host "3. Run 'npm run deploy' to deploy to Cloudflare" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see docs/setup-guide.md" -ForegroundColor White
