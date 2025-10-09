# 🏠 NAS 整合架構 - 充分利用現有基礎設施

## 🎯 您的現有資源

✅ **NAS 伺服器**
- PostgreSQL + pgvector (向量資料庫)
- n8n (工作流自動化)
- 穩定的網路儲存

✅ **本機電腦**
- Ollama + 7B LLM
- 開發環境

✅ **Cloudflare 帳號**
- 網域: shyangtsuen.xyz
- 可選的雲端備份

## 🏗️ 優化後的架構

### 核心原則：
1. **PostgreSQL + pgvector** 取代 ChromaDB（更穩定、功能更強）
2. **n8n** 作為工作流引擎（自動化 Agent 協作）
3. **Ollama** 提供本地 AI 能力（私密、快速）
4. **NAS** 作為中央伺服器（24/7 運行）
5. **Cloudflare** 僅作遠端訪問和備份

---

## 📊 技術棧整合

| 功能 | 使用的技術 | 部署位置 |
|------|-----------|---------|
| **主資料庫** | PostgreSQL + pgvector | NAS |
| **向量搜尋** | pgvector (內建) | NAS |
| **API 服務** | FastAPI (Python) | NAS Docker |
| **工作流** | n8n | NAS (已有) |
| **LLM 推理** | Ollama (7B) | 本機 |
| **Web UI** | Svelte | NAS Docker/本機 |
| **雲端備份** | Cloudflare R2/D1 | 雲端 |

---

## 🔧 實現方案

### 方案 1: NAS 中央伺服器（推薦）⭐

```
架構圖:

┌─────────────────────────────────────────────┐
│              您的 NAS                        │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  Docker Compose Stack              │    │
│  │                                    │    │
│  │  ┌──────────────────────────┐     │    │
│  │  │  ai-agent-api:8000       │     │    │
│  │  │  (FastAPI)               │     │    │
│  │  └──────────────────────────┘     │    │
│  │             ↓                      │    │
│  │  ┌──────────────────────────┐     │    │
│  │  │  PostgreSQL:5432         │     │    │
│  │  │  + pgvector extension    │     │    │
│  │  └──────────────────────────┘     │    │
│  │             ↓                      │    │
│  │  ┌──────────────────────────┐     │    │
│  │  │  n8n:5678                │     │    │
│  │  │  (工作流)                 │     │    │
│  │  └──────────────────────────┘     │    │
│  │             ↓                      │    │
│  │  ┌──────────────────────────┐     │    │
│  │  │  ai-agent-ui:3000        │     │    │
│  │  │  (Web UI)                │     │    │
│  │  └──────────────────────────┘     │    │
│  └────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                  ↕
         內網訪問 (192.168.x.x)
                  ↕
┌─────────────────────────────────────────────┐
│          您的本機電腦                         │
│                                             │
│  ┌──────────────────────────┐              │
│  │  Ollama:11434            │              │
│  │  (LLM 推理)              │              │
│  └──────────────────────────┘              │
│                                             │
│  ┌──────────────────────────┐              │
│  │  CLI Tool                │              │
│  │  (ai-team command)       │              │
│  └──────────────────────────┘              │
└─────────────────────────────────────────────┘
```

### 整合流程

```python
# Agent 執行流程

1. 使用者透過 CLI 或 Web UI 發送請求
   ↓
2. FastAPI (NAS) 接收請求
   ↓
3. Coordinator Agent 分析需求
   ↓
4. 需要 AI 生成？
   ├─ YES → 調用 Ollama API (本機)
   └─ NO  → 繼續
   ↓
5. 存儲到 PostgreSQL
   ↓
6. 需要向量搜尋？
   ├─ YES → 使用 pgvector 查詢
   └─ NO  → 繼續
   ↓
7. 觸發 n8n workflow（如果需要）
   ↓
8. 返回結果給使用者
```

---

## 🐳 Docker Compose 配置（NAS 部署）

```yaml
# docker-compose.nas.yml
version: '3.8'

services:
  # PostgreSQL + pgvector（如果還沒有）
  postgres:
    image: pgvector/pgvector:pg16
    container_name: ai-agent-postgres
    environment:
      POSTGRES_DB: ai_agent_db
      POSTGRES_USER: ai_agent
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - ai-agent-net

  # FastAPI AI Agent Server
  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api.nas
    container_name: ai-agent-api
    environment:
      - MODE=nas
      - DATABASE_URL=postgresql://ai_agent:your_secure_password@postgres:5432/ai_agent_db
      - OLLAMA_URL=http://192.168.x.x:11434  # 您的本機 IP
      - N8N_WEBHOOK_URL=http://n8n:5678/webhook
    volumes:
      - ./src/main/python:/app/src
      - ./data/files:/app/data/files
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    networks:
      - ai-agent-net

  # Web UI
  ui:
    build:
      context: .
      dockerfile: docker/Dockerfile.ui
    container_name: ai-agent-ui
    environment:
      - API_URL=http://api:8000
      - MODE=nas
    ports:
      - "3000:3000"
    networks:
      - ai-agent-net

  # Redis (可選，用於快取)
  redis:
    image: redis:alpine
    container_name: ai-agent-redis
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data
    networks:
      - ai-agent-net

networks:
  ai-agent-net:
    driver: bridge
```

---

## 🗄️ PostgreSQL + pgvector Schema

```sql
-- scripts/init.sql

-- 啟用 pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Agents 表
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  capabilities JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks 表
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT REFERENCES agents(id),
  created_by TEXT,
  dependencies JSONB,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Documents 表（知識庫）
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT,
  source TEXT,
  source_url TEXT,
  category TEXT,
  tags JSONB,
  user_id TEXT,
  agent_id TEXT REFERENCES agents(id),
  metadata JSONB,
  indexed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_category ON documents(category);

-- Document Chunks 表（用於 RAG）
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  -- pgvector: 儲存向量（1536 維度，適合 OpenAI embeddings）
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 為向量搜尋創建索引（HNSW 索引，快速近似搜尋）
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Knowledge Entries 表
CREATE TABLE knowledge_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags JSONB,
  related_tasks JSONB,
  author_agent_id TEXT REFERENCES agents(id),
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON knowledge_entries USING hnsw (embedding vector_cosine_ops);

-- System Logs 表
CREATE TABLE system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  agent_id TEXT REFERENCES agents(id),
  task_id TEXT REFERENCES tasks(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_level ON system_logs(level);
CREATE INDEX idx_logs_created_at ON system_logs(created_at);

-- 插入預設 Agents
INSERT INTO agents (id, name, role, capabilities, performance_metrics) VALUES
  ('agent-coordinator', 'Coordinator Agent', 'Team Coordinator',
   '["task_orchestration", "team_management"]', '{}'),
  ('agent-pm', 'Product Manager Agent', 'Product Manager',
   '["requirements_analysis", "prd_writing"]', '{}'),
  ('agent-architect', 'Solution Architect Agent', 'Solution Architect',
   '["system_design", "technology_selection"]', '{}'),
  ('agent-backend-dev', 'Backend Developer Agent', 'Backend Developer',
   '["api_development", "database_design"]', '{}'),
  ('agent-frontend-dev', 'Frontend Developer Agent', 'Frontend Developer',
   '["ui_development", "api_integration"]', '{}'),
  ('agent-qa', 'QA Engineer Agent', 'QA Engineer',
   '["test_planning", "automated_testing"]', '{}'),
  ('agent-devops', 'DevOps Engineer Agent', 'DevOps Engineer',
   '["deployment", "monitoring"]', '{}'),
  ('agent-data-analyst', 'Data Analyst Agent', 'Data Analyst',
   '["data_analysis", "reporting"]', '{}'),
  ('agent-knowledge-mgr', 'Knowledge Manager Agent', 'Knowledge Manager',
   '["knowledge_curation", "content_classification"]', '{}');
```

---

## 🔗 Ollama 整合

```python
# src/main/python/core/llm.py

import httpx
from typing import Optional, List

class OllamaClient:
    """Ollama LLM 客戶端"""

    def __init__(self, base_url: str = "http://192.168.x.x:11434"):
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate(
        self,
        prompt: str,
        model: str = "llama2:7b",
        system: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """生成文本"""

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }

        if system:
            payload["system"] = system

        response = await self.client.post(
            f"{self.base_url}/api/generate",
            json=payload
        )

        result = response.json()
        return result["response"]

    async def embed(
        self,
        text: str,
        model: str = "llama2:7b"
    ) -> List[float]:
        """生成向量嵌入"""

        response = await self.client.post(
            f"{self.base_url}/api/embeddings",
            json={
                "model": model,
                "prompt": text
            }
        )

        result = response.json()
        return result["embedding"]
```

---

## 🔄 n8n 工作流整合

### n8n Workflow 範例：

```json
{
  "name": "AI Agent Task Automation",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "ai-agent-task",
        "method": "POST"
      }
    },
    {
      "name": "Task Created",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// 處理任務創建事件\nconst task = items[0].json;\nreturn items;"
      }
    },
    {
      "name": "Notify Team",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#gac",
        "text": "New task created: {{$json.title}}"
      }
    },
    {
      "name": "Update Database",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "tasks"
      }
    }
  ]
}
```

---

## 📝 使用流程

### 1. 在 NAS 上部署

```bash
# SSH 到您的 NAS
ssh user@nas-ip

# 克隆專案
git clone <your-repo>
cd gac-v1

# 編輯配置
cp config/nas.example.yaml config/nas.yaml
# 編輯 nas.yaml，填入您的 NAS IP、Ollama URL 等

# 啟動服務
docker-compose -f docker-compose.nas.yml up -d

# 查看日誌
docker-compose -f docker-compose.nas.yml logs -f
```

### 2. 在本機電腦上使用

```bash
# 安裝 CLI 工具
pip install -e .

# 配置 NAS 連線
ai-team config set nas-url http://nas-ip:8000

# 創建專案
ai-team create-project "電商平台開發"

# Coordinator 處理需求
ai-team coordinator process "實現用戶認證系統"
```

### 3. 透過 Web UI

訪問：`http://nas-ip:3000`

---

## 🚀 優勢總結

### ✅ 使用您現有的 NAS 基礎設施

1. **PostgreSQL + pgvector**
   - 比 ChromaDB 更穩定
   - 原生支援向量搜尋
   - 完整的 SQL 功能
   - 更好的 ACID 保證

2. **n8n 整合**
   - 現成的工作流引擎
   - 可視化編排 Agent 協作
   - 豐富的整合選項

3. **Ollama 本地 LLM**
   - 完全私密
   - 無 API 成本
   - 低延遲
   - 7B 模型足夠多數任務

4. **NAS 24/7 運行**
   - 中央伺服器
   - 穩定可靠
   - 團隊共享訪問

---

## 下一步

我現在將為您創建：

1. ✅ PostgreSQL + pgvector 版本的資料庫層
2. ✅ Ollama 整合的 LLM 客戶端
3. ✅ n8n webhook 整合
4. ✅ NAS 專用的 Docker Compose
5. ✅ 配置文件範本

要我開始實現嗎？
