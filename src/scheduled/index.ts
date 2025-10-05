/**
 * Scheduled Tasks (Cron Jobs)
 * Cloudflare Workers Cron Triggers
 *
 * 配置在 wrangler.toml:
 * [triggers]
 * crons = ["* /5 * * * *"]  (每 5 分鐘執行一次)
 */

import type { Env } from '../main/js/types'
import { HealthMonitorService } from '../services/health-monitor'

/**
 * Cron 任務處理器
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext
): Promise<void> {
  console.log('[Cron] Scheduled task triggered at:', new Date(event.scheduledTime).toISOString())

  try {
    // 執行 Factory OS 健康檢查
    await performFactoryHealthCheck(env)

    // 其他定時任務可以在這裡添加
    // await cleanupOldLogs(env)
    // await syncVectorData(env)

    console.log('[Cron] Scheduled task completed successfully')
  } catch (error) {
    console.error('[Cron] Scheduled task failed:', error)
    // 記錄錯誤但不拋出，避免影響其他定時任務
  }
}

/**
 * 執行 Factory OS 健康檢查
 */
async function performFactoryHealthCheck(env: Env): Promise<void> {
  console.log('[Cron] Starting Factory OS health check...')

  try {
    const healthMonitor = new HealthMonitorService(env)

    // 執行健康檢查
    const result = await healthMonitor.performHealthCheck()

    console.log('[Cron] Factory OS health check result:', {
      status: result.factory_os_status,
      response_time: result.response_time_ms,
      database: result.database_status,
      integration: result.integration_operational,
    })

    // 檢測異常並告警
    await healthMonitor.detectAndAlertAnomalies()

    // 如果狀態為 down，記錄嚴重錯誤
    if (result.factory_os_status === 'down') {
      console.error('[Cron] ⚠️ CRITICAL: Factory OS is DOWN!', result.error_message)
    }
  } catch (error) {
    console.error('[Cron] Factory OS health check failed:', error)
    throw error
  }
}

/*
 * 清理舊日誌（示例 - 暫時註釋掉）
 *
async function cleanupOldLogs(env: Env): Promise<void> {
  console.log('[Cron] Cleaning up old logs...')

  try {
    // 刪除 30 天前的日誌
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    await env.DB.prepare(`
      DELETE FROM system_logs
      WHERE created_at < ?
    `).bind(thirtyDaysAgo).run()

    console.log('[Cron] Old logs cleaned up successfully')
  } catch (error) {
    console.error('[Cron] Failed to cleanup old logs:', error)
  }
}
*/

/*
 * 同步向量數據（示例 - 暫時註釋掉）
 *
async function syncVectorData(env: Env): Promise<void> {
  console.log('[Cron] Syncing vector data...')

  // TODO: 實現向量數據同步邏輯
  // 例如：將 Vectorize 數據備份到 R2
}
*/
