# ai-agent-team-v1

**Cloudflare + NAS + RAG + Multi-LLM 企業級 AI Agent 團隊系統**

> **Version**: v2.2 (Hybrid + Multi-LLM + Cloudflare Paid Features)
> **Cost**: $5-50/month (視使用量)
> **Last Updated**: 2025-10-04

## 📋 專案概述

這是一個基於 Cloudflare Workers 的企業級 AI Agent 協作系統，整合了：
- ✅ **多 Agent 協作框架**：9 個專業 AI Agent 協同工作
- ✅ **RAG 系統**：語義檢索 + PostgreSQL pgvector
- ✅ **Multi-LLM 智能路由**：OpenAI + Gemini 自動選擇最佳/最便宜 LLM
- ✅ **MCP 協議整合**：支援外部數據爬取和整合
- ✅ **雙向備份**：Cloudflare ↔ NAS 災難恢復
- ✅ **企業級安全**：加密、認證、審計
- ✅ **自動化運維**：Cron Triggers + Queues + R2 Storage

## 🎯 核心特性 (v2.2)

### 💰 **智能成本優化**
- **Multi-LLM Router**: 自動選擇 OpenAI/Gemini，節省 50%-100% LLM 成本
- **Gemini 免費額度**: Embeddings 完全免費，Chat 實驗版免費
- **智能路由策略**: cost/performance/balanced 三種模式
- **成本追蹤**: 自動計算每次請求成本

### 🚀 **Cloudflare 付費功能**
- **Cron Triggers**: 自動化定時任務 (數據同步/備份)
- **R2 Storage**: 全球 CDN + 免費出站流量
- **Queues**: 異步任務處理，提升性能
- **Workers Paid**: $5/月基礎訂閱，企業級 SLA

### 🧪 **完整測試框架**
- **26+ 測試用例**: LLM Router + RAG Multi-LLM 集成測試
- **多策略驗證**: cost/performance/balanced 策略測試
- **Failover 測試**: 自動容錯機制驗證
- **成本比較**: 實際成本節省效果演示

## 🎯 快速開始

### 方式一：使用輔助腳本 (推薦)

```bash
# 1. 部署前檢查
./scripts/pre-deployment-check.sh

# 2. 快速部署
./scripts/quick-deploy.sh production

# 3. 監控成本
./scripts/monitor-costs.sh
```

### 方式二：手動步驟

1. **閱讀文檔**
   - [CLAUDE.md](./CLAUDE.md) - 開發規則和指南
   - [PROJECT-CONTINUATION.md](./PROJECT-CONTINUATION.md) - 專案當前狀態
   - [COST-ANALYSIS.md](./COST-ANALYSIS.md) - 成本分析

2. **環境配置**
   ```bash
   cp .env.example .env
   # 編輯 .env 填入 API Keys
   ```

3. **部署**
   ```bash
   npm run typecheck
   npm run deploy
   ```

### 繼續執行專案 (新 Session)

```bash
# 1. 初始化 session (自動拉取最新狀態)
./.claude-session-init.sh

# 2. 在 Claude Code 中輸入
繼續執行專案
```

## 🏗️ 專案結構

```
ai-agent-team-v1/
├── CLAUDE.md                      # Claude Code 開發規則
├── ai_agent_team_config.txt       # AI Agent 團隊配置
├── src/                           # 源代碼
│   ├── main/
│   │   ├── python/               # Python 組件
│   │   │   ├── core/            # 核心邏輯
│   │   │   ├── utils/           # 工具函數
│   │   │   ├── models/          # 數據模型
│   │   │   ├── services/        # 服務層
│   │   │   ├── api/             # API 端點
│   │   │   ├── training/        # ML 訓練
│   │   │   ├── inference/       # 推理引擎
│   │   │   └── evaluation/      # 模型評估
│   │   ├── js/                  # JavaScript/TypeScript 組件
│   │   └── resources/           # 配置和資源
│   │       ├── config/
│   │       ├── data/
│   │       └── assets/
│   └── test/                     # 測試代碼
│       ├── unit/
│       ├── integration/
│       └── fixtures/
├── data/                         # 數據管理
│   ├── raw/                     # 原始數據
│   ├── processed/               # 處理後數據
│   ├── external/                # 外部數據
│   └── temp/                    # 臨時數據
├── notebooks/                    # Jupyter notebooks
│   ├── exploratory/             # 探索性分析
│   ├── experiments/             # 實驗記錄
│   └── reports/                 # 分析報告
├── models/                       # ML 模型
│   ├── trained/                 # 訓練完成的模型
│   ├── checkpoints/             # 訓練檢查點
│   └── metadata/                # 模型元數據

├── experiments/                  # 實驗追蹤
│   ├── configs/                 # 實驗配置
│   ├── results/                 # 實驗結果
│   └── logs/                    # 訓練日誌
├── docs/                         # 文檔
│   ├── api/                     # API 文檔
│   ├── user/                    # 用戶指南
│   └── dev/                     # 開發者文檔
├── tools/                        # 開發工具
├── scripts/                      # 自動化腳本
├── examples/                     # 使用範例
├── output/                       # 生成的輸出
├── logs/                         # 日誌文件
└── tmp/                          # 臨時文件
```

## 🤖 AI Agent 團隊

### 核心 Agent
1. **Coordinator** - 協調者，負責任務調度
2. **Product Manager** - 產品經理，負責需求分析
3. **Solution Architect** - 架構師，負責系統設計

### 開發 Agent
4. **Backend Developer** - 後端工程師（TypeScript/Cloudflare Workers）
5. **Frontend Developer** - 前端工程師（React/SvelteKit）
6. **QA Engineer** - 測試工程師

### 運維 Agent
7. **DevOps Engineer** - 運維工程師（部署和監控）
8. **Data Analyst** - 數據分析師
9. **Knowledge Manager** - 知識管理員

## 🛠️ 技術棧

### Cloudflare 平台 (Workers Paid Plan - $5/月)
- **Workers** - 無服務器運算 (無限請求)
- **D1** - SQLite 數據庫 (5GB 免費)
- **Vectorize** - 向量數據庫 (可選，推薦用 NAS pgvector)
- **R2** ✅ - 對象存儲 (10GB 免費 + 免費出站流量)
- **KV** - 鍵值存儲 (1GB 免費)
- **Queues** ✅ - 消息隊列 (100萬操作/月免費)
- **Cron Triggers** ✅ - 定時任務 (無額外費用)

### AI/ML (Multi-LLM 智能路由)
- **OpenAI API** - GPT-4o-mini, text-embedding-3-small
- **Google Gemini** - Gemini 2.0 Flash (免費), text-embedding-004 (免費)
- **LLM Router** - 自動選擇最佳 Provider (cost/performance/balanced)
- **RAG Engine** - Retrieval-Augmented Generation
- **PostgreSQL pgvector** - 向量存儲 (NAS 免費)

### 開發框架
- **TypeScript** - 主要開發語言
- **Hono.js** - 輕量級路由框架
- **Vitest** - 測試框架 (26+ 測試用例)
- **React / SvelteKit** - 前端框架 (未來)
- **TailwindCSS** - UI 樣式 (未來)

### 基礎設施 (混合架構)
- **Cloudflare Workers** - Edge 計算 + API
- **NAS PostgreSQL** - 主要數據存儲 + 向量搜尋
- **雙向同步** - Cloudflare ↔ NAS 自動備份
- **Wrangler** - Cloudflare CLI 工具

## 📦 安裝與設置

### 前置要求
```bash
# Node.js 18+
node --version

# Cloudflare Wrangler
npm install -g wrangler

# 登入 Cloudflare
wrangler login
```

### 環境配置
```bash
# 複製環境變量範本
cp .env.example .env

# 編輯配置
vim .env
```

### 初始化資源

#### 1. Cloudflare Dashboard 操作 (Workers Paid 必須)

```
1. 升級 Workers Paid Plan ($5/月)
   https://dash.cloudflare.com/[account-id]/workers/plans

2. 創建 R2 Bucket
   Dashboard → R2 → Create bucket
   名稱: ai-agent-files

3. 創建 Queues (2 個)
   Dashboard → Queues → Create
   - ai-agent-tasks (max_batch_size: 10)
   - ai-agent-backup (max_batch_size: 5)

4. 設定預算警報
   Dashboard → Billing → Budget alerts
   建議上限: $20-50/月
```

#### 2. CLI 創建資源

```bash
# 創建 D1 數據庫
wrangler d1 create ai-agent-db

# 創建 Vectorize 索引 (可選，推薦用 NAS pgvector)
wrangler vectorize create ai-agent-vectors --dimensions=1536 --metric=cosine

# 驗證 R2 bucket (已在 Dashboard 創建)
npx wrangler r2 bucket list
```

## 🚀 開發指南

### 開發規則
- ✅ **永遠先搜索** - 使用 Grep/Glob 找到現有實現
- ✅ **擴展而非重複** - 單一數據源原則
- ✅ **使用 Task agents** - 處理長時間運行的操作
- ✅ **每個任務後提交** - 保持小而頻繁的提交
- ✅ **GitHub 自動備份** - 每次提交後推送

### 工作流程
1. **需求分析** → PM Agent 撰寫 PRD
2. **架構設計** → Architect 設計技術方案
3. **並行開發** → Backend + Frontend 同步開發
4. **測試驗證** → QA 執行測試
5. **部署上線** → DevOps 部署到 Cloudflare
6. **監控優化** → Data Analyst 分析數據

## 📊 備份策略

### Cloudflare → NAS
- **實時增量備份** - 數據變更時觸發
- **每小時增量備份** - Cron 觸發
- **每天全量備份** - 02:00 執行
- **R2 同步** - 每 6 小時同步文件

### 恢復目標
- **RTO (恢復時間)** - 4 小時
- **RPO (恢復點)** - 1 小時

## 📚 文檔

### 核心文檔
- **[PROJECT-CONTINUATION.md](./PROJECT-CONTINUATION.md)** - 專案當前狀態與待辦事項
- **[CLAUDE.md](./CLAUDE.md)** - Claude Code 開發規則與指南
- **[COST-ANALYSIS.md](./COST-ANALYSIS.md)** - 完整成本分析 ($0-50/月)

### 功能指南
- **[Multi-LLM Guide](./docs/multi-llm-guide.md)** - Multi-LLM 智能路由使用指南
- **[Cloudflare Paid Deployment](./docs/cloudflare-paid-deployment.md)** - 付費功能部署指南
- **[Session Setup](./SESSION-SETUP.md)** - Session 初始化設置

### 配置與腳本
- **[AI Agent 配置](./ai_agent_team_config.txt)** - Agent 團隊配置
- **[pre-deployment-check.sh](./scripts/pre-deployment-check.sh)** - 部署前檢查
- **[monitor-costs.sh](./scripts/monitor-costs.sh)** - 成本監控
- **[quick-deploy.sh](./scripts/quick-deploy.sh)** - 快速部署

## 🔒 安全

- ✅ JWT 認證
- ✅ RBAC 權限控制
- ✅ AES-256 備份加密
- ✅ TLS 1.3 傳輸加密
- ✅ 輸入驗證和清理
- ✅ 審計日誌

## 🤝 貢獻

1. Fork 本專案
2. 創建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 💰 成本預估

### 三種方案比較

| 方案 | 月成本 | 適用場景 | 主要特點 |
|------|--------|---------|---------|
| 🆓 **免費** | $0-5 | 個人開發 | NAS cron + 免費 LLM |
| ⭐ **混合** (推薦) | $10-20 | 小型團隊 | Cloudflare Paid + NAS + 智能路由 |
| 🚀 **企業級** | $20-50 | 中大型企業 | 完整付費功能 + 高性能 |

### 成本構成 (混合方案)

```
Workers Paid:          $5/月 (基礎)
R2 Storage:            $0-3/月 (depends on usage)
Queues:                $0-2/月 (depends on usage)
LLM API (balanced):    $2-8/月 (50%-100% 節省)
NAS 電費:               $3-5/月
──────────────────────────
總計:                  $10-20/月
```

**vs 傳統方案**: 節省 50%-70% 成本

詳見 [COST-ANALYSIS.md](./COST-ANALYSIS.md)

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 🙏 致謝

- **Template by**: Chang Ho Chien | HC AI 說人話channel
- **Tutorial**: https://youtu.be/8Q1bRZaHH24
- **Powered by**: Cloudflare Workers, Claude AI, OpenAI, Google Gemini

## 📊 專案狀態

- **版本**: v2.2 (Hybrid + Multi-LLM + Cloudflare Paid)
- **最後更新**: 2025-10-04
- **開發階段**: ✅ 核心功能完成，進入部署階段
- **測試覆蓋**: 26+ 測試用例
- **成本範圍**: $5-50/月 (視使用量)

---

**🎯 Ready to build the future of AI Agent collaboration with intelligent cost optimization!**

**🚀 Quick Start**: `./scripts/quick-deploy.sh`
**💰 Cost Monitor**: `./scripts/monitor-costs.sh`
**📖 Full Guide**: [PROJECT-CONTINUATION.md](./PROJECT-CONTINUATION.md)
