# Cloudflare 資源設置指南

## 前置需求

1. Cloudflare 帳號
2. Cloudflare API Token
3. Node.js 18+ 和 npm

## 步驟 1: 獲取 Cloudflare API Token

1. 訪問 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 點擊右上角的個人資料圖標 > **My Profile**
3. 在左側菜單選擇 **API Tokens**
4. 點擊 **Create Token**
5. 使用 **Edit Cloudflare Workers** 模板，或創建自定義 token with:
   - Permissions:
     - Account > D1 > Edit
     - Account > Workers R2 Storage > Edit
     - Account > Workers KV Storage > Edit
     - Account > Vectorize > Edit
     - Account > Queues > Edit
     - Zone > Workers Routes > Edit
6. 複製生成的 token

## 步驟 2: 設置環境變量

### Linux/Mac:
```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
export CLOUDFLARE_ACCOUNT_ID="your-account-id-here"
```

### Windows (PowerShell):
```powershell
$env:CLOUDFLARE_API_TOKEN="your-token-here"
$env:CLOUDFLARE_ACCOUNT_ID="your-account-id-here"
```

### Windows (CMD):
```cmd
set CLOUDFLARE_API_TOKEN=your-token-here
set CLOUDFLARE_ACCOUNT_ID=your-account-id-here
```

或者創建 `.env` 文件（不要提交到 Git）：
```
CLOUDFLARE_API_TOKEN=your-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
```

## 步驟 3: 創建 Cloudflare 資源

### 3.1 創建 D1 Database (Production)
```bash
npx wrangler d1 create ai-agent-db
```

輸出示例：
```
✅ Successfully created DB 'ai-agent-db'
Created your database using D1's new storage backend.

[[d1_databases]]
binding = "DB"
database_name = "ai-agent-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**複製 `database_id` 並更新 `wrangler.toml` 第 16 行**

### 3.2 創建 D1 Database (Development)
```bash
npx wrangler d1 create ai-agent-db-dev
```

**複製 `database_id` 並更新 `wrangler.toml` 第 66 行**

### 3.3 初始化數據庫 Schema (Production)
```bash
npx wrangler d1 execute ai-agent-db --file=src/main/js/database/schema.sql
```

### 3.4 初始化數據庫 Schema (Development)
```bash
npx wrangler d1 execute ai-agent-db-dev --file=src/main/js/database/schema.sql --env development
```

### 3.5 創建 Vectorize Index
```bash
npx wrangler vectorize create ai-agent-vectors --dimensions=1536 --metric=cosine
```

輸出示例：
```
✅ Successfully created index 'ai-agent-vectors'
```

**在 `wrangler.toml` 第 21 行確認 index_name**

### 3.6 創建 R2 Bucket
```bash
npx wrangler r2 bucket create ai-agent-files
```

輸出示例：
```
✅ Created bucket 'ai-agent-files'
```

### 3.7 創建 KV Namespace
```bash
npx wrangler kv:namespace create CACHE
```

輸出示例：
```
✅ Created namespace with id "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**複製 `id` 並更新 `wrangler.toml` 第 31 行**

### 3.8 創建 Queues
```bash
npx wrangler queues create ai-agent-tasks
npx wrangler queues create ai-agent-backups
```

## 步驟 4: 更新 wrangler.toml

完成上述步驟後，確保 `wrangler.toml` 包含所有資源 ID：

```toml
# D1 Database (Production)
[[d1_databases]]
binding = "DB"
database_name = "ai-agent-db"
database_id = "YOUR_PROD_DATABASE_ID_HERE"  # 從步驟 3.1 獲取

# KV Namespace
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # 從步驟 3.7 獲取

# Development Database
[env.development.d1_databases]
binding = "DB"
database_name = "ai-agent-db-dev"
database_id = "YOUR_DEV_DATABASE_ID_HERE"  # 從步驟 3.2 獲取
```

## 步驟 5: 本地測試

### 啟動本地開發服務器
```bash
npm run dev
```

應該看到：
```
⛅️ wrangler 3.x.x
------------------
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

### 測試 API Endpoints

#### Health Check
```bash
curl http://localhost:8787/health
```

預期輸出：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "environment": "development",
    "timestamp": 1234567890
  }
}
```

#### 創建任務
```bash
curl -X POST http://localhost:8787/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "implement_feature",
    "title": "Test Feature",
    "description": "Testing task creation",
    "priority": "high",
    "created_by": "user-test"
  }'
```

#### 查詢任務
```bash
curl http://localhost:8787/api/tasks/status/pending
```

## 步驟 6: 部署到 Cloudflare

### 部署到 Production
```bash
npm run deploy
```

或
```bash
npx wrangler deploy --env production
```

### 查看部署的 Worker
```bash
npx wrangler deployments list
```

### 查看實時日誌
```bash
npx wrangler tail
```

## 常見問題排查

### 問題 1: Authentication Error
**錯誤**: `CLOUDFLARE_API_TOKEN environment variable`

**解決方案**: 確保已設置 API Token 環境變量

### 問題 2: Database Not Found
**錯誤**: `D1 database not found`

**解決方案**:
1. 確認已創建 D1 database
2. 確認 `wrangler.toml` 中的 `database_id` 正確
3. 重新執行 schema 初始化

### 問題 3: Module Not Found
**錯誤**: `Cannot find module 'hono'`

**解決方案**:
```bash
npm install
```

### 問題 4: Type Errors
**錯誤**: TypeScript compilation errors

**解決方案**:
```bash
npm run type-check
```

## 資源管理命令

### 列出所有 D1 Databases
```bash
npx wrangler d1 list
```

### 查詢 D1 Database
```bash
npx wrangler d1 execute ai-agent-db --command="SELECT * FROM agents LIMIT 5"
```

### 備份 D1 Database
```bash
npx wrangler d1 export ai-agent-db --output=backup.sql
```

### 列出 R2 Buckets
```bash
npx wrangler r2 bucket list
```

### 列出 KV Namespaces
```bash
npx wrangler kv:namespace list
```

### 列出 Queues
```bash
npx wrangler queues list
```

## 監控和調試

### 查看 Worker 日誌
```bash
npx wrangler tail --format pretty
```

### 查看特定環境日誌
```bash
npx wrangler tail --env production
```

### 查看 D1 Analytics
訪問 [Cloudflare Dashboard > D1](https://dash.cloudflare.com/) 查看查詢性能

## 成本估算

### Free Tier 限制:
- **D1**: 5 databases, 100k reads/day, 50k writes/day
- **Workers**: 100k requests/day
- **KV**: 100k reads/day, 1k writes/day
- **R2**: 10 GB storage, 1M Class A operations/month
- **Vectorize**: 30M queried vector dimensions/month
- **Queues**: 1M operations/month

### 預估成本 (超過 Free Tier):
- **D1**: $5/month per database (after free tier)
- **Workers**: $5/10M requests
- **R2**: $0.015/GB storage, $4.50/M Class A operations
- **Vectorize**: $0.04 per 1M queried dimensions

## 下一步

1. ✅ 設置完成後，運行 `npm run dev` 測試本地環境
2. 創建測試數據並驗證 API
3. 實現其他 Agent (PM, Architect, QA, etc.)
4. 設置 NAS 備份系統
5. 配置 CI/CD pipeline

## 參考資源

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [D1 文檔](https://developers.cloudflare.com/d1/)
- [Vectorize 文檔](https://developers.cloudflare.com/vectorize/)
- [R2 文檔](https://developers.cloudflare.com/r2/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)
