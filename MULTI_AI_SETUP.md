# Multi-AI Collaboration Setup Guide
## ChatGPT + Gemini + AI Agent Team 整合設置

## 📋 前置要求

### 1. API Keys
你需要以下 API keys:

- **OpenAI API Key** (ChatGPT/Codex)
  - 註冊: https://platform.openai.com/api-keys
  - 費用: GPT-4o-mini ~$0.15/MTok

- **Google AI API Key** (Gemini)
  - 註冊: https://makersuite.google.com/app/apikey
  - 費用: Gemini 1.5 Flash ~$0.075/MTok

- **Anthropic API Key** (Claude - AI Agent Team)
  - 註冊: https://console.anthropic.com/settings/keys
  - 費用: Claude Sonnet ~$3/MTok

### 2. Node.js & Dependencies

```bash
# 確保 Node.js >= 18
node --version

# 安裝 dependencies
cd apps/ai-agent-team
npm install
```

---

## 🚀 快速開始

### Step 1: 安裝額外依賴

```bash
cd apps/ai-agent-team

# 安裝 OpenAI SDK
npm install openai

# 安裝 Google Generative AI SDK
npm install @google/generative-ai

# 安裝 TypeScript 類型定義 (如果需要)
npm install --save-dev @types/node
```

### Step 2: 設置環境變數

創建 `.env` 文件：

```bash
# apps/ai-agent-team/.env

# OpenAI (ChatGPT)
OPENAI_API_KEY=sk-proj-...

# Google AI (Gemini)
GOOGLE_API_KEY=AIza...

# Anthropic (Claude - AI Agent Team)
ANTHROPIC_API_KEY=sk-ant-...

# Genesis Observability (追蹤使用量)
OBSERVABILITY_API_URL=https://obs-edge.flymorris1230.workers.dev/ingest
OBSERVABILITY_API_KEY=a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e
```

### Step 3: 測試連接

創建測試腳本 `test-connections.ts`:

```typescript
import { ChatGPTClient } from './src/main/js/clients/chatgpt-client';
import { GeminiClient } from './src/main/js/clients/gemini-client';

async function testConnections() {
  console.log('🧪 測試 AI 連接...\n');

  // Test ChatGPT
  try {
    const chatgpt = new ChatGPTClient({
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4o-mini',
    });
    const result = await chatgpt.complete('Hello, ChatGPT!');
    console.log('✅ ChatGPT 連接成功');
    console.log(`   回應: ${result.content.substring(0, 50)}...`);
    console.log(`   Token: ${result.tokens}, 成本: $${result.cost.toFixed(6)}\n`);
  } catch (error: any) {
    console.error('❌ ChatGPT 連接失敗:', error.message, '\n');
  }

  // Test Gemini
  try {
    const gemini = new GeminiClient({
      apiKey: process.env.GOOGLE_API_KEY!,
      model: 'gemini-1.5-flash',
    });
    const result = await gemini.generate('Hello, Gemini!');
    console.log('✅ Gemini 連接成功');
    console.log(`   回應: ${result.content.substring(0, 50)}...`);
    console.log(`   Token: ${result.tokens}, 成本: $${result.cost.toFixed(6)}\n`);
  } catch (error: any) {
    console.error('❌ Gemini 連接失敗:', error.message, '\n');
  }
}

testConnections();
```

執行測試：

```bash
npx tsx test-connections.ts
```

### Step 4: 運行示範

```bash
# 運行完整示範
npx tsx examples/multi-ai-collaboration-demo.ts

# 或運行單個示範
# Demo 1: 並行執行 + 投票
# Demo 2: 階梯式執行
# Demo 3: 專業分工
# Demo 4: 動態路由
# Demo 5: 成本對比
```

---

## 📖 使用範例

### 範例 1: 基本使用

```typescript
import { ChatGPTClient } from './src/main/js/clients/chatgpt-client';
import { GeminiClient } from './src/main/js/clients/gemini-client';

// 初始化
const chatgpt = new ChatGPTClient({
  apiKey: process.env.OPENAI_API_KEY!,
});

const gemini = new GeminiClient({
  apiKey: process.env.GOOGLE_API_KEY!,
});

// 使用 ChatGPT
const result1 = await chatgpt.complete('撰寫一個排序函數');
console.log(result1.content);

// 使用 Gemini
const result2 = await gemini.generate('解釋什麼是遞歸');
console.log(result2.content);
```

### 範例 2: 並行執行

```typescript
// 同時調用兩個 AI，比較結果
const [gptResult, geminiResult] = await Promise.all([
  chatgpt.complete('什麼是 TypeScript?'),
  gemini.generate('什麼是 TypeScript?'),
]);

console.log('ChatGPT:', gptResult.content);
console.log('Gemini:', geminiResult.content);
console.log('總成本:', gptResult.cost + geminiResult.cost);
```

### 範例 3: 代碼生成與審查

```typescript
// 1. Gemini 快速生成
const code = await gemini.generateCode('創建一個用戶管理 API', 'typescript');

// 2. ChatGPT 審查
const review = await chatgpt.reviewCode(code.content);

console.log('生成的代碼:', code.content);
console.log('審查意見:', review.content);
```

### 範例 4: 成本優化

```typescript
// 根據任務複雜度選擇 AI
async function smartExecute(task: string, complexity: 'low' | 'high') {
  if (complexity === 'low') {
    // 簡單任務用 Gemini (便宜)
    return await gemini.generate(task);
  } else {
    // 複雜任務用 ChatGPT (質量高)
    return await chatgpt.complete(task);
  }
}

const result = await smartExecute('寫一個 Hello World', 'low');
```

---

## 📊 成本預估

### 典型任務成本 (GPT-4o-mini + Gemini 1.5 Flash)

| 任務類型 | Tokens | ChatGPT | Gemini | 節省 |
|---------|--------|---------|--------|------|
| 簡單問答 | 200 | $0.0001 | $0.00002 | 80% |
| 代碼生成 | 1000 | $0.0006 | $0.0001 | 83% |
| 代碼審查 | 2000 | $0.0012 | $0.0002 | 83% |
| 文檔生成 | 3000 | $0.0018 | $0.0003 | 83% |

**建議**:
- 簡單任務 → Gemini (成本低 80%)
- 複雜任務 → ChatGPT (質量高)
- 關鍵任務 → 並行執行 + 投票 (最可靠，但成本 2x)

---

## 🎯 進階使用

### 自定義模型選擇

```typescript
// 使用不同的 ChatGPT 模型
const chatgptPro = new ChatGPTClient({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o', // 更強大，更貴
});

// 使用不同的 Gemini 模型
const geminiPro = new GeminiClient({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-1.5-pro', // 長上下文，多模態
});
```

### 調整參數

```typescript
const chatgpt = new ChatGPTClient({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini',
  temperature: 0.3, // 更確定性的輸出 (0-1)
  maxTokens: 2048,  // 限制輸出長度
});
```

### 多輪對話

```typescript
// ChatGPT 多輪對話
const messages = [
  { role: 'user', content: '你好！' },
  { role: 'assistant', content: '你好！有什麼我可以幫助你的？' },
  { role: 'user', content: '幫我解釋什麼是遞歸' },
];

const result = await chatgpt.chat(messages);
```

---

## 🐛 故障排除

### 問題 1: API Key 無效

```
錯誤: Invalid API key
```

**解決**:
- 檢查 `.env` 文件是否正確設置
- 確認 API key 沒有過期
- 檢查 API key 是否有正確的權限

### 問題 2: 網絡超時

```
錯誤: Request timeout
```

**解決**:
- 檢查網絡連接
- 增加超時時間
- 使用代理（如果在中國大陸）

### 問題 3: Token 限制

```
錯誤: Maximum context length exceeded
```

**解決**:
- 減少輸入內容長度
- 使用 `maxTokens` 參數限制輸出
- 考慮使用支援更長上下文的模型 (Gemini Pro 1M tokens)

### 問題 4: 成本超標

**解決**:
- 設置每日預算限制
- 優先使用 Gemini (成本低 80%)
- 避免不必要的並行執行
- 使用動態路由策略

---

## 📈 監控與追蹤

### 整合到 Genesis Observability

```typescript
import { trackCollaboration } from './src/main/js/utils/observability';

// 執行任務
const result = await chatgpt.complete('任務描述');

// 上報使用量
await trackCollaboration({
  project_id: 'GAC_FactoryOS',
  task_id: 'task-001',
  task_type: 'code_generation',
  strategy: 'dynamic_routing',
  ai_used: ['chatgpt'],
  total_tokens: result.tokens,
  total_cost: result.cost,
  duration_ms: 1500,
});
```

### 查看統計

訪問 Dashboard:
https://genesis-observability-obs-dashboard.vercel.app/

---

## 📚 更多資源

- **OpenAI 文檔**: https://platform.openai.com/docs
- **Google AI 文檔**: https://ai.google.dev/docs
- **Anthropic 文檔**: https://docs.anthropic.com/
- **多 AI 協作設計**: `MULTI_AI_COLLABORATION.md`
- **Genesis Observability**: `genesis-observability/`

---

## 🎯 下一步

1. ✅ 完成 API Keys 設置
2. ✅ 測試連接
3. ✅ 運行示範
4. 🔄 實現你的第一個協作任務
5. 📊 監控使用量和成本
6. 🚀 優化策略

---

**作者**: Claude Code
**日期**: 2025-10-07
**版本**: 1.0
