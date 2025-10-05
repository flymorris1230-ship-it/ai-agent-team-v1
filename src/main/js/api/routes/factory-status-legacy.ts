/**
 * Factory Status API Routes (Legacy Endpoints)
 * 提供與原始需求匹配的端點路徑，但使用正確的實現
 *
 * NOTE: 這些端點是為了兼容性而添加的。
 * 推薦使用主 factory-status.ts 中的端點。
 */

import { Hono } from 'hono'
import type { Env } from '../../types'
import { HealthMonitorService } from '../../../../services/health-monitor'
import { FactoryOSClient } from '../../../../integrations/factory-os-client'

export const factoryStatusLegacyRoutes = new Hono<{ Bindings: Env }>()

// ==========================================
// Legacy Endpoints (兼容性端點)
// ==========================================

/**
 * GET /factory-status/status
 * 當前狀態（兼容端點）
 *
 * 推薦使用: GET /factory-status/current
 */
factoryStatusLegacyRoutes.get('/status', async (c) => {
  try {
    const client = new FactoryOSClient({
      baseURL: c.env.FACTORY_OS_URL || 'http://localhost:3001',
      apiKey: c.env.FACTORY_OS_API_KEY,
    })

    const metrics = await client.getSystemMetrics()

    return c.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      500
    )
  }
})

/**
 * GET /factory-status/status/history
 * 歷史數據（最近 24 小時）
 *
 * 推薦使用: GET /factory-status/history?limit=288
 */
factoryStatusLegacyRoutes.get('/status/history', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({
        success: false,
        error: 'Database not configured'
      }, 503)
    }

    // 計算 24 小時前的時間戳
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // ✅ 使用正確的列名
    const { results } = await c.env.DB.prepare(`
      SELECT
        timestamp,
        factory_os_status,
        response_time_ms,
        database_status,
        integration_operational,
        error_message
      FROM factory_health_checks
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT 288
    `).bind(twentyFourHoursAgo).all()

    return c.json({
      success: true,
      data: {
        checks: results,
        count: results.length,
        period: '24h',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: (error as Error).message,
      },
      500
    )
  }
})

/**
 * GET /factory-status/status/summary
 * 健康摘要（最近 1 小時）
 *
 * 推薦使用: GET /factory-status/stats?hours=1
 */
factoryStatusLegacyRoutes.get('/status/summary', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json({
        success: false,
        error: 'Database not configured'
      }, 503)
    }

    // 計算 1 小時前的時間戳
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // ✅ 使用正確的列名和聚合查詢
    const { results } = await c.env.DB.prepare(`
      SELECT
        factory_os_status,
        COUNT(*) as count,
        AVG(response_time_ms) as avg_response_time,
        MAX(response_time_ms) as max_response_time,
        MIN(response_time_ms) as min_response_time
      FROM factory_health_checks
      WHERE timestamp >= ?
      GROUP BY factory_os_status
    `).bind(oneHourAgo).all()

    // 計算總檢查次數
    const totalChecks = results.reduce((sum: number, row: any) => sum + row.count, 0)

    // 計算 uptime
    const healthyChecks = results.find((row: any) => row.factory_os_status === 'healthy')?.count || 0
    const uptimePercentage = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

    return c.json({
      success: true,
      data: {
        summary: results,
        period: '1h',
        total_checks: totalChecks,
        uptime_percentage: Math.round(uptimePercentage * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: (error as Error).message,
      },
      500
    )
  }
})

/**
 * GET /factory-status/status/detailed
 * 詳細健康摘要（包含更多指標）
 *
 * 額外端點：提供更詳細的分析
 */
factoryStatusLegacyRoutes.get('/status/detailed', async (c) => {
  try {
    const healthMonitor = new HealthMonitorService(c.env)

    // 獲取不同時間範圍的統計
    const [stats1h, stats24h, stats7d] = await Promise.all([
      healthMonitor.getHealthStats(1),
      healthMonitor.getHealthStats(24),
      healthMonitor.getHealthStats(24 * 7),
    ])

    // 獲取最近檢查
    const recentChecks = await healthMonitor.getRecentHealthChecks(10)

    return c.json({
      success: true,
      data: {
        current: recentChecks[0] || null,
        recent_checks: recentChecks,
        statistics: {
          last_1h: stats1h,
          last_24h: stats24h,
          last_7d: stats7d,
        },
        health_grade: {
          '1h': stats1h.uptime_percentage >= 99 ? 'excellent'
               : stats1h.uptime_percentage >= 95 ? 'good'
               : stats1h.uptime_percentage >= 90 ? 'fair' : 'poor',
          '24h': stats24h.uptime_percentage >= 99 ? 'excellent'
               : stats24h.uptime_percentage >= 95 ? 'good'
               : stats24h.uptime_percentage >= 90 ? 'fair' : 'poor',
          '7d': stats7d.uptime_percentage >= 99 ? 'excellent'
               : stats7d.uptime_percentage >= 95 ? 'good'
               : stats7d.uptime_percentage >= 90 ? 'fair' : 'poor',
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DETAILED_STATUS_FAILED',
          message: (error as Error).message,
        },
      },
      500
    )
  }
})
