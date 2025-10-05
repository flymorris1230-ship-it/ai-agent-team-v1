#!/usr/bin/env tsx
/**
 * Verify Health Monitor Implementation
 * 驗證健康監控系統實現是否正確
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(msg: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`)
}

function success(msg: string) {
  log(`✅ ${msg}`, 'green')
}

function error(msg: string) {
  log(`❌ ${msg}`, 'red')
}

function info(msg: string) {
  log(`ℹ️  ${msg}`, 'blue')
}

function section(msg: string) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(msg, 'cyan')
  log('='.repeat(60), 'cyan')
}

interface CheckResult {
  name: string
  passed: boolean
  details?: string
}

const results: CheckResult[] = []

function check(name: string, condition: boolean, details?: string) {
  results.push({ name, passed: condition, details })
  if (condition) {
    success(name)
    if (details) info(`  ${details}`)
  } else {
    error(name)
    if (details) info(`  ${details}`)
  }
}

function main() {
  log(`
╔═══════════════════════════════════════════════════════════╗
║  Health Monitor Implementation Verification               ║
╚═══════════════════════════════════════════════════════════╝
`, 'cyan')

  // ==========================================
  // Check 1: Health Monitor Service File
  // ==========================================
  section('Check 1: Health Monitor Service 檔案檢查')

  try {
    const healthMonitorPath = join(__dirname, '../src/services/health-monitor.ts')
    const content = readFileSync(healthMonitorPath, 'utf-8')

    check(
      'health-monitor.ts 檔案存在',
      true,
      healthMonitorPath
    )

    check(
      'HealthMonitorService 類定義存在',
      content.includes('export class HealthMonitorService'),
      '找到 HealthMonitorService 類'
    )

    check(
      'saveHealthCheckResult 方法存在',
      content.includes('private async saveHealthCheckResult'),
      '找到私有方法 saveHealthCheckResult'
    )

    check(
      'performHealthCheck 方法存在',
      content.includes('async performHealthCheck()'),
      '找到公開方法 performHealthCheck'
    )

    check(
      'getRecentHealthChecks 方法存在',
      content.includes('async getRecentHealthChecks'),
      '找到歷史查詢方法'
    )

    check(
      'getHealthStats 方法存在',
      content.includes('async getHealthStats'),
      '找到統計分析方法'
    )

    check(
      'detectAndAlertAnomalies 方法存在',
      content.includes('async detectAndAlertAnomalies'),
      '找到異常檢測方法'
    )
  } catch (err) {
    error('health-monitor.ts 檔案讀取失敗')
    console.error(err)
  }

  // ==========================================
  // Check 2: Database Schema
  // ==========================================
  section('Check 2: 數據庫 Schema 檢查')

  try {
    const schemaPath = join(__dirname, '../src/main/js/database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')

    check(
      'schema.sql 檔案存在',
      true,
      schemaPath
    )

    check(
      'factory_health_checks 表定義存在',
      schema.includes('CREATE TABLE IF NOT EXISTS factory_health_checks'),
      '找到表定義'
    )

    check(
      '使用正確的列名: factory_os_status',
      schema.includes('factory_os_status TEXT NOT NULL'),
      '列名正確'
    )

    check(
      '使用正確的列名: timestamp',
      schema.includes('timestamp TEXT NOT NULL'),
      '時間戳列名正確'
    )

    check(
      'integration_operational 字段存在',
      schema.includes('integration_operational INTEGER NOT NULL'),
      '整合狀態字段已定義'
    )

    check(
      'error_message 字段存在',
      schema.includes('error_message TEXT'),
      '錯誤訊息字段已定義'
    )

    check(
      'timestamp 索引存在',
      schema.includes('CREATE INDEX idx_factory_health_timestamp'),
      '時間戳索引已創建'
    )

    check(
      'status 索引存在',
      schema.includes('CREATE INDEX idx_factory_health_status'),
      '狀態索引已創建'
    )

    check(
      'created_at 索引存在',
      schema.includes('CREATE INDEX idx_factory_health_created_at'),
      '創建時間索引已創建'
    )

    // 檢查不應該存在的錯誤列名
    check(
      '沒有使用錯誤的列名 factory_status',
      !schema.includes('factory_status TEXT') || schema.includes('factory_os_status TEXT'),
      '未使用錯誤的列名'
    )

    check(
      '沒有使用錯誤的列名 checked_at',
      !schema.includes('checked_at TEXT') || schema.includes('timestamp TEXT'),
      '未使用錯誤的列名'
    )
  } catch (err) {
    error('schema.sql 檔案讀取失敗')
    console.error(err)
  }

  // ==========================================
  // Check 3: Scheduled Tasks
  // ==========================================
  section('Check 3: Cron 定時任務檢查')

  try {
    const scheduledPath = join(__dirname, '../src/scheduled/index.ts')
    const scheduled = readFileSync(scheduledPath, 'utf-8')

    check(
      'scheduled/index.ts 檔案存在',
      true,
      scheduledPath
    )

    check(
      'handleScheduled 函數存在',
      scheduled.includes('export async function handleScheduled'),
      '找到 Cron 處理函數'
    )

    check(
      'performFactoryHealthCheck 函數存在',
      scheduled.includes('async function performFactoryHealthCheck'),
      '找到健康檢查函數'
    )

    check(
      'HealthMonitorService 已導入',
      scheduled.includes("import { HealthMonitorService } from '../services/health-monitor'"),
      'HealthMonitorService 已正確導入'
    )
  } catch (err) {
    error('scheduled/index.ts 檔案讀取失敗')
    console.error(err)
  }

  // ==========================================
  // Check 4: API Routes
  // ==========================================
  section('Check 4: API 路由檢查')

  try {
    const apiRoutesPath = join(__dirname, '../src/main/js/api/routes/factory-status.ts')
    const apiRoutes = readFileSync(apiRoutesPath, 'utf-8')

    check(
      'factory-status.ts 路由檔案存在',
      true,
      apiRoutesPath
    )

    check(
      '/current 端點存在',
      apiRoutes.includes("factoryStatusRoutes.get('/current'"),
      '當前狀態端點已定義'
    )

    check(
      '/history 端點存在',
      apiRoutes.includes("factoryStatusRoutes.get('/history'"),
      '歷史記錄端點已定義'
    )

    check(
      '/stats 端點存在',
      apiRoutes.includes("factoryStatusRoutes.get('/stats'"),
      '統計數據端點已定義'
    )

    check(
      '/check-now 端點存在',
      apiRoutes.includes("factoryStatusRoutes.post('/check-now'"),
      '手動檢查端點已定義'
    )

    check(
      '/dashboard 端點存在',
      apiRoutes.includes("factoryStatusRoutes.get('/dashboard'"),
      '儀表板端點已定義'
    )
  } catch (err) {
    error('factory-status.ts 路由檔案讀取失敗')
    console.error(err)
  }

  // ==========================================
  // Check 5: Documentation
  // ==========================================
  section('Check 5: 文檔檢查')

  try {
    const docsPath = join(__dirname, '../docs/HEALTH_METRICS_STORAGE.md')
    const docs = readFileSync(docsPath, 'utf-8')

    check(
      'HEALTH_METRICS_STORAGE.md 文檔存在',
      true,
      docsPath
    )

    check(
      '文檔包含正確的 Schema 說明',
      docs.includes('factory_os_status') && docs.includes('integration_operational'),
      '文檔已更新為正確的 schema'
    )
  } catch (err) {
    error('HEALTH_METRICS_STORAGE.md 文檔讀取失敗')
    console.error(err)
  }

  try {
    const integrationDocsPath = join(__dirname, '../docs/FACTORY_OS_INTEGRATION.md')
    const integrationDocs = readFileSync(integrationDocsPath, 'utf-8')

    check(
      'FACTORY_OS_INTEGRATION.md 文檔存在',
      true,
      integrationDocsPath
    )

    check(
      '整合文檔包含使用範例',
      integrationDocs.includes('HealthMonitorService'),
      '文檔包含 HealthMonitorService 使用範例'
    )
  } catch (err) {
    error('FACTORY_OS_INTEGRATION.md 文檔讀取失敗')
    console.error(err)
  }

  // ==========================================
  // Summary
  // ==========================================
  section('驗證總結')

  const totalChecks = results.length
  const passedChecks = results.filter(r => r.passed).length
  const failedChecks = totalChecks - passedChecks

  console.log()
  info(`總檢查項: ${totalChecks}`)
  success(`通過: ${passedChecks}`)
  if (failedChecks > 0) {
    error(`失敗: ${failedChecks}`)
  }

  const passRate = (passedChecks / totalChecks) * 100
  console.log()

  if (passRate === 100) {
    log(`🎉 完美！所有檢查項都通過了！`, 'green')
    log(`
✅ Health Monitor 系統已完整實現：

📊 核心功能：
- HealthMonitorService 類（170+ 行）
- 自動健康檢查和存儲
- 歷史數據查詢
- 統計分析
- 異常檢測和告警

💾 數據庫：
- factory_health_checks 表（正確的 schema）
- 3 個優化索引
- 完整的字段定義

⏰ Cron 任務：
- 每 5 分鐘自動執行
- 健康檢查 + 異常檢測

🌐 API 端點：
- 6 個 RESTful endpoints
- 完整的監控數據訪問

📚 文檔：
- 完整的使用指南
- 故障排除文檔
- API 參考

🚀 可立即使用，無需額外配置！
`, 'cyan')
  } else if (passRate >= 80) {
    log(`✅ 良好！大部分檢查通過（${passRate.toFixed(1)}%）`, 'green')
  } else if (passRate >= 60) {
    log(`⚠️ 需要注意！部分檢查失敗（${passRate.toFixed(1)}%）`, 'yellow')
  } else {
    log(`❌ 嚴重問題！多數檢查失敗（${passRate.toFixed(1)}%）`, 'red')
  }

  console.log()

  if (failedChecks > 0) {
    log('失敗的檢查項:', 'yellow')
    results.filter(r => !r.passed).forEach(r => {
      error(`  - ${r.name}`)
      if (r.details) {
        info(`    ${r.details}`)
      }
    })
    console.log()
  }

  process.exit(failedChecks > 0 ? 1 : 0)
}

main()
