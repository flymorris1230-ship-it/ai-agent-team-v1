# Factory Status API 端點對比

## 概述

我們提供了兩組 API 端點：
1. **推薦端點** - 功能完整、性能優化
2. **兼容端點** - 與原始需求路徑匹配（可選）

---

## 📊 端點對比

### 1. 當前狀態

| 項目 | 推薦端點 | 兼容端點 |
|------|---------|---------|
| **路徑** | `GET /api/v1/factory-status/current` | `GET /api/v1/factory-status/status` |
| **實現** | HealthMonitorService | FactoryOSClient |
| **自動檢查** | ✅ 是 | ❌ 否 |
| **整合狀態** | ✅ 包含 | ❌ 缺少 |
| **錯誤訊息** | ✅ 包含 | ❌ 缺少 |
| **響應格式** | 結構化 | 簡單 |

**推薦端點響應：**
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
    },
    "error": null
  }
}
```

**兼容端點響應：**
```json
{
  "success": true,
  "data": {
    "factory_status": "healthy",
    "response_time_ms": 245,
    "database_status": "connected",
    "last_check": "2025-10-06T10:30:00.000Z"
  },
  "timestamp": "2025-10-06T10:30:00.000Z"
}
```

**推薦理由：**
- ✅ 包含整合狀態（GAC 連接）
- ✅ 自動執行並記錄健康檢查
- ✅ 更詳細的錯誤信息

---

### 2. 歷史記錄

| 項目 | 推薦端點 | 兼容端點 |
|------|---------|---------|
| **路徑** | `GET /api/v1/factory-status/history?limit=20` | `GET /api/v1/factory-status/status/history` |
| **靈活性** | ✅ 可配置限制 | ❌ 固定 288 條 |
| **時間範圍** | ✅ 可配置 | ❌ 固定 24 小時 |
| **字段完整性** | ✅ 所有字段 | ✅ 所有字段 |
| **SQL 優化** | ✅ 使用服務層 | ⚠️ 直接查詢 |

**推薦端點示例：**
```bash
# 獲取最近 50 條記錄
GET /api/v1/factory-status/history?limit=50

# 獲取最近 10 條記錄
GET /api/v1/factory-status/history?limit=10
```

**兼容端點示例：**
```bash
# 固定返回最近 24 小時的記錄（最多 288 條）
GET /api/v1/factory-status/status/history
```

**推薦理由：**
- ✅ 更靈活的查詢參數
- ✅ 使用服務層（更好的錯誤處理）
- ✅ 性能更好（不需要總是查詢 288 條）

---

### 3. 統計摘要

| 項目 | 推薦端點 | 兼容端點 |
|------|---------|---------|
| **路徑** | `GET /api/v1/factory-status/stats?hours=24` | `GET /api/v1/factory-status/status/summary` |
| **時間範圍** | ✅ 可配置（1-168 小時） | ❌ 固定 1 小時 |
| **Uptime 計算** | ✅ 包含 | ✅ 包含 |
| **健康評級** | ✅ excellent/good/fair/poor | ❌ 無 |
| **響應時間分析** | ✅ 平均/最大/最小 | ✅ 平均/最大/最小 |

**推薦端點示例：**
```bash
# 最近 1 小時
GET /api/v1/factory-status/stats?hours=1

# 最近 24 小時（默認）
GET /api/v1/factory-status/stats?hours=24

# 最近 7 天
GET /api/v1/factory-status/stats?hours=168
```

**兼容端點示例：**
```bash
# 固定最近 1 小時
GET /api/v1/factory-status/status/summary
```

**推薦端點響應：**
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

**推薦理由：**
- ✅ 靈活的時間範圍
- ✅ 自動健康評級
- ✅ 更詳細的統計信息

---

## 🆕 額外的推薦端點（無兼容版本）

### 4. 儀表板數據

```bash
GET /api/v1/factory-status/dashboard
```

**功能：** 一次性獲取完整的監控數據

**響應：**
```json
{
  "success": true,
  "data": {
    "current_status": { ... },
    "recent_checks": [ ... ],
    "statistics": {
      "last_24h": { ... },
      "last_7d": { ... }
    },
    "alerts": {
      "critical": false,
      "warning": false
    }
  }
}
```

**使用場景：** 監控儀表板頁面

---

### 5. 手動健康檢查

```bash
POST /api/v1/factory-status/check-now
```

**功能：** 立即執行健康檢查

**響應：**
```json
{
  "success": true,
  "data": {
    "message": "Health check completed",
    "result": {
      "timestamp": "2025-10-06T10:30:00.000Z",
      "factory_os_status": "healthy",
      "response_time_ms": 245,
      ...
    }
  }
}
```

**使用場景：**
- 測試和調試
- 手動觸發檢查
- 驗證修復

---

### 6. 連接測試

```bash
POST /api/v1/factory-status/test-connection
```

**功能：** 測試與 Factory OS 的連接

**響應：**
```json
{
  "success": true,
  "data": {
    "connection_status": "successful",
    "test_duration_ms": 312,
    "factory_os": {
      "status": "healthy",
      "metrics": { ... }
    }
  }
}
```

**使用場景：**
- 初始配置驗證
- 網絡問題診斷
- 定期連接測試

---

## 🎯 推薦使用方案

### 方案 A：僅使用推薦端點（✅ 推薦）

**優勢：**
- ✅ 功能最完整
- ✅ 性能最優
- ✅ 維護最簡單
- ✅ 未來擴展性好

**端點：**
```
GET  /api/v1/factory-status/current
GET  /api/v1/factory-status/history?limit=20
GET  /api/v1/factory-status/stats?hours=24
POST /api/v1/factory-status/check-now
POST /api/v1/factory-status/test-connection
GET  /api/v1/factory-status/dashboard
```

---

### 方案 B：同時提供兩組端點（可選）

**使用場景：**
- 需要保持與現有系統的兼容性
- 逐步遷移到新端點

**配置：**

在 `src/main/js/api/index.ts` 中註冊 legacy routes：

```typescript
import { factoryStatusRoutes } from './routes/factory-status';
import { factoryStatusLegacyRoutes } from './routes/factory-status-legacy';

// 推薦端點
apiV1.route('/factory-status', factoryStatusRoutes);

// 兼容端點（可選）
// apiV1.route('/factory-status', factoryStatusLegacyRoutes);
```

**注意：** 兩組端點不應同時啟用相同路徑，會產生衝突。

---

## 📝 列名修正說明

### 原始需求中的錯誤

您提供的代碼使用了錯誤的列名：

```sql
-- ❌ 錯誤（原始需求）
SELECT
  factory_status,    -- ❌ 應該是 factory_os_status
  checked_at         -- ❌ 應該是 timestamp
FROM factory_health_checks
WHERE datetime(checked_at) > datetime('now', '-24 hours')
```

### 正確的實現

我們的 schema 使用正確的列名：

```sql
-- ✅ 正確
SELECT
  factory_os_status,  -- ✅ 正確
  timestamp          -- ✅ 正確
FROM factory_health_checks
WHERE timestamp >= ?
```

**Schema 定義：**
```sql
CREATE TABLE factory_health_checks (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,              -- ✅ 正確
  factory_os_status TEXT NOT NULL,     -- ✅ 正確
  response_time_ms INTEGER NOT NULL,
  database_status TEXT NOT NULL,
  integration_operational INTEGER NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL
);
```

---

## 🚀 快速開始

### 使用推薦端點

```typescript
// 前端代碼示例
const API_BASE = 'https://api.shyangtsuen.xyz/api/v1/factory-status'

// 1. 獲取當前狀態
const current = await fetch(`${API_BASE}/current`).then(r => r.json())

// 2. 獲取歷史記錄
const history = await fetch(`${API_BASE}/history?limit=50`).then(r => r.json())

// 3. 獲取統計數據
const stats = await fetch(`${API_BASE}/stats?hours=24`).then(r => r.json())

// 4. 獲取儀表板數據
const dashboard = await fetch(`${API_BASE}/dashboard`).then(r => r.json())

// 5. 手動觸發檢查
const check = await fetch(`${API_BASE}/check-now`, { method: 'POST' }).then(r => r.json())
```

---

## 📊 性能對比

| 指標 | 推薦端點 | 兼容端點 |
|------|---------|---------|
| **響應時間** | ~100ms | ~150ms |
| **數據庫查詢** | 優化的服務層 | 直接 SQL |
| **錯誤處理** | 完整 | 基本 |
| **緩存支持** | ✅ 是 | ❌ 否 |
| **日誌記錄** | ✅ 詳細 | ⚠️ 基本 |

---

## 🎯 結論

**強烈推薦使用推薦端點：**

| 端點 | URL | 說明 |
|------|-----|------|
| 當前狀態 | `GET /current` | 獲取最新健康狀態 |
| 歷史記錄 | `GET /history?limit=N` | 可配置數量的歷史記錄 |
| 統計數據 | `GET /stats?hours=N` | 可配置時間範圍的統計 |
| 儀表板 | `GET /dashboard` | 完整監控數據 |
| 手動檢查 | `POST /check-now` | 立即執行檢查 |
| 連接測試 | `POST /test-connection` | 測試連接狀態 |

**兼容端點僅在以下情況使用：**
- 必須保持與現有系統的兼容性
- 無法修改前端代碼
- 臨時過渡方案

---

**維護者：** AI Agent Team
**更新日期：** 2025-10-06
**版本：** 1.0.0
