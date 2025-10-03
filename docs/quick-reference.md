# 🚀 Quick Reference - shyangtsuen.xyz

## 一鍵設定與部署

### 步驟 1: 設定 Cloudflare API Token

```powershell
# Windows PowerShell
$env:CLOUDFLARE_API_TOKEN="your-api-token-here"
$env:CLOUDFLARE_ACCOUNT_ID="your-account-id-here"
```

**獲取 Token**: https://dash.cloudflare.com/profile/api-tokens
**獲取 Account ID**: Cloudflare Dashboard 右側欄

---

### 步驟 2: 創建 Cloudflare 資源

```powershell
# 運行自動設定腳本（Windows）
.\scripts\setup-cloudflare.ps1
```

腳本會自動創建：
- ✅ D1 Databases (production + development)
- ✅ Vectorize Index
- ✅ R2 Bucket
- ✅ KV Namespace
- ✅ Queues (tasks + backups)
- ✅ 初始化資料庫 Schema

---

### 步驟 3: 更新配置

根據腳本輸出，更新 `wrangler.toml` 中的資源 ID：

```toml
# 第 25 行 - Production Database ID
database_id = "從腳本輸出複製"

# 第 39 行 - KV Namespace ID
id = "從腳本輸出複製"

# 第 98 行 - Development Database ID
database_id = "從腳本輸出複製"
```

---

### 步驟 4: 本地測試

```bash
# 啟動開發伺服器
npm run dev

# 測試 API
curl http://localhost:8787/health
```

---

### 步驟 5: 部署到您的網域

```powershell
# 部署到 production (api.shyangtsuen.xyz)
.\scripts\deploy.ps1 production

# 或使用 npm script
npm run deploy:production
```

---

## 🌐 您的網域配置

### 可用的子網域

| 子網域 | 用途 | 狀態 |
|--------|------|------|
| `api.shyangtsuen.xyz` | AI Agent API 後端 | ✅ 已配置 |
| `api-staging.shyangtsuen.xyz` | Staging 環境 | ✅ 已配置 |
| `admin.shyangtsuen.xyz` | 管理後台 | 🔄 未來開發 |
| `kb.shyangtsuen.xyz` | 知識庫管理 | 🔄 未來開發 |
| `docs.shyangtsuen.xyz` | API 文檔 | 🔄 未來開發 |
| `monitor.shyangtsuen.xyz` | 監控儀表板 | 🔄 未來開發 |

### 已使用
- ❌ `n8n.shyangtsuen.xyz` (已佔用)
- ❌ `chat.shyangtsuen.xyz` (已佔用)

---

## 📝 常用命令

### 開發
```bash
npm run dev              # 啟動本地開發伺服器
npm run type-check       # TypeScript 型別檢查
npm run lint             # ESLint 檢查
npm test                 # 運行測試
```

### 部署
```bash
npm run deploy:production   # 部署到 production
npm run deploy:staging      # 部署到 staging
npm run deploy:script:prod  # 使用完整部署腳本
```

### 資料庫
```bash
npm run db:init            # 初始化 production database
npm run db:init:dev        # 初始化 development database
npm run db:backup          # 備份資料庫
```

### 網域管理
```bash
npm run domain:add         # 添加自訂網域
npm run domain:list        # 列出所有網域
```

### 監控
```bash
npm run logs               # 查看即時日誌
npm run logs:prod          # 查看 production 日誌
npx wrangler deployments list  # 查看部署歷史
```

---

## 🔧 API 測試

### Health Check
```bash
curl https://api.shyangtsuen.xyz/health
```

### 創建任務
```bash
curl -X POST https://api.shyangtsuen.xyz/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "implement_feature",
    "title": "Test Feature",
    "priority": "high",
    "created_by": "user-test"
  }'
```

### Coordinator 處理請求
```bash
curl -X POST https://api.shyangtsuen.xyz/api/coordinator/process \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Implement user authentication",
    "priority": "high"
  }'
```

### 查詢任務
```bash
curl https://api.shyangtsuen.xyz/api/tasks/status/pending
```

### 知識庫搜索
```bash
curl -X POST https://api.shyangtsuen.xyz/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query": "How to implement JWT?"}'
```

### 查看日誌
```bash
curl https://api.shyangtsuen.xyz/api/logs?limit=50
```

---

## 🎯 完整工作流程

### 首次部署

```powershell
# 1. 設定環境變數
$env:CLOUDFLARE_API_TOKEN="your-token"
$env:CLOUDFLARE_ACCOUNT_ID="your-account-id"

# 2. 創建資源
.\scripts\setup-cloudflare.ps1

# 3. 更新 wrangler.toml (根據腳本輸出)

# 4. 本地測試
npm run dev

# 5. 部署到 production
.\scripts\deploy.ps1 production
```

### 日常開發

```bash
# 1. 啟動開發環境
npm run dev

# 2. 修改代碼

# 3. 測試
npm test

# 4. 提交
git add .
git commit -m "Your changes"

# 5. 部署到 staging 測試
npm run deploy:staging

# 6. 測試 staging
curl https://api-staging.shyangtsuen.xyz/health

# 7. 部署到 production
npm run deploy:production
```

---

## 🔍 故障排除

### DNS 未生效
```bash
# 檢查 DNS 傳播
# 訪問: https://dnschecker.org/?domain=api.shyangtsuen.xyz

# 列出配置的網域
npm run domain:list

# 重新添加網域
npm run domain:add
```

### Database 錯誤
```bash
# 檢查資料庫列表
npx wrangler d1 list

# 重新初始化 schema
npm run db:init
```

### 查看錯誤日誌
```bash
npm run logs:prod
```

---

## 📚 文檔連結

- 📖 [完整設定指南](./setup-guide.md)
- 🚀 [快速開始](./quickstart.md)
- 🌐 [網域設定](./domain-setup.md)
- 📋 [配置詳情](../ai_agent_team_config.txt)

---

## 🆘 需要幫助？

1. 查看文檔：`docs/` 目錄
2. 查看日誌：`npm run logs:prod`
3. Cloudflare Dashboard: https://dash.cloudflare.com/
4. 教學影片: https://youtu.be/8Q1bRZaHH24

---

**網域**: shyangtsuen.xyz
**API Endpoint**: https://api.shyangtsuen.xyz
**環境**: Production + Staging
**版本**: 1.0.0
