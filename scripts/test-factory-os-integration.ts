#!/usr/bin/env tsx
/**
 * Factory OS Integration Test Script
 * 測試 AI Agent Team 與 Factory OS 的整合功能
 */

import { FactoryOSClient } from '../src/integrations/factory-os-client'

// 測試環境配置
const FACTORY_OS_URL = process.env.FACTORY_OS_URL || 'http://localhost:3001'
const FACTORY_OS_API_KEY = process.env.FACTORY_OS_API_KEY || 'test-api-key'

// 顏色輸出
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

async function main() {
  log(`
╔═══════════════════════════════════════════════════════════╗
║  AI Agent Team ↔ Factory OS 整合測試                      ║
╚═══════════════════════════════════════════════════════════╝
`, 'cyan')

  info(`Factory OS URL: ${FACTORY_OS_URL}`)
  info(`API Key: ${FACTORY_OS_API_KEY ? '已設置' : '未設置'}`)
  console.log()

  const client = new FactoryOSClient({
    baseURL: FACTORY_OS_URL,
    apiKey: FACTORY_OS_API_KEY,
    timeout: 10000,
  })

  // ==========================================
  // Test 1: Ping
  // ==========================================
  section('Test 1: Ping Factory OS')

  try {
    const pingResult = await client.ping()

    if (pingResult.status === 'healthy') {
      success('Ping 成功')
      info(`  狀態: ${pingResult.status}`)
      info(`  時間: ${pingResult.timestamp}`)
      info(`  訊息: ${pingResult.message}`)
    } else {
      error('Ping 失敗')
      info(`  狀態: ${pingResult.status}`)
    }
  } catch (err) {
    error('Ping 異常')
    console.error(err)
  }

  // ==========================================
  // Test 2: Database Status
  // ==========================================
  section('Test 2: 檢查數據庫狀態')

  try {
    const dbResult = await client.checkDBStatus()

    if (dbResult.status === 'connected') {
      success('數據庫連接正常')
      if (dbResult.latest_migrations) {
        info(`  最近遷移數量: ${dbResult.latest_migrations.length}`)
        dbResult.latest_migrations.slice(0, 3).forEach((migration) => {
          info(`    - ${migration.migration_name}`)
        })
      }
    } else {
      error('數據庫連接失敗')
      info(`  錯誤: ${dbResult.error}`)
    }
  } catch (err) {
    error('數據庫檢查異常')
    console.error(err)
  }

  // ==========================================
  // Test 3: System Metrics
  // ==========================================
  section('Test 3: 獲取系統指標')

  try {
    const metrics = await client.getSystemMetrics()

    success('系統指標獲取成功')
    info(`  Factory 狀態: ${metrics.factory_status}`)
    info(`  響應時間: ${metrics.response_time_ms}ms`)
    info(`  數據庫狀態: ${metrics.database_status}`)
    info(`  最後檢查: ${metrics.last_check}`)

    // 性能警告
    if (metrics.response_time_ms > 1000) {
      log(`  ⚠️  響應時間較慢 (${metrics.response_time_ms}ms)`, 'yellow')
    }
  } catch (err) {
    error('系統指標獲取異常')
    console.error(err)
  }

  // ==========================================
  // Test 4: Integration Status
  // ==========================================
  section('Test 4: 整合狀態檢查')

  try {
    const integrationStatus = await client.getIntegrationStatus()

    if (integrationStatus) {
      success('整合狀態獲取成功')
      info(`  Factory OS 版本: ${integrationStatus.factory_os.version}`)
      info(`  Factory OS 環境: ${integrationStatus.factory_os.environment}`)
      info(`  Factory OS 數據庫: ${integrationStatus.factory_os.database}`)
      info(`  GAC 狀態: ${integrationStatus.gac.status}`)
      info(`  GAC API URL: ${integrationStatus.gac.api_url}`)
      info(`  整合運行: ${integrationStatus.integration.operational ? '正常' : '異常'}`)

      if (integrationStatus.integration.capabilities) {
        info(`  可用能力:`)
        integrationStatus.integration.capabilities.forEach((cap: string) => {
          info(`    - ${cap}`)
        })
      }

      if (!integrationStatus.integration.operational) {
        log(`  ⚠️  整合未正常運行`, 'yellow')
        if (integrationStatus.gac.error) {
          error(`  GAC 錯誤: ${JSON.stringify(integrationStatus.gac.error)}`)
        }
      }
    } else {
      error('無法獲取整合狀態')
    }
  } catch (err) {
    error('整合狀態檢查異常')
    console.error(err)
  }

  // ==========================================
  // Test 5: Full Health Check
  // ==========================================
  section('Test 5: 完整健康檢查')

  try {
    const healthCheck = await client.fullHealthCheck()

    success('完整健康檢查完成')
    info(`  總體狀態: ${healthCheck.status}`)
    info(`  檢查時間: ${healthCheck.timestamp}`)
    info(`  Factory 狀態: ${healthCheck.metrics.factory_status}`)
    info(`  響應時間: ${healthCheck.metrics.response_time_ms}ms`)
    info(`  數據庫: ${healthCheck.metrics.database_status}`)

    if (healthCheck.integration_status) {
      info(`  整合運行: ${healthCheck.integration_status.integration.operational ? '✅' : '❌'}`)
    }

    // 狀態評估
    if (healthCheck.status === 'healthy') {
      success('  🎉 系統健康狀態良好！')
    } else if (healthCheck.status === 'degraded') {
      log('  ⚠️  系統性能降級', 'yellow')
    } else {
      error('  ❌ 系統故障')
    }
  } catch (err) {
    error('完整健康檢查異常')
    console.error(err)
  }

  // ==========================================
  // Summary
  // ==========================================
  section('測試總結')

  log(`
  ✅ 整合測試已完成

  📊 測試項目:
  - Ping 測試
  - 數據庫狀態檢查
  - 系統指標獲取
  - 整合狀態檢查
  - 完整健康檢查

  📝 後續步驟:
  1. 確保 Factory OS 正在運行 (npm run dev)
  2. 設置環境變數:
     export FACTORY_OS_URL="http://localhost:3001"
     export FACTORY_OS_API_KEY="your-api-key"
  3. 部署到 Cloudflare Workers 後配置 Cron triggers
  4. 在 wrangler.toml 中配置:
     [triggers]
     crons = ["*/5 * * * *"]

  📚 API 端點:
  - GET  /api/v1/factory-status/current - 當前狀態
  - GET  /api/v1/factory-status/history - 歷史記錄
  - GET  /api/v1/factory-status/stats - 統計數據
  - POST /api/v1/factory-status/test-connection - 測試連接
  - POST /api/v1/factory-status/check-now - 手動檢查
  - GET  /api/v1/factory-status/dashboard - 儀表板數據
  `, 'cyan')
}

// 執行測試
main()
  .then(() => {
    log('\n✅ 測試完成\n', 'green')
    process.exit(0)
  })
  .catch((error) => {
    log('\n❌ 測試失敗\n', 'red')
    console.error(error)
    process.exit(1)
  })
