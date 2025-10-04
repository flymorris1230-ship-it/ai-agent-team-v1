# 🚀 專案繼續執行指南 (Project Continuation Guide)

> **關鍵字觸發**: 當開啟新的 Claude Code 終端機時，輸入 **"繼續執行專案"** 即可接續上一階段工作

---

## 📌 專案當前狀態

**專案名稱**: AI Agent Team v1
**架構版本**: v2.1 (Hybrid + Multi-LLM + Testing)
**最後更新**: 2025-10-04
**當前階段**: ✅ 核心功能與測試框架已完成，進入 API 配置與實際測試階段

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
- [x] 測試套件執行驗證 (18 tests passed)
- [x] TypeScript 編譯無錯誤

---

## 🎯 當前待辦事項 (Current TODO)

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

### 優先級 4: 部署準備
- [ ] **設定 API 預算上限**
  - OpenAI: https://platform.openai.com/account/billing/limits
  - Gemini: https://aistudio.google.com/app/apikey (查看用量)

- [ ] **部署到 Cloudflare Workers**
  ```bash
  npm run deploy
  ```

- [ ] **監控成本和性能**
  - 查看 LLM Router 統計
  - 確認成本節省效果

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
- `COST-ANALYSIS.md` - 成本分析報告
- `docs/multi-llm-guide.md` - Multi-LLM 使用指南
- `CLAUDE.md` - 開發規範
- `README.md` - 專案介紹

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
