# 💰 成本分析報告 (Cost Analysis Report)

## 📊 專案架構概覽

此專案採用 **混合架構 (Hybrid Architecture)**：
- **Cloudflare Workers (免費層)** - Edge 計算和快取
- **NAS PostgreSQL + pgvector** - 主要向量存儲和備份
- **雙向同步機制** - 資料備援和災難恢復

---

## ✅ **免費服務 (已啟用)**

### 1. Cloudflare Workers Free Plan
- ✅ **D1 Database** (SQLite)
  - 免費額度: 10 個數據庫 / 5GB 存儲 / 500萬次讀取/天
  - 用途: 元數據、任務、對話記錄
  - 成本: **$0/月**

- ✅ **Vectorize** (向量數據庫) - **可選使用**
  - 免費額度: 3000萬 vectors / 3000萬次查詢/月
  - 用途: 備援向量搜尋 (可透過 `ENABLE_POSTGRES_VECTOR=true` 改用 NAS)
  - 成本: **$0/月**

- ✅ **KV Store** (快取)
  - 免費額度: 100,000 次讀取/天
  - 用途: API 回應快取、session 存儲
  - 成本: **$0/月**

- ✅ **Workers** (無伺服器計算)
  - 免費額度: 100,000 次請求/天
  - 用途: API 端點、RAG 服務
  - 成本: **$0/月**

### 2. NAS 本地服務
- ✅ **PostgreSQL + pgvector**
  - 免費 (自有 NAS 硬體)
  - 用途: 主要向量存儲、文檔管理、備份
  - 成本: **$0/月** (僅電費)

### 3. OpenAI API (按使用量計費)
- ⚠️ **text-embedding-3-small**: $0.00002 / 1K tokens
- ⚠️ **gpt-4o-mini**: $0.150 / 1M 輸入 tokens, $0.600 / 1M 輸出 tokens
- 預估成本: **視使用量** (建議設定每月預算上限)

---

## ⚠️ **潛在付費服務 (已禁用但需確認)**

### 🔴 問題 1: Cron Triggers (定時任務)

**現況:**
```toml
# wrangler.toml 第 70-76 行
[triggers]
crons = [
  "*/5 * * * *",   # Database sync every 5 minutes
  "*/30 * * * *",  # Task distribution every 30 minutes
  "0 2 * * *",     # Daily full backup at 2 AM
  "0 */6 * * *",   # R2 sync every 6 hours
]
```

**問題分析:**
- ❌ **此配置未被註解掉**，可能會觸發付費計劃
- Workers Free Plan **不支援 Cron Triggers**
- 需要升級到 **Workers Paid ($5/月)** 才能使用

**建議解決方案:**
1. **方案 A (免費)**: 註解掉 Cron，改用 NAS 本地 Cron 執行同步
2. **方案 B (付費)**: 保留 Cloudflare Cron ($5/月)

---

### 🟡 問題 2: R2 Storage (對象存儲)

**現況:**
```toml
# wrangler.toml 第 40-42 行 (已註解)
# [[r2_buckets]]
# binding = "STORAGE"
# bucket_name = "ai-agent-files"
```

**狀態:** ✅ 已正確註解，使用 NAS 存儲替代
**成本:** **$0/月**

---

### 🟡 問題 3: Queues (消息隊列)

**現況:**
```toml
# wrangler.toml 第 56-63 行 (已註解)
# [[queues.producers]]
# binding = "TASK_QUEUE"
# queue = "ai-agent-tasks"
```

**狀態:** ✅ 已正確註解
**成本:** **$0/月**

---

## 🔧 **雙向存儲架構確認**

### ✅ PostgreSQL 向量存儲 (已實現)

**配置檔案檢查:**

1. **.env.example**
   ```bash
   ENABLE_POSTGRES_VECTOR=true      # ✅ 啟用 PostgreSQL 向量
   ENABLE_HYBRID_SEARCH=false       # ✅ 關閉混合模式 (省成本)
   POSTGRES_HOST=192.168.1.114
   POSTGRES_PORT=5532
   ```

2. **RAGEngine 實作** (`src/main/js/core/rag-engine.ts`)
   ```typescript
   usePostgresVector: config?.usePostgresVector ?? false,  // 可設為 true
   hybridSearch: config?.hybridSearch ?? false,            // 建議 false
   ```

3. **UnifiedDatabase** (`src/main/js/database/unified-db.ts`)
   - ✅ 自動路由到 PostgreSQL 或 D1
   - ✅ 向量搜尋使用 pgvector
   - ✅ 元數據使用 D1

---

## 📋 **建議配置 (完全免費方案)**

### 1. 修正 wrangler.toml

```toml
# ==========================================
# Cron Triggers (for scheduled tasks)
# ==========================================
# Note: Cron triggers require Workers Paid plan ($5/month)
# Disabled - Using NAS cron instead for free alternative

# [triggers]
# crons = [
#   "*/5 * * * *",   # Database sync every 5 minutes
#   "*/30 * * * *",  # Task distribution every 30 minutes
#   "0 2 * * *",     # Daily full backup at 2 AM
#   "0 */6 * * *",   # R2 sync every 6 hours
# ]
```

### 2. 配置 .env

```bash
# 使用 NAS PostgreSQL 作為主要向量存儲
ENABLE_POSTGRES_VECTOR=true

# 關閉混合搜尋 (避免使用 Cloudflare Vectorize)
ENABLE_HYBRID_SEARCH=false

# 啟用自動同步 (透過 NAS cron)
ENABLE_AUTO_SYNC=true
SYNC_INTERVAL_SECONDS=300
```

### 3. NAS Cron 配置 (替代 Cloudflare Cron)

在 NAS 上建立 crontab:
```bash
# 每 5 分鐘同步一次
*/5 * * * * /volume1/docker/ai-agent-backup/sync.sh

# 每天凌晨 2 點全量備份
0 2 * * * /volume1/docker/ai-agent-backup/full-backup.sh
```

---

## 💵 **總成本估算**

### 完全免費方案 (建議)
```
Cloudflare Workers (Free)     $0/月
D1 Database (Free)            $0/月
KV Store (Free)               $0/月
NAS PostgreSQL (自有硬體)     $0/月 (僅電費 ~$2-5/月)
OpenAI API (按用量)           ~$5-20/月 (視使用量)
─────────────────────────────────
總計                          ~$5-25/月 (主要是 OpenAI)
```

### 付費增強方案 (可選)
```
Cloudflare Workers Paid       $5/月 (啟用 Cron)
Cloudflare Vectorize          $0/月 (免費額度內)
OpenAI API                    ~$10-50/月 (更高用量)
─────────────────────────────────
總計                          ~$15-55/月
```

---

## ✅ **確認清單**

- [ ] **註解掉 wrangler.toml 中的 Cron Triggers** (避免觸發付費)
- [ ] **設定 ENABLE_POSTGRES_VECTOR=true** (使用 NAS 替代 Vectorize)
- [ ] **設定 ENABLE_HYBRID_SEARCH=false** (避免雙倍向量存儲)
- [ ] **在 NAS 上配置 cron jobs** (替代 Cloudflare Cron)
- [ ] **設定 OpenAI API 預算上限** (控制成本)
- [ ] **驗證 R2 和 Queues 已註解** (避免意外啟用)

---

## 🎯 **結論**

✅ **雙向存儲架構已正確實現**
- Cloudflare Workers (免費) - Edge 快取和 API
- NAS PostgreSQL (免費) - 主要向量存儲和備份

⚠️ **需要修正的問題**
- 註解掉 `wrangler.toml` 中的 Cron Triggers
- 改用 NAS 本地 Cron 執行定時任務

💰 **預期成本**
- **$0/月** (Cloudflare 服務)
- **~$5-25/月** (OpenAI API，視使用量)

---

**生成時間:** 2025-10-04
**架構版本:** v1.0 (Hybrid)
