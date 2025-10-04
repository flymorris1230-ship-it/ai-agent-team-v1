# 🚀 Quick Deployment Guide - 5 Minutes

**TL;DR**: Follow these commands to deploy in 5 minutes!

---

## ⚡ Fast Track (If Already Set Up)

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Deploy to production
npx wrangler deploy --env production

# 3. Deploy database schema
npx wrangler d1 execute ai-agent-db-prod --file=scripts/schema.sql --remote
npx wrangler d1 execute ai-agent-db-prod --file=scripts/seed-agents.sql --remote

# 4. Test deployment
curl https://ai-agent-team-prod.<your-subdomain>.workers.dev/api/health
```

**Done!** ✅

---

## 🆕 First Time Setup

### Step 1: Authenticate (30 seconds)

```bash
npx wrangler login
```

### Step 2: Upgrade to Paid Plan ($5/month)

Go to: https://dash.cloudflare.com/ → Workers & Pages → Plans → "Workers Paid"

### Step 3: Create Resources (2 minutes)

```bash
# Create production database
npx wrangler d1 create ai-agent-db-prod
# ✏️ Copy the database_id

# Create R2 bucket
npx wrangler r2 bucket create ai-agent-files

# Create queues
npx wrangler queues create ai-agent-tasks
npx wrangler queues create ai-agent-backup

# Create vector index
npx wrangler vectorize create ai-agent-vectors --dimensions=768 --metric=cosine
```

### Step 4: Update Config (1 minute)

Edit `wrangler.toml` line 121:
```toml
database_id = "<paste-your-database-id-here>"
```

### Step 5: Set Secrets (1 minute)

```bash
# Use your actual API keys from .env file
echo "your-openai-key-here" | npx wrangler secret put OPENAI_API_KEY --env production
echo "your-gemini-key-here" | npx wrangler secret put GEMINI_API_KEY --env production
echo "balanced" | npx wrangler secret put LLM_STRATEGY --env production
echo "true" | npx wrangler secret put USE_LLM_ROUTER --env production
```

### Step 6: Deploy (1 minute)

```bash
# Deploy application
npx wrangler deploy --env production

# Deploy database
npx wrangler d1 execute ai-agent-db-prod --file=scripts/schema.sql --remote
npx wrangler d1 execute ai-agent-db-prod --file=scripts/seed-agents.sql --remote
```

### Step 7: Verify

```bash
# Get your deployment URL from the deploy output, then:
curl https://ai-agent-team-prod.<your-subdomain>.workers.dev/api/health

# Should return: {"status":"healthy",...}
```

---

## 🎉 You're Live!

**Production URL**: `https://ai-agent-team-prod.<your-subdomain>.workers.dev`

**Custom Domain** (optional):
```bash
npx wrangler deployments domains add api.shyangtsuen.xyz --env production
```

---

## 📊 Monitor Your Deployment

```bash
# Real-time logs
npx wrangler tail --env production

# Check agents
curl https://ai-agent-team-prod.<your-subdomain>.workers.dev/api/agents
```

---

## 💰 Cost Summary

- **Workers Paid**: $5/month base
- **Expected total**: $5-15/month (with Multi-LLM optimization)
- **Set alerts**: Dashboard → Billing → Budget alerts at $20/month

---

## 🆘 Need Help?

- **Full Guide**: See `CLOUDFLARE-SETUP.md`
- **Troubleshooting**: See `SESSION-STATUS.md`
- **Project Status**: See `PROJECT-CONTINUATION.md`

---

**Ready? Start with Step 1! 🚀**
