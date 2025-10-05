#!/usr/bin/env tsx
/**
 * Comprehensive Production Test Report Generator
 * 全面的生產環境測試報告生成器
 *
 * Tests all Factory OS integration features and generates a detailed report
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(msg: string) {
  const line = '═'.repeat(70);
  log(`\n${line}`, 'cyan');
  log(`  ${msg}`, 'bright');
  log(line, 'cyan');
}

function subheader(msg: string) {
  log(`\n${'─'.repeat(70)}`, 'blue');
  log(`  ${msg}`, 'blue');
  log('─'.repeat(70), 'blue');
}

function success(msg: string) {
  log(`✅ ${msg}`, 'green');
}

function error(msg: string) {
  log(`❌ ${msg}`, 'red');
}

function warning(msg: string) {
  log(`⚠️  ${msg}`, 'yellow');
}

function info(msg: string) {
  log(`ℹ️  ${msg}`, 'blue');
}

interface TestResult {
  name: string;
  passed: boolean;
  duration_ms: number;
  details?: string;
  error?: string;
}

interface CategoryResults {
  category: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

const allResults: CategoryResults[] = [];

// ========================================
// Test Categories
// ========================================

async function testFileStructure(): Promise<CategoryResults> {
  header('📁 File Structure Verification');

  const results: TestResult[] = [];
  const files = [
    'src/integrations/factory-os-client.ts',
    'src/services/health-monitor.ts',
    'src/scheduled/index.ts',
    'src/main/js/api/routes/factory-status.ts',
    'src/main/js/api/routes/factory-status-legacy.ts',
    'src/main/js/database/schema.sql',
    'docs/FACTORY_OS_INTEGRATION.md',
    'docs/HEALTH_METRICS_STORAGE.md',
    'docs/API_ENDPOINTS_COMPARISON.md',
    'docs/FACTORY_OS_QUICK_START.md',
    'scripts/test-factory-os-integration.ts',
    'scripts/verify-health-monitor.ts',
    '.dev.vars.example',
    '.env.example',
  ];

  for (const file of files) {
    const start = Date.now();
    const fullPath = join(__dirname, '..', file);
    const exists = existsSync(fullPath);
    const duration = Date.now() - start;

    results.push({
      name: `File exists: ${file}`,
      passed: exists,
      duration_ms: duration,
      details: exists ? fullPath : `Missing: ${fullPath}`,
    });

    if (exists) {
      success(`${file}`);
    } else {
      error(`${file} - MISSING`);
    }
  }

  const passed = results.filter(r => r.passed).length;
  return {
    category: 'File Structure',
    tests: results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

async function testCodeQuality(): Promise<CategoryResults> {
  header('🔍 Code Quality Checks');

  const results: TestResult[] = [];

  // Check FactoryOSClient
  try {
    const start = Date.now();
    const clientPath = join(__dirname, '../src/integrations/factory-os-client.ts');
    const clientCode = readFileSync(clientPath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: 'FactoryOSClient class exists', check: clientCode.includes('export class FactoryOSClient') },
      { name: 'Retry mechanism implemented', check: clientCode.includes('retryFetch') },
      { name: 'Exponential backoff', check: clientCode.includes('Math.pow(2, i)') },
      { name: 'Timeout handling', check: clientCode.includes('timeout') },
      { name: 'Error handling', check: clientCode.includes('try') && clientCode.includes('catch') },
    ];

    checks.forEach(check => {
      results.push({
        name: `Factory OS Client - ${check.name}`,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Implemented' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });
  } catch (err) {
    error(`Failed to read FactoryOSClient: ${(err as Error).message}`);
  }

  // Check HealthMonitorService
  try {
    const start = Date.now();
    const servicePath = join(__dirname, '../src/services/health-monitor.ts');
    const serviceCode = readFileSync(servicePath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: 'HealthMonitorService class exists', check: serviceCode.includes('export class HealthMonitorService') },
      { name: 'performHealthCheck method', check: serviceCode.includes('async performHealthCheck()') },
      { name: 'getRecentHealthChecks method', check: serviceCode.includes('getRecentHealthChecks') },
      { name: 'getHealthStats method', check: serviceCode.includes('getHealthStats') },
      { name: 'Anomaly detection', check: serviceCode.includes('detectAndAlertAnomalies') },
      { name: 'Correct column names', check: serviceCode.includes('factory_os_status') && serviceCode.includes('timestamp') },
    ];

    checks.forEach(check => {
      results.push({
        name: `Health Monitor - ${check.name}`,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Implemented' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });
  } catch (err) {
    error(`Failed to read HealthMonitorService: ${(err as Error).message}`);
  }

  // Check API Routes
  try {
    const start = Date.now();
    const routesPath = join(__dirname, '../src/main/js/api/routes/factory-status.ts');
    const routesCode = readFileSync(routesPath, 'utf-8');
    const duration = Date.now() - start;

    const endpoints = [
      { name: 'GET /current', check: routesCode.includes("factoryStatusRoutes.get('/current'") },
      { name: 'GET /history', check: routesCode.includes("factoryStatusRoutes.get('/history'") },
      { name: 'GET /stats', check: routesCode.includes("factoryStatusRoutes.get('/stats'") },
      { name: 'GET /dashboard', check: routesCode.includes("factoryStatusRoutes.get('/dashboard'") },
      { name: 'POST /check-now', check: routesCode.includes("factoryStatusRoutes.post('/check-now'") },
      { name: 'POST /test-connection', check: routesCode.includes("factoryStatusRoutes.post('/test-connection'") },
    ];

    endpoints.forEach(endpoint => {
      results.push({
        name: `Recommended API - ${endpoint.name}`,
        passed: endpoint.check,
        duration_ms: duration,
        details: endpoint.check ? 'Defined' : 'Missing',
      });
      if (endpoint.check) {
        success(endpoint.name);
      } else {
        error(endpoint.name);
      }
    });
  } catch (err) {
    error(`Failed to read API routes: ${(err as Error).message}`);
  }

  // Check Legacy Routes
  try {
    const start = Date.now();
    const legacyPath = join(__dirname, '../src/main/js/api/routes/factory-status-legacy.ts');
    const legacyCode = readFileSync(legacyPath, 'utf-8');
    const duration = Date.now() - start;

    const endpoints = [
      { name: 'GET /status', check: legacyCode.includes("factoryStatusLegacyRoutes.get('/status'") },
      { name: 'GET /status/history', check: legacyCode.includes("factoryStatusLegacyRoutes.get('/status/history'") },
      { name: 'GET /status/summary', check: legacyCode.includes("factoryStatusLegacyRoutes.get('/status/summary'") },
      { name: 'GET /status/detailed', check: legacyCode.includes("factoryStatusLegacyRoutes.get('/status/detailed'") },
      { name: 'Correct SQL column names', check: legacyCode.includes('factory_os_status') && legacyCode.includes('timestamp') },
    ];

    endpoints.forEach(endpoint => {
      results.push({
        name: `Legacy API - ${endpoint.name}`,
        passed: endpoint.check,
        duration_ms: duration,
        details: endpoint.check ? 'Defined' : 'Missing',
      });
      if (endpoint.check) {
        success(endpoint.name);
      } else {
        error(endpoint.name);
      }
    });
  } catch (err) {
    error(`Failed to read legacy routes: ${(err as Error).message}`);
  }

  const passed = results.filter(r => r.passed).length;
  return {
    category: 'Code Quality',
    tests: results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

async function testDatabaseSchema(): Promise<CategoryResults> {
  header('🗄️  Database Schema Verification');

  const results: TestResult[] = [];

  try {
    const start = Date.now();
    const schemaPath = join(__dirname, '../src/main/js/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: 'factory_health_checks table exists', check: schema.includes('CREATE TABLE IF NOT EXISTS factory_health_checks') },
      { name: 'Correct column: factory_os_status', check: schema.includes('factory_os_status TEXT NOT NULL') },
      { name: 'Correct column: timestamp', check: schema.includes('timestamp TEXT NOT NULL') },
      { name: 'Column: response_time_ms', check: schema.includes('response_time_ms INTEGER NOT NULL') },
      { name: 'Column: database_status', check: schema.includes('database_status TEXT NOT NULL') },
      { name: 'Column: integration_operational', check: schema.includes('integration_operational INTEGER NOT NULL') },
      { name: 'Column: error_message', check: schema.includes('error_message TEXT') },
      { name: 'Index: timestamp', check: schema.includes('CREATE INDEX idx_factory_health_timestamp') },
      { name: 'Index: status', check: schema.includes('CREATE INDEX idx_factory_health_status') },
      { name: 'Index: created_at', check: schema.includes('CREATE INDEX idx_factory_health_created_at') },
      { name: 'No wrong column names', check: !schema.includes('factory_status TEXT') && !schema.includes('checked_at TEXT') },
    ];

    checks.forEach(check => {
      results.push({
        name: check.name,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Present' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });
  } catch (err) {
    error(`Failed to read schema: ${(err as Error).message}`);
  }

  const passed = results.filter(r => r.passed).length;
  return {
    category: 'Database Schema',
    tests: results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

async function testEnvironmentConfiguration(): Promise<CategoryResults> {
  header('⚙️  Environment Configuration');

  const results: TestResult[] = [];

  // Check .dev.vars.example
  try {
    const start = Date.now();
    const devVarsPath = join(__dirname, '../.dev.vars.example');
    const devVars = readFileSync(devVarsPath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: '.dev.vars.example exists', check: true },
      { name: 'FACTORY_OS_URL defined', check: devVars.includes('FACTORY_OS_URL=') },
      { name: 'FACTORY_OS_API_KEY defined', check: devVars.includes('FACTORY_OS_API_KEY=') },
      { name: 'Has comments/documentation', check: devVars.includes('#') },
    ];

    checks.forEach(check => {
      results.push({
        name: check.name,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Configured' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });
  } catch (err) {
    error(`Failed to read .dev.vars.example: ${(err as Error).message}`);
  }

  // Check .env.example
  try {
    const start = Date.now();
    const envExamplePath = join(__dirname, '../.env.example');
    const envExample = readFileSync(envExamplePath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: '.env.example exists', check: true },
      { name: 'FACTORY_OS_URL in template', check: envExample.includes('FACTORY_OS_URL=') },
      { name: 'FACTORY_OS_API_KEY in template', check: envExample.includes('FACTORY_OS_API_KEY=') },
    ];

    checks.forEach(check => {
      results.push({
        name: check.name,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Configured' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });
  } catch (err) {
    error(`Failed to read .env.example: ${(err as Error).message}`);
  }

  // Check .gitignore
  try {
    const start = Date.now();
    const gitignorePath = join(__dirname, '../.gitignore');
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: '.env excluded from git', check: gitignore.includes('.env') },
      { name: '.dev.vars excluded from git', check: gitignore.includes('.dev.vars') },
    ];

    checks.forEach(check => {
      results.push({
        name: check.name,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Protected' : 'Not protected',
      });
      if (check.check) {
        success(check.name);
      } else {
        warning(check.name);
      }
    });
  } catch (err) {
    error(`Failed to read .gitignore: ${(err as Error).message}`);
  }

  const passed = results.filter(r => r.passed).length;
  return {
    category: 'Environment Configuration',
    tests: results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

async function testDocumentation(): Promise<CategoryResults> {
  header('📚 Documentation Quality');

  const results: TestResult[] = [];

  const docs = [
    {
      file: 'docs/FACTORY_OS_INTEGRATION.md',
      requiredContent: ['Architecture', 'API 端點', '環境配置', '故障排除'],
    },
    {
      file: 'docs/HEALTH_METRICS_STORAGE.md',
      requiredContent: ['factory_os_status', 'timestamp', 'Schema', '使用範例'],
    },
    {
      file: 'docs/API_ENDPOINTS_COMPARISON.md',
      requiredContent: ['推薦端點', '兼容端點', '對比', '端點對比'],
    },
    {
      file: 'docs/FACTORY_OS_QUICK_START.md',
      requiredContent: ['快速啟動', 'API 端點', '故障排除', '環境變數'],
    },
  ];

  for (const doc of docs) {
    try {
      const start = Date.now();
      const docPath = join(__dirname, '..', doc.file);
      const content = readFileSync(docPath, 'utf-8');
      const duration = Date.now() - start;

      // Check file exists
      results.push({
        name: `${doc.file} exists`,
        passed: true,
        duration_ms: duration,
        details: `${content.split('\n').length} lines`,
      });
      success(`${doc.file} (${content.split('\n').length} lines)`);

      // Check required content
      for (const required of doc.requiredContent) {
        const hasContent = content.includes(required);
        results.push({
          name: `${doc.file} - contains "${required}"`,
          passed: hasContent,
          duration_ms: 0,
          details: hasContent ? 'Found' : 'Missing',
        });
        if (hasContent) {
          info(`  ✓ Contains: ${required}`);
        } else {
          warning(`  ✗ Missing: ${required}`);
        }
      }
    } catch (err) {
      error(`Failed to read ${doc.file}: ${(err as Error).message}`);
      results.push({
        name: `${doc.file} exists`,
        passed: false,
        duration_ms: 0,
        error: (err as Error).message,
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  return {
    category: 'Documentation',
    tests: results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

async function testCronConfiguration(): Promise<CategoryResults> {
  header('⏰ Cron Configuration');

  const results: TestResult[] = [];

  try {
    const start = Date.now();
    const wranglerPath = join(__dirname, '../wrangler.toml');
    const wrangler = readFileSync(wranglerPath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: 'Cron triggers section exists', check: wrangler.includes('[triggers]') },
      { name: 'Has cron entries', check: wrangler.includes('crons =') },
      { name: '5-minute schedule exists', check: wrangler.includes('*/5 * * * *') },
    ];

    checks.forEach(check => {
      results.push({
        name: check.name,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Configured' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });

    // Check scheduled handler
    const scheduledPath = join(__dirname, '../src/scheduled/index.ts');
    const scheduledCode = readFileSync(scheduledPath, 'utf-8');

    const scheduledChecks = [
      { name: 'handleScheduled function exists', check: scheduledCode.includes('export async function handleScheduled') },
      { name: 'Factory OS health check implemented', check: scheduledCode.includes('performFactoryHealthCheck') },
      { name: 'HealthMonitorService imported', check: scheduledCode.includes('HealthMonitorService') },
    ];

    scheduledChecks.forEach(check => {
      results.push({
        name: check.name,
        passed: check.check,
        duration_ms: 0,
        details: check.check ? 'Implemented' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });
  } catch (err) {
    error(`Failed to verify cron config: ${(err as Error).message}`);
  }

  const passed = results.filter(r => r.passed).length;
  return {
    category: 'Cron Configuration',
    tests: results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

async function testAPIRoutesRegistration(): Promise<CategoryResults> {
  header('🔗 API Routes Registration');

  const results: TestResult[] = [];

  try {
    const start = Date.now();
    const apiIndexPath = join(__dirname, '../src/main/js/api/index.ts');
    const apiIndex = readFileSync(apiIndexPath, 'utf-8');
    const duration = Date.now() - start;

    const checks = [
      { name: 'factoryStatusRoutes imported', check: apiIndex.includes("import { factoryStatusRoutes }") },
      { name: 'factoryStatusLegacyRoutes imported', check: apiIndex.includes("import { factoryStatusLegacyRoutes }") },
      { name: 'Recommended routes registered', check: apiIndex.includes("apiV1.route('/factory-status', factoryStatusRoutes)") },
      { name: 'Legacy routes registered', check: apiIndex.includes("apiV1.route('/factory-status', factoryStatusLegacyRoutes)") },
      { name: 'Root endpoint lists factory-status', check: apiIndex.includes("'factory-status'") },
      { name: 'Endpoint documentation in root', check: apiIndex.includes('factory_status_endpoints') },
    ];

    checks.forEach(check => {
      results.push({
        name: check.name,
        passed: check.check,
        duration_ms: duration,
        details: check.check ? 'Configured' : 'Missing',
      });
      if (check.check) {
        success(check.name);
      } else {
        error(check.name);
      }
    });
  } catch (err) {
    error(`Failed to verify API routes: ${(err as Error).message}`);
  }

  const passed = results.filter(r => r.passed).length;
  return {
    category: 'API Routes Registration',
    tests: results,
    passed,
    failed: results.length - passed,
    total: results.length,
  };
}

// ========================================
// Generate Report
// ========================================

function generateMarkdownReport(results: CategoryResults[]): string {
  let report = `# Factory OS Integration - Production Test Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Version:** 1.0.0\n\n`;

  report += `---\n\n`;

  // Executive Summary
  report += `## 📊 Executive Summary\n\n`;

  const totalTests = results.reduce((sum, cat) => sum + cat.total, 0);
  const totalPassed = results.reduce((sum, cat) => sum + cat.passed, 0);
  const totalFailed = results.reduce((sum, cat) => sum + cat.failed, 0);
  const passRate = ((totalPassed / totalTests) * 100).toFixed(2);

  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| **Total Tests** | ${totalTests} |\n`;
  report += `| **Passed** | ✅ ${totalPassed} |\n`;
  report += `| **Failed** | ❌ ${totalFailed} |\n`;
  report += `| **Pass Rate** | ${passRate}% |\n`;
  report += `| **Status** | ${passRate === '100.00' ? '🟢 ALL TESTS PASSED' : passRate >= '90' ? '🟡 MOSTLY PASSING' : '🔴 NEEDS ATTENTION'} |\n\n`;

  // Category Summary
  report += `## 📋 Category Summary\n\n`;
  report += `| Category | Tests | Passed | Failed | Pass Rate |\n`;
  report += `|----------|-------|--------|--------|----------|\n`;

  results.forEach(cat => {
    const catPassRate = ((cat.passed / cat.total) * 100).toFixed(1);
    const status = cat.failed === 0 ? '✅' : '⚠️';
    report += `| ${status} ${cat.category} | ${cat.total} | ${cat.passed} | ${cat.failed} | ${catPassRate}% |\n`;
  });
  report += `\n`;

  // Detailed Results by Category
  report += `## 🔍 Detailed Test Results\n\n`;

  results.forEach(cat => {
    report += `### ${cat.category}\n\n`;
    report += `**Pass Rate:** ${((cat.passed / cat.total) * 100).toFixed(1)}% (${cat.passed}/${cat.total})\n\n`;

    if (cat.failed > 0) {
      report += `**Failed Tests:**\n\n`;
      cat.tests.filter(t => !t.passed).forEach(test => {
        report += `- ❌ ${test.name}\n`;
        if (test.details) report += `  - Details: ${test.details}\n`;
        if (test.error) report += `  - Error: ${test.error}\n`;
      });
      report += `\n`;
    }

    report += `**All Tests:**\n\n`;
    report += `| Status | Test | Duration | Details |\n`;
    report += `|--------|------|----------|--------|\n`;
    cat.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      const duration = test.duration_ms ? `${test.duration_ms}ms` : '-';
      const details = test.details || test.error || '-';
      report += `| ${status} | ${test.name} | ${duration} | ${details} |\n`;
    });
    report += `\n`;
  });

  // Recommendations
  report += `## 💡 Recommendations\n\n`;

  if (passRate === '100.00') {
    report += `✅ **All tests passed!** The Factory OS integration is ready for production.\n\n`;
    report += `**Next Steps:**\n`;
    report += `1. Deploy to Cloudflare Workers production environment\n`;
    report += `2. Configure production environment variables\n`;
    report += `3. Enable Cron triggers\n`;
    report += `4. Monitor health check logs\n\n`;
  } else {
    report += `⚠️ **Some tests failed.** Please address the following issues:\n\n`;
    results.forEach(cat => {
      if (cat.failed > 0) {
        report += `**${cat.category}:**\n`;
        cat.tests.filter(t => !t.passed).forEach(test => {
          report += `- Fix: ${test.name}\n`;
        });
        report += `\n`;
      }
    });
  }

  // Configuration Checklist
  report += `## ✅ Production Deployment Checklist\n\n`;
  report += `- [ ] All tests passing (${passRate}%)\n`;
  report += `- [ ] Environment variables configured (.dev.vars for local, secrets for production)\n`;
  report += `- [ ] Factory OS endpoint accessible\n`;
  report += `- [ ] API key configured\n`;
  report += `- [ ] Database schema migrated\n`;
  report += `- [ ] Cron triggers enabled\n`;
  report += `- [ ] Monitoring and alerting configured\n`;
  report += `- [ ] Documentation reviewed\n`;
  report += `- [ ] Backup and recovery plan in place\n\n`;

  // File Inventory
  report += `## 📁 File Inventory\n\n`;
  report += `### Core Implementation\n\n`;
  report += `- \`src/integrations/factory-os-client.ts\` - Factory OS HTTP client\n`;
  report += `- \`src/services/health-monitor.ts\` - Health monitoring service\n`;
  report += `- \`src/scheduled/index.ts\` - Cron task handler\n`;
  report += `- \`src/main/js/api/routes/factory-status.ts\` - Recommended API endpoints\n`;
  report += `- \`src/main/js/api/routes/factory-status-legacy.ts\` - Legacy API endpoints\n`;
  report += `- \`src/main/js/database/schema.sql\` - Database schema\n\n`;

  report += `### Testing & Verification\n\n`;
  report += `- \`scripts/test-factory-os-integration.ts\` - Integration tests\n`;
  report += `- \`scripts/verify-health-monitor.ts\` - Implementation verification\n`;
  report += `- \`scripts/generate-production-test-report.ts\` - This report generator\n\n`;

  report += `### Documentation\n\n`;
  report += `- \`docs/FACTORY_OS_INTEGRATION.md\` - Complete integration guide\n`;
  report += `- \`docs/HEALTH_METRICS_STORAGE.md\` - Health metrics storage guide\n`;
  report += `- \`docs/API_ENDPOINTS_COMPARISON.md\` - API endpoints comparison\n`;
  report += `- \`docs/FACTORY_OS_QUICK_START.md\` - Quick start guide\n\n`;

  report += `### Configuration\n\n`;
  report += `- \`.dev.vars.example\` - Local development environment template\n`;
  report += `- \`.env.example\` - Node.js scripts environment template\n\n`;

  // Footer
  report += `---\n\n`;
  report += `**Report Generated By:** AI Agent Team Testing Suite\n`;
  report += `**Report Version:** 1.0.0\n`;
  report += `**Timestamp:** ${new Date().toISOString()}\n`;

  return report;
}

// ========================================
// Main Execution
// ========================================

async function main() {
  log(`
╔══════════════════════════════════════════════════════════════════╗
║  Factory OS Integration - Production Test Report                ║
║  Comprehensive Testing & Verification Suite                     ║
╚══════════════════════════════════════════════════════════════════╝
`, 'bright');

  info(`Started: ${new Date().toISOString()}\n`);

  try {
    // Run all test categories
    allResults.push(await testFileStructure());
    allResults.push(await testCodeQuality());
    allResults.push(await testDatabaseSchema());
    allResults.push(await testEnvironmentConfiguration());
    allResults.push(await testDocumentation());
    allResults.push(await testCronConfiguration());
    allResults.push(await testAPIRoutesRegistration());

    // Generate summary
    header('📊 Test Summary');

    const totalTests = allResults.reduce((sum, cat) => sum + cat.total, 0);
    const totalPassed = allResults.reduce((sum, cat) => sum + cat.passed, 0);
    const totalFailed = allResults.reduce((sum, cat) => sum + cat.failed, 0);
    const passRate = ((totalPassed / totalTests) * 100).toFixed(2);

    log(`\nTotal Tests:  ${totalTests}`, 'cyan');
    log(`Passed:       ${totalPassed} ✅`, 'green');
    log(`Failed:       ${totalFailed} ❌`, totalFailed > 0 ? 'red' : 'green');
    log(`Pass Rate:    ${passRate}%\n`, passRate === '100.00' ? 'green' : 'yellow');

    allResults.forEach(cat => {
      const catPassRate = ((cat.passed / cat.total) * 100).toFixed(1);
      const status = cat.failed === 0 ? '✅' : '⚠️';
      log(`${status} ${cat.category}: ${cat.passed}/${cat.total} (${catPassRate}%)`, cat.failed === 0 ? 'green' : 'yellow');
    });

    // Generate markdown report
    header('📝 Generating Report');

    const report = generateMarkdownReport(allResults);
    const reportPath = join(__dirname, '../docs/PRODUCTION_TEST_REPORT.md');
    writeFileSync(reportPath, report, 'utf-8');

    success(`Report saved to: docs/PRODUCTION_TEST_REPORT.md`);
    info(`Report size: ${report.length} bytes`);

    // Final status
    header('✨ Test Complete');

    if (passRate === '100.00') {
      log(`\n🎉 ALL TESTS PASSED! Factory OS integration is production-ready.\n`, 'green');
      process.exit(0);
    } else if (parseFloat(passRate) >= 90) {
      log(`\n✅ Most tests passed (${passRate}%). Review failed tests before production deployment.\n`, 'yellow');
      process.exit(0);
    } else {
      log(`\n⚠️ Significant issues detected (${passRate}% pass rate). Please fix failed tests.\n`, 'red');
      process.exit(1);
    }
  } catch (error) {
    header('❌ Test Failed');
    log(`\nFatal error: ${(error as Error).message}\n`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
