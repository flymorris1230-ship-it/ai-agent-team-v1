# 🚀 Cloudflare 付費功能部署指南

> **版本**: v2.2 (Cloudflare Paid Features Enabled)
> **更新時間**: 2025-10-04
> **預估成本**: $5-50/月 (視使用量)

---

## 📋 **前置準備**

### ✅ **必須完成項目**

1. **Cloudflare 帳號**
   - 註冊: https://dash.cloudflare.com/sign-up
   - 驗證信箱

2. **Workers Paid Plan 訂閱**
   - 前往: https://dash.cloudflare.com/[account-id]/workers/plans
   - 選擇 **Workers Paid** ($5/月)
   - 綁定信用卡

3. **設定預算警報** (強烈建議)
   - 前往: https://dash.cloudflare.com/[account-id]/billing
   - 設定每月預算上限 (建議: $20-50)
   - 啟用郵件通知

---

## 🎯 **部署流程**

### Phase 1: 升級 Workers Plan

#### 步驟 1: 升級訂閱

1. 登入 Cloudflare Dashboard
2. 前往 **Workers & Pages** → **Plans**
3. 點擊 **Upgrade to Paid**
4. 確認訂閱 **$5.00/月**

✅ **確認**: 看到 "Workers Paid Plan" 標誌

---

### Phase 2: 創建 R2 Storage Bucket

#### 步驟 1: 啟用 R2

1. 前往 **R2** → **Overview**
2. 點擊 **Create bucket**
3. 填寫資訊:
   ```
   Bucket name: ai-agent-files
   Location: Automatic (推薦)
   Storage class: Standard
   ```
4. 點擊 **Create bucket**

#### 步驟 2: 獲取 Public URL (可選)

1. 進入創建的 bucket
2. 點擊 **Settings** → **Public access**
3. 啟用 **Public access**
4. 複製 Public URL:
   ```
   例如: https://pub-xxxxxxxxxxxxx.r2.dev
   ```

✅ **確認**: Bucket 列表中看到 `ai-agent-files`

---

### Phase 3: 創建 Queues

#### 步驟 1: 創建 Task Queue

1. 前往 **Queues** → **Create a Queue**
2. 填寫資訊:
   ```
   Queue name: ai-agent-tasks
   Max batch size: 10
   Max batch timeout: 30 seconds
   ```
3. 點擊 **Create**

#### 步驟 2: 創建 Backup Queue

1. 重複上述步驟
2. 填寫資訊:
   ```
   Queue name: ai-agent-backup
   Max batch size: 5
   Max batch timeout: 60 seconds
   ```

✅ **確認**: Queues 列表中看到兩個 Queue

---

### Phase 4: 配置環境變數

#### 步驟 1: 複製 .env 檔案

```bash
cp .env.example .env
```

#### 步驟 2: 編輯 .env

```bash
nano .env  # 或使用您喜歡的編輯器
```

#### 步驟 3: 填入 Cloudflare 付費功能配置

```bash
# ==========================================
# Cloudflare Paid Features Configuration
# ==========================================
ENABLE_CLOUDFLARE_CRON=true
ENABLE_CLOUDFLARE_R2=true
ENABLE_CLOUDFLARE_QUEUES=true

# R2 Storage Configuration
R2_BUCKET_NAME=ai-agent-files
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev  # 從 Dashboard 複製

# Queues Configuration
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY_MS=1000

# ==========================================
# LLM API Configuration (建議使用 balanced)
# ==========================================
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here
LLM_STRATEGY=balanced
USE_LLM_ROUTER=true
```

✅ **確認**: 所有必要環境變數已填寫

---

### Phase 5: 驗證配置

#### 步驟 1: TypeScript 編譯檢查

```bash
npm run typecheck
```

**預期輸出**: 無錯誤

#### 步驟 2: 本地開發測試

```bash
npm run dev
```

**驗證項目**:
- ✅ Workers 啟動成功
- ✅ D1 Database 連接正常
- ✅ R2 Storage 綁定正確
- ✅ Queues 綁定正確

#### 步驟 3: 檢查 wrangler.toml

```bash
cat wrangler.toml | grep -A 5 "\[triggers\]"
cat wrangler.toml | grep -A 5 "r2_buckets"
cat wrangler.toml | grep -A 5 "queues"
```

**確認**:
- ✅ Cron Triggers 已啟用 (未註解)
- ✅ R2 Buckets 已啟用 (未註解)
- ✅ Queues 已啟用 (未註解)

---

### Phase 6: 部署到 Cloudflare

#### 步驟 1: 測試構建

```bash
npm run build:test
```

**檢查輸出**: 確認無警告或錯誤

#### 步驟 2: 部署到 Production

```bash
npm run deploy
```

**預期輸出**:
```
✨  Successfully created/updated script gac
✨  Uploaded gac-prod (X.XX sec)
✨  Published gac
   https://gac.your-subdomain.workers.dev
✨  Success! Your worker is live at https://gac.your-subdomain.workers.dev
```

#### 步驟 3: 驗證部署

1. **檢查 Workers**
   ```bash
   curl https://api.shyangtsuen.xyz/health
   ```

2. **檢查 Cron Triggers**
   - 前往 Dashboard → Workers → gac → Triggers
   - 確認 4 個 Cron 定義存在

3. **檢查日誌**
   ```bash
   npx wrangler tail
   ```

✅ **確認**: 部署成功且所有功能正常

---

## 📊 **功能驗證清單**

### ✅ **Cron Triggers**

**測試方法**: 等待 5 分鐘，檢查是否有自動同步日誌

```bash
npx wrangler tail --format pretty
```

**預期輸出**:
```
[2025-10-04 10:05:00] Cron: Database sync started
[2025-10-04 10:05:01] Synced 150 records from D1 to PostgreSQL
```

### ✅ **R2 Storage**

**測試方法**: 上傳測試文件

```bash
# 創建測試文件
echo "Hello Cloudflare R2" > test.txt

# 使用 wrangler 上傳
npx wrangler r2 object put ai-agent-files/test.txt --file=test.txt

# 驗證上傳
npx wrangler r2 object get ai-agent-files/test.txt
```

**預期輸出**: 檔案內容正確返回

### ✅ **Queues**

**測試方法**: 發送測試消息

```typescript
// 在 Worker 中發送消息
await env.TASK_QUEUE.send({
  type: 'test',
  payload: { message: 'Hello from Queues' },
  timestamp: Date.now()
});
```

**檢查日誌**:
```bash
npx wrangler tail
```

**預期**: 看到消息被處理的日誌

---

## 💰 **成本監控**

### 1. **設定 Cloudflare Dashboard 監控**

1. 前往 **Account Home** → **Analytics**
2. 查看各項服務用量:
   - Workers requests
   - R2 storage & operations
   - Queues operations
   - D1 reads/writes

### 2. **設定每日成本警報**

創建檔案: `scripts/check-cloudflare-cost.sh`

```bash
#!/bin/bash
# 每日自動檢查 Cloudflare 成本
# 設定 cron: 0 9 * * * ~/check-cloudflare-cost.sh

# 從 Dashboard API 獲取用量 (需要 API Token)
ACCOUNT_ID="your-account-id"
API_TOKEN="your-api-token"

curl -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/billing/usage" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. **查看當月帳單**

```bash
# 前往 Dashboard
https://dash.cloudflare.com/[account-id]/billing
```

**設定提醒**:
- 當月用量達到 $10 時發郵件
- 當月用量達到 $30 時發簡訊
- 當月用量達到 $50 時暫停服務

---

## 🔧 **故障排除**

### 問題 1: Cron Triggers 未執行

**症狀**: 定時任務沒有觸發

**檢查步驟**:
1. 確認已升級到 Workers Paid Plan
2. 檢查 `wrangler.toml` 中 `[triggers]` 未註解
3. 重新部署: `npm run deploy`
4. 查看日誌: `npx wrangler tail`

**解決方案**:
```bash
# 手動觸發 Cron (測試用)
curl -X POST https://api.shyangtsuen.xyz/api/v1/admin/trigger-sync \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 問題 2: R2 Bucket 不存在

**症狀**: 部署時出現 "Bucket 'ai-agent-files' not found"

**解決方案**:
1. 在 Dashboard 創建 Bucket (名稱必須完全一致)
2. 確認 `wrangler.toml` 中的 `bucket_name` 正確
3. 重新部署

---

### 問題 3: Queues 綁定錯誤

**症狀**: "Queue 'ai-agent-tasks' not found"

**解決方案**:
1. 在 Dashboard 創建兩個 Queues:
   - ai-agent-tasks
   - ai-agent-backup
2. 確認 `wrangler.toml` 中 Queue 名稱一致
3. 重新部署

---

## 📝 **部署後檢查清單**

### Cloudflare 付費功能

- [ ] ✅ **Workers Paid Plan 已訂閱** ($5/月)
- [ ] ✅ **R2 Bucket 已創建**: ai-agent-files
- [ ] ✅ **Queues 已創建**: ai-agent-tasks, ai-agent-backup
- [ ] ✅ **Cron Triggers 正常運行** (檢查日誌)
- [ ] ✅ **預算警報已設定** ($20-50/月)

### 功能驗證

- [ ] ✅ **API Health Check 成功**
- [ ] ✅ **R2 文件上傳/下載正常**
- [ ] ✅ **Queues 消息處理正常**
- [ ] ✅ **Cron 自動執行確認** (等待 5 分鐘)
- [ ] ✅ **LLM Router 智能選擇正常**

### 成本監控

- [ ] ✅ **Dashboard Analytics 可查看**
- [ ] ✅ **每日成本警報已設定**
- [ ] ✅ **月度預算限制已設定**

---

## 🎯 **效能優化建議**

### 1. **Cron 頻率調整**

根據實際需求調整 `wrangler.toml`:

```toml
# 低流量環境 (省成本)
crons = [
  "*/15 * * * *",  # 每 15 分鐘同步
  "0 */2 * * *",   # 每 2 小時分發任務
]

# 高流量環境 (更新更快)
crons = [
  "*/2 * * * *",   # 每 2 分鐘同步
  "*/10 * * * *",  # 每 10 分鐘分發任務
]
```

### 2. **R2 存儲優化**

- 使用 **Infrequent Access** 儲存舊文件 ($0.01/GB vs $0.015/GB)
- 設定 Lifecycle rules 自動歸檔

### 3. **Queues 批次處理**

調整 `max_batch_size`:
- 低延遲需求: 5-10
- 高吞吐需求: 50-100

---

## 📚 **相關文檔**

- [COST-ANALYSIS.md](../COST-ANALYSIS.md) - 詳細成本分析
- [multi-llm-guide.md](./multi-llm-guide.md) - Multi-LLM 使用指南
- [PROJECT-CONTINUATION.md](../PROJECT-CONTINUATION.md) - 專案繼續執行指南

---

## 🆘 **支援資源**

- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- Cloudflare Queues Docs: https://developers.cloudflare.com/queues/
- Cloudflare Community: https://community.cloudflare.com/

---

**部署完成！** 🎉

**預期成本**: $10-20/月 (小型團隊輕量使用)
**下一步**: 配置 Gemini API Key 進一步降低 LLM 成本

**更新時間**: 2025-10-04
**作者**: AI Agent Team
