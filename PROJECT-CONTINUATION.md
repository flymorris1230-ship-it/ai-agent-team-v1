# 🚀 專案繼續執行指南 (Project Continuation Guide)

> **關鍵字觸發**: 當開啟新的 Claude Code 終端機時，輸入 **"繼續執行專案"** 即可接續上一階段工作

---

## 📌 專案當前狀態

**專案名稱**: AI Agent Team v1
**架構版本**: v2.3 (Hybrid + Multi-LLM + Testing + Cloudflare Paid + pgvector)
**最後更新**: 2025-10-05
**當前階段**: ✅ pgvector 安裝完成，進入 RAG 系統整合階段
**預估成本**: $5-50/月 (視使用量而定)

---

## ✅ 已完成階段 (Completed Phases)

### Phase 1: 技術債務清理 ✅
- [x] 合併 `rag-engine-v2.ts` 到 `rag-engine.ts`
- [x] 刪除重複代碼，遵守 CLAUDE.md 規範
- [x] 修復 TypeScript 編譯錯誤
- [x] 提交 commit: "Consolidate RAG engines"

### Phase 2: 成本優化驗證 ✅
- [x] 創建 `COST-ANALYSIS.md` 成本分析報告
- [x] 註解 `wrangler.toml` 中的 Cron Triggers (避免 $5/月費用)
- [x] 創建 `scripts/nas-cron-setup.sh` (免費 NAS cron 替代方案)
- [x] 確認雙向存儲架構 (NAS PostgreSQL + Cloudflare)

### Phase 3: 多 LLM 智能路由系統 ✅
- [x] 實現 Provider 抽象層 (`BaseLLMProvider`)
- [x] 實現 OpenAI Provider (GPT-4o-mini, text-embedding-3-small)
- [x] 實現 Gemini Provider (Gemini 2.0 Flash, text-embedding-004)
- [x] 實現 LLM Router (cost/performance/balanced 三種策略)
- [x] 整合到 RAGEngine
- [x] 更新類型定義和環境變數
- [x] 創建 `docs/multi-llm-guide.md` 使用指南
- [x] 修復所有 TypeScript 編譯錯誤
- [x] 提交 commit (78f4a83): "Add multi-LLM intelligent routing system"

### Phase 4: 測試框架建立 ✅
- [x] 創建 LLM Router 集成測試 (`llm-router.test.ts`)
  - [x] Provider 選擇策略測試 (cost/performance/balanced)
  - [x] Failover 和可靠性測試
  - [x] 使用統計追蹤測試
  - [x] 成本估算測試
  - [x] 負載平衡測試
- [x] 創建 RAG Multi-LLM 集成測試 (`rag-multi-llm.test.ts`)
  - [x] 成本優化模式測試
  - [x] 平衡模式測試 (簡單/複雜查詢)
  - [x] 性能模式測試
  - [x] 文檔索引和語義搜尋測試
- [x] 擴展響應類型以包含 provider 和 cost 元數據
- [x] 測試套件執行驗證 (26 tests passed)
- [x] TypeScript 編譯無錯誤

### Phase 5: 啟用 Cloudflare 付費功能 ✅
- [x] 更新 `wrangler.toml` 啟用 Cron Triggers
- [x] 更新 `wrangler.toml` 啟用 R2 Storage
- [x] 更新 `wrangler.toml` 啟用 Queues
- [x] 更新 `.env.example` 添加付費功能配置
- [x] 更新 `COST-ANALYSIS.md` 完整付費方案成本估算
  - [x] 詳細定價分析 (Workers/R2/D1/Vectorize/Queues)
  - [x] 三種使用情境 (輕量/中等/重度)
  - [x] 方案比較表 (免費 vs 付費)
- [x] 創建 `docs/cloudflare-paid-deployment.md` 部署指南
  - [x] 完整部署流程 (6 個 Phase)
  - [x] 功能驗證清單
  - [x] 故障排除指南
  - [x] 成本監控方案

### Phase 6: pgvector 向量資料庫安裝 ✅
- [x] 使用 pgAdmin4 GUI 安裝 pgvector
  - [x] 登入 pgAdmin4 (https://postgres.shyangtsuen.xyz)
  - [x] 添加 NAS PostgreSQL Server 連接 (192.168.1.114:5532)
  - [x] 執行 `CREATE EXTENSION vector`
- [x] 創建生產環境向量表 `knowledge_vectors`
  - [x] UUID 主鍵 + 1536 維向量
  - [x] JSONB metadata 欄位
  - [x] 時間戳記欄位
- [x] 創建高效能索引
  - [x] ivfflat 向量索引 (100 lists, cosine similarity)
  - [x] GIN 索引 (metadata JSONB 查詢)
  - [x] B-tree 索引 (created_at 時間排序)
- [x] 測試向量操作
  - [x] Cosine 距離測試通過
  - [x] L2 距離測試通過
  - [x] Inner Product 測試通過
- [x] 更新文檔
  - [x] 更新 `docs/pgvector/STATUS.md` (標記為完成)
  - [x] 清理測試數據

---

## 🎯 當前待辦事項 (Current TODO)

### 優先級 0: Cloudflare Dashboard 操作 (必須) 🆕
- [ ] **升級到 Workers Paid Plan** ($5/月)
  - 前往: https://dash.cloudflare.com/[account-id]/workers/plans
  - 選擇 "Workers Paid" 並綁定信用卡

- [ ] **創建 R2 Bucket**
  - 前往: R2 → Create bucket
  - 名稱: `ai-agent-files`
  - 複製 Public URL 到 `.env`

- [ ] **創建 Queues** (2 個)
  - Queue 1: `ai-agent-tasks` (max_batch_size: 10)
  - Queue 2: `ai-agent-backup` (max_batch_size: 5)

- [ ] **設定預算警報**
  - 前往: Billing → Budget alerts
  - 設定上限: $20-50/月

### 優先級 1: 環境配置 (用戶操作)
- [ ] **獲取 Gemini API Key** (免費)
  - 前往: https://aistudio.google.com/app/apikey
  - 點擊 "Get API Key"
  - 複製 Key 到 `.env` 檔案

- [ ] **配置 .env 檔案**
  ```bash
  # 複製範本
  cp .env.example .env

  # 編輯並填入以下內容:
  OPENAI_API_KEY=sk-your-openai-key-here
  GEMINI_API_KEY=your-gemini-key-here
  LLM_STRATEGY=balanced
  PREFERRED_PROVIDER=
  USE_LLM_ROUTER=true
  ENABLE_POSTGRES_VECTOR=true
  ENABLE_HYBRID_SEARCH=false
  ```

### 優先級 2: NAS Cron 配置 (用戶操作)
- [ ] **在 NAS 上執行 cron 設置腳本**
  ```bash
  # 1. 複製腳本到 NAS
  scp scripts/nas-cron-setup.sh admin@192.168.1.114:/volume1/docker/ai-agent-backup/

  # 2. SSH 登入 NAS
  ssh admin@192.168.1.114

  # 3. 執行設置腳本
  cd /volume1/docker/ai-agent-backup
  chmod +x nas-cron-setup.sh
  ./nas-cron-setup.sh
  ```

### 優先級 3: 測試與驗證
- [x] **建立測試框架** ✅
  - [x] 創建 Multi-LLM Router 測試套件
  - [x] 創建 RAG Multi-LLM 集成測試
  - [x] 測試 cost/performance/balanced 策略
  - [x] 測試 failover 機制
  - [x] 測試成本計算和統計追蹤

- [ ] **執行實際 API 測試** (需配置 API Keys)
  - [ ] 測試 OpenAI embedding
  - [ ] 測試 Gemini embedding (免費)
  - [ ] 測試智能路由實際運作
  - [ ] 驗證成本節省效果

- [ ] **測試雙向存儲同步**
  - [ ] D1 → PostgreSQL 同步
  - [ ] PostgreSQL → D1 同步
  - [ ] 向量搜尋功能

### 優先級 4: 部署與監控
- [ ] **部署到 Cloudflare Workers**
  ```bash
  # 1. 驗證配置
  npm run typecheck

  # 2. 測試構建
  npm run build:test

  # 3. 部署到 Production
  npm run deploy
  ```

- [ ] **驗證部署功能**
  - [ ] API Health Check: `curl https://api.shyangtsuen.xyz/health`
  - [ ] Cron Triggers 運行 (等待 5 分鐘檢查日誌)
  - [ ] R2 文件上傳測試
  - [ ] Queues 消息處理測試

- [ ] **設定 API 預算上限**
  - OpenAI: https://platform.openai.com/account/billing/limits
  - Gemini: https://aistudio.google.com/app/apikey (查看用量)
  - Cloudflare: Dashboard → Billing → Budget alerts

- [ ] **監控成本和性能**
  - [ ] 查看 Cloudflare Dashboard Analytics
  - [ ] 查看 LLM Router 統計
  - [ ] 設定每日成本檢查腳本
  - [ ] 確認成本節省效果

---

## 🔧 快速啟動命令 (Quick Commands)

```bash
# 1. 檢查專案狀態
npm run typecheck

# 2. 執行測試
npm test

# 3. 本地開發模式
npm run dev

# 4. 部署到 Cloudflare
npm run deploy

# 5. 查看資料庫 (D1)
npx wrangler d1 execute ai-agent-db --command "SELECT * FROM agents LIMIT 5"

# 6. 查看日誌
npx wrangler tail
```

---

## 📁 重要檔案索引 (Key Files)

### 核心邏輯
- `src/main/js/core/rag-engine.ts` - RAG 引擎 (已整合 Multi-LLM)
- `src/main/js/llm/router.ts` - LLM 智能路由器
- `src/main/js/llm/providers/` - LLM Provider 實現
- `src/main/js/database/unified-db.ts` - 統一資料庫介面

### 配置檔案
- `wrangler.toml` - Cloudflare Workers 配置 (Cron 已註解)
- `.env.example` - 環境變數範本
- `package.json` - 依賴和腳本

### 文檔
- `CLAUDE.md` - 開發規範
- `README.md` - 專案介紹
- `PROJECT-CONTINUATION.md` - 本指南 (快速繼續)
- `docs/` - **完整文檔目錄** (已重新整理)
  - `docs/guides/` - 核心指南 (SESSION-SETUP, SESSION-STATUS, NEXT-STEPS)
  - `docs/cloudflare/` - Cloudflare 設定與診斷
  - `docs/nas/` - NAS 部署文檔
  - `docs/pgvector/` - pgvector 安裝指南
  - `docs/deployment/` - 部署指南 (包含 COST-ANALYSIS.md)
  - `docs/reports/` - 測試報告
- `docs/multi-llm-guide.md` - Multi-LLM 使用指南
- `config/` - 配置文件目錄
  - `config/docker/` - Docker Compose 和 Dockerfile
  - `config/proxy/` - PostgreSQL HTTP Proxy 配置
  - `config/examples/` - 環境變數範本

### 測試
- `src/main/js/__tests__/` - 測試檔案目錄

### 腳本
- `scripts/nas-cron-setup.sh` - NAS cron 設置腳本

---

## 💡 技術決策記錄 (Key Decisions)

### 1. 架構選擇
- **雙向存儲**: NAS PostgreSQL (主) + Cloudflare (邊緣快取)
- **成本考量**: 使用 NAS cron 替代 Cloudflare Cron ($5/月 → $0/月)
- **向量存儲**: PostgreSQL pgvector (免費) 優先於 Cloudflare Vectorize

### 2. Multi-LLM 策略
- **Provider**: OpenAI + Google Gemini
- **預設策略**: Balanced (平衡成本與品質)
  - Embeddings: Gemini (免費)
  - 簡單查詢 (<1000字): Gemini (免費)
  - 複雜查詢 (>1000字): OpenAI (品質優先)
- **容錯機制**: 自動 failover + 最多 2 次重試

### 3. 成本預估
- **完全免費方案**: $0/月 (純 Gemini)
- **平衡方案**: $2-8/月 (智能路由, 省 70%)
- **高性能方案**: $10-30/月 (純 OpenAI)

---

## 🔄 新 Session 快速啟動流程

當你開啟新的 Claude Code 終端機時:

1. **輸入關鍵字**: "繼續執行專案"

2. **AI 會自動**:
   - 讀取此文件 (`PROJECT-CONTINUATION.md`)
   - 了解當前專案狀態
   - 檢查待辦事項清單
   - 詢問你要執行哪個優先級的任務

3. **你可以回答**:
   - "執行優先級 1" (配置環境)
   - "執行優先級 2" (設置 NAS cron)
   - "執行優先級 3" (測試系統)
   - "查看專案狀態"
   - 或其他自訂需求

---

## 📊 專案健康度檢查 (Health Check)

執行以下命令確認專案狀態:

```bash
# TypeScript 編譯檢查
npm run typecheck

# 測試執行
npm test

# 環境變數檢查
cat .env | grep -E "(OPENAI_API_KEY|GEMINI_API_KEY|LLM_STRATEGY)"

# Git 狀態
git status
git log --oneline -5
```

**預期結果**:
- ✅ TypeScript 編譯無錯誤
- ✅ 所有測試通過
- ✅ API Keys 已設定
- ✅ Git 工作目錄乾淨

---

## 🆘 常見問題 (FAQ)

### Q: 如何確認 Multi-LLM 系統是否正常運作?
A: 查看 `docs/multi-llm-guide.md` 中的測試範例，或執行:
```typescript
const stats = router.getUsageStats();
console.log(stats); // 查看各 provider 的請求數量
```

### Q: 如何切換 LLM 策略?
A: 修改 `.env` 中的 `LLM_STRATEGY`:
- `cost` - 成本優先 (完全免費)
- `balanced` - 平衡模式 (推薦)
- `performance` - 性能優先

### Q: 如何確認 Cron 已正確禁用?
A: 查看 `wrangler.toml` 第 70-76 行，確認 `[triggers]` 區塊已註解。

### Q: NAS PostgreSQL 連線失敗怎麼辦?
A: 檢查 `.env` 中的:
```bash
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_DB=ai_agent_db
POSTGRES_USER=agent_user
POSTGRES_PASSWORD=your-password
```

---

## 📝 變更日誌 (Changelog)

### 2025-10-04 - v2.2
- ✅ 啟用 Cloudflare 付費功能 (Phase 5)
- ✅ 啟用 Cron Triggers (自動化定時任務)
- ✅ 啟用 R2 Storage (對象存儲 + 免費出站流量)
- ✅ 啟用 Queues (異步任務處理)
- ✅ 完整成本估算 (輕量 $10/月, 中等 $18/月, 重度 $40/月)
- ✅ 創建部署指南 (docs/cloudflare-paid-deployment.md)
- ✅ 更新 .env.example (付費功能配置)
- ✅ 預估成本範圍: $5-50/月

### 2025-10-04 - v2.1
- ✅ 建立完整測試框架 (Phase 4)
- ✅ 創建 Multi-LLM Router 集成測試 (15 tests)
- ✅ 創建 RAG Multi-LLM 集成測試 (11 tests)
- ✅ 擴展響應類型 (provider & cost 元數據)
- ✅ 測試 cost/performance/balanced 策略
- ✅ Session 初始化系統 (.claude-session-init.sh)

### 2025-10-04 - v2.0
- ✅ 實現 Multi-LLM 智能路由系統
- ✅ 整合 OpenAI + Gemini API
- ✅ 成本優化: 可節省 50%-100%
- ✅ 註解 Cloudflare Cron Triggers
- ✅ 創建 NAS cron 替代方案

### 2025-10-04 - v1.5
- ✅ 合併 RAG Engine v2 功能
- ✅ 清理技術債務
- ✅ 完成成本分析報告

---

**🎯 記住**: 開啟新終端機時，只需輸入 **"繼續執行專案"**，AI 就會自動接續工作！
