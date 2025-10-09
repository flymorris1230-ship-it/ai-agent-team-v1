# 網域設定指南 - shyangtsuen.xyz

## 🌐 可用的子網域規劃

您的網域：`shyangtsuen.xyz`
已使用：`n8n.shyangtsuen.xyz`, `chat.shyangtsuen.xyz`

### 建議的子網域配置：

```
api.shyangtsuen.xyz          → AI Agent API 後端服務
agents.shyangtsuen.xyz       → Agent 管理介面（未來前端）
kb.shyangtsuen.xyz          → 知識庫管理（Knowledge Base）
docs.shyangtsuen.xyz        → API 文檔和系統文檔
admin.shyangtsuen.xyz       → 管理後台
backup.shyangtsuen.xyz      → 備份管理介面
monitor.shyangtsuen.xyz     → 監控儀表板
```

## 📋 設定步驟

### 步驟 1: 獲取 Cloudflare 資訊

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 選擇您的網域 `shyangtsuen.xyz`
3. 複製以下資訊：
   - **Zone ID**: 在右側欄位的 "API" 區域
   - **Account ID**: 點擊右上角頭像 > Account Home

### 步驟 2: 設定環境變數

創建或編輯 `.env` 檔案：

```bash
# Cloudflare API Configuration
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_ZONE_ID=your-zone-id-here

# Domain Configuration
DOMAIN=shyangtsuen.xyz
API_SUBDOMAIN=api
ADMIN_SUBDOMAIN=admin
KB_SUBDOMAIN=kb
```

### 步驟 3: 更新 wrangler.toml

我已經為您準備了配置，請檢查更新後的 `wrangler.toml` 文件。

主要更改：
- 添加了自訂網域路由
- 配置了 Workers 路由規則
- 設定了多環境支援（dev/staging/prod）

### 步驟 4: 創建 Cloudflare 資源

#### 4.1 使用自動化腳本（推薦）

**Windows PowerShell:**
```powershell
# 設定環境變數
$env:CLOUDFLARE_API_TOKEN="your-token-here"
$env:CLOUDFLARE_ACCOUNT_ID="your-account-id-here"

# 運行設定腳本
.\scripts\setup-cloudflare.ps1
```

**Linux/Mac:**
```bash
export CLOUDFLARE_API_TOKEN="your-token-here"
export CLOUDFLARE_ACCOUNT_ID="your-account-id-here"

./scripts/setup-cloudflare.sh
```

#### 4.2 手動創建（逐步）

```bash
# 1. D1 Database
npx wrangler d1 create ai-agent-db
npx wrangler d1 create ai-agent-db-dev

# 2. 初始化 Schema
npx wrangler d1 execute ai-agent-db --file=src/main/js/database/schema.sql

# 3. Vectorize Index
npx wrangler vectorize create ai-agent-vectors --dimensions=1536 --metric=cosine

# 4. R2 Bucket
npx wrangler r2 bucket create ai-agent-files

# 5. KV Namespace
npx wrangler kv:namespace create CACHE

# 6. Queues
npx wrangler queues create ai-agent-tasks
npx wrangler queues create ai-agent-backups
```

### 步驟 5: 設定 DNS 記錄

在 Cloudflare Dashboard 中設定 DNS：

#### 選項 A: 使用 Workers Custom Domains（自動化，推薦）

部署後 Cloudflare 會自動處理 DNS，無需手動設定。

#### 選項 B: 手動設定 DNS（備用）

在 Cloudflare DNS 設定中添加：

| 類型  | 名稱   | 內容                          | Proxy | TTL  |
|-------|--------|-------------------------------|-------|------|
| CNAME | api    | gac.workers.dev     | ✅    | Auto |
| CNAME | admin  | gac.workers.dev     | ✅    | Auto |
| CNAME | kb     | gac.workers.dev     | ✅    | Auto |
| CNAME | docs   | gac-docs.pages.dev  | ✅    | Auto |

### 步驟 6: 部署 Workers

#### 6.1 本地測試
```bash
# 啟動開發伺服器
npm run dev

# 測試 API
curl http://localhost:8787/health
```

#### 6.2 部署到 Cloudflare

```bash
# 部署到 production
npm run deploy

# 或使用完整命令
npx wrangler deploy --env production
```

#### 6.3 配置自訂網域

```bash
# 添加自訂網域到 Worker
npx wrangler deployments domains add api.shyangtsuen.xyz

# 列出所有自訂網域
npx wrangler deployments domains list
```

### 步驟 7: 驗證部署

#### 7.1 Health Check
```bash
curl https://api.shyangtsuen.xyz/health
```

預期回應：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "environment": "production",
    "timestamp": 1234567890
  }
}
```

#### 7.2 測試 API Endpoints

```bash
# 創建任務
curl -X POST https://api.shyangtsuen.xyz/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "implement_feature",
    "title": "Test Task",
    "description": "Testing production deployment",
    "priority": "high",
    "created_by": "system"
  }'

# 查詢任務
curl https://api.shyangtsuen.xyz/api/tasks/status/pending

# Coordinator 處理請求
curl -X POST https://api.shyangtsuen.xyz/api/coordinator/process \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "description": "Implement user authentication",
    "priority": "high"
  }'

# 查看系統日誌
curl https://api.shyangtsuen.xyz/api/logs?limit=10
```

### 步驟 8: 監控和管理

#### 查看即時日誌
```bash
npx wrangler tail --env production
```

#### 查看部署狀態
```bash
npx wrangler deployments list
```

#### 查看分析數據
訪問 Cloudflare Dashboard > Workers & Pages > gac > Analytics

## 🔒 安全設定

### 1. API 認證（建議實作）

在 `src/main/js/middleware/auth.ts` 添加認證中介軟體：

```typescript
// 將在後續實作
export const apiAuth = async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey || !await validateApiKey(apiKey)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};
```

### 2. Rate Limiting

使用 Cloudflare 的 Rate Limiting：
- Dashboard > Security > WAF > Rate limiting rules

### 3. CORS 設定

已在 `src/main/js/index.ts` 中配置：
```typescript
app.use('/*', cors());
```

可以限制特定網域：
```typescript
app.use('/*', cors({
  origin: ['https://shyangtsuen.xyz', 'https://chat.shyangtsuen.xyz'],
  credentials: true
}));
```

## 📊 子網域用途詳細規劃

### 1. api.shyangtsuen.xyz
**用途**: 主要 API 端點
**部署**: Cloudflare Workers
**功能**:
- RESTful API endpoints
- Task management
- Agent coordination
- Knowledge base operations
- System logs

### 2. admin.shyangtsuen.xyz（未來開發）
**用途**: 管理後台
**部署**: Cloudflare Pages
**功能**:
- Agent 狀態監控
- 任務管理介面
- 系統配置
- 用戶管理

### 3. kb.shyangtsuen.xyz（未來開發）
**用途**: 知識庫管理
**部署**: Cloudflare Pages
**功能**:
- 文檔上傳
- 語義搜索介面
- 知識分類瀏覽
- RAG 測試工具

### 4. docs.shyangtsuen.xyz（未來開發）
**用途**: API 文檔和開發者資源
**部署**: Cloudflare Pages
**功能**:
- OpenAPI/Swagger 文檔
- 使用教學
- 範例程式碼
- 架構說明

### 5. monitor.shyangtsuen.xyz（未來開發）
**用途**: 系統監控儀表板
**部署**: Cloudflare Pages
**功能**:
- 即時效能監控
- 錯誤追蹤
- 使用分析
- 成本追蹤

## 🚀 快速開始命令

### 完整部署流程（首次）

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env
# 編輯 .env 填入您的資訊

# 3. 創建 Cloudflare 資源
.\scripts\setup-cloudflare.ps1  # Windows
# 或
./scripts/setup-cloudflare.sh   # Linux/Mac

# 4. 更新 wrangler.toml（根據腳本輸出）

# 5. 本地測試
npm run dev

# 6. 部署到 production
npm run deploy

# 7. 配置自訂網域
npx wrangler deployments domains add api.shyangtsuen.xyz
```

### 日常開發流程

```bash
# 開發
npm run dev

# 測試
npm test

# 型別檢查
npm run type-check

# 部署
npm run deploy
```

## 🔍 故障排除

### 問題 1: DNS 未生效
**症狀**: 無法訪問 api.shyangtsuen.xyz

**解決方案**:
1. 檢查 DNS 傳播：https://dnschecker.org/
2. 清除瀏覽器快取
3. 檢查 Cloudflare Proxy 狀態（橙色雲圖示）
4. 等待 DNS 傳播（最多 24 小時，通常幾分鐘）

### 問題 2: 502 Bad Gateway
**症狀**: 訪問網域時顯示 502 錯誤

**解決方案**:
1. 檢查 Worker 是否成功部署：`npx wrangler deployments list`
2. 查看錯誤日誌：`npx wrangler tail`
3. 確認路由設定正確
4. 重新部署：`npm run deploy`

### 問題 3: Database Not Found
**症狀**: API 回應 D1 database not found

**解決方案**:
1. 確認 D1 database 已創建：`npx wrangler d1 list`
2. 檢查 `wrangler.toml` 中的 `database_id` 正確
3. 重新執行 schema：`npx wrangler d1 execute ai-agent-db --file=src/main/js/database/schema.sql`

### 問題 4: CORS Error
**症狀**: 前端無法呼叫 API（CORS blocked）

**解決方案**:
在 `src/main/js/index.ts` 中更新 CORS 設定：
```typescript
app.use('/*', cors({
  origin: ['https://shyangtsuen.xyz', 'https://chat.shyangtsuen.xyz'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

## 📈 後續步驟

1. ✅ 完成基礎設定
2. 部署 API 到 api.shyangtsuen.xyz
3. 實作其他 Agents（PM, Architect, QA 等）
4. 開發前端管理介面（admin.shyangtsuen.xyz）
5. 整合 n8n（透過 API 調用）
6. 整合 chat（可能是 ChatGPT/Claude 介面）
7. 設定 NAS 備份系統
8. 實作 MCP 協議整合

## 🔗 相關資源

- [Cloudflare Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [DNS Management](https://developers.cloudflare.com/dns/)
- [Workers Analytics](https://developers.cloudflare.com/workers/observability/analytics/)

## 💡 最佳實踐

1. **環境分離**: 使用不同網域或子網域區分 dev/staging/prod
2. **版本控制**: 使用 git tags 標記每次 production 部署
3. **監控**: 設定 Cloudflare Analytics 和 Error Tracking
4. **備份**: 定期備份 D1 database 到 R2 和 NAS
5. **安全**: 實作 API Key 認證和 Rate Limiting
6. **日誌**: 保留完整的系統日誌供除錯使用

---

**準備好開始了嗎？運行設定腳本開始部署！** 🚀
