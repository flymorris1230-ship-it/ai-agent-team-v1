# 📁 GitHub 倉庫文件整理計劃

## 🎯 **整理目標**

將 26 個散落在根目錄的文檔文件重新組織成清晰的目錄結構。

---

## 📊 **當前狀態分析**

### 根目錄文件統計
- **Markdown 文檔**: 26 個
- **配置文件**: 8 個
- **腳本文件**: 4 個
- **源代碼目錄**: src/, docs/, scripts/
- **其他**: node_modules/, .git/, tmp/

### 問題
- ❌ 根目錄過於混亂（30+ 個文件）
- ❌ 文檔分類不清晰
- ❌ 難以快速找到所需文件
- ❌ 新用戶上手困難

---

## 🏗️ **新目錄架構設計**

```
ai-agent-team-v1/
├── 📄 README.md                    # 專案介紹
├── 📄 CLAUDE.md                    # 開發規範
├── 📄 LICENSE                      # 許可證
├── 📄 PROJECT-CONTINUATION.md      # 快速繼續指南
│
├── 📂 docs/                        # 📚 文檔目錄
│   ├── 📂 guides/                  # 核心指南
│   │   ├── SESSION-SETUP.md
│   │   ├── SESSION-STATUS.md
│   │   └── NEXT-STEPS.md
│   │
│   ├── 📂 cloudflare/              # Cloudflare 文檔
│   │   ├── FEATURES-STATUS.md
│   │   ├── SETUP.md
│   │   ├── TUNNEL-COMPLETE-SETUP.md
│   │   ├── TUNNEL-DIAGNOSIS.md
│   │   ├── TUNNEL-SETUP-COMMANDS.md
│   │   └── QUICK-TUNNEL-SETUP.sh
│   │
│   ├── 📂 nas/                     # NAS 部署文檔
│   │   ├── CONTAINER-MANUAL-SETUP.md
│   │   ├── DEPLOYMENT-GUIDE.md
│   │   ├── PROXY-DEPLOYMENT.md
│   │   ├── QUICK-DEPLOY.md
│   │   └── TASKSCHEDULER-SETUP.md
│   │
│   ├── 📂 pgvector/                # pgvector 安裝
│   │   ├── INSTALLATION.md
│   │   ├── STATUS.md
│   │   ├── PGADMIN4-GUIDE.md
│   │   └── PROXY-UPDATE-GUIDE.md
│   │
│   ├── 📂 deployment/              # 部署指南
│   │   ├── DEPLOYMENT.md
│   │   ├── DEPLOY-NOW.md
│   │   └── COST-ANALYSIS.md
│   │
│   └── 📂 reports/                 # 測試報告
│       ├── PRODUCTION-TEST.md
│       └── PRODUCTION-TEST-TUNNEL.md
│
├── 📂 config/                      # ⚙️ 配置文件
│   ├── 📂 docker/
│   │   ├── docker-compose.proxy.yml
│   │   └── Dockerfile.proxy
│   │
│   ├── 📂 proxy/
│   │   ├── nas-postgres-proxy.py
│   │   └── nas-proxy.env
│   │
│   └── 📂 examples/
│       └── .env.example
│
├── 📂 scripts/                     # 🔧 腳本 (保持現有)
│   ├── test-pgvector.sh
│   ├── deploy-proxy-update.sh
│   ├── install-python-deps.sh
│   └── test-proxy.sh
│
├── 📂 src/                         # 💻 源代碼 (保持現有)
├── 📂 data/                        # 📊 數據 (保持現有)
├── 📂 tmp/                         # 🗂️ 臨時文件 (保持現有)
│
├── 📄 package.json                 # Node.js 配置
├── 📄 tsconfig.json                # TypeScript 配置
├── 📄 wrangler.toml                # Cloudflare 配置
├── 📄 vitest.config.ts             # 測試配置
└── 📄 ai_agent_team_config.txt     # Agent 配置
```

---

## 🔄 **文件移動計劃**

### 1. 創建新目錄
```bash
mkdir -p docs/{guides,cloudflare,nas,pgvector,deployment,reports}
mkdir -p config/{docker,proxy,examples}
```

### 2. 移動文檔文件

#### **docs/guides/** (核心指南)
```bash
git mv SESSION-SETUP.md docs/guides/
git mv SESSION-STATUS.md docs/guides/
git mv NEXT-STEPS.md docs/guides/
git mv CONTINUE-HERE.md docs/guides/
```

#### **docs/cloudflare/** (Cloudflare 文檔)
```bash
git mv CLOUDFLARE-FEATURES-STATUS.md docs/cloudflare/FEATURES-STATUS.md
git mv CLOUDFLARE-SETUP.md docs/cloudflare/SETUP.md
git mv CLOUDFLARE-TUNNEL-COMPLETE-SETUP.md docs/cloudflare/TUNNEL-COMPLETE-SETUP.md
git mv CLOUDFLARE-TUNNEL-DIAGNOSIS.md docs/cloudflare/TUNNEL-DIAGNOSIS.md
git mv TUNNEL-SETUP-COMMANDS.md docs/cloudflare/
git mv QUICK-TUNNEL-SETUP.sh docs/cloudflare/
```

#### **docs/nas/** (NAS 部署)
```bash
git mv NAS-CONTAINER-MANUAL-SETUP.md docs/nas/CONTAINER-MANUAL-SETUP.md
git mv NAS-DEPLOYMENT-GUIDE.md docs/nas/DEPLOYMENT-GUIDE.md
git mv NAS-PROXY-DEPLOYMENT.md docs/nas/PROXY-DEPLOYMENT.md
git mv NAS-QUICK-DEPLOY.md docs/nas/QUICK-DEPLOY.md
git mv NAS-TASKSCHEDULER-SETUP.md docs/nas/TASKSCHEDULER-SETUP.md
```

#### **docs/pgvector/** (pgvector 安裝)
```bash
git mv PGVECTOR-INSTALLATION.md docs/pgvector/INSTALLATION.md
git mv PGVECTOR-STATUS.md docs/pgvector/STATUS.md
git mv PGADMIN4-PGVECTOR-GUIDE.md docs/pgvector/PGADMIN4-GUIDE.md
git mv PROXY-UPDATE-GUIDE.md docs/pgvector/PROXY-UPDATE-GUIDE.md
```

#### **docs/deployment/** (部署指南)
```bash
git mv DEPLOYMENT.md docs/deployment/
git mv DEPLOY-NOW.md docs/deployment/
git mv COST-ANALYSIS.md docs/deployment/
```

#### **docs/reports/** (測試報告)
```bash
git mv PRODUCTION-TEST-REPORT.md docs/reports/PRODUCTION-TEST.md
git mv PRODUCTION-TEST-REPORT-TUNNEL.md docs/reports/PRODUCTION-TEST-TUNNEL.md
```

### 3. 移動配置文件

#### **config/docker/**
```bash
git mv docker-compose.proxy.yml config/docker/
git mv Dockerfile.proxy config/docker/
```

#### **config/proxy/**
```bash
git mv nas-postgres-proxy.py config/proxy/
git mv nas-proxy.env config/proxy/
```

#### **config/examples/**
```bash
cp .env.example config/examples/
```

### 4. 移動腳本（如有遺漏）
```bash
git mv install-python-deps.sh scripts/
git mv test-proxy.sh scripts/
```

---

## 📝 **需要更新的引用**

### 1. README.md
- 更新文檔路徑引用
- 添加新的目錄結構說明

### 2. PROJECT-CONTINUATION.md
- 更新文檔鏈接

### 3. 其他文檔內的相對路徑
- 檢查並更新所有內部鏈接

---

## ✅ **執行步驟**

1. **創建目錄結構**
2. **移動文件** (使用 `git mv` 保留歷史)
3. **更新引用**
4. **創建目錄索引** (README.md in each folder)
5. **測試鏈接**
6. **提交更改**

---

## 🎯 **預期效果**

### 整理前（根目錄）
```
30+ files (混亂)
```

### 整理後（根目錄）
```
📄 README.md
📄 CLAUDE.md
📄 LICENSE
📄 PROJECT-CONTINUATION.md
📂 docs/
📂 config/
📂 scripts/
📂 src/
+ 配置文件 (package.json, wrangler.toml, etc.)
```

### 優勢
- ✅ 根目錄清晰（~10 個主要文件/目錄）
- ✅ 文檔分類明確
- ✅ 易於導航和查找
- ✅ 新用戶友好
- ✅ 維護性提升

---

## 📊 **目錄索引文件**

每個子目錄都會有 README.md：

- `docs/README.md` - 文檔總覽
- `docs/guides/README.md` - 核心指南索引
- `docs/cloudflare/README.md` - Cloudflare 文檔索引
- `docs/nas/README.md` - NAS 部署索引
- `docs/pgvector/README.md` - pgvector 安裝索引
- `docs/deployment/README.md` - 部署指南索引
- `docs/reports/README.md` - 測試報告索引
- `config/README.md` - 配置文件說明

---

**準備執行整理？**
