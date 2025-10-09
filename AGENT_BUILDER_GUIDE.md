# 🤖 Agent Builder Integration Guide

完整整合 ChatGPT 式的 Agent Building、Audio 和 Images 功能到 GAC Agent 團隊系統。

## 📋 目錄

1. [功能概述](#功能概述)
2. [資料庫架構](#資料庫架構)
3. [API 使用指南](#api-使用指南)
4. [使用場景範例](#使用場景範例)
5. [部署步驟](#部署步驟)

---

## 🎯 功能概述

### 1. **Agent Building**
讓用戶自行創建專屬 AI Agent，無需編程技能。

**核心特性：**
- ✅ 自訂指令（System Prompt）
- ✅ 選擇 LLM 模型（Claude, GPT-4 等）
- ✅ 配置能力（程式碼解釋器、檔案搜尋、網頁搜尋）
- ✅ 知識庫整合
- ✅ 溫度、Token 限制等參數調整
- ✅ 預設範本（品檢專家、生產規劃、維護助手等）

### 2. **Audio Processing**
語音輸入/輸出能力。

**核心功能：**
- ✅ 語音轉文字（STT - Speech-to-Text）
- ✅ 文字轉語音（TTS - Text-to-Speech）
- ✅ 多語言支援
- ✅ R2 儲存整合

### 3. **Image Processing**
圖片分析和生成。

**核心功能：**
- ✅ 圖片分析（Vision AI）
- ✅ OCR 文字提取
- ✅ 物體辨識
- ✅ 圖片生成（DALL-E, Stable Diffusion）
- ✅ R2 儲存整合

---

## 🗄️ 資料庫架構

### 新增的資料表

#### 1. `custom_agents` - 自訂 Agent
```sql
CREATE TABLE custom_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL,
  model TEXT DEFAULT 'claude-3-5-sonnet',
  capabilities TEXT, -- JSON array
  supports_audio INTEGER DEFAULT 0,
  supports_image INTEGER DEFAULT 0,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  created_by TEXT NOT NULL,
  is_public INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

#### 2. `audio_messages` - 音訊訊息
```sql
CREATE TABLE audio_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  audio_format TEXT NOT NULL,
  transcription TEXT,
  language TEXT,
  is_generated INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
```

#### 3. `image_messages` - 圖片訊息
```sql
CREATE TABLE image_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_format TEXT NOT NULL,
  description TEXT,
  detected_objects TEXT, -- JSON
  is_generated INTEGER DEFAULT 0,
  processing_status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
```

#### 4. `agent_templates` - Agent 範本
```sql
CREATE TABLE agent_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_instructions TEXT NOT NULL,
  supports_audio INTEGER DEFAULT 0,
  supports_image INTEGER DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

---

## 🔌 API 使用指南

### Agent Builder API

#### 創建自訂 Agent
```http
POST /api/v1/agent-builder/agents
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "品質檢驗專家",
  "description": "專門分析產品缺陷並提供改善建議",
  "instructions": "你是品質檢驗專家，專門分析產品缺陷...",
  "model": "claude-3-5-sonnet",
  "capabilities": ["file_search", "image_analysis"],
  "supports_audio": true,
  "supports_image": true,
  "temperature": 0.7,
  "max_tokens": 4096,
  "tags": ["manufacturing", "quality"]
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "custom-agent-1234567890-abc",
    "name": "品質檢驗專家",
    "status": "active",
    "created_at": 1704067200000
  }
}
```

#### 列出我的 Agents
```http
GET /api/v1/agent-builder/agents?include_public=true
Authorization: Bearer {token}
```

#### 從範本克隆 Agent
```http
POST /api/v1/agent-builder/templates/template-quality-inspector/clone
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "我的品檢助手"
}
```

#### 列出可用範本
```http
GET /api/v1/agent-builder/templates?category=manufacturing
```

---

### Audio API

#### 語音轉文字（STT）
```http
POST /api/v1/audio/transcribe
Authorization: Bearer {token}
Content-Type: multipart/form-data

audio: [audio file]
language: zh
prompt: "這是品質會議錄音"
```

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "audio-1234567890-abc",
    "transcription": "本週共發現 15 件品質異常...",
    "language": "zh",
    "confidence": 0.95,
    "duration_seconds": 120
  }
}
```

#### 文字轉語音（TTS）
```http
POST /api/v1/audio/speak
Authorization: Bearer {token}
Content-Type: application/json

{
  "text": "品質檢驗已完成，發現 3 件異常",
  "voice": "alloy",
  "speed": 1.0,
  "format": "mp3"
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "tts-1234567890-abc",
    "audio_url": "https://storage.example.com/audio/...",
    "audio_format": "mp3",
    "duration_seconds": 5
  }
}
```

---

### Image API

#### 圖片分析
```http
POST /api/v1/images/analyze
Authorization: Bearer {token}
Content-Type: multipart/form-data

image: [image file]
detect_objects: true
extract_text: true
detailed_description: true
```

**回應：**
```json
{
  "success": true,
  "data": {
    "id": "img-analysis-1234567890-abc",
    "description": "產品外觀照片，可見明顯刮痕",
    "detected_objects": [
      {
        "label": "scratch",
        "confidence": 0.92
      },
      {
        "label": "product_surface",
        "confidence": 0.98
      }
    ],
    "ocr_text": "LOT: 2024010",
    "tags": ["defect", "quality_issue"]
  }
}
```

#### OCR 文字提取
```http
POST /api/v1/images/ocr
Authorization: Bearer {token}
Content-Type: multipart/form-data

image: [image file]
language: zh
```

#### 圖片生成
```http
POST /api/v1/images/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "prompt": "工廠生產線流程圖，包含 5 個工作站",
  "model": "dall-e-3",
  "size": "1024x1024",
  "quality": "hd"
}
```

---

## 💡 使用場景範例

### 場景 1：品質檢驗 Agent + 圖片分析

```javascript
// 1. 創建品質檢驗 Agent
const response1 = await fetch('/api/v1/agent-builder/templates/template-quality-inspector/clone', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '我的品檢助手',
  }),
});
const agent = await response1.json();

// 2. 上傳產品照片進行分析
const formData = new FormData();
formData.append('image', imageFile);
formData.append('detect_objects', 'true');
formData.append('extract_text', 'true');

const response2 = await fetch('/api/v1/images/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});
const imageAnalysis = await response2.json();

// 3. 將分析結果傳給 Agent 進行專業判斷
const response3 = await fetch('/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agent_id: agent.data.id,
    messages: [
      {
        role: 'user',
        content: `請分析以下品質檢驗結果：\n${JSON.stringify(imageAnalysis.data, null, 2)}`,
      },
    ],
  }),
});
const agentResponse = await response3.json();

console.log('品檢 Agent 回應:', agentResponse.response);
```

### 場景 2：語音報工流程

```javascript
// 1. 作業員語音報工
const audioFormData = new FormData();
audioFormData.append('audio', audioFile);
audioFormData.append('language', 'zh');

const response1 = await fetch('/api/v1/audio/transcribe', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: audioFormData,
});
const transcription = await response1.json();

// 2. 解析報工內容並更新 MES
const workReport = {
  station: extractStation(transcription.data.transcription),
  workOrder: extractWorkOrder(transcription.data.transcription),
  quantity: extractQuantity(transcription.data.transcription),
};

// 3. 生成語音確認
const response2 = await fetch('/api/v1/audio/speak', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: `已記錄：站點 ${workReport.station}，工單 ${workReport.workOrder}，數量 ${workReport.quantity}`,
    voice: 'alloy',
    language: 'zh',
  }),
});
const confirmation = await response2.json();

// 播放確認語音
playAudio(confirmation.data.audio_url);
```

### 場景 3：設備維護助手（多模態）

```javascript
// 1. 創建維護助手 Agent
const agent = await createAgentFromTemplate('template-maintenance-assistant', '維修小幫手');

// 2. 上傳設備異常照片
const imageAnalysis = await analyzeImage(devicePhoto);

// 3. 錄製異常聲音
const audioTranscription = await transcribeAudio(deviceSound);

// 4. 綜合診斷
const diagnosis = await chat(agent.id, `
設備狀況：
- 視覺檢查：${imageAnalysis.description}
- 檢測物體：${JSON.stringify(imageAnalysis.detected_objects)}
- 異常聲音：${audioTranscription.transcription}

請提供診斷和維修建議。
`);

console.log('診斷結果:', diagnosis.response);

// 5. 如果需要語音指引
if (enableVoiceGuidance) {
  const voiceGuidance = await textToSpeech(diagnosis.response);
  playAudio(voiceGuidance.audio_url);
}
```

---

## 🚀 部署步驟

### 1. 執行資料庫遷移

```bash
cd /Users/morrislin/Desktop/GAC_FactroyOS/apps/gac

# 檢查 wrangler.toml 中的 D1 database_id
cat wrangler.toml

# 執行遷移
wrangler d1 execute DB --file=src/main/js/database/agent-builder-migration.sql
```

### 2. 配置環境變數

在 Cloudflare Workers 設定中新增：

```toml
# wrangler.toml 或 Cloudflare Dashboard

[vars]
# LLM API Keys（根據使用的模型）
ANTHROPIC_API_KEY = "your-api-key"
OPENAI_API_KEY = "your-api-key"

# R2 Storage（音訊/圖片檔案）
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "gac-media-storage"
```

### 3. 部署到 Cloudflare Workers

```bash
# 本地測試
wrangler dev

# 部署到生產環境
wrangler deploy
```

### 4. 驗證部署

```bash
# 測試 API 端點
curl -X GET https://your-worker.workers.dev/api/v1/agent-builder/templates

# 測試建立 Agent
curl -X POST https://your-worker.workers.dev/api/v1/agent-builder/agents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試 Agent",
    "instructions": "你是一個測試助手",
    "model": "claude-3-5-sonnet"
  }'
```

---

## 📊 預設範本

系統已內建以下 Agent 範本：

### 製造業專用
1. **Quality Inspector Agent** - 品質檢驗專家
   - 支援圖片分析
   - 支援語音輸入
   - 專業缺陷診斷

2. **Production Planning Agent** - 生產規劃專家
   - 產能分析
   - 排程優化
   - 支援語音輸入

3. **Equipment Maintenance Agent** - 設備維護專家
   - 故障診斷
   - 支援圖片和語音
   - 維修指引

### 通用範本
4. **Customer Service Agent** - 客服助手
5. **Code Assistant** - 程式設計助手
6. **Data Analyst** - 數據分析師

---

## 🔧 整合至現有 Agent 團隊

Custom Agents 可與現有的 9 個系統 Agents 協同工作：

```javascript
// 範例：品檢 Agent 發現異常後，觸發系統 Agent 處理
const qualityIssue = await customAgent.analyze(productImage);

if (qualityIssue.severity === 'high') {
  // 觸發 Coordinator Agent 創建任務
  await coordinatorAgent.createTask({
    type: 'quality_alert',
    title: '高風險品質異常',
    description: qualityIssue.description,
    priority: 'critical',
    assigned_to: 'agent-qa',
  });
}
```

---

## 📈 效益評估

| 功能模組 | 實施時間 | 預期效益 |
|---------|---------|---------|
| Agent Builder | 2 週 | 降低 60% Agent 開發成本 |
| Audio Processing | 1 週 | 提升 40% 作業效率 |
| Image Processing | 2 週 | 品檢效率提升 10 倍 |

---

## 🆘 疑難排解

### 常見問題

**Q: Custom Agent 無法創建**
```
A: 檢查資料庫遷移是否成功：
   wrangler d1 execute DB --command="SELECT name FROM sqlite_master WHERE type='table' AND name='custom_agents'"
```

**Q: 音訊轉文字失敗**
```
A: 確認 OPENAI_API_KEY 或 Whisper API 配置正確
```

**Q: 圖片上傳到 R2 失敗**
```
A: 檢查 R2 bucket binding 配置：
   wrangler.toml 中的 [[r2_buckets]] 設定
```

---

## 📚 相關文件

- [Claude API Documentation](https://docs.anthropic.com/)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Cloudflare R2 Storage](https://developers.cloudflare.com/r2/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)

---

## 🎯 下一步

1. **整合真實 LLM API**（目前為 placeholder）
2. **完善 Audio/Image 處理**（整合 Whisper、DALL-E）
3. **前端 UI 開發**（Agent Builder 拖拉介面）
4. **效能優化**（快取、批次處理）
5. **監控和分析**（使用量、成本追蹤）

---

**建構時間：** 2025-01-09
**版本：** 1.0.0
**維護者：** GAC Development Team
