# 🚀 Cloudflare Setup Guide - AI Agent Team v1

**Status**: Ready for Cloudflare configuration
**Prerequisites**: ✅ API Keys configured, ✅ Wrangler v4 installed
**Time Required**: ~15 minutes
**Cost**: $5/month base + usage

---

## 📋 Setup Checklist

- [ ] Step 1: Authenticate with Cloudflare
- [ ] Step 2: Upgrade to Workers Paid Plan ($5/month)
- [ ] Step 3: Create D1 Production Database
- [ ] Step 4: Create R2 Bucket
- [ ] Step 5: Create Queues (2 queues)
- [ ] Step 6: Create Vectorize Index
- [ ] Step 7: Update Configuration
- [ ] Step 8: Deploy Schema to Production
- [ ] Step 9: Deploy Workers Application
- [ ] Step 10: Verify Deployment

---

## Step 1: Authenticate with Cloudflare

```bash
# Login to Cloudflare (opens browser)
npx wrangler login

# Verify authentication
npx wrangler whoami

# Expected output:
# 👋 You are logged in with an API Token, associated with the email '<your-email>'.
# ┌───────────────────┬──────────────────────────────────┐
# │ Account Name      │ Account ID                       │
# ├───────────────────┼──────────────────────────────────┤
# │ <Your Account>    │ <your-account-id>                │
# └───────────────────┴──────────────────────────────────┘
```

**✏️ ACTION**: Copy your `Account ID` - you'll need it in Step 7

---

## Step 2: Upgrade to Workers Paid Plan

### Via Dashboard (Recommended)

1. **Go to**: https://dash.cloudflare.com/
2. **Navigate**: Workers & Pages → Plans
3. **Select**: "Workers Paid" plan
4. **Cost**: $5/month base
   - Includes 10M requests/month
   - Additional requests: $0.50/million
5. **Bind credit card** and confirm

### Benefits You Get:
- ✅ Cron Triggers (automated scheduling)
- ✅ Queues (async task processing)
- ✅ Increased CPU time (50s vs 10ms)
- ✅ R2 Storage (10GB free storage)
- ✅ WebSockets support
- ✅ Durable Objects (future use)

**⚠️ Important**: Set a budget alert to avoid surprises!

### Set Budget Alert

1. **Go to**: Dashboard → Billing → Budget alerts
2. **Set alert at**: $20/month (recommended)
3. **Set hard limit**: $50/month (optional)

---

## Step 3: Create D1 Production Database

```bash
# Create production database
npx wrangler d1 create ai-agent-db-prod

# Expected output:
# ✅ Successfully created DB 'ai-agent-db-prod'!
#
# [[d1_databases]]
# binding = "DB"
# database_name = "ai-agent-db-prod"
# database_id = "<your-database-id>"
```

**✏️ ACTION**: Copy the `database_id` - you'll need it in Step 7

---

## Step 4: Create R2 Bucket

```bash
# Create R2 bucket for file storage
npx wrangler r2 bucket create ai-agent-files

# Verify creation
npx wrangler r2 bucket list

# Expected output:
# ┌──────────────────┬──────────────────────────┐
# │ Name             │ Creation Date            │
# ├──────────────────┼──────────────────────────┤
# │ ai-agent-files   │ 2025-10-05               │
# └──────────────────┴──────────────────────────┘
```

### R2 Pricing (Very Cheap!)
- **Storage**: $0.015/GB per month
- **Class A Operations** (write): $4.50/million
- **Class B Operations** (read): $0.36/million
- **Egress**: ✅ **FREE** (unlike S3!)

**Estimated cost**: $0.50-$2/month for typical usage

---

## Step 5: Create Queues

```bash
# Create task queue
npx wrangler queues create ai-agent-tasks

# Create backup queue
npx wrangler queues create ai-agent-backup

# Verify creation
npx wrangler queues list

# Expected output:
# ┌────────────────────┬──────────────────────────┐
# │ Name               │ Created                  │
# ├────────────────────┼──────────────────────────┤
# │ ai-agent-tasks     │ 2025-10-05               │
# │ ai-agent-backup    │ 2025-10-05               │
# └────────────────────┴──────────────────────────┘
```

### Queue Pricing
- **Operations**: $0.40/million
- **First 1M operations/month**: FREE
- **Estimated cost**: $0-$1/month

---

## Step 6: Create Vectorize Index

```bash
# Create vector index for RAG system
npx wrangler vectorize create ai-agent-vectors \
  --dimensions=768 \
  --metric=cosine

# Verify creation
npx wrangler vectorize list

# Expected output:
# ┌────────────────────┬────────────┬────────┐
# │ Name               │ Dimensions │ Metric │
# ├────────────────────┼────────────┼────────┤
# │ ai-agent-vectors   │ 768        │ cosine │
# └────────────────────┴────────────┴────────┘
```

**Note**: Using 768 dimensions for Gemini embeddings (free tier)

### Vectorize Pricing
- **Storage**: Free (beta)
- **Queries**: $0.04/million
- **Estimated cost**: $0-$0.50/month

---

## Step 7: Update Configuration Files

### 7.1 Update `wrangler.toml`

Find and replace the following in `wrangler.toml`:

```toml
# Line 121 - Update production database ID
[[env.production.d1_databases]]
binding = "DB"
database_name = "ai-agent-db-prod"
database_id = "<paste-your-prod-database-id-here>"  # ← From Step 3
```

### 7.2 Update `.dev.vars` (local development)

Create `.dev.vars` file for local secrets (not committed to git):

```bash
# Create .dev.vars file
cat > .dev.vars << 'EOF'
OPENAI_API_KEY=sk-proj-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here
LLM_STRATEGY=balanced
USE_LLM_ROUTER=true
EOF
```

### 7.3 Set Production Secrets

```bash
# Set OpenAI API key (use your actual key from .env)
echo "your-openai-key-here" | \
  npx wrangler secret put OPENAI_API_KEY --env production

# Set Gemini API key (use your actual key from .env)
echo "your-gemini-key-here" | \
  npx wrangler secret put GEMINI_API_KEY --env production

# Set LLM strategy
echo "balanced" | \
  npx wrangler secret put LLM_STRATEGY --env production

# Enable LLM router
echo "true" | \
  npx wrangler secret put USE_LLM_ROUTER --env production
```

---

## Step 8: Deploy Schema to Production

```bash
# Deploy database schema to production D1
npx wrangler d1 execute ai-agent-db-prod \
  --file=scripts/schema.sql \
  --remote

# Expected output:
# 🌀 Executing on ai-agent-db-prod (production):
# 🚣 Executed 45 commands in 1.234s

# Seed 9 AI agents
npx wrangler d1 execute ai-agent-db-prod \
  --file=scripts/seed-agents.sql \
  --remote

# Verify agents deployed
npx wrangler d1 execute ai-agent-db-prod \
  --command "SELECT id, name, role FROM agents;" \
  --remote

# Expected: 9 agents listed
```

---

## Step 9: Deploy Workers Application

### 9.1 Pre-deployment Check

```bash
# TypeScript compilation check
npm run typecheck

# Expected: ✅ No errors

# Run tests
npm test

# Expected: 33/52 passing (PostgreSQL tests can fail - optional)
```

### 9.2 Deploy to Production

```bash
# Deploy to production environment
npx wrangler deploy --env production

# Expected output:
# Total Upload: XX.XX KiB / gzip: XX.XX KiB
# Uploaded ai-agent-team-prod (X.XX sec)
# Published ai-agent-team-prod (X.XX sec)
#   https://ai-agent-team-prod.<your-subdomain>.workers.dev
# Current Deployment ID: <deployment-id>
```

**✏️ ACTION**: Copy the deployment URL - test it in next step

---

## Step 10: Verify Deployment

### 10.1 Health Check

```bash
# Replace with your actual deployment URL
DEPLOY_URL="https://ai-agent-team-prod.<your-subdomain>.workers.dev"

# Test health endpoint
curl "$DEPLOY_URL/api/health"

# Expected output:
# {
#   "status": "healthy",
#   "timestamp": 1696512000000,
#   "environment": "production",
#   "database": "connected",
#   "llm_providers": {
#     "openai": "healthy",
#     "gemini": "healthy"
#   }
# }
```

### 10.2 Test Agents Endpoint

```bash
# List all agents
curl "$DEPLOY_URL/api/agents"

# Expected: 9 agents returned
```

### 10.3 Verify Cron Triggers

```bash
# Check cron trigger logs (wait 5 minutes after deployment)
npx wrangler tail --env production

# Look for scheduled executions:
# [2025-10-05 12:05:00] "GET /scheduled" 200 OK
```

### 10.4 Test R2 Upload (Optional)

```bash
# Test file upload via API
# (Requires authentication - implement in next phase)
```

---

## 🎉 Deployment Complete!

### ✅ What's Working Now:

- ✅ **Workers**: Production API deployed
- ✅ **D1 Database**: Schema + 9 agents deployed
- ✅ **R2 Storage**: Bucket ready for files
- ✅ **Queues**: Task and backup queues active
- ✅ **Vectorize**: Vector index ready for RAG
- ✅ **Cron Triggers**: Automated scheduling active
- ✅ **Multi-LLM**: Cost-optimized routing enabled

### 📊 Expected Monthly Costs:

**Minimal Usage** (development/testing):
- Workers Paid: $5.00
- R2 Storage: $0.50
- Queues: $0.00 (within free tier)
- Vectorize: $0.00 (beta)
- LLM APIs: $0-2 (mostly Gemini free tier)
- **Total**: $5.50-7/month

**Moderate Usage** (small production):
- Workers: $5.00 + $1-2 overflow
- R2: $1-2
- Queues: $0.50
- Vectorize: $0.50
- LLM APIs: $2-5
- **Total**: $10-15/month

**Heavy Usage**:
- Workers: $5.00 + $5-10
- R2: $3-5
- Queues: $1-2
- Vectorize: $1-2
- LLM APIs: $5-15
- **Total**: $20-40/month

### 🔗 Custom Domain Setup (Optional)

If you want to use `api.shyangtsuen.xyz`:

```bash
# Add custom domain route
npx wrangler deployments domains add api.shyangtsuen.xyz --env production

# Verify DNS
dig api.shyangtsuen.xyz
```

---

## 📝 Maintenance Commands

```bash
# View production logs
npx wrangler tail --env production

# View database
npx wrangler d1 execute ai-agent-db-prod \
  --command "SELECT COUNT(*) FROM tasks;" \
  --remote

# List R2 files
npx wrangler r2 object list ai-agent-files

# Check queue metrics
npx wrangler queues list

# Rollback deployment (if needed)
npx wrangler rollback --env production
```

---

## 🆘 Troubleshooting

### Issue: "Invalid account ID"
**Solution**: Update `wrangler.toml` and `.env` with your actual account ID from Step 1

### Issue: "Queues not available"
**Solution**: Ensure you're on Workers Paid plan (Step 2)

### Issue: "Database not found"
**Solution**: Double-check `database_id` in `wrangler.toml` matches output from Step 3

### Issue: "Cron triggers not running"
**Solution**:
- Check logs: `npx wrangler tail --env production`
- Verify paid plan is active
- Wait 5 minutes after deployment

### Issue: "High costs"
**Solution**:
- Check usage: Cloudflare Dashboard → Analytics
- Verify LLM strategy is "balanced" (using Gemini free tier)
- Review budget alerts
- Consider switching to "cost" strategy (100% Gemini)

---

## 📚 Additional Resources

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **D1 Database**: https://developers.cloudflare.com/d1/
- **R2 Storage**: https://developers.cloudflare.com/r2/
- **Queues**: https://developers.cloudflare.com/queues/
- **Vectorize**: https://developers.cloudflare.com/vectorize/

---

**🎯 Ready to deploy? Follow the steps above in order!**

**Questions? Check `SESSION-STATUS.md` for current system status.**
