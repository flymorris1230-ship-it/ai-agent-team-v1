# 🚀 Quick Start Guide

最快 5 分鐘開始使用 AI Agent Team 系統！

## 方法 1: 自動設置（推薦）

### Windows (PowerShell)
```powershell
# 1. 設置 API Token
$env:CLOUDFLARE_API_TOKEN="your-token-here"

# 2. 運行設置腳本
.\scripts\setup-cloudflare.ps1

# 3. 根據輸出更新 wrangler.toml

# 4. 啟動開發服務器
npm run dev
```

### Linux/Mac (Bash)
```bash
# 1. 設置 API Token
export CLOUDFLARE_API_TOKEN="your-token-here"

# 2. 運行設置腳本
./scripts/setup-cloudflare.sh

# 3. 根據輸出更新 wrangler.toml

# 4. 啟動開發服務器
npm run dev
```

## 方法 2: 手動設置

### 1. 獲取 Cloudflare API Token

訪問 https://dash.cloudflare.com/profile/api-tokens 並創建新 token

### 2. 設置環境變量

```bash
# 創建 .env 文件
cp .env.example .env

# 編輯 .env 文件，填入你的 token
```

### 3. 創建資源

```bash
# 安裝依賴
npm install

# 創建 D1 數據庫
npx wrangler d1 create ai-agent-db
npx wrangler d1 create ai-agent-db-dev

# 初始化 Schema
npx wrangler d1 execute ai-agent-db --file=src/main/js/database/schema.sql

# 創建其他資源
npx wrangler vectorize create ai-agent-vectors --dimensions=1536
npx wrangler r2 bucket create ai-agent-files
npx wrangler kv:namespace create CACHE
npx wrangler queues create ai-agent-tasks
npx wrangler queues create ai-agent-backups
```

### 4. 更新配置

將創建資源時返回的 ID 更新到 `wrangler.toml`

### 5. 測試

```bash
# 本地開發
npm run dev

# 測試 API
curl http://localhost:8787/health
```

## 驗證設置

### 1. Health Check
```bash
curl http://localhost:8787/health
```

預期響應：
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

### 2. 創建測試任務
```bash
curl -X POST http://localhost:8787/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "implement_feature",
    "title": "Test Task",
    "description": "This is a test task",
    "priority": "high",
    "created_by": "quickstart-test"
  }'
```

### 3. 查詢任務
```bash
curl http://localhost:8787/api/tasks/status/pending
```

### 4. 處理用戶請求
```bash
curl -X POST http://localhost:8787/api/coordinator/process \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user",
    "description": "Implement user authentication feature",
    "priority": "high"
  }'
```

### 5. 查看進度
```bash
curl http://localhost:8787/api/coordinator/progress
```

## 常見 API 使用示例

### 知識庫操作

#### 上傳文檔
```bash
curl -X POST http://localhost:8787/api/knowledge/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Development Best Practices",
    "content": "Always validate input...",
    "category": "development",
    "tags": ["api", "best-practices"]
  }'
```

#### 語義搜索
```bash
curl -X POST http://localhost:8787/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to implement JWT authentication?",
    "top_k": 5
  }'
```

### Agent 操作

#### 查看 Agent 性能
```bash
curl http://localhost:8787/api/agents/agent-backend-dev/metrics
```

#### 觸發 Backend Developer Agent
```bash
curl -X POST http://localhost:8787/api/agents/backend-dev/process
```

### 系統日誌

#### 查詢日誌
```bash
curl "http://localhost:8787/api/logs?level=error&limit=50"
```

## 部署到 Cloudflare

### 1. 確保所有資源已創建

```bash
# 檢查資源列表
npx wrangler d1 list
npx wrangler r2 bucket list
npx wrangler kv:namespace list
```

### 2. 部署

```bash
# 部署到 production
npm run deploy

# 或指定環境
npx wrangler deploy --env production
```

### 3. 查看部署

```bash
# 列出部署歷史
npx wrangler deployments list

# 查看實時日誌
npx wrangler tail
```

## 開發工作流程

### 日常開發

```bash
# 1. 啟動開發服務器（自動熱重載）
npm run dev

# 2. 修改代碼

# 3. 測試 API

# 4. 提交代碼
git add .
git commit -m "Your commit message"
```

### 類型檢查

```bash
npm run type-check
```

### 代碼質量

```bash
# ESLint
npm run lint

# Prettier
npm run format
```

### 測試

```bash
# 運行測試
npm test

# 測試覆蓋率
npm run test:coverage
```

## 下一步

- ✅ 設置完成！現在可以：
  1. 探索 API endpoints
  2. 查看 [完整文檔](./setup-guide.md)
  3. 實現自定義 Agents
  4. 配置 NAS 備份
  5. 整合 MCP 協議

## 需要幫助？

- 📖 完整設置指南: `docs/setup-guide.md`
- 🔧 故障排除: `docs/setup-guide.md#常見問題排查`
- 📺 教程視頻: https://youtu.be/8Q1bRZaHH24
- 📋 配置範例: `ai_agent_team_config.txt`

## 資源連結

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [D1 Database](https://developers.cloudflare.com/d1/)
- [Vectorize](https://developers.cloudflare.com/vectorize/)
- [Hono Framework](https://hono.dev/)
