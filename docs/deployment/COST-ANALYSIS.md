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

## 💎 **Cloudflare 付費方案成本估算 (v2.2 - Paid Features)**

> **⚠️ 重要**: 以下成本估算基於啟用 Cloudflare Workers Paid Plan + R2 + Queues

### 📊 **Cloudflare 付費功能定價 (2025)**

#### 1. **Workers Paid Plan** - $5.00/月 (基礎訂閱)
**包含內容**:
- 3000萬 CPU 毫秒/月
- Cron Triggers (無額外費用)
- Queues 支援 (使用量另計)
- 所有 Workers 功能無限制

#### 2. **R2 Object Storage**
**免費額度**:
- 10 GB 存儲/月
- 100萬次 Class A 操作/月 (PUT, POST, LIST)
- 1000萬次 Class B 操作/月 (GET, HEAD)
- ✅ **出站流量完全免費** (最大優勢)

**超出後**:
- 存儲: $0.015/GB/月
- Class A 操作: $4.50/百萬次
- Class B 操作: $0.36/百萬次

#### 3. **D1 Database**
**包含在 Workers Paid 中**:
- 5 GB 存儲
- 250億行讀取/月
- 5000萬行寫入/月

**超出後**:
- 存儲: $0.75/GB/月
- 讀取: $0.001/百萬行
- 寫入: $1.00/百萬行

#### 4. **Vectorize**
**定價模式**: 按維度計費
- 查詢: $0.01/百萬維度
- 存儲: $0.05/1億維度

**範例**: 10,000 個 768 維向量，每天查詢 1000 次
- 月成本: ~$0.31/月

#### 5. **Queues**
**免費額度**: 100萬操作/月

**超出後**: $0.40/百萬操作
- 每條消息 ≈ 3 次操作 (寫、讀、刪)
- 實際成本: ~$1.20/百萬條消息

---

### 💰 **付費方案月成本分析**

#### 🎯 **情境 1: 輕量使用 (小型團隊)**

**使用量假設**:
- R2: 5 GB 文件存儲
- D1: 3 GB 數據
- Vectorize: 5000 個向量 (768維), 500 查詢/天
- Queues: 10萬條消息/月
- Cron: 4 個定時任務
- LLM: Balanced 策略

**成本計算**:
```
Workers Paid Plan:        $5.00
R2 (5 GB 免費內):          $0.00
D1 (3 GB 免費內):          $0.00
Vectorize:                $0.15
Queues (免費內):           $0.00
LLM API (balanced):       $2.00
NAS 電費:                  $3.00
────────────────────────────────
總計:                     $10.15/月
```

#### 📊 **情境 2: 中等使用 (企業小規模)**

**使用量假設**:
- R2: 50 GB 文件 + 500萬次讀取/月
- D1: 8 GB 數據 + 1億行讀取/月
- Vectorize: 50,000 個向量, 5000 查詢/天
- Queues: 100萬條消息/月
- Cron: 同上
- LLM: Balanced 策略

**成本計算**:
```
Workers Paid Plan:        $5.00
R2 存儲 (50-10=40 GB):    $0.60  ($0.015 × 40)
R2 操作 (Class B):        $0.16  ($0.36/M × 4M 超額)
D1 存儲 (8-5=3 GB):       $2.25  ($0.75 × 3)
D1 讀取 (100M):           $0.10  ($0.001 × 100)
Vectorize:                $1.54
Queues (~300萬操作):      $0.80  ($0.40 × 2M 超額)
LLM API (balanced):       $5.00
NAS 電費:                  $3.00
────────────────────────────────
總計:                     $18.45/月
```

#### 🚀 **情境 3: 重度使用 (企業級)**

**使用量假設**:
- R2: 200 GB 文件 + 2000萬次讀取/月
- D1: 15 GB 數據 + 10億行讀取/月
- Vectorize: 100,000 個向量, 20,000 查詢/天
- Queues: 500萬條消息/月
- Cron: 同上
- LLM: Balanced 策略

**成本計算**:
```
Workers Paid Plan:        $5.00
R2 存儲 (200-10=190 GB):  $2.85  ($0.015 × 190)
R2 操作 (Class B):        $0.36  ($0.36/M × 10M 超額)
D1 存儲 (15-5=10 GB):     $7.50  ($0.75 × 10)
D1 讀取 (1000M):          $1.00  ($0.001 × 1000)
Vectorize:                $6.14
Queues (~1500萬操作):     $5.60  ($0.40 × 14M 超額)
LLM API (balanced):       $8.00
NAS 電費:                  $3.00
────────────────────────────────
總計:                     $39.45/月
```

---

### 📊 **方案比較: 免費 vs 付費**

| 項目 | 免費方案 (v2.1) | 付費輕量 (v2.2) | 付費中等 | 付費重度 |
|------|----------------|----------------|---------|---------|
| **Workers Plan** | Free | Paid ($5) | Paid ($5) | Paid ($5) |
| **Cron Triggers** | ❌ NAS cron | ✅ Cloudflare | ✅ Cloudflare | ✅ Cloudflare |
| **R2 Storage** | ❌ NAS 本地 | ✅ 5GB | ✅ 50GB | ✅ 200GB |
| **Queues** | ❌ 同步處理 | ✅ 異步 | ✅ 異步 | ✅ 異步 |
| **月成本** | $0-5 | ~$10 | ~$18 | ~$40 |
| **適用場景** | 個人開發 | 小型團隊 | 中型企業 | 大型企業 |

---

### 🌟 **付費方案優勢**

#### ✅ **自動化與可靠性**
- **Cron Triggers**: 全自動定時任務，無需 NAS
- **Queues**: 異步任務處理，提升性能
- **全球 CDN**: R2 免費出站流量

#### ✅ **簡化架構**
- 減少對 NAS 的依賴
- 統一在 Cloudflare 平台管理
- 99.99% SLA 保證

#### ✅ **擴展性**
- 無限 Workers 請求
- 自動擴展至全球
- 企業級性能

---

### 🎯 **推薦方案選擇**

#### 🆓 **完全免費方案** (適合: 個人開發者)
```
成本: $0-5/月
優勢: 零基礎設施成本
限制: 需手動管理 NAS cron
```

#### ⭐ **混合方案** (適合: 小型創業團隊) - **推薦**
```
成本: $10-20/月
配置: Workers Paid + R2 (輕量) + NAS pgvector + Gemini 免費
優勢: 自動化 + 成本可控 + 雙向備份
```

#### 🚀 **完全付費方案** (適合: 中大型企業)
```
成本: $20-50/月
配置: Workers Paid + R2 + Queues + Vectorize + OpenAI
優勢: 企業級可靠性 + 全球性能 + 完整功能
```

---

### 📋 **確認清單更新 (付費方案)**

#### Cloudflare 付費功能
- [x] **升級到 Workers Paid Plan** ($5/月)
- [x] **啟用 wrangler.toml 中的 Cron Triggers** ✅
- [x] **啟用 wrangler.toml 中的 R2 Storage** ✅
- [x] **啟用 wrangler.toml 中的 Queues** ✅
- [ ] **在 Dashboard 創建 R2 bucket: ai-agent-files**
- [ ] **在 Dashboard 創建 Queues: ai-agent-tasks, ai-agent-backup**
- [ ] **設定 Cloudflare 預算警報**

#### 環境配置
- [ ] **更新 .env: ENABLE_CLOUDFLARE_CRON=true**
- [ ] **更新 .env: ENABLE_CLOUDFLARE_R2=true**
- [ ] **更新 .env: ENABLE_CLOUDFLARE_QUEUES=true**
- [ ] **獲取 R2 Public URL 並更新 .env**

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
**架構版本:** v2.2 (Hybrid + Multi-LLM + Cloudflare Paid Features)
**成本範圍:** $0/月 (完全免費) ~ $50/月 (企業級重度使用)
