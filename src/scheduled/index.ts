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

/**
 * Sync vector data from D1 to PostgreSQL pgvector
 * Ensures vector embeddings are backed up and available for hybrid search
 */
async function syncVectorData(env: Env): Promise<void> {
  console.log('[Cron] ⏳ Starting vector data synchronization...')

  try {
    // Get all knowledge entries from D1
    const result = await env.DB.prepare(`
      SELECT id, type, title, content, tags, related_tasks, author_agent_id, created_at, updated_at
      FROM knowledge_base
      ORDER BY updated_at DESC
      LIMIT 100
    `).all()

    if (!result.results || result.results.length === 0) {
      console.log('[Cron] No knowledge entries to sync')
      return
    }

    console.log(`[Cron] Found ${result.results.length} knowledge entries to sync`)

    // Initialize RAG Engine for embedding generation
    const { RAGEngine } = await import('../main/js/core/rag-engine')
    const ragEngine = new RAGEngine(env, {
      llmStrategy: 'cost', // Use Gemini free embeddings
      usePostgresVector: true,
    })

    let syncedCount = 0
    let errorCount = 0

    for (const entry of result.results) {
      try {
        // Create embedding for the content
        const embedding = await ragEngine.createEmbedding(entry.content as string)

        // Store in PostgreSQL knowledge_vectors table via HTTP Proxy
        // Note: This requires PostgreSQL HTTP Proxy to be running
        const proxyUrl = env.POSTGRES_PROXY_URL || 'http://192.168.1.114:8000'

        const response = await fetch(`${proxyUrl}/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': env.POSTGRES_PROXY_API_KEY || 'your-secure-api-key-here',
          },
          body: JSON.stringify({
            sql: `
              INSERT INTO knowledge_vectors (id, content, metadata, embedding, created_at, updated_at)
              VALUES ($1, $2, $3::jsonb, $4::vector, $5, $6)
              ON CONFLICT (id) DO UPDATE SET
                content = EXCLUDED.content,
                metadata = EXCLUDED.metadata,
                embedding = EXCLUDED.embedding,
                updated_at = EXCLUDED.updated_at
            `,
            params: [
              entry.id,
              entry.content,
              JSON.stringify({
                title: entry.title,
                type: entry.type,
                tags: entry.tags,
                author: entry.author_agent_id,
              }),
              `[${embedding.join(',')}]`,
              entry.created_at,
              entry.updated_at,
            ],
          }),
        })

        if (response.ok) {
          syncedCount++
          console.log(`[Cron] ✅ Synced: ${entry.id} (${entry.title})`)
        } else {
          errorCount++
          console.error(`[Cron] ❌ Failed to sync: ${entry.id}`, await response.text())
        }
      } catch (error) {
        errorCount++
        console.error(`[Cron] ❌ Error syncing ${entry.id}:`, error)
      }
    }

    console.log(`[Cron] ✅ Vector sync completed: ${syncedCount} synced, ${errorCount} errors`)
  } catch (error) {
    console.error('[Cron] ❌ Vector sync failed:', error)
  }
}
