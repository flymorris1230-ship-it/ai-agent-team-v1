# Multi-LLM Router 使用指南
## GAC_FactoryOS 智能 LLM 路由系統

## 🎯 系統概述

GAC_FactoryOS 已內建**企業級 Multi-LLM 路由系統**，支援：

- ✅ **OpenAI** (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- ✅ **Gemini** (Gemini 2.0 Flash, 1.5 Pro/Flash)
- ✅ **Claude** (Claude 3.5 Sonnet, Opus, Haiku)

### 核心特性

1. **智能路由** - 根據任務自動選擇最佳 LLM
2. **自動 Fallback** - 失敗自動切換備用 Provider
3. **成本優化** - Gemini 免費 embedding 和 chat
4. **追蹤整合** - 完整的 Genesis Observability 追蹤
5. **高可用性** - 健康檢查、重試、負載均衡

---

## 📋 前置要求

### 1. API Keys

你需要以下 API keys（至少 2 個）:

```bash
# 必需（至少選其一）
OPENAI_API_KEY=sk-proj-...      # https://platform.openai.com/api-keys
GOOGLE_API_KEY=AIza...           # https://makersuite.google.com/app/apikey

# 可選（用於高質量任務）
ANTHROPIC_API_KEY=sk-ant-...     # https://console.anthropic.com/settings/keys
```

### 2. 環境設置

```bash
cd apps/ai-agent-team

# 創建 .env 文件
cat > .env << 'EOF'
# LLM Providers
OPENAI_API_KEY=sk-proj-...
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...

# Genesis Observability (可選)
OBSERVABILITY_API_URL=https://obs-edge.flymorris1230.workers.dev/ingest
OBSERVABILITY_API_KEY=a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e
EOF
```

---

## 🚀 快速開始

### Step 1: 基本使用

```typescript
import { LLMRouter } from './src/main/js/llm/router';

// 初始化 Router
const router = new LLMRouter(
  process.env.OPENAI_API_KEY!,
  process.env.GOOGLE_API_KEY!,
  process.env.ANTHROPIC_API_KEY, // 可選
  {
    strategy: 'balanced',      // 'cost' | 'performance' | 'balanced'
    fallbackEnabled: true,     // 啟用自動 fallback
    maxRetries: 2,             // 最多重試 2 次
  }
);

// Chat Completion
const response = await router.createChatCompletion({
  messages: [
    { role: 'user', content: '什麼是 TypeScript?' }
  ],
  temperature: 0.7,
});

console.log('Provider:', response.provider);
console.log('Model:', response.model);
console.log('Content:', response.message.content);
console.log('Cost:', response.cost);
console.log('Tokens:', response.usage.total_tokens);
```

### Step 2: 運行示範

```bash
# 設置 API keys
export OPENAI_API_KEY=sk-...
export GOOGLE_API_KEY=AIza...
export ANTHROPIC_API_KEY=sk-ant-...  # 可選

# 運行示範
npx tsx examples/multi-llm-router-demo.ts
```

---

## 🎛️ 路由策略

### 1. Balanced 策略（推薦）⭐

**智能選擇，質量與成本平衡**

```typescript
const router = new LLMRouter(
  openaiKey,
  geminiKey,
  claudeKey,
  { strategy: 'balanced' }
);
```

**路由邏輯**:
- **高複雜度任務** (≥8) → Claude (最高質量)
- **安全任務** (auth, encryption) → Claude (最可靠)
- **UI 任務** (React, component) → OpenAI (前端經驗好)
- **簡單查詢** (<1000字) → Gemini (便宜/免費)
- **複雜查詢** (≥1000字) → OpenAI (質量好)

### 2. Cost 策略

**成本優先，最大化節省**

```typescript
const router = new LLMRouter(
  openaiKey,
  geminiKey,
  claudeKey,
  { strategy: 'cost' }
);
```

**路由邏輯**:
- **Embedding** → Gemini (免費)
- **Chat** → Gemini 2.0 Flash (免費) 或 1.5 Flash 8B (最便宜)

**成本節省**: Gemini 比 OpenAI 便宜 **80-95%**

### 3. Performance 策略

**性能優先，速度與可靠性**

```typescript
const router = new LLMRouter(
  openaiKey,
  geminiKey,
  claudeKey,
  { strategy: 'performance' }
);
```

**路由邏輯**:
- **所有任務** → OpenAI (最可靠)
- **Fallback** → 其他可用 providers

---

## 💡 使用範例

### 範例 1: 簡單對話

```typescript
const response = await router.createChatCompletion({
  messages: [
    { role: 'user', content: 'Hello!' }
  ],
});

// Balanced 策略: 自動選 Gemini (簡單查詢，免費)
```

### 範例 2: 複雜任務

```typescript
const response = await router.createChatCompletion({
  messages: [
    {
      role: 'user',
      content: `設計一個分散式系統架構，包含：
        1. 微服務設計
        2. 數據庫分片
        3. 負載均衡
        4. 容錯機制
        請提供詳細方案。`
    }
  ],
});

// Balanced 策略: 自動選 Claude (高複雜度) 或 OpenAI (長內容)
```

### 範例 3: 安全任務

```typescript
const response = await router.createChatCompletion({
  messages: [
    {
      role: 'user',
      content: '如何實現 JWT authentication 和 Row Level Security?'
    }
  ],
});

// Balanced 策略: 自動選 Claude (安全任務)
```

### 範例 4: Embedding（免費）

```typescript
const response = await router.createEmbedding({
  input: 'TypeScript is a typed superset of JavaScript',
});

// 所有策略: 自動選 Gemini (免費 embedding)
console.log('Cost:', response.cost); // $0.00
```

### 範例 5: 多輪對話

```typescript
const response = await router.createChatCompletion({
  messages: [
    { role: 'user', content: '你好！' },
    { role: 'assistant', content: '你好！有什麼我可以幫助你的？' },
    { role: 'user', content: '幫我解釋什麼是遞歸' },
  ],
});
```

### 範例 6: 自定義參數

```typescript
const response = await router.createChatCompletion({
  messages: [{ role: 'user', content: '生成代碼' }],
  temperature: 0.3,  // 更確定性的輸出
  maxTokens: 2048,   // 限制輸出長度
  topP: 0.9,
});
```

---

## 🔄 自動 Fallback

系統會自動處理失敗：

```typescript
const router = new LLMRouter(
  openaiKey,
  geminiKey,
  claudeKey,
  {
    fallbackEnabled: true,  // 啟用 fallback
    maxRetries: 2,          // 每個 provider 最多重試 2 次
  }
);

// 如果 Primary provider 失敗，自動嘗試其他 providers
const response = await router.createChatCompletion({
  messages: [{ role: 'user', content: 'Hello' }],
});

// ✅ 保證成功（只要有一個 provider 可用）
```

**Fallback 流程**:
1. 嘗試 Primary provider (最多 2 次)
2. 失敗 → 標記為不健康
3. 自動切換到其他健康的 provider
4. 5 分鐘後恢復健康狀態

---

## 📊 監控與統計

### 健康檢查

```typescript
const healthStatus = await router.getHealthStatus();

console.log(healthStatus);
// {
//   openai: { provider: 'openai', healthy: true, latency: 120 },
//   gemini: { provider: 'gemini', healthy: true, latency: 80 },
//   claude: { provider: 'claude', healthy: true, latency: 150 },
// }
```

### 使用統計

```typescript
// 執行一些請求後...
const stats = router.getUsageStats();

console.log(stats);
// {
//   openai: { requests: 10, healthy: true },
//   gemini: { requests: 25, healthy: true },
//   claude: { requests: 5, healthy: true },
// }

// 重置統計
router.resetStats();
```

### Genesis Observability 追蹤

系統自動追蹤所有 LLM 使用：

```typescript
// 自動上報到 Genesis Observability
const router = new LLMRouter(
  openaiKey,
  geminiKey,
  claudeKey,
  { strategy: 'balanced' },
  env  // 傳入 env 啟用追蹤
);

// 每個請求自動記錄:
// - Provider 和 Model
// - Token 使用量
// - 成本
// - 延遲
// - 任務類型
```

查看追蹤數據：
https://genesis-observability-obs-dashboard.vercel.app/

---

## 💰 成本分析

### Provider 定價（每百萬 tokens）

| Provider | Chat Input | Chat Output | Embedding |
|----------|------------|-------------|-----------|
| **Gemini 2.0 Flash** | $0 (免費) | $0 (免費) | $0 (免費) |
| Gemini 1.5 Flash 8B | $0.075 | $0.30 | $0 (免費) |
| **GPT-4o-mini** | $0.15 | $0.60 | $0.02/1K |
| GPT-4o | $2.50 | $10.00 | - |
| Claude 3.5 Sonnet | $3.00 | $15.00 | - |

### 成本節省範例

**場景 1: 簡單問答**
```
Gemini:     $0.00 (免費)
GPT-4o-mini: $0.0001
節省: 100%
```

**場景 2: 代碼生成 (1000 tokens)**
```
Gemini:     $0.00 (免費) 或 $0.0001
GPT-4o-mini: $0.0006
節省: 83-100%
```

**場景 3: Embedding (1000 tokens)**
```
Gemini:     $0.00 (免費)
OpenAI:     $0.00002
節省: 100%
```

**Balanced 策略每月節省**: ~30-50%

---

## 🐛 故障排除

### 問題 1: API Key 無效

```
錯誤: Invalid API key
```

**解決**:
```bash
# 檢查 .env 文件
cat .env | grep API_KEY

# 確認 key 格式正確
# OpenAI: sk-proj-...
# Google: AIza...
# Anthropic: sk-ant-...
```

### 問題 2: 所有 Providers 失敗

```
錯誤: All LLM providers failed
```

**解決**:
1. 檢查網絡連接
2. 確認至少一個 API key 有效
3. 檢查 API 配額是否用完
4. 運行健康檢查: `router.getHealthStatus()`

### 問題 3: Gemini 免費配額用完

**解決**:
- Gemini 2.0 Flash 目前免費（實驗性）
- 用完後會自動 fallback 到 OpenAI
- 或升級到付費 Gemini 1.5 Flash 8B

### 問題 4: 延遲過高

**解決**:
```typescript
// 使用 Performance 策略
const router = new LLMRouter(
  openaiKey,
  geminiKey,
  claudeKey,
  { strategy: 'performance' }  // 優先使用 OpenAI
);
```

---

## 📚 進階功能

### 1. 自定義複雜度分析

Router 會自動分析任務複雜度 (1-10)，基於：
- 內容長度
- 關鍵字 (architecture, security, algorithm, etc.)

你可以通過內容引導路由：
```typescript
// 強制使用 Claude（提高複雜度）
const response = await router.createChatCompletion({
  messages: [{
    role: 'user',
    content: '【高複雜度】設計分散式系統架構...' // 包含關鍵字
  }],
});
```

### 2. 負載均衡

多個相同優先級的 providers 會自動負載均衡：
```typescript
// 如果 OpenAI 和 Gemini 都適合，選擇請求數較少的
const router = new LLMRouter(..., { strategy: 'balanced' });

// Router 會追蹤每個 provider 的請求數
// 自動平衡負載
```

### 3. 健康恢復

Provider 標記為不健康後，5 分鐘後自動恢復：
```typescript
// Provider 失敗 → 標記為不健康 → 5 分鐘後恢復
// 無需手動干預
```

---

## 🎯 最佳實踐

### 1. 策略選擇

- **開發/測試**: 使用 `cost` 策略（節省成本）
- **生產環境**: 使用 `balanced` 策略（質量與成本平衡）
- **關鍵任務**: 使用 `performance` 策略（最高可靠性）

### 2. 錯誤處理

```typescript
try {
  const response = await router.createChatCompletion({...});
} catch (error) {
  console.error('LLM 請求失敗:', error.message);
  // 所有 providers 都失敗，需要人工介入
}
```

### 3. 成本監控

定期檢查使用統計：
```typescript
const stats = router.getUsageStats();
console.log('總請求數:', Object.values(stats).reduce((sum, s) => sum + s.requests, 0));
```

### 4. 環境配置

```bash
# 開發環境: 只使用免費 providers
GOOGLE_API_KEY=AIza...

# 生產環境: 配置所有 providers
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 📖 相關文檔

- **LLM Router 源碼**: `src/main/js/llm/router.ts`
- **Providers**: `src/main/js/llm/providers/`
- **Genesis Observability**: `../../../genesis-observability/`
- **多 AI 協作架構**: `../../../genesis-observability/MULTI_AI_COLLABORATION.md`

---

## ✨ 總結

GAC_FactoryOS 的 Multi-LLM Router 提供：

1. ✅ **智能路由** - 自動選擇最佳 LLM
2. ✅ **高可用性** - 自動 fallback 和重試
3. ✅ **成本優化** - Gemini 免費 + 智能策略節省 30-50%
4. ✅ **完整追蹤** - Genesis Observability 整合
5. ✅ **企業級** - 健康檢查、負載均衡、統計

**開始使用**:
```bash
export OPENAI_API_KEY=sk-...
export GOOGLE_API_KEY=AIza...
npx tsx examples/multi-llm-router-demo.ts
```

---

**作者**: Claude Code
**日期**: 2025-10-07
**版本**: 2.0 (更新為使用現有 LLMRouter)
