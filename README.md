# ai-agent-team-v1

**Cloudflare + NAS + RAG + MCP 企業級 AI Agent 團隊系統**

## 📋 專案概述

這是一個基於 Cloudflare Workers 的企業級 AI Agent 協作系統，整合了：
- ✅ **多 Agent 協作框架**：9 個專業 AI Agent 協同工作
- ✅ **RAG 系統**：使用 Vectorize 實現語義檢索
- ✅ **MCP 協議整合**：支援外部數據爬取和整合
- ✅ **NAS 備份**：完整的災難恢復策略
- ✅ **企業級安全**：加密、認證、審計

## 🎯 快速開始

### 📌 **下次開啟專案先看這裡！**

👉 **[NEXT_STEPS.md](NEXT_STEPS.md)** - 當前進度與下一步執行清單

**當前狀態：**
- ✅ Phase 0: 本地開發與測試（已完成 100%）
- ⏳ Phase 1: 生產環境部署（待執行）
- 🔜 Phase 2: 監控與告警設置（待執行）

### 開發指南

1. **閱讀 CLAUDE.md** - 包含所有開發規則和指南
2. **查看 ai_agent_team_config.txt** - 完整的 Agent 團隊配置
3. **遵循開發規範** - 使用 src/main/ 目錄結構

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

### Cloudflare 平台
- **Workers** - 無服務器運算
- **D1** - SQLite 數據庫
- **Vectorize** - 向量數據庫
- **R2** - 對象存儲
- **KV** - 鍵值存儲
- **Queues** - 消息隊列

### 開發框架
- **TypeScript** - 主要開發語言
- **Hono.js / itty-router** - 路由框架
- **React / SvelteKit** - 前端框架
- **TailwindCSS** - UI 樣式

### AI/ML
- **RAG (Retrieval-Augmented Generation)** - 檢索增強生成
- **OpenAI API** - LLM 服務
- **MCP Protocol** - 模型上下文協議

### 整合服務
- **Factory OS** - 健康監控與整合 (✅ 已實現)
  - 自動健康檢查 (每 5 分鐘)
  - 歷史數據追蹤
  - 統計分析與告警
  - 推薦 + 兼容 API 端點

### 備份與運維
- **NAS** - 本地備份
- **rclone** - R2 ↔ NAS 同步
- **Wrangler** - Cloudflare CLI

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
```bash
# 創建 D1 數據庫
wrangler d1 create ai-agent-db

# 創建 Vectorize 索引
wrangler vectorize create ai-agent-vectors --dimensions=1536 --metric=cosine

# 創建 R2 存儲桶
wrangler r2 bucket create ai-agent-files
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
- **[開發規則](./CLAUDE.md)** - Claude Code 開發指南
- **[AI Agent 配置](./ai_agent_team_config.txt)** - 完整的 Agent 團隊配置
- **[專案繼續指南](./PROJECT-CONTINUATION.md)** - 快速繼續開發

### 詳細文檔 → [docs/](./docs/)
- **[核心指南](./docs/guides/)** - 會話設定、狀態追蹤、下一步
- **[Cloudflare](./docs/cloudflare/)** - Workers、Tunnel 設定與診斷
- **[NAS 部署](./docs/nas/)** - 容器設定、Proxy 部署、排程設定
- **[pgvector](./docs/pgvector/)** - 向量資料庫安裝與配置
- **[部署指南](./docs/deployment/)** - 生產環境部署與成本分析
- **[測試報告](./docs/reports/)** - 生產測試結果

### 配置文件 → [config/](./config/)
- **[Docker](./config/docker/)** - Docker Compose 和 Dockerfile
- **[Proxy](./config/proxy/)** - PostgreSQL HTTP Proxy 配置
- **[範例](./config/examples/)** - 環境變數範本

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

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 🙏 致謝

- **Template by**: Chang Ho Chien | HC AI 說人話channel
- **Tutorial**: https://youtu.be/8Q1bRZaHH24
- **Powered by**: Cloudflare Workers, Claude AI, MCP Protocol

---

**🎯 Ready to build the future of AI Agent collaboration!**
