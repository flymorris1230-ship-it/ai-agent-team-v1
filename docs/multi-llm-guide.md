# 🤖 多 LLM 智能路由使用指南

## 📋 概述

此系統支援同時使用 **OpenAI** 和 **Google Gemini** API，並透過智能路由自動選擇最佳 Provider。

## ✨ 主要優勢

### 💰 **成本優化**
- Gemini Embeddings: **免費** (vs OpenAI $0.02/1M tokens)
- Gemini 2.0 Flash: **免費** 實驗版本 (vs OpenAI $0.15/1M tokens)
- Gemini 1.5 Flash 8B: **$0.0375/1M** (vs OpenAI $0.15/1M tokens)
- **預期節省: 50%-100%**

### 🔄 **自動容錯**
- Provider 故障時自動切換
- 重試機制 (最多 2 次)
- 健康狀態監控

### 🎯 **智能選擇**
- 根據任務複雜度自動選擇
- 負載平衡
- 性能追蹤

---

## 🚀 快速開始

### 1️⃣ **獲取 API Keys**

#### OpenAI API Key
1. 前往 https://platform.openai.com/api-keys
2. 建立新的 API Key
3. 複製 Key (sk-...)

#### Gemini API Key (免費)
1. 前往 https://aistudio.google.com/app/apikey
2. 點擊 "Get API Key"
3. 複製 Key

### 2️⃣ **配置環境變數**

編輯 `.env` 檔案：

```bash
# ==========================================
# LLM API Configuration
# ==========================================
OPENAI_API_KEY=sk-your-openai-key-here
GEMINI_API_KEY=your-gemini-key-here

# LLM Router 配置
LLM_STRATEGY=balanced           # cost | performance | balanced
PREFERRED_PROVIDER=             # openai | gemini (留空自動選擇)
USE_LLM_ROUTER=true            # 啟用智能路由
```

### 3️⃣ **選擇路由策略**

#### 成本優化模式 (cost) - 完全免費
```bash
LLM_STRATEGY=cost
PREFERRED_PROVIDER=gemini
```
- ✅ 所有 embeddings 使用 Gemini (免費)
- ✅ 所有 chat 使用 Gemini (免費)
- 💰 **成本: $0/月**

#### 平衡模式 (balanced) - 推薦 ⭐
```bash
LLM_STRATEGY=balanced
PREFERRED_PROVIDER=
```
- ✅ Embeddings: Gemini (免費)
- ✅ 簡單查詢 (<1000字): Gemini (免費)
- ✅ 複雜查詢 (>1000字): OpenAI (更好品質)
- 💰 **成本: ~$2-8/月 (省 70%)**

#### 性能模式 (performance) - 品質優先
```bash
LLM_STRATEGY=performance
PREFERRED_PROVIDER=openai
```
- ✅ 所有請求使用 OpenAI
- ✅ Gemini 作為備援
- 💰 **成本: ~$10-20/月**

---

## 📊 **使用範例**

### 在代碼中使用

RAG Engine 會自動使用 LLM Router:

```typescript
import { RAGEngine } from './core/rag-engine';

// 初始化 RAG Engine
const ragEngine = new RAGEngine(env, {
  llmStrategy: 'balanced',        // 路由策略
  preferredProvider: undefined,   // 自動選擇
  useLLMRouter: true,            // 啟用路由
});

// 自動使用最佳 LLM
const result = await ragEngine.generateAnswer({
  query: '什麼是 AI Agent?',
  top_k: 5,
});

// 系統會自動:
// 1. 使用 Gemini 創建 embedding (免費)
// 2. 根據查詢複雜度選擇 LLM
// 3. 如果失敗，自動切換到備援 Provider
```

### 直接使用 LLM Router

```typescript
import { LLMRouter } from './llm/router';

// 初始化 Router
const router = new LLMRouter(
  env.OPENAI_API_KEY,
  env.GEMINI_API_KEY,
  {
    strategy: 'cost',
    fallbackEnabled: true,
    maxRetries: 2,
  }
);

// 創建 Embedding (自動選擇最便宜的)
const embedding = await router.createEmbedding({
  text: 'Hello World',
});

// 聊天補全 (自動選擇)
const response = await router.createChatCompletion({
  messages: [
    { role: 'user', content: '你好' },
  ],
});

// 查看使用統計
const stats = router.getUsageStats();
console.log(stats);
// {
//   openai: { requests: 50, healthy: true },
//   gemini: { requests: 150, healthy: true }
// }
```

---

## 📈 **監控和除錯**

### 查看健康狀態

```typescript
const health = await router.getHealthStatus();
console.log(health);
// {
//   openai: { provider: 'openai', healthy: true, latency: 150 },
//   gemini: { provider: 'gemini', healthy: true, latency: 80 }
// }
```

### 查看使用統計

```typescript
const stats = router.getUsageStats();
console.log(`OpenAI requests: ${stats.openai.requests}`);
console.log(`Gemini requests: ${stats.gemini.requests}`);
```

### 日誌輸出

系統會自動記錄:
```
✅ LLM Router initialized (strategy: balanced)
📊 Embedding created via LLM Router (model: text-embedding-004, tokens: 50)
💬 Chat completion via LLM Router (model: gemini-2.0-flash-exp, tokens: 200)
⚠️ OpenAI failed, falling back to Gemini
```

---

## 🔧 **進階配置**

### 自訂模型

```typescript
const ragEngine = new RAGEngine(env, {
  embeddingModel: 'text-embedding-3-large',  // OpenAI 高精度
  chatModel: 'gemini-1.5-pro',               // Gemini Pro
  llmStrategy: 'balanced',
});
```

### 禁用自動路由

如果只想用單一 Provider:

```bash
USE_LLM_ROUTER=false
PREFERRED_PROVIDER=openai
```

或在代碼中:

```typescript
const ragEngine = new RAGEngine(env, {
  useLLMRouter: false,  // 禁用路由，直接使用 OpenAI
});
```

---

## 💡 **最佳實踐**

### 開發環境
```bash
LLM_STRATEGY=cost
PREFERRED_PROVIDER=gemini
# 使用免費額度進行開發和測試
```

### 生產環境 (平衡)
```bash
LLM_STRATEGY=balanced
PREFERRED_PROVIDER=
# 自動選擇，兼顧成本和品質
```

### 高流量場景
```bash
LLM_STRATEGY=cost
PREFERRED_PROVIDER=gemini
# 減少成本，使用 Gemini 處理大部分請求
```

### 關鍵業務
```bash
LLM_STRATEGY=performance
PREFERRED_PROVIDER=openai
# 確保最佳品質
```

---

## ❓ **常見問題**

### Q: Gemini 真的免費嗎？
A: 是的！Gemini 2.0 Flash (實驗版) 和 text-embedding-004 目前完全免費。

### Q: 如果兩個 Provider 都失敗怎麼辦？
A: 系統會拋出錯誤，並在日誌中記錄詳細資訊。

### Q: 可以只用 Gemini 嗎？
A: 可以！設定 `PREFERRED_PROVIDER=gemini` 和 `LLM_STRATEGY=cost`。

### Q: 如何確保資料隱私？
A: OpenAI 和 Gemini 都不會儲存 API 請求數據用於訓練。建議查閱各自的隱私政策。

### Q: 路由決策的延遲是多少？
A: 路由決策是本地計算，延遲 <1ms。主要延遲來自 API 調用本身。

---

## 📚 **參考資料**

- [OpenAI API 文檔](https://platform.openai.com/docs)
- [Gemini API 文檔](https://ai.google.dev/docs)
- [成本分析報告](../COST-ANALYSIS.md)

---

**更新時間:** 2025-10-04
**作者:** AI Agent Team
