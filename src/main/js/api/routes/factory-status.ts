/**
 * Factory Status API Routes
 * API endpoints for monitoring Factory OS integration status
 */

import { Hono } from 'hono'
import type { Env } from '../../types'
import { HealthMonitorService } from '../../../../services/health-monitor'
import { FactoryOSClient } from '../../../../integrations/factory-os-client'

export const factoryStatusRoutes = new Hono<{ Bindings: Env }>()

// ==========================================
// Current Status Endpoints
// ==========================================

/**
 * GET /factory-status/current
 * 獲取當前 Factory OS 狀態
 */
factoryStatusRoutes.get('/current', async (c) => {
  try {
    const healthMonitor = new HealthMonitorService(c.env)
    const result = await healthMonitor.performHealthCheck()

    return c.json({
      success: true,
      data: {
        timestamp: result.timestamp,
        factory_os: {
          status: result.factory_os_status,
          response_time_ms: result.response_time_ms,
          database_status: result.database_status,
        },
        integration: {
          operational: result.integration_operational,
        },
        error: result.error_message || null,
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: (error as Error).message,
        },
      },
      500
    )
  }
})

/**
 * GET /factory-status/history
 * 獲取歷史健康檢查記錄
 */
factoryStatusRoutes.get('/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20')
    const healthMonitor = new HealthMonitorService(c.env)
    const history = await healthMonitor.getRecentHealthChecks(limit)

    return c.json({
      success: true,
      data: {
        total: history.length,
        checks: history,
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'HISTORY_FETCH_FAILED',
          message: (error as Error).message,
        },
      },
      500
    )
  }
})

/**
 * GET /factory-status/stats
 * 獲取健康狀態統計
 */
factoryStatusRoutes.get('/stats', async (c) => {
  try {
    const hours = parseInt(c.req.query('hours') || '24')
    const healthMonitor = new HealthMonitorService(c.env)
    const stats = await healthMonitor.getHealthStats(hours)

    return c.json({
      success: true,
      data: {
        period_hours: hours,
        statistics: stats,
        summary: {
          status: stats.uptime_percentage >= 99 ? 'excellent'
            : stats.uptime_percentage >= 95 ? 'good'
            : stats.uptime_percentage >= 90 ? 'fair'
            : 'poor',
          uptime_sla: `${stats.uptime_percentage}%`,
        },
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'STATS_FETCH_FAILED',
          message: (error as Error).message,
        },
      },
      500
    )
  }
})

// ==========================================
// Integration Testing Endpoints
// ==========================================

/**
 * POST /factory-status/test-connection
 * 測試與 Factory OS 的連接
 */
factoryStatusRoutes.post('/test-connection', async (c) => {
  try {
    const factoryOSClient = new FactoryOSClient({
      baseURL: c.env.FACTORY_OS_URL || 'http://localhost:3001',
      apiKey: c.env.FACTORY_OS_API_KEY,
      timeout: 10000,
    })

    const startTime = Date.now()

    // 執行完整健康檢查
    const healthData = await factoryOSClient.fullHealthCheck()

    const duration = Date.now() - startTime

    return c.json({
      success: true,
      data: {
        connection_status: 'successful',
        test_duration_ms: duration,
        factory_os: {
          status: healthData.status,
          metrics: healthData.metrics,
        },
        integration: healthData.integration_status?.integration || null,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: (error as Error).message,
        },
        data: {
          connection_status: 'failed',
          timestamp: new Date().toISOString(),
        },
      },
      500
    )
  }
})

/**
 * GET /factory-status/integration-details
 * 獲取詳細的整合狀態信息
 */
factoryStatusRoutes.get('/integration-details', async (c) => {
  try {
    const factoryOSClient = new FactoryOSClient({
      baseURL: c.env.FACTORY_OS_URL || 'http://localhost:3001',
      apiKey: c.env.FACTORY_OS_API_KEY,
    })

    const integrationStatus = await factoryOSClient.getIntegrationStatus()

    if (!integrationStatus) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INTEGRATION_STATUS_UNAVAILABLE',
            message: 'Unable to fetch integration status from Factory OS',
          },
        },
        503
      )
    }

    return c.json({
      success: true,
      data: integrationStatus,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INTEGRATION_DETAILS_FAILED',
          message: (error as Error).message,
        },
      },
      500
    )
  }
})

// ==========================================
// Manual Health Check Endpoint
// ==========================================

/**
 * POST /factory-status/check-now
 * 立即執行健康檢查（手動觸發）
 */
factoryStatusRoutes.post('/check-now', async (c) => {
  try {
    const healthMonitor = new HealthMonitorService(c.env)

    // 執行健康檢查
    const result = await healthMonitor.performHealthCheck()

    // 檢測異常
    await healthMonitor.detectAndAlertAnomalies()

    return c.json({
      success: true,
      data: {
        message: 'Health check completed',
        result: {
          timestamp: result.timestamp,
          factory_os_status: result.factory_os_status,
          response_time_ms: result.response_time_ms,
          database_status: result.database_status,
          integration_operational: result.integration_operational,
          error_message: result.error_message || null,
        },
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'MANUAL_CHECK_FAILED',
          message: (error as Error).message,
        },
      },
      500
    )
  }
})

// ==========================================
// Dashboard Summary Endpoint
// ==========================================

/**
 * GET /factory-status/dashboard
 * 獲取儀表板摘要數據
 */
factoryStatusRoutes.get('/dashboard', async (c) => {
  try {
    const healthMonitor = new HealthMonitorService(c.env)

    // 獲取當前狀態
    const currentStatus = await healthMonitor.performHealthCheck()

    // 獲取最近 10 次檢查
    const recentChecks = await healthMonitor.getRecentHealthChecks(10)

    // 獲取 24 小時統計
    const stats24h = await healthMonitor.getHealthStats(24)

    // 獲取 7 天統計
    const stats7d = await healthMonitor.getHealthStats(24 * 7)

    return c.json({
      success: true,
      data: {
        current_status: {
          status: currentStatus.factory_os_status,
          response_time_ms: currentStatus.response_time_ms,
          database_status: currentStatus.database_status,
          integration_operational: currentStatus.integration_operational,
          last_check: currentStatus.timestamp,
        },
        recent_checks: recentChecks,
        statistics: {
          last_24h: stats24h,
          last_7d: stats7d,
        },
        alerts: {
          critical: currentStatus.factory_os_status === 'down',
          warning: currentStatus.factory_os_status === 'degraded',
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DASHBOARD_FETCH_FAILED',
          message: (error as Error).message,
        },
      },
      500
    )
  }
})
