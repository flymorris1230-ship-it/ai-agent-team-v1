# Cloudflare Workers 部署指南

## 📋 部署前檢查清單

### 1. 環境準備
- [ ] 已安裝 Node.js (v18+)
- [ ] 已安裝 Wrangler CLI (`npm install -g wrangler`)
- [ ] 已登入 Cloudflare (`wrangler login`)
- [ ] 已配置 `.env` 文件

### 2. 資料庫準備
- [ ] D1 資料庫已創建
- [ ] PostgreSQL 已運行並配置 pgvector
- [ ] PostgreSQL Proxy 已部署到 NAS
- [ ] 資料庫 schema 已初始化

### 3. API Keys 準備
- [ ] OpenAI API Key
- [ ] PostgreSQL Proxy API Key
- [ ] Cloudflare API Token

## 🚀 部署步驟

### 步驟 1: 安裝依賴

```bash
npm install
```

### 步驟 2: 配置環境變數

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 文件，填入實際值
nano .env
```

必要的環境變數：
```bash
OPENAI_API_KEY=sk-your-key-here
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_PASSWORD=Morris1230
POSTGRES_PROXY_API_KEY=your-proxy-api-key
```

### 步驟 3: 初始化 D1 資料庫

```bash
# 開發環境
npm run db:init:dev

# 生產環境（等準備好再執行）
npm run db:init
```

### 步驟 4: 類型檢查

```bash
npm run type-check
```

### 步驟 5: 本地測試

```bash
# 啟動本地開發服務器
npm run dev

# 在另一個終端測試
curl http://localhost:8787/health
```

### 步驟 6: 部署到 Cloudflare

```bash
# 部署到開發環境
npm run deploy:staging

# 部署到生產環境（確認無誤後）
npm run deploy:production
```

### 步驟 7: 配置環境變數到 Cloudflare

```bash
# 設置 OpenAI API Key
wrangler secret put OPENAI_API_KEY

# 設置 PostgreSQL 密碼
wrangler secret put POSTGRES_PASSWORD

# 設置 Proxy API Key
wrangler secret put POSTGRES_PROXY_API_KEY
```

### 步驟 8: 配置自定義域名（可選）

```bash
# 添加域名路由
npm run domain:add

# 查看域名列表
npm run domain:list
```

### 步驟 9: 啟用 Cron Triggers（需要付費方案）

在 `wrangler.toml` 中取消註釋 cron triggers：

```toml
[triggers]
crons = [
  "*/5 * * * *",   # Database sync every 5 minutes
  "*/30 * * * *",  # Task distribution every 30 minutes
  "0 2 * * *",     # Daily full backup at 2 AM
]
```

## ✅ 部署驗證

### 1. 健康檢查

```bash
# 基本健康檢查
curl https://gac.your-subdomain.workers.dev/health

# 完整系統檢查
curl https://gac.your-subdomain.workers.dev/health/full
```

預期輸出：
```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T...",
  "checks": {
    "d1": { "healthy": true, "latency": 5 },
    "postgres": { "healthy": true, "latency": 15, "pgvector": true },
    "openai": { "healthy": true }
  }
}
```

### 2. 測試 API 端點

```bash
# 列出 Agents
curl https://gac.your-subdomain.workers.dev/api/v1/agents

# 創建任務（需要認證）
curl -X POST https://gac.your-subdomain.workers.dev/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "develop_api",
    "title": "Build user authentication",
    "priority": "high"
  }'
```

### 3. 測試 RAG 系統

```bash
# 上傳文件到知識庫
curl -X POST https://gac.your-subdomain.workers.dev/api/v1/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "API Documentation",
    "content": "..."
  }'

# 測試 RAG 查詢
curl -X POST https://gac.your-subdomain.workers.dev/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "How do I authenticate?",
    "use_rag": true
  }'
```

### 4. 查看日誌

```bash
# 實時日誌
npm run logs

# 生產環境日誌
npm run logs:prod
```

## 🔧 故障排除

### 問題 1: D1 連接失敗

檢查 D1 資料庫 ID：

```bash
wrangler d1 list
```

更新 `wrangler.toml` 中的 `database_id`。

### 問題 2: PostgreSQL Proxy 無法連接

檢查：
1. NAS 上的 proxy 容器是否運行
2. 防火牆是否允許 port 8000
3. API Key 是否正確

```bash
# 測試 proxy
curl http://192.168.1.114:8000/health
```

### 問題 3: Cron Jobs 未執行

Cron triggers 需要 **Workers Paid Plan**。

檢查：
```bash
wrangler tail --format=pretty
```

### 問題 4: OpenAI API 錯誤

檢查：
1. API Key 是否有效
2. 是否有足夠的配額
3. 是否設置了正確的 secret

```bash
wrangler secret list
```

## 📊 監控與維護

### 查看部署狀態

```bash
wrangler deployments list
```

### 查看使用統計

訪問 Cloudflare Dashboard:
- Workers Analytics
- D1 Metrics
- Vectorize Statistics

### 更新部署

```bash
# 拉取最新代碼
git pull origin main

# 重新部署
npm run deploy:production
```

### 回滾部署

```bash
# 查看部署歷史
wrangler deployments list

# 回滾到特定版本
wrangler rollback --deployment-id <deployment-id>
```

## 🔐 安全最佳實踐

1. **使用 Secrets 管理敏感資訊**
   ```bash
   wrangler secret put OPENAI_API_KEY
   wrangler secret put POSTGRES_PASSWORD
   ```

2. **限制 CORS**

   在 `src/main/js/api/index.ts` 中配置：
   ```typescript
   cors({
     origin: ['https://your-domain.com'],
     allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
   })
   ```

3. **啟用速率限制**

   使用 Cloudflare Rate Limiting 或在代碼中實現。

4. **監控異常活動**

   設置 Cloudflare Alerts 監控：
   - 高錯誤率
   - 異常流量
   - API 使用超限

## 📝 部署檢查清單

部署後驗證：

- [ ] `/health` 端點返回 healthy
- [ ] `/health/full` 所有檢查通過
- [ ] D1 資料庫可訪問
- [ ] PostgreSQL Proxy 連接正常
- [ ] pgvector 功能可用
- [ ] OpenAI API 可調用
- [ ] Cron jobs 正常執行
- [ ] 日誌正常記錄
- [ ] 自定義域名解析正確
- [ ] HTTPS 證書有效

## 🎯 性能優化

### 1. 啟用快取

使用 KV namespace 快取常用數據：

```typescript
const cached = await env.CACHE.get(key);
if (cached) return JSON.parse(cached);

// ... fetch data ...

await env.CACHE.put(key, JSON.stringify(data), {
  expirationTtl: 3600 // 1 hour
});
```

### 2. 優化 RAG 查詢

- 調整 chunk size
- 使用更小的 embedding 模型
- 實施結果快取

### 3. 資料庫查詢優化

- 使用 prepared statements
- 添加適當的索引
- 限制查詢結果數量

## 🆘 支援與幫助

- Cloudflare Workers 文檔: https://developers.cloudflare.com/workers/
- D1 文檔: https://developers.cloudflare.com/d1/
- Vectorize 文檔: https://developers.cloudflare.com/vectorize/
- 專案 GitHub Issues: https://github.com/your-repo/issues
