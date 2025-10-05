/**
 * Health Monitor Service
 * 監控 Factory OS 健康狀態並記錄到數據庫
 */

import { FactoryOSClient } from '../integrations/factory-os-client'
import type { Env } from '../main/js/types'

export interface HealthCheckResult {
  timestamp: string
  factory_os_status: 'healthy' | 'degraded' | 'down'
  response_time_ms: number
  database_status: 'connected' | 'error'
  integration_operational: boolean
  error_message?: string
}

export class HealthMonitorService {
  private env: Env
  private factoryOSClient: FactoryOSClient

  constructor(env: Env) {
    this.env = env
    this.factoryOSClient = new FactoryOSClient({
      baseURL: env.FACTORY_OS_URL || 'http://localhost:3001',
      apiKey: env.FACTORY_OS_API_KEY,
      timeout: 30000,
    })
  }

  /**
   * 執行健康檢查並記錄結果
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()

    try {
      const healthData = await this.factoryOSClient.fullHealthCheck()

      const result: HealthCheckResult = {
        timestamp: healthData.timestamp,
        factory_os_status: healthData.status,
        response_time_ms: healthData.metrics.response_time_ms,
        database_status: healthData.metrics.database_status,
        integration_operational: healthData.integration_status?.integration.operational ?? false,
      }

      // 記錄到數據庫
      await this.saveHealthCheckResult(result)

      return result
    } catch (error) {
      const errorResult: HealthCheckResult = {
        timestamp: new Date().toISOString(),
        factory_os_status: 'down',
        response_time_ms: Date.now() - startTime,
        database_status: 'error',
        integration_operational: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      }

      // 記錄錯誤到數據庫
      await this.saveHealthCheckResult(errorResult)

      return errorResult
    }
  }

  /**
   * 保存健康檢查結果到數據庫
   */
  private async saveHealthCheckResult(result: HealthCheckResult): Promise<void> {
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
        result.timestamp,
        result.factory_os_status,
        result.response_time_ms,
        result.database_status,
        result.integration_operational ? 1 : 0,
        result.error_message || null
      ).run()

      console.log('[HealthMonitor] Saved health check result:', result.factory_os_status)
    } catch (error) {
      console.error('[HealthMonitor] Failed to save health check result:', error)
    }
  }

  /**
   * 獲取最近的健康檢查記錄
   */
  async getRecentHealthChecks(limit: number = 10): Promise<HealthCheckResult[]> {
    try {
      const results = await this.env.DB.prepare(`
        SELECT
          timestamp,
          factory_os_status,
          response_time_ms,
          database_status,
          integration_operational,
          error_message
        FROM factory_health_checks
        ORDER BY timestamp DESC
        LIMIT ?
      `).bind(limit).all<HealthCheckResult>()

      return results.results || []
    } catch (error) {
      console.error('[HealthMonitor] Failed to get recent health checks:', error)
      return []
    }
  }

  /**
   * 獲取健康狀態統計
   */
  async getHealthStats(hours: number = 24): Promise<{
    total_checks: number
    healthy_count: number
    degraded_count: number
    down_count: number
    avg_response_time_ms: number
    uptime_percentage: number
  }> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const stats = await this.env.DB.prepare(`
        SELECT
          COUNT(*) as total_checks,
          SUM(CASE WHEN factory_os_status = 'healthy' THEN 1 ELSE 0 END) as healthy_count,
          SUM(CASE WHEN factory_os_status = 'degraded' THEN 1 ELSE 0 END) as degraded_count,
          SUM(CASE WHEN factory_os_status = 'down' THEN 1 ELSE 0 END) as down_count,
          AVG(response_time_ms) as avg_response_time_ms
        FROM factory_health_checks
        WHERE timestamp >= ?
      `).bind(since).first<{
        total_checks: number
        healthy_count: number
        degraded_count: number
        down_count: number
        avg_response_time_ms: number
      }>()

      if (!stats || stats.total_checks === 0) {
        return {
          total_checks: 0,
          healthy_count: 0,
          degraded_count: 0,
          down_count: 0,
          avg_response_time_ms: 0,
          uptime_percentage: 0,
        }
      }

      const uptime_percentage = (stats.healthy_count / stats.total_checks) * 100

      return {
        ...stats,
        uptime_percentage: Math.round(uptime_percentage * 100) / 100,
      }
    } catch (error) {
      console.error('[HealthMonitor] Failed to get health stats:', error)
      return {
        total_checks: 0,
        healthy_count: 0,
        degraded_count: 0,
        down_count: 0,
        avg_response_time_ms: 0,
        uptime_percentage: 0,
      }
    }
  }

  /**
   * 檢測並告警異常狀態
   */
  async detectAndAlertAnomalies(): Promise<void> {
    const recentChecks = await this.getRecentHealthChecks(5)

    // 連續 3 次失敗則告警
    const consecutiveFailures = recentChecks.slice(0, 3).filter(
      check => check.factory_os_status === 'down'
    ).length

    if (consecutiveFailures >= 3) {
      console.error('[HealthMonitor] ⚠️ ALERT: Factory OS has been down for 3+ consecutive checks')
      // TODO: 發送告警通知 (Email, Slack, etc.)
    }

    // 響應時間異常
    const avgResponseTime = recentChecks.reduce((sum, check) => sum + check.response_time_ms, 0) / recentChecks.length
    if (avgResponseTime > 5000) {
      console.warn('[HealthMonitor] ⚠️ WARNING: Average response time is high:', avgResponseTime, 'ms')
      // TODO: 發送性能警告
    }
  }
}
