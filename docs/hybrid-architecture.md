# 🔄 混合架構設計 - 本地 + 雲端雙軌運作

## 🎯 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Team 混合架構                      │
└─────────────────────────────────────────────────────────────┘

本地環境 (離線優先)                     雲端環境 (協作同步)
┌────────────────────┐                  ┌────────────────────┐
│   本地 Docker      │   ⇄ 雙向同步 ⇄   │  Cloudflare Workers│
│                    │                  │                    │
│ ┌──────────────┐   │                  │ ┌──────────────┐   │
│ │ FastAPI      │   │                  │ │ Hono API     │   │
│ │ (Python)     │   │                  │ │ (TypeScript) │   │
│ └──────────────┘   │                  │ └──────────────┘   │
│                    │                  │                    │
│ ┌──────────────┐   │                  │ ┌──────────────┐   │
│ │ SQLite       │◄──┼──────────────────┼─►│ D1 Database  │   │
│ │ (本地檔案)   │   │    定期同步        │ │ (雲端)       │   │
│ └──────────────┘   │                  │ └──────────────┘   │
│                    │                  │                    │
│ ┌──────────────┐   │                  │ ┌──────────────┐   │
│ │ ChromaDB     │◄──┼──────────────────┼─►│ Vectorize    │   │
│ │ (向量資料庫) │   │    向量同步        │ │ (向量資料庫) │   │
│ └──────────────┘   │                  │ └──────────────┘   │
│                    │                  │                    │
│ ┌──────────────┐   │                  │ ┌──────────────┐   │
│ │ Local Files  │◄──┼──────────────────┼─►│ R2 Storage   │   │
│ │ (文檔儲存)   │   │    檔案同步        │ │ (物件儲存)   │   │
│ └──────────────┘   │                  │ └──────────────┘   │
│                    │                  │                    │
│ ┌──────────────┐   │                  │                    │
│ │ Web UI       │   │                  │                    │
│ │ (Svelte/React)│  │                  │                    │
│ └──────────────┘   │                  │                    │
└────────────────────┘                  └────────────────────┘
     localhost:8000                      api.shyangtsuen.xyz

     ┌──────────────┐
     │   CLI Tool   │
     │ (混合控制)    │
     └──────────────┘
       - 本地優先
       - 雲端備份
       - 手動/自動同步
```

## 🎯 設計原則

### 1. **本地優先 (Local-First)**
- 所有操作預設在本地執行
- 無網路時完全可用
- 快速響應，無延遲

### 2. **雲端增強 (Cloud-Enhanced)**
- 團隊協作透過雲端
- 自動備份到雲端
- 多裝置同步

### 3. **智能同步 (Smart Sync)**
- 衝突偵測和解決
- 增量同步（僅同步變更）
- 可配置同步策略

## 📊 技術棧對比

| 功能 | 本地環境 | 雲端環境 |
|------|---------|---------|
| **API 框架** | FastAPI (Python) | Hono (TypeScript) |
| **資料庫** | SQLite | Cloudflare D1 |
| **向量資料庫** | ChromaDB | Cloudflare Vectorize |
| **檔案儲存** | Local FileSystem | R2 Storage |
| **快取** | Redis (optional) | KV Namespace |
| **佇列** | Celery (optional) | Cloudflare Queues |
| **Web UI** | Svelte/React (local) | Cloudflare Pages |

## 🔄 同步機制

### 同步策略

#### **策略 1: 手動同步（完全控制）**
```bash
# 推送本地變更到雲端
ai-team sync push

# 從雲端拉取變更
ai-team sync pull

# 雙向同步
ai-team sync both
```

#### **策略 2: 自動同步（便利）**
```bash
# 啟動自動同步（每 5 分鐘）
ai-team sync auto --interval 5m

# 即時同步（有變更立即同步）
ai-team sync realtime
```

#### **策略 3: 排程同步（平衡）**
```bash
# 每小時同步一次
ai-team sync schedule --cron "0 * * * *"

# 每天下班前同步
ai-team sync schedule --cron "0 18 * * *"
```

### 同步內容

```yaml
sync_config:
  # 任務資料
  tasks:
    direction: bidirectional  # 雙向
    conflict_resolution: newest_wins

  # 知識庫
  knowledge_base:
    direction: bidirectional
    conflict_resolution: manual  # 手動解決衝突

  # 文檔
  documents:
    direction: push_to_cloud  # 單向到雲端（備份）

  # 系統日誌
  logs:
    direction: push_to_cloud
    retention_local: 7_days
    retention_cloud: 90_days
```

### 衝突解決策略

```python
# 1. 最新優先 (Newest Wins)
if local.updated_at > cloud.updated_at:
    winner = local
else:
    winner = cloud

# 2. 手動解決 (Manual Resolution)
show_diff(local, cloud)
winner = user_choose()

# 3. 合併策略 (Merge)
merged = merge(local, cloud)
```

## 🚀 使用情境

### 情境 1: 離線產品開發

```bash
# 早上啟動本地環境
docker-compose up -d

# 創建新專案（完全離線）
ai-team create-project "電商平台開發" --local

# Coordinator 分配任務
ai-team coordinator process "實現用戶認證系統"

# 查看任務
ai-team tasks list --status pending

# 開發一整天...

# 下班前同步到雲端（備份）
ai-team sync push

# 關閉本地環境
docker-compose down
```

### 情境 2: 團隊協作

```bash
# 成員 A（您）：本地開發
ai-team create-task "實現 API Gateway" --assign backend-dev

# 自動同步到雲端
ai-team sync push

# 成員 B（遠端）：透過雲端 API 查看
curl https://api.shyangtsuen.xyz/api/tasks/status/pending

# 成員 B 完成任務（在雲端）
curl -X POST https://api.shyangtsuen.xyz/api/tasks/task-123/complete

# 您拉取更新
ai-team sync pull
```

### 情境 3: 混合工作

```bash
# 在公司：使用本地環境
ai-team --mode local

# 在家：透過雲端 API
ai-team --mode cloud

# 任何地方：自動選擇
ai-team --mode auto  # 自動偵測環境
```

## 📁 目錄結構

```
ai-agent-team-v1/
├── src/
│   ├── main/
│   │   ├── python/              # 本地 Python 版本
│   │   │   ├── api/
│   │   │   │   ├── main.py      # FastAPI 主程式
│   │   │   │   └── routes/      # API 路由
│   │   │   ├── core/
│   │   │   │   ├── database.py  # SQLite 操作
│   │   │   │   ├── vectordb.py  # ChromaDB 操作
│   │   │   │   ├── sync.py      # 同步引擎
│   │   │   │   └── storage.py   # 本地檔案管理
│   │   │   ├── agents/          # Agent 實現
│   │   │   │   ├── coordinator.py
│   │   │   │   ├── backend_dev.py
│   │   │   │   └── ...
│   │   │   └── cli/
│   │   │       └── cli.py       # CLI 工具
│   │   │
│   │   └── js/                  # 雲端 TypeScript 版本
│   │       ├── index.ts         # Cloudflare Workers
│   │       ├── agents/
│   │       ├── core/
│   │       └── types/
│   │
│   └── web/                     # Web UI (Svelte)
│       ├── src/
│       ├── public/
│       └── package.json
│
├── data/                        # 本地資料儲存
│   ├── database/
│   │   └── ai-agent.db         # SQLite 資料庫
│   ├── vectors/                # ChromaDB 資料
│   ├── documents/              # 文檔儲存
│   └── backups/                # 本地備份
│
├── docker/
│   ├── docker-compose.yml      # 本地環境
│   ├── Dockerfile.api          # FastAPI
│   ├── Dockerfile.ui           # Web UI
│   └── nginx.conf              # Nginx 配置
│
├── scripts/
│   ├── setup-local.sh          # 本地環境設定
│   ├── setup-cloudflare.sh     # 雲端資源設定
│   ├── sync.py                 # 同步腳本
│   └── deploy.sh               # 部署腳本
│
└── config/
    ├── local.yaml              # 本地配置
    ├── cloud.yaml              # 雲端配置
    └── sync.yaml               # 同步配置
```

## 🐳 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # FastAPI 後端
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./src/main/python:/app/src
    environment:
      - MODE=local
      - DATABASE_PATH=/app/data/database/ai-agent.db
      - VECTOR_DB_PATH=/app/data/vectors
    depends_on:
      - chromadb
      - redis

  # ChromaDB 向量資料庫
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - ./data/vectors:/chroma/chroma

  # Redis (可選的快取)
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data

  # Web UI
  ui:
    build:
      context: .
      dockerfile: docker/Dockerfile.ui
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://api:8000
      - MODE=local

  # Nginx (反向代理)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
      - ui
```

## 🛠️ CLI 工具設計

```bash
# AI Agent Team CLI

# 環境管理
ai-team init --mode hybrid              # 初始化混合環境
ai-team start                           # 啟動本地環境
ai-team stop                            # 停止本地環境
ai-team status                          # 查看狀態

# 模式切換
ai-team config --mode local             # 切換到本地模式
ai-team config --mode cloud             # 切換到雲端模式
ai-team config --mode auto              # 自動模式

# 專案管理
ai-team create-project "專案名稱"        # 創建專案
ai-team list-projects                   # 列出專案

# 任務管理
ai-team create-task "任務描述" --type implement_feature
ai-team list-tasks --status pending
ai-team complete-task <task-id>

# Coordinator 操作
ai-team coordinator process "實現用戶登入功能"
ai-team coordinator assign <task-id> backend-dev
ai-team coordinator progress            # 查看進度

# Agent 操作
ai-team agent status backend-dev        # 查看 Agent 狀態
ai-team agent metrics backend-dev       # 查看性能指標
ai-team agent trigger backend-dev       # 觸發 Agent 處理任務

# 知識庫管理
ai-team kb upload ./docs/**/*.md        # 上傳文檔
ai-team kb search "JWT 認證"            # 搜索知識庫
ai-team kb list --category development  # 列出文檔

# 同步管理
ai-team sync status                     # 查看同步狀態
ai-team sync push                       # 推送到雲端
ai-team sync pull                       # 從雲端拉取
ai-team sync both                       # 雙向同步
ai-team sync auto --interval 5m         # 自動同步
ai-team sync conflicts                  # 查看衝突

# 備份管理
ai-team backup create                   # 創建本地備份
ai-team backup restore <backup-id>      # 恢復備份
ai-team backup list                     # 列出備份
ai-team backup cloud                    # 備份到雲端

# 日誌查看
ai-team logs --level error --tail 100   # 查看錯誤日誌
ai-team logs --agent backend-dev        # 查看特定 Agent 日誌
ai-team logs --task task-123            # 查看任務日誌

# 監控
ai-team monitor                         # 即時監控
ai-team stats                           # 統計資訊
```

## 📊 資料同步流程

```python
# sync.py 核心邏輯

class SyncEngine:
    def __init__(self):
        self.local_db = SQLiteDB()
        self.cloud_api = CloudflareAPI()

    def sync_tasks(self, direction='both'):
        """同步任務資料"""
        if direction in ['push', 'both']:
            # 推送到雲端
            local_tasks = self.local_db.get_updated_tasks(
                since=last_sync_time
            )
            for task in local_tasks:
                self.cloud_api.upsert_task(task)

        if direction in ['pull', 'both']:
            # 從雲端拉取
            cloud_tasks = self.cloud_api.get_updated_tasks(
                since=last_sync_time
            )
            for task in cloud_tasks:
                # 檢查衝突
                if self.has_conflict(task):
                    self.resolve_conflict(task)
                else:
                    self.local_db.upsert_task(task)

    def sync_knowledge_base(self):
        """同步知識庫"""
        # 1. 同步文檔元數據
        self.sync_documents()

        # 2. 同步向量資料
        self.sync_vectors()

        # 3. 同步檔案
        self.sync_files()

    def resolve_conflict(self, item):
        """解決衝突"""
        strategy = self.config.conflict_resolution

        if strategy == 'newest_wins':
            return self.newest_wins(item)
        elif strategy == 'manual':
            return self.manual_resolve(item)
        elif strategy == 'merge':
            return self.merge(item)
```

## 🔐 安全性考量

### 本地環境
- ✅ 資料加密儲存（AES-256）
- ✅ 本地資料庫密碼保護
- ✅ 檔案權限控制

### 雲端同步
- ✅ HTTPS 加密傳輸
- ✅ API Token 認證
- ✅ 資料端到端加密選項

### 備份策略
```yaml
backup:
  local:
    frequency: daily
    retention: 30_days
    path: ./data/backups/

  cloud:
    frequency: weekly
    retention: 90_days
    encryption: true
```

## 📈 效能優化

### 本地環境
- SQLite 索引優化
- ChromaDB 快取
- Redis 查詢快取
- 批次處理

### 同步優化
- 增量同步（僅同步變更）
- 壓縮傳輸
- 並行上傳/下載
- 斷點續傳

## 🎯 下一步實現

我現在將為您實現：

1. ✅ 本地 Python FastAPI 版本
2. ✅ SQLite + ChromaDB 整合
3. ✅ CLI 工具
4. ✅ Docker Compose 配置
5. ✅ 同步機制
6. ✅ Web UI（簡單版）

預計實現時間：2-3 小時
開始實現嗎？
