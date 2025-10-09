# 🎯 下一步行動指南

**日期**: 2025-10-05
**當前狀態**: ✅ Phase 6 完成 (pgvector 安裝)
**下一階段**: Phase 7 - RAG 系統整合

---

## ✅ 已完成工作總結

### Phase 6: pgvector 向量資料庫安裝 ✅
- ✅ pgvector 擴展安裝完成（通過 pgAdmin4 GUI）
- ✅ 生產環境表創建完成 (`knowledge_vectors`)
- ✅ 高效能索引配置完成 (ivfflat + GIN + B-tree)
- ✅ 向量操作測試通過 (Cosine/L2/Inner Product)
- ✅ 文檔更新和 Git 備份完成

**成果**:
- 零成本向量資料庫就緒（vs Cloudflare Vectorize $61/月）
- 1536 維向量支援（OpenAI embedding 兼容）
- JSONB metadata 查詢支援
- 時間排序索引支援

---

## 🎯 Phase 7: RAG 系統整合（下一階段）

### 目標
將 RAG Engine 整合 NAS PostgreSQL pgvector，實現完整的檢索增強生成功能。

### 預估時間
- 配置: 10 分鐘
- 開發: 30-60 分鐘
- 測試: 20 分鐘
- **總計**: 1-1.5 小時

---

## 📋 詳細步驟

### 步驟 1: 環境變數配置 (5 分鐘)

#### 1.1 更新 `.env` 文件

```bash
# PostgreSQL pgvector 配置
POSTGRES_HOST=192.168.1.114
POSTGRES_PORT=5532
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=Morris1230

# 啟用 PostgreSQL 向量存儲
ENABLE_POSTGRES_VECTOR=true

# Multi-LLM 配置（已有）
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
LLM_STRATEGY=balanced
USE_LLM_ROUTER=true
```

#### 1.2 創建 `.dev.vars` (本地開發)

```bash
cp .env .dev.vars
```

#### 1.3 設定 Wrangler Secrets (生產環境)

```bash
# PostgreSQL 連接資訊
echo "192.168.1.114" | npx wrangler secret put POSTGRES_HOST
echo "5532" | npx wrangler secret put POSTGRES_PORT
echo "postgres" | npx wrangler secret put POSTGRES_DB
echo "postgres" | npx wrangler secret put POSTGRES_USER
echo "Morris1230" | npx wrangler secret put POSTGRES_PASSWORD
```

---

### 步驟 2: 創建 PostgreSQL 向量存儲適配器 (30 分鐘)

#### 2.1 創建文件 `src/main/js/database/postgres-vector-store.ts`

```typescript
/**
 * PostgreSQL + pgvector 向量存儲適配器
 */
export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
  created_at: Date;
  updated_at: Date;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export class PostgresVectorStore {
  constructor(
    private host: string,
    private port: number,
    private database: string,
    private user: string,
    private password: string
  ) {}

  /**
   * 插入向量文檔
   */
  async insertDocument(
    content: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<string> {
    // 實現向量插入邏輯
    const query = `
      INSERT INTO knowledge_vectors (content, embedding, metadata)
      VALUES ($1, $2::vector, $3::jsonb)
      RETURNING id
    `;

    // 執行 SQL
    const result = await this.execute(query, [
      content,
      `[${embedding.join(',')}]`,
      JSON.stringify(metadata || {})
    ]);

    return result[0].id;
  }

  /**
   * 相似度搜索
   */
  async similaritySearch(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorDocument[]> {
    const { limit = 10, threshold = 0.8, filter } = options;

    // 使用 ivfflat 索引進行相似度搜索
    const query = `
      SELECT
        id,
        content,
        metadata,
        embedding,
        created_at,
        updated_at,
        1 - (embedding <=> $1::vector) AS similarity
      FROM knowledge_vectors
      WHERE 1 - (embedding <=> $1::vector) > $2
      ${filter ? 'AND metadata @> $3::jsonb' : ''}
      ORDER BY embedding <=> $1::vector
      LIMIT $${filter ? 4 : 3}
    `;

    const params = [
      `[${queryEmbedding.join(',')}]`,
      threshold,
      ...(filter ? [JSON.stringify(filter)] : []),
      limit
    ];

    return await this.execute(query, params);
  }

  /**
   * 執行 SQL 查詢
   */
  private async execute(query: string, params: any[]): Promise<any[]> {
    // 使用 HTTP Proxy 或直接連接
    const response = await fetch(`http://${this.host}:${this.port}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, params })
    });

    if (!response.ok) {
      throw new Error(`PostgreSQL query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.rows || [];
  }
}
```

#### 2.2 更新 RAG Engine

修改 `src/main/js/core/rag-engine.ts`:

```typescript
import { PostgresVectorStore } from '../database/postgres-vector-store';

export class RAGEngine {
  private vectorStore?: PostgresVectorStore;

  constructor(private env: Env) {
    // 初始化向量存儲
    if (env.ENABLE_POSTGRES_VECTOR === 'true') {
      this.vectorStore = new PostgresVectorStore(
        env.POSTGRES_HOST,
        parseInt(env.POSTGRES_PORT),
        env.POSTGRES_DB,
        env.POSTGRES_USER,
        env.POSTGRES_PASSWORD
      );
    }
  }

  /**
   * 添加文檔到知識庫
   */
  async addDocument(content: string, metadata?: Record<string, any>): Promise<string> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    // 使用 Multi-LLM Router 生成 embedding (Gemini 免費)
    const embedding = await this.llmRouter.generateEmbedding(content, {
      strategy: 'cost' // 使用免費的 Gemini
    });

    // 存儲到 PostgreSQL
    return await this.vectorStore.insertDocument(content, embedding, metadata);
  }

  /**
   * 語義搜索
   */
  async semanticSearch(
    query: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<VectorDocument[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    // 生成查詢向量
    const queryEmbedding = await this.llmRouter.generateEmbedding(query, {
      strategy: 'cost'
    });

    // 執行相似度搜索
    return await this.vectorStore.similaritySearch(queryEmbedding, options);
  }

  /**
   * RAG 檢索增強生成
   */
  async generateWithContext(
    query: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<string> {
    // 1. 語義搜索相關文檔
    const relevantDocs = await this.semanticSearch(query, options);

    // 2. 構建上下文
    const context = relevantDocs
      .map(doc => `[${doc.metadata?.source || 'Unknown'}] ${doc.content}`)
      .join('\n\n');

    // 3. 使用 Multi-LLM Router 生成回答
    const prompt = `Based on the following context, answer the question.

Context:
${context}

Question: ${query}

Answer:`;

    const response = await this.llmRouter.complete(prompt, {
      strategy: 'balanced' // 智能選擇 LLM
    });

    return response.content;
  }
}
```

---

### 步驟 3: 測試 RAG 功能 (20 分鐘)

#### 3.1 創建測試文件 `src/main/js/__tests__/rag-pgvector.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { RAGEngine } from '../core/rag-engine';

describe('RAG Engine with pgvector', () => {
  it('should add document to knowledge base', async () => {
    const rag = new RAGEngine(env);

    const docId = await rag.addDocument(
      'pgvector is a PostgreSQL extension for vector similarity search',
      { source: 'test', category: 'database' }
    );

    expect(docId).toBeDefined();
  });

  it('should perform semantic search', async () => {
    const rag = new RAGEngine(env);

    const results = await rag.semanticSearch(
      'How to use pgvector?',
      { limit: 3, threshold: 0.7 }
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('content');
    expect(results[0]).toHaveProperty('similarity');
  });

  it('should generate answer with context', async () => {
    const rag = new RAGEngine(env);

    const answer = await rag.generateWithContext(
      'What is pgvector used for?',
      { limit: 5 }
    );

    expect(answer).toBeDefined();
    expect(answer.length).toBeGreaterThan(0);
  });
});
```

#### 3.2 執行測試

```bash
npm test -- rag-pgvector.test.ts
```

---

### 步驟 4: 更新 API 端點 (15 分鐘)

#### 4.1 添加 RAG API 端點 `src/main/js/api/rag.ts`

```typescript
import { Hono } from 'hono';
import { RAGEngine } from '../core/rag-engine';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/rag/documents
 * 添加文檔到知識庫
 */
app.post('/documents', async (c) => {
  const { content, metadata } = await c.req.json();

  const rag = new RAGEngine(c.env);
  const id = await rag.addDocument(content, metadata);

  return c.json({ success: true, id });
});

/**
 * POST /api/rag/search
 * 語義搜索
 */
app.post('/search', async (c) => {
  const { query, limit, threshold } = await c.req.json();

  const rag = new RAGEngine(c.env);
  const results = await rag.semanticSearch(query, { limit, threshold });

  return c.json({ success: true, results });
});

/**
 * POST /api/rag/generate
 * RAG 生成回答
 */
app.post('/generate', async (c) => {
  const { query, limit, threshold } = await c.req.json();

  const rag = new RAGEngine(c.env);
  const answer = await rag.generateWithContext(query, { limit, threshold });

  return c.json({ success: true, answer });
});

export default app;
```

#### 4.2 註冊路由 `src/index.ts`

```typescript
import ragAPI from './main/js/api/rag';

app.route('/api/rag', ragAPI);
```

---

### 步驟 5: 本地測試 (10 分鐘)

```bash
# 啟動開發服務器
npm run dev

# 測試添加文檔
curl -X POST http://localhost:8788/api/rag/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "pgvector is a PostgreSQL extension for vector similarity search. It supports L2 distance, inner product, and cosine distance.",
    "metadata": {"source": "pgvector-docs", "category": "database"}
  }'

# 測試語義搜索
curl -X POST http://localhost:8788/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to search vectors in PostgreSQL?",
    "limit": 5,
    "threshold": 0.7
  }'

# 測試 RAG 生成
curl -X POST http://localhost:8788/api/rag/generate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is pgvector and what distance metrics does it support?",
    "limit": 3
  }'
```

---

## ✅ 完成檢查清單

Phase 7 完成標準：

- [ ] 環境變數配置完成
- [ ] PostgresVectorStore 類實現完成
- [ ] RAGEngine 整合 pgvector 完成
- [ ] 測試套件通過
- [ ] API 端點實現完成
- [ ] 本地測試全部通過
- [ ] 文檔更新完成
- [ ] Git 提交並推送到 GitHub

---

## 💰 成本影響

### Phase 7 成本
- **pgvector 儲存**: $0 (NAS 本地)
- **Embedding API**: $0 (使用 Gemini 免費 tier)
- **Chat Completion**: $2-5/月 (balanced strategy)
- **總計**: $2-5/月

### 與 Cloudflare Vectorize 對比
- **節省**: ~$61/月（100% 向量存儲成本）
- **Embedding 成本**: -100% (Gemini 免費 vs OpenAI 付費)

---

## 🎯 預期成果

完成 Phase 7 後，您將擁有：

1. **完整的 RAG 系統**
   - 文檔向量化和存儲
   - 語義相似度搜索
   - 檢索增強生成

2. **零成本向量存儲**
   - 使用 NAS PostgreSQL pgvector
   - 無限存儲空間（受 NAS 容量限制）
   - 無查詢費用

3. **智能成本優化**
   - Embedding: 100% Gemini (免費)
   - Chat: Balanced strategy (簡單用 Gemini，複雜用 OpenAI)
   - 預估節省: 70-90% vs 純 OpenAI

4. **生產級性能**
   - ivfflat 索引加速搜索
   - JSONB metadata 過濾
   - 時間排序支援

---

## 📚 參考資料

- **pgvector 文檔**: https://github.com/pgvector/pgvector
- **當前狀態**: `docs/pgvector/STATUS.md`
- **專案進度**: `PROJECT-CONTINUATION.md`
- **會話狀態**: `docs/guides/SESSION-STATUS.md`

---

## 🆘 需要幫助？

### PostgreSQL 連接問題
```bash
# 測試連接
curl http://192.168.1.114:5532/health

# 通過 pgAdmin4 檢查
# https://postgres.shyangtsuen.xyz
```

### pgvector 擴展問題
```sql
-- 驗證擴展
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- 驗證表
SELECT tablename FROM pg_tables WHERE tablename = 'knowledge_vectors';
```

### Multi-LLM 問題
```bash
# 測試 API Keys
npm test -- llm-router.test.ts
```

---

## 🚀 開始 Phase 7

**準備好了嗎？** 執行以下命令開始：

```bash
# 1. 確認環境
cat .env | grep -E "(POSTGRES|ENABLE_POSTGRES_VECTOR)"

# 2. 創建分支（可選）
git checkout -b phase-7-rag-integration

# 3. 開始開發
# 按照上面的步驟 1-5 執行
```

**預估完成時間**: 1-1.5 小時
**難度**: ⭐⭐⭐ 中等

**下一次開啟終端時，執行**:
```bash
cd /Users/morrislin/Desktop/gac-v1/gac-v1
cat docs/guides/NEXT-STEPS.md
```

---

**🎯 Good luck with Phase 7! 🚀**
