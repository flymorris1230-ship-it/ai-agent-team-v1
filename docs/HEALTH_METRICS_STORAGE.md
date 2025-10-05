# Factory OS 健康指標存儲指南

## 問題說明

原始代碼中的 SQL INSERT 語句與實際的數據庫 schema 不匹配：

### ❌ 錯誤的代碼

```typescript
/**
 * Store health metrics in database
 */
private async storeHealthMetrics(metrics: any, env: Env): Promise<void> {
  try {
    if (env.DB) {
      await env.DB.prepare(`
        INSERT INTO factory_health_checks
        (factory_status, response_time_ms, database_status, checked_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        metrics.factory_status,
        metrics.response_time_ms,
        metrics.database_status,
        metrics.last_check
      ).run();

      await this.logger.info('Health metrics stored to D1', { metrics });
    }
  } catch (error) {
    await this.logger.error('Failed to store health metrics', { error });
  }
}
```

**問題：**
1. 列名不匹配：`factory_status` 應為 `factory_os_status`
2. 缺少必要列：`integration_operational` 和 `error_message`
3. 錯誤的列名：`checked_at` 應為 `timestamp`
4. 沒有使用 ID（表有 auto-generated ID）

---

## ✅ 正確的實現

### 方案 1: 直接在 DatabaseSyncService 中添加（推薦）

在 `src/main/js/core/database-sync.ts` 中添加：

```typescript
/**
 * Store Factory OS health metrics in database
 */
async storeFactoryHealthMetrics(metrics: {
  factory_os_status: 'healthy' | 'degraded' | 'down';
  response_time_ms: number;
  database_status: 'connected' | 'error';
  integration_operational: boolean;
  error_message?: string;
  timestamp: string;
}): Promise<void> {
  try {
    await this.env.DB.prepare(`
      INSERT INTO factory_health_checks (
        timestamp,
        factory_os_status,
        response_time_ms,
        database_status,
        integration_operational,
        error_message
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      metrics.timestamp,
      metrics.factory_os_status,
      metrics.response_time_ms,
      metrics.database_status,
      metrics.integration_operational ? 1 : 0,  // SQLite boolean as integer
      metrics.error_message || null
    ).run();

    await this.logger.info('Factory OS health metrics stored to D1', {
      status: metrics.factory_os_status,
      response_time: metrics.response_time_ms
    });
  } catch (error) {
    await this.logger.error('Failed to store Factory OS health metrics', { error });
    throw error;
  }
}
```

### 方案 2: 使用現有的 HealthMonitorService（最佳實踐）

**推薦直接使用已實現的服務：**

```typescript
import { HealthMonitorService } from '../../../services/health-monitor';

// 在您的代碼中
const healthMonitor = new HealthMonitorService(env);

// 執行健康檢查並自動存儲
const result = await healthMonitor.performHealthCheck();

// result 會自動存儲到 factory_health_checks 表
```

---

## 數據庫 Schema 參考

### factory_health_checks 表結構

```sql
CREATE TABLE factory_health_checks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  timestamp TEXT NOT NULL,
  factory_os_status TEXT NOT NULL,      -- 'healthy' | 'degraded' | 'down'
  response_time_ms INTEGER NOT NULL,
  database_status TEXT NOT NULL,        -- 'connected' | 'error'
  integration_operational INTEGER NOT NULL,  -- 0 or 1 (boolean)
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 索引
CREATE INDEX idx_factory_health_timestamp ON factory_health_checks(timestamp);
CREATE INDEX idx_factory_health_status ON factory_health_checks(factory_os_status);
CREATE INDEX idx_factory_health_created_at ON factory_health_checks(created_at);
```

### 字段說明

| 字段 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | TEXT | ✅ | 自動生成的唯一 ID |
| `timestamp` | TEXT | ✅ | ISO 8601 時間戳 |
| `factory_os_status` | TEXT | ✅ | Factory OS 狀態 |
| `response_time_ms` | INTEGER | ✅ | 響應時間（毫秒） |
| `database_status` | TEXT | ✅ | 數據庫狀態 |
| `integration_operational` | INTEGER | ✅ | 整合運行狀態（0 或 1） |
| `error_message` | TEXT | ❌ | 錯誤訊息（可選） |
| `created_at` | INTEGER | ✅ | Unix 時間戳（自動） |

---

## 使用範例

### 範例 1: 使用 HealthMonitorService（推薦）

```typescript
import { HealthMonitorService } from '../../../services/health-monitor';
import type { Env } from '../types';

class MyService {
  private env: Env;

  async checkFactoryOSHealth(): Promise<void> {
    // 創建健康監控服務
    const healthMonitor = new HealthMonitorService(this.env);

    // 執行健康檢查（自動存儲到 D1）
    const result = await healthMonitor.performHealthCheck();

    console.log('Health check result:', {
      status: result.factory_os_status,
      response_time: result.response_time_ms,
      database: result.database_status,
      integration: result.integration_operational
    });

    // 檢測異常
    await healthMonitor.detectAndAlertAnomalies();

    // 獲取統計數據
    const stats = await healthMonitor.getHealthStats(24); // 最近 24 小時
    console.log('24h stats:', {
      uptime: stats.uptime_percentage,
      avg_response_time: stats.avg_response_time_ms
    });
  }
}
```

### 範例 2: 在 Cron 任務中使用

```typescript
// src/scheduled/index.ts
import { HealthMonitorService } from '../services/health-monitor';

export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  console.log('[Cron] Scheduled task triggered');

  try {
    // 執行 Factory OS 健康檢查
    const healthMonitor = new HealthMonitorService(env);
    const result = await healthMonitor.performHealthCheck();

    console.log('[Cron] Factory OS health check completed:', {
      status: result.factory_os_status,
      response_time: result.response_time_ms
    });

    // 檢測異常並告警
    await healthMonitor.detectAndAlertAnomalies();

    // 如果狀態為 down，記錄嚴重錯誤
    if (result.factory_os_status === 'down') {
      console.error('[Cron] ⚠️ CRITICAL: Factory OS is DOWN!', result.error_message);
    }
  } catch (error) {
    console.error('[Cron] Factory OS health check failed:', error);
  }
}
```

### 範例 3: 在 API 端點中使用

```typescript
// src/main/js/api/routes/custom.ts
import { Hono } from 'hono';
import { HealthMonitorService } from '../../../../services/health-monitor';
import type { Env } from '../../types';

const app = new Hono<{ Bindings: Env }>();

app.post('/check-factory-health', async (c) => {
  try {
    const healthMonitor = new HealthMonitorService(c.env);

    // 執行健康檢查
    const result = await healthMonitor.performHealthCheck();

    return c.json({
      success: true,
      data: {
        status: result.factory_os_status,
        response_time_ms: result.response_time_ms,
        database_status: result.database_status,
        integration_operational: result.integration_operational,
        timestamp: result.timestamp
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: (error as Error).message
      }
    }, 500);
  }
});

export default app;
```

---

## 查詢健康數據

### 查詢最近的健康檢查

```typescript
async getRecentHealthChecks(env: Env, limit: number = 10) {
  const results = await env.DB.prepare(`
    SELECT
      timestamp,
      factory_os_status,
      response_time_ms,
      database_status,
      integration_operational,
      error_message
    FROM factory_health_checks
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(limit).all();

  return results.results;
}
```

### 查詢統計數據

```typescript
async getHealthStats(env: Env, hours: number = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_checks,
      SUM(CASE WHEN factory_os_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
      SUM(CASE WHEN factory_os_status = 'degraded' THEN 1 ELSE 0 END) as degraded_count,
      SUM(CASE WHEN factory_os_status = 'down' THEN 1 ELSE 0 END) as down_count,
      AVG(response_time_ms) as avg_response_time_ms
    FROM factory_health_checks
    WHERE timestamp >= ?
  `).bind(since).first();

  const uptime_percentage = stats.total_checks > 0
    ? (stats.healthy_count / stats.total_checks) * 100
    : 0;

  return {
    ...stats,
    uptime_percentage: Math.round(uptime_percentage * 100) / 100
  };
}
```

---

## 告警與監控

### 異常檢測

```typescript
async detectAnomalies(env: Env): Promise<void> {
  const healthMonitor = new HealthMonitorService(env);

  // 獲取最近 5 次檢查
  const recent = await healthMonitor.getRecentHealthChecks(5);

  // 檢查連續失敗
  const consecutiveFailures = recent
    .slice(0, 3)
    .filter(check => check.factory_os_status === 'down')
    .length;

  if (consecutiveFailures >= 3) {
    console.error('🚨 ALERT: Factory OS has been down for 3+ consecutive checks');
    // 發送告警
    await sendAlert({
      severity: 'critical',
      message: 'Factory OS is down',
      checks: recent
    });
  }

  // 檢查性能降級
  const avgResponseTime = recent.reduce((sum, check) => sum + check.response_time_ms, 0) / recent.length;

  if (avgResponseTime > 5000) {
    console.warn('⚠️ WARNING: High average response time:', avgResponseTime, 'ms');
    // 發送警告
    await sendAlert({
      severity: 'warning',
      message: `High response time: ${avgResponseTime}ms`,
      checks: recent
    });
  }
}
```

---

## 數據清理

### 清理舊數據（建議保留 30 天）

```typescript
async cleanupOldHealthChecks(env: Env, daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

  const result = await env.DB.prepare(`
    DELETE FROM factory_health_checks
    WHERE timestamp < ?
  `).bind(cutoffDate).run();

  console.log(`Deleted ${result.meta.changes} old health check records`);

  return result.meta.changes || 0;
}
```

在 Cron 任務中定期執行：

```typescript
// 每天執行一次清理
if (cronType.includes('0 2')) {  // 每天凌晨 2 點
  const deleted = await cleanupOldHealthChecks(env, 30);
  console.log(`Cleaned up ${deleted} old health check records`);
}
```

---

## 最佳實踐

1. **使用現有服務**
   - ✅ 優先使用 `HealthMonitorService`
   - ✅ 避免重複實現相同邏輯

2. **錯誤處理**
   - ✅ 總是 try-catch 數據庫操作
   - ✅ 記錄錯誤到日誌
   - ✅ 不要因存儲失敗而中斷主流程

3. **性能優化**
   - ✅ 使用索引加速查詢
   - ✅ 定期清理舊數據
   - ✅ 批量操作時使用事務

4. **數據一致性**
   - ✅ 使用正確的列名和類型
   - ✅ Boolean 值轉換為 0/1（SQLite）
   - ✅ 時間戳使用 ISO 8601 格式

---

## 相關文檔

- [Factory OS Integration Guide](./FACTORY_OS_INTEGRATION.md)
- [Health Monitor Service](../src/services/health-monitor.ts)
- [Database Schema](../src/main/js/database/schema.sql)

---

**維護者：** AI Agent Team
**更新日期：** 2025-10-06
**版本：** 1.0.0
