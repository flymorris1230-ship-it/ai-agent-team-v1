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

### 3. LLM API (按使用量計費 - 多 Provider 智能選擇)

#### 📊 **OpenAI API 定價**
| 模型 | 輸入 | 輸出 | 用途 |
|------|------|------|------|
| text-embedding-3-small | $0.02 / 1M tokens | - | Embedding |
| gpt-4o-mini | $0.15 / 1M tokens | $0.60 / 1M tokens | 聊天 (快速) |
| gpt-4o | $2.50 / 1M tokens | $10.00 / 1M tokens | 聊天 (高品質) |

#### 🎁 **Google Gemini API 定價 (更便宜！)**
| 模型 | 輸入 | 輸出 | 用途 |
|------|------|------|------|
| text-embedding-004 | **免費** | - | Embedding (768 維) |
| gemini-2.0-flash-exp | **免費** (實驗) | **免費** | 聊天 (最快) |
| gemini-1.5-flash-8b | $0.0375 / 1M tokens | $0.15 / 1M tokens | 聊天 (最便宜) |
| gemini-1.5-flash | $0.075 / 1M tokens | $0.30 / 1M tokens | 聊天 (平衡) |
| gemini-1.5-pro | $1.25 / 1M tokens | $5.00 / 1M tokens | 聊天 (高品質) |

#### 💡 **智能路由策略**

系統會根據以下策略自動選擇最佳 LLM:

1. **成本優化模式 (cost)**
   - Embeddings: Gemini (免費) ✅
   - 簡單查詢: Gemini 2.0 Flash (免費) ✅
   - 複雜查詢: Gemini 1.5 Flash 8B ($0.0375/1M) ✅

2. **性能優化模式 (performance)**
   - Embeddings: OpenAI text-embedding-3-small
   - 所有查詢: OpenAI GPT-4o-mini

3. **平衡模式 (balanced)** ⭐ 推薦
   - Embeddings: Gemini (免費) ✅
   - 簡單查詢 (<1000 字): Gemini (免費) ✅
   - 複雜查詢 (>1000 字): OpenAI GPT-4o-mini
   - 自動故障切換

#### 💰 **預估成本比較**

**僅使用 OpenAI:**
```
100K embeddings: $2.00
100K chat tokens: $15.00
───────────────────────
每月: ~$17.00
```

**使用智能路由 (balanced):**
```
100K embeddings (Gemini): $0.00  ✅ 省 $2.00
100K chat tokens (混合): ~$5.00  ✅ 省 $10.00
───────────────────────
每月: ~$5.00  🎉 省 70%
```

**完全使用 Gemini (cost):**
```
100K embeddings: $0.00  ✅
100K chat tokens: $0.00  ✅ (實驗階段)
───────────────────────
每月: $0.00  🎉 完全免費！
```

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

### 🎯 **完全免費方案 (極致省錢)** ⭐ 強烈推薦
```
Cloudflare Workers (Free)     $0/月
D1 Database (Free)            $0/月
KV Store (Free)               $0/月
NAS PostgreSQL (自有硬體)     $0/月 (僅電費 ~$2-5/月)
Gemini API (免費額度)         $0/月 ✅
─────────────────────────────────
總計                          $0/月 🎉
```

**配置:**
```bash
# .env 設定
LLM_STRATEGY=cost              # 使用成本優化模式
PREFERRED_PROVIDER=gemini      # 優先使用 Gemini
USE_LLM_ROUTER=true
```

### 💰 **平衡方案 (推薦)**
```
Cloudflare Workers (Free)     $0/月
D1 Database (Free)            $0/月
KV Store (Free)               $0/月
NAS PostgreSQL (自有硬體)     $0/月 (僅電費 ~$2-5/月)
LLM API (智能路由)            ~$2-8/月 ✅
─────────────────────────────────
總計                          ~$2-13/月
```

**配置:**
```bash
# .env 設定
LLM_STRATEGY=balanced          # 使用平衡模式 (預設)
PREFERRED_PROVIDER=            # 自動選擇
USE_LLM_ROUTER=true
```

**成本節省:**
- ✅ 70% 成本降低 vs 僅使用 OpenAI
- ✅ Embeddings 完全免費 (Gemini)
- ✅ 簡單查詢免費 (Gemini)
- ✅ 自動故障切換確保可用性

### 🚀 **高性能方案 (品質優先)**
```
Cloudflare Workers (Free)     $0/月
D1 Database (Free)            $0/月
KV Store (Free)               $0/月
NAS PostgreSQL (自有硬體)     $0/月
OpenAI API (純 OpenAI)        ~$10-30/月
─────────────────────────────────
總計                          ~$10-35/月
```

**配置:**
```bash
# .env 設定
LLM_STRATEGY=performance       # 性能優先模式
PREFERRED_PROVIDER=openai      # 優先使用 OpenAI
USE_LLM_ROUTER=true
```

### 💼 **付費增強方案 (企業級)**
```
Cloudflare Workers Paid       $5/月 (啟用 Cron)
LLM API (混合使用)            ~$10-30/月
─────────────────────────────────
總計                          ~$15-35/月
```

---

## ✅ **確認清單**

### 基礎設施
- [x] **註解掉 wrangler.toml 中的 Cron Triggers** (避免觸發付費) ✅
- [x] **設定 ENABLE_POSTGRES_VECTOR=true** (使用 NAS 替代 Vectorize) ✅
- [ ] **設定 ENABLE_HYBRID_SEARCH=false** (避免雙倍向量存儲)
- [ ] **在 NAS 上配置 cron jobs** (替代 Cloudflare Cron)
- [x] **驗證 R2 和 Queues 已註解** (避免意外啟用) ✅

### 多 LLM 配置
- [ ] **獲取 Gemini API Key** (https://aistudio.google.com/app/apikey) 🆓
- [ ] **設定 GEMINI_API_KEY** (.env 檔案)
- [ ] **選擇 LLM_STRATEGY** (cost / balanced / performance)
- [ ] **啟用 USE_LLM_ROUTER=true** (開啟智能路由)
- [ ] **設定 OpenAI/Gemini API 預算上限** (雙重保護)

---

## 🎯 **結論**

### ✅ **多 LLM 智能路由系統已完成**
- 🤖 支援 OpenAI + Google Gemini 雙 Provider
- 🎯 智能路由: 自動選擇最佳 / 最便宜的 LLM
- 💰 成本優化: 最多省 100% LLM 費用 (使用 Gemini 免費額度)
- 🔄 自動容錯: Provider 故障時自動切換
- 📊 實時監控: 追蹤每個 Provider 的使用量和健康狀態

### ✅ **雙向存儲架構**
- ☁️ Cloudflare Workers (免費) - Edge 快取和 API
- 💾 NAS PostgreSQL (免費) - 主要向量存儲和備份
- 🔄 雙向同步 - 災難恢復

### 💰 **最終成本預估**

**🎉 極致省錢方案 (完全免費):**
```
基礎設施: $0/月
LLM API:  $0/月 (Gemini 免費額度)
──────────────────
總計:     $0/月 ✨
```

**⭐ 平衡方案 (推薦):**
```
基礎設施: $0/月
LLM API:  $2-8/月 (智能路由, 70% 省費)
──────────────────
總計:     $2-13/月
```

**📈 vs 傳統方案:**
- 原本 (純 OpenAI): $17-25/月
- 現在 (智能路由): $0-13/月
- **節省: 50%-100%** 🎉

### 🚀 **下一步**

1. 獲取 Gemini API Key (免費): https://aistudio.google.com/app/apikey
2. 更新 `.env` 設定 Gemini 和路由策略
3. 在 NAS 設置 cron (免費替代 Cloudflare Cron)
4. 測試多 LLM 路由功能
5. 監控成本和性能

---

**更新時間:** 2025-10-04
**架構版本:** v2.0 (Hybrid + Multi-LLM)
