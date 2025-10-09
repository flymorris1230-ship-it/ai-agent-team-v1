# Factory OS 整合文檔

## 概述

GAC v1 現已整合 Factory OS 健康監控系統，提供：
- 🔄 自動健康檢查 (每 5 分鐘)
- 📊 實時狀態監控
- 📈 歷史數據統計
- 🚨 異常告警檢測
- 📡 RESTful API 端點

## 架構

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   GAC (GAC)       │         │   Genesis Factory OS         │
│   Cloudflare Workers        │         │   Next.js + tRPC             │
│                             │         │                              │
│  ┌──────────────────────┐   │         │  ┌────────────────────────┐  │
│  │  Factory OS Client   │───┼────────►│  │  Health Router         │  │
│  │  (HTTP Client)       │   │  HTTPS  │  │  (tRPC Endpoints)      │  │
│  └──────────────────────┘   │         │  └────────────────────────┘  │
│             │                │         │                              │
│             ▼                │         │  ┌────────────────────────┐  │
│  ┌──────────────────────┐   │         │  │  Database (PostgreSQL) │  │
│  │  Health Monitor      │   │         │  └────────────────────────┘  │
│  │  Service             │   │         └──────────────────────────────┘
│  └──────────────────────┘   │
│             │                │
│             ▼                │
│  ┌──────────────────────┐   │
│  │  D1 Database         │   │
│  │  (Health Checks)     │   │
│  └──────────────────────┘   │
│                             │
│  ┌──────────────────────┐   │
│  │  Cron Trigger        │   │
│  │  (Every 5 minutes)   │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

## 核心組件

### 1. Factory OS Client (`src/integrations/factory-os-client.ts`)

HTTP 客戶端，負責與 Factory OS 通訊。

**主要方法：**
- `ping()` - 基本健康檢查
- `checkDBStatus()` - 數據庫狀態檢查
- `getSystemMetrics()` - 系統指標獲取
- `getIntegrationStatus()` - 整合狀態查詢
- `fullHealthCheck()` - 完整健康檢查

**特性：**
- ✅ 自動重試機制 (最多 3 次)
- ✅ 指數退避策略 (1s, 2s, 4s)
- ✅ 超時控制 (預設 30 秒)
- ✅ 錯誤處理

### 2. Health Monitor Service (`src/services/health-monitor.ts`)

健康監控服務，負責執行檢查並記錄到數據庫。

**主要方法：**
- `performHealthCheck()` - 執行健康檢查並記錄
- `getRecentHealthChecks(limit)` - 獲取歷史記錄
- `getHealthStats(hours)` - 獲取統計數據
- `detectAndAlertAnomalies()` - 異常檢測與告警

**告警條件：**
- 連續 3 次失敗 → 發送告警
- 平均響應時間 > 5000ms → 性能警告

### 3. Scheduled Tasks (`src/scheduled/index.ts`)

Cron 定時任務處理器。

**執行頻率：** 每 5 分鐘 (可配置)

**任務流程：**
1. 執行 Factory OS 健康檢查
2. 記錄結果到 D1 數據庫
3. 檢測異常狀態
4. 執行數據庫同步 (如果配置)

### 4. API Routes (`src/main/js/api/routes/factory-status.ts`)

RESTful API 端點，提供監控數據查詢。

## 環境配置

### 必要環境變數

在 `.env` 或 Cloudflare Workers 環境變數中設置：

```bash
# Factory OS Integration
FACTORY_OS_URL="http://localhost:3001"        # 開發環境
# FACTORY_OS_URL="https://factory-os.shyangtsuen.xyz"  # 正式環境
FACTORY_OS_API_KEY="your-api-key-here"        # API 認證金鑰
```

### wrangler.toml 配置

添加 Cron trigger：

```toml
[triggers]
crons = ["*/5 * * * *"]  # 每 5 分鐘執行一次

# 或使用其他頻率：
# crons = ["*/10 * * * *"]  # 每 10 分鐘
# crons = ["0 * * * *"]     # 每小時
# crons = ["0 */4 * * *"]   # 每 4 小時
```

## 數據庫 Schema

### factory_health_checks 表

```sql
CREATE TABLE factory_health_checks (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  factory_os_status TEXT NOT NULL,      -- 'healthy' | 'degraded' | 'down'
  response_time_ms INTEGER NOT NULL,
  database_status TEXT NOT NULL,        -- 'connected' | 'error'
  integration_operational INTEGER NOT NULL,  -- 0 or 1
  error_message TEXT,
  created_at INTEGER NOT NULL
);
```

## API 端點

### 1. 當前狀態

```bash
GET /api/v1/factory-status/current
```

**響應：**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-10-06T10:30:00.000Z",
    "factory_os": {
      "status": "healthy",
      "response_time_ms": 245,
      "database_status": "connected"
    },
    "integration": {
      "operational": true
    }
  }
}
```

### 2. 歷史記錄

```bash
GET /api/v1/factory-status/history?limit=20
```

**響應：**
```json
{
  "success": true,
  "data": {
    "total": 20,
    "checks": [
      {
        "timestamp": "2025-10-06T10:30:00.000Z",
        "factory_os_status": "healthy",
        "response_time_ms": 245,
        "database_status": "connected",
        "integration_operational": true
      }
    ]
  }
}
```

### 3. 統計數據

```bash
GET /api/v1/factory-status/stats?hours=24
```

**響應：**
```json
{
  "success": true,
  "data": {
    "period_hours": 24,
    "statistics": {
      "total_checks": 288,
      "healthy_count": 285,
      "degraded_count": 2,
      "down_count": 1,
      "avg_response_time_ms": 234.5,
      "uptime_percentage": 99.65
    },
    "summary": {
      "status": "excellent",
      "uptime_sla": "99.65%"
    }
  }
}
```

### 4. 測試連接

```bash
POST /api/v1/factory-status/test-connection
```

**響應：**
```json
{
  "success": true,
  "data": {
    "connection_status": "successful",
    "test_duration_ms": 312,
    "factory_os": {
      "status": "healthy",
      "metrics": {...}
    }
  }
}
```

### 5. 手動檢查

```bash
POST /api/v1/factory-status/check-now
```

**響應：**
```json
{
  "success": true,
  "data": {
    "message": "Health check completed",
    "result": {...}
  }
}
```

### 6. 儀表板數據

```bash
GET /api/v1/factory-status/dashboard
```

**響應：**
```json
{
  "success": true,
  "data": {
    "current_status": {...},
    "recent_checks": [...],
    "statistics": {
      "last_24h": {...},
      "last_7d": {...}
    },
    "alerts": {
      "critical": false,
      "warning": false
    }
  }
}
```

## 本地測試

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動 Factory OS

```bash
cd /path/to/genesis-factory-os
npm run dev  # 啟動在 http://localhost:3001
```

### 3. 運行測試腳本

```bash
cd /path/to/gac-v1

# 設置環境變數
export FACTORY_OS_URL="http://localhost:3001"
export FACTORY_OS_API_KEY="test-api-key"

# 運行測試
npx tsx scripts/test-factory-os-integration.ts
```

**預期輸出：**
```
╔═══════════════════════════════════════════════════════════╗
║  GAC ↔ Factory OS 整合測試                      ║
╚═══════════════════════════════════════════════════════════╝

ℹ️  Factory OS URL: http://localhost:3001
ℹ️  API Key: 已設置

============================================================
Test 1: Ping Factory OS
============================================================
✅ Ping 成功
ℹ️    狀態: healthy
ℹ️    時間: 2025-10-06T10:30:00.000Z
ℹ️    訊息: pong

============================================================
Test 2: 檢查數據庫狀態
============================================================
✅ 數據庫連接正常
ℹ️    最近遷移數量: 5

...
```

### 4. 本地開發模式

```bash
npm run dev
```

### 5. 部署到 Cloudflare

```bash
# 設置環境變數
npx wrangler secret put FACTORY_OS_URL
npx wrangler secret put FACTORY_OS_API_KEY

# 部署
npm run deploy
```

## 監控與告警

### 告警條件

1. **Critical (嚴重)：** Factory OS 連續 3 次健康檢查失敗
2. **Warning (警告)：** 平均響應時間超過 5000ms

### 告警輸出

當前告警輸出到 console，可以擴展到：
- Email 通知
- Slack 通知
- Webhook 通知
- PagerDuty 整合

**擴展方式：**

在 `src/services/health-monitor.ts` 中的 `detectAndAlertAnomalies()` 方法添加通知邏輯：

```typescript
if (consecutiveFailures >= 3) {
  // 發送 Email
  await sendEmailAlert({
    subject: '🚨 Factory OS 嚴重告警',
    body: 'Factory OS has been down for 3+ consecutive checks'
  })

  // 發送 Slack 通知
  await sendSlackMessage({
    channel: '#alerts',
    text: '⚠️ Factory OS is down!'
  })
}
```

## 性能優化

### 1. 調整檢查頻率

修改 `wrangler.toml`：

```toml
# 降低頻率以節省資源
crons = ["*/10 * * * *"]  # 每 10 分鐘

# 或在低流量時段減少檢查
crons = ["*/5 * * * *"]   # 白天每 5 分鐘
crons = ["*/30 * * * *"]  # 夜間每 30 分鐘
```

### 2. 優化超時設置

修改 `FactoryOSClient` 初始化：

```typescript
const client = new FactoryOSClient({
  baseURL: env.FACTORY_OS_URL,
  apiKey: env.FACTORY_OS_API_KEY,
  timeout: 10000,  // 10 秒 (預設 30 秒)
})
```

### 3. 調整重試次數

在 `factory-os-client.ts` 中：

```typescript
private async retryFetch<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 2  // 降低到 2 次
): Promise<T> {
  // ...
}
```

## 故障排除

### 問題 1: Factory OS 無法連接

**症狀：** `NETWORK_ERROR` 或超時

**解決方法：**
1. 確認 Factory OS 正在運行
2. 檢查 `FACTORY_OS_URL` 是否正確
3. 檢查網絡連接
4. 查看 Factory OS 日誌

### 問題 2: 認證失敗

**症狀：** `INVALID_API_KEY` 錯誤

**解決方法：**
1. 確認 `FACTORY_OS_API_KEY` 已設置
2. 檢查 API Key 是否正確
3. 確認 Factory OS 端的 API Key 配置

### 問題 3: Cron 任務未執行

**症狀：** 沒有健康檢查記錄

**解決方法：**
1. 檢查 `wrangler.toml` 中的 cron 配置
2. 確認已部署到 Cloudflare Workers
3. 查看 Workers 日誌：`npx wrangler tail`
4. 確認 D1 數據庫已創建表

### 問題 4: 數據庫表不存在

**症狀：** SQL 錯誤 "no such table"

**解決方法：**
```bash
# 執行 schema 創建
npx wrangler d1 execute DB --file=src/main/js/database/schema.sql
```

## 擴展功能

### 1. 添加更多檢查項目

在 `FactoryOSClient` 中添加新方法：

```typescript
async checkAPIHealth(): Promise<boolean> {
  try {
    const response = await this.request('/api/v1/health')
    return response.success
  } catch {
    return false
  }
}
```

### 2. 自定義告警規則

在 `HealthMonitorService` 中：

```typescript
async detectCustomAnomalies(): Promise<void> {
  const stats = await this.getHealthStats(1)

  // 自定義規則：如果 1 小時內有超過 5 次失敗
  if (stats.down_count > 5) {
    await this.sendAlert('HIGH_FAILURE_RATE', stats)
  }
}
```

### 3. 整合第三方監控

```typescript
// 發送到 Datadog
await fetch('https://api.datadoghq.com/api/v1/series', {
  method: 'POST',
  headers: {
    'DD-API-KEY': env.DATADOG_API_KEY
  },
  body: JSON.stringify({
    series: [{
      metric: 'factory.os.health',
      points: [[Date.now() / 1000, result.factory_os_status === 'healthy' ? 1 : 0]]
    }]
  })
})
```

## 最佳實踐

1. **環境變數管理：** 使用 Wrangler secrets 而非直接在代碼中
2. **錯誤處理：** 總是捕獲並記錄錯誤
3. **超時設置：** 根據網絡環境調整
4. **數據清理：** 定期清理舊的健康檢查記錄 (建議保留 30 天)
5. **告警頻率：** 避免告警疲勞，設置合理的閾值

## 相關文檔

- [Factory OS Integration Guide](/tmp/genesis-factory-os-temp/docs/GAC_INTEGRATION.md)
- [Cloudflare Workers Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare D1 Database](https://developers.cloudflare.com/d1/)

---

**維護者：** GAC
**更新日期：** 2025-10-06
**版本：** 1.0.0
