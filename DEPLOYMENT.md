# 🚀 AI Agent Team - 部署指南

## 📋 系統概覽

完整的企業級 AI Agent 協作系統，基於 Cloudflare Workers 構建。

### ✅ 已實現功能

**核心系統：**
- ✅ 9 個專業 AI Agent（Coordinator, PM, Architect, Backend, Frontend, QA, DevOps, Data Analyst, Knowledge Manager）
- ✅ RAG 引擎（OpenAI embeddings + GPT-4o-mini）
- ✅ Agent 通訊與編排系統
- ✅ 完整 RESTful API（Hono.js）
- ✅ NAS 備份系統

**技術棧：**
- Cloudflare Workers (TypeScript)
- D1 Database (SQLite)
- Vectorize (向量數據庫, 1536維度)
- R2 Storage (對象存儲)
- KV Store (快取)
- Queues (消息隊列)
- OpenAI API (embeddings + chat)

## 🔧 部署步驟

### 1. 環境準備

```bash
# 安裝依賴
npm install

# 登入 Cloudflare
wrangler login
```

### 2. 配置環境變量

```bash
# 複製環境變量模板
cp .env.example .env

# 編輯 .env 填入您的 API keys
# - OPENAI_API_KEY
# - JWT_SECRET (隨機生成32+字符)
# - NAS_WEBHOOK_URL (可選)
```

### 3. 自動化資源配置

```bash
# 執行 Cloudflare 資源設置腳本
bash scripts/setup-cloudflare.sh
```

此腳本將創建：
- 3 個 D1 數據庫 (dev, staging, prod)
- 1 個 Vectorize 索引 (1536維度, cosine)
- 2 個 R2 存儲桶 (files, backups)
- 3 個 KV 命名空間
- 2 個消息隊列 (tasks, backups)
- 配置 Secrets (OPENAI_API_KEY, JWT_SECRET, NAS_WEBHOOK_URL)

### 4. 更新配置文件

設置腳本完成後，更新 `wrangler.toml` 中的資源 ID：

```toml
# 將輸出的 ID 填入對應位置
[[d1_databases]]
database_id = "your-actual-database-id"

[[kv_namespaces]]
id = "your-actual-kv-id"
```

### 5. 初始化數據庫

```bash
# 初始化數據庫 schema
npm run db:migrate
```

### 6. 本地開發

```bash
# 啟動本地開發服務器
npm run dev

# 訪問 http://localhost:8787
```

### 7. 部署到生產環境

```bash
# 部署到 staging
npm run deploy:staging

# 部署到 production
npm run deploy:production
```

## 📡 API 端點

### 基礎端點
- `GET /` - API 信息
- `GET /api/v1/health` - 健康檢查

### 認證
- `POST /api/v1/auth/register` - 用戶註冊
- `POST /api/v1/auth/login` - 用戶登入

### Chat (RAG)
- `POST /api/v1/chat` - 發送消息
- `GET /api/v1/chat/conversations` - 獲取對話列表
- `GET /api/v1/chat/conversations/:id` - 獲取對話詳情

### 文檔管理
- `POST /api/v1/documents` - 上傳文檔
- `GET /api/v1/documents` - 列出文檔
- `POST /api/v1/documents/:id/reindex` - 重新索引

### 任務管理
- `POST /api/v1/tasks` - 創建任務
- `GET /api/v1/tasks` - 列出任務
- `PUT /api/v1/tasks/:id/assign` - 分配任務

### Agent 管理
- `GET /api/v1/agents` - 列出所有 Agent
- `GET /api/v1/agents/:id/metrics` - Agent 性能指標

### 知識庫
- `POST /api/v1/knowledge` - 創建知識條目
- `GET /api/v1/knowledge?q=query` - 語義搜索

## 🔐 安全配置

### 設置 Secrets

```bash
# OpenAI API Key
wrangler secret put OPENAI_API_KEY

# JWT Secret (用於生成用戶 token)
wrangler secret put JWT_SECRET

# NAS Webhook URL (可選)
wrangler secret put NAS_WEBHOOK_URL
```

## 🗄️ 備份配置

### 自動備份
系統已配置以下自動備份：

- **每小時**: 增量備份（僅變更數據）
- **每天 2:00**: 完整數據庫備份
- **每 6 小時**: R2 文件同步

### 手動備份

```bash
# 手動觸發完整備份
curl -X POST https://your-api.com/api/v1/backup/full \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 監控

### Cloudflare Dashboard
- Workers Analytics
- D1 查詢統計
- R2 存儲使用量
- Queue 消息處理

### 健康檢查
```bash
# 系統健康
curl https://your-api.com/api/v1/health

# 數據庫健康
curl https://your-api.com/api/v1/health/db

# Vectorize 健康
curl https://your-api.com/api/v1/health/vectorize

# Agent 健康
curl https://your-api.com/api/v1/health/agents
```

## 🧪 測試

```bash
# 運行測試
npm test

# 測試覆蓋率
npm run test:coverage
```

## 📈 擴展性

### 水平擴展
Cloudflare Workers 自動處理全球分佈和負載平衡

### 數據庫擴展
- D1: 支持最大 500MB 
- 超出限制可配置多個數據庫分片

### 向量存儲擴展
- Vectorize: 支持數百萬向量
- 可配置多個索引分離不同類型數據

## 🚨 故障排除

### 常見問題

**1. OpenAI API 錯誤**
```bash
# 檢查 API key
wrangler secret list

# 重新設置
wrangler secret put OPENAI_API_KEY
```

**2. 數據庫連接失敗**
```bash
# 檢查數據庫狀態
wrangler d1 list

# 重新初始化
npm run db:migrate
```

**3. 向量搜索失敗**
```bash
# 檢查 Vectorize 索引
wrangler vectorize list

# 重新索引文檔
curl -X POST https://your-api.com/api/v1/documents/:id/reindex
```

## 📝 維護

### 定期任務
- 每週: 檢查備份完整性
- 每月: 清理舊日誌和備份
- 每季: 性能優化和成本審查

### 數據庫維護
```bash
# 導出數據庫
npm run db:backup

# 清理舊數據
wrangler d1 execute ai-agent-db \
  --command "DELETE FROM system_logs WHERE created_at < ?"
```

## 📚 相關文檔

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [D1 數據庫文檔](https://developers.cloudflare.com/d1/)
- [Vectorize 文檔](https://developers.cloudflare.com/vectorize/)
- [R2 存儲文檔](https://developers.cloudflare.com/r2/)

## 🆘 支持

遇到問題？
1. 查看 [GitHub Issues](https://github.com/flymorris1230-ship-it/ai-agent-team-v1/issues)
2. 查看系統日誌：`npm run logs`
3. 聯繫技術支持

---

**🎯 系統已準備就緒！開始構建您的 AI Agent 團隊！**
