/**
 * Quality Summary Report Generator
 * 生成 Phase 1 完整的品質總結報告
 *
 * 報告內容:
 * - 測試執行總結
 * - 效能指標分析
 * - 成本優化驗證
 * - 可靠性評估
 * - 問題清單與建議
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  coverage?: number;
}

interface PerformanceMetrics {
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  concurrentCapacity: number;
}

interface CostMetrics {
  monthlyProjection: number;
  savingsVsBaseline: number;
  freeModelUsage: number;
  avgCostPerTask: number;
}

interface ReliabilityMetrics {
  uptime: number;
  errorRate: number;
  failureRecoveryTime: number;
  dataConsistency: number;
}

interface QualitySummary {
  generatedAt: string;
  systemVersion: string;
  testMetrics: TestMetrics;
  performanceMetrics: PerformanceMetrics;
  costMetrics: CostMetrics;
  reliabilityMetrics: ReliabilityMetrics;
  qualityScore: number;
  issues: string[];
  recommendations: string[];
}

export class QualityReportGenerator {
  private summary: Partial<QualitySummary> = {};

  constructor() {
    this.summary = {
      generatedAt: new Date().toISOString(),
      systemVersion: 'Phase 1 - AI Agent Team v1.0',
      issues: [],
      recommendations: [],
    };
  }

  addTestMetrics(metrics: TestMetrics) {
    this.summary.testMetrics = metrics;
  }

  addPerformanceMetrics(metrics: PerformanceMetrics) {
    this.summary.performanceMetrics = metrics;
  }

  addCostMetrics(metrics: CostMetrics) {
    this.summary.costMetrics = metrics;
  }

  addReliabilityMetrics(metrics: ReliabilityMetrics) {
    this.summary.reliabilityMetrics = metrics;
  }

  addIssue(issue: string) {
    this.summary.issues?.push(issue);
  }

  addRecommendation(recommendation: string) {
    this.summary.recommendations?.push(recommendation);
  }

  calculateQualityScore(): number {
    let score = 100;

    // Test metrics (25 points)
    if (this.summary.testMetrics) {
      const passRate = (this.summary.testMetrics.passed / this.summary.testMetrics.totalTests) * 100;
      score -= (100 - passRate) * 0.25;
    }

    // Performance metrics (25 points)
    if (this.summary.performanceMetrics) {
      if (this.summary.performanceMetrics.p95Latency > 500) score -= 10;
      if (this.summary.performanceMetrics.throughput < 50) score -= 10;
      if (this.summary.performanceMetrics.concurrentCapacity < 100) score -= 5;
    }

    // Cost metrics (25 points)
    if (this.summary.costMetrics) {
      if (this.summary.costMetrics.monthlyProjection > 66) score -= 15;
      if (this.summary.costMetrics.savingsVsBaseline < 80) score -= 10;
    }

    // Reliability metrics (25 points)
    if (this.summary.reliabilityMetrics) {
      if (this.summary.reliabilityMetrics.uptime < 99.9) score -= 10;
      if (this.summary.reliabilityMetrics.errorRate > 0.1) score -= 10;
      if (this.summary.reliabilityMetrics.failureRecoveryTime > 1000) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  generateMarkdownReport(): string {
    this.summary.qualityScore = this.calculateQualityScore();

    const report = `# Phase 1 AI Agent Team - 品質總結報告

**生成時間**: ${new Date(this.summary.generatedAt!).toLocaleString('zh-TW')}
**系統版本**: ${this.summary.systemVersion}
**品質評分**: **${this.summary.qualityScore!.toFixed(1)}/100** ${this.getScoreEmoji(this.summary.qualityScore!)}

---

## 📊 測試執行總結

${this.generateTestSummary()}

---

## ⚡ 效能指標分析

${this.generatePerformanceSummary()}

---

## 💰 成本優化驗證

${this.generateCostSummary()}

---

## 🛡️ 可靠性評估

${this.generateReliabilitySummary()}

---

## ⭐ 品質指標達成狀況

${this.generateQualityTargets()}

---

## ⚠️ 發現的問題

${this.generateIssuesList()}

---

## 💡 改進建議

${this.generateRecommendations()}

---

## 📈 總體評估

${this.generateOverallAssessment()}

---

**報告結束** - 生成於 ${new Date().toLocaleString('zh-TW')}
`;

    return report;
  }

  private getScoreEmoji(score: number): string {
    if (score >= 95) return '🌟🌟🌟 (優秀)';
    if (score >= 85) return '🌟🌟 (良好)';
    if (score >= 75) return '🌟 (合格)';
    return '⚠️ (需改進)';
  }

  private generateTestSummary(): string {
    const m = this.summary.testMetrics;
    if (!m) return '⚠️ 無測試數據';

    const passRate = ((m.passed / m.totalTests) * 100).toFixed(1);

    return `
| 指標 | 數值 | 目標 | 狀態 |
|------|------|------|------|
| 總測試數 | ${m.totalTests} | - | ✅ |
| 通過測試 | ${m.passed} | - | ✅ |
| 失敗測試 | ${m.failed} | 0 | ${m.failed === 0 ? '✅' : '❌'} |
| 通過率 | ${passRate}% | 100% | ${parseFloat(passRate) === 100 ? '✅' : '⚠️'} |
| 執行時間 | ${(m.duration / 1000).toFixed(1)}s | <300s | ${m.duration < 300000 ? '✅' : '⚠️'} |
| 代碼覆蓋率 | ${m.coverage ? m.coverage + '%' : 'N/A'} | >60% | ${m.coverage && m.coverage > 60 ? '✅' : '⚠️'} |
`;
  }

  private generatePerformanceSummary(): string {
    const m = this.summary.performanceMetrics;
    if (!m) return '⚠️ 無效能數據';

    return `
| 指標 | 數值 | 目標 | 狀態 |
|------|------|------|------|
| 平均延遲 | ${m.avgLatency.toFixed(2)}ms | <200ms | ${m.avgLatency < 200 ? '✅' : '⚠️'} |
| P95 延遲 | ${m.p95Latency.toFixed(2)}ms | <500ms | ${m.p95Latency < 500 ? '✅' : '❌'} |
| P99 延遲 | ${m.p99Latency.toFixed(2)}ms | <1000ms | ${m.p99Latency < 1000 ? '✅' : '❌'} |
| 吞吐量 | ${m.throughput.toFixed(2)} tasks/sec | >100 | ${m.throughput > 100 ? '✅' : '⚠️'} |
| 並發能力 | ${m.concurrentCapacity} tasks | >100 | ${m.concurrentCapacity > 100 ? '✅' : '❌'} |

**效能評估**: ${m.p95Latency < 500 && m.throughput > 100 ? '✅ 滿足生產需求' : '⚠️ 需要優化'}
`;
  }

  private generateCostSummary(): string {
    const m = this.summary.costMetrics;
    if (!m) return '⚠️ 無成本數據';

    return `
| 指標 | 數值 | 目標 | 狀態 |
|------|------|------|------|
| 月度成本預估 | $${m.monthlyProjection.toFixed(2)} | <$66 | ${m.monthlyProjection < 66 ? '✅' : '❌'} |
| 成本節省率 | ${m.savingsVsBaseline.toFixed(1)}% | >83% | ${m.savingsVsBaseline > 83 ? '✅' : '⚠️'} |
| 免費模型使用率 | ${m.freeModelUsage.toFixed(1)}% | >70% | ${m.freeModelUsage > 70 ? '✅' : '⚠️'} |
| 每任務平均成本 | $${m.avgCostPerTask.toFixed(6)} | <$0.001 | ${m.avgCostPerTask < 0.001 ? '✅' : '⚠️'} |

**成本評估**: ${m.monthlyProjection < 66 && m.savingsVsBaseline > 83 ? '✅ 達成成本優化目標' : '⚠️ 需調整成本策略'}
`;
  }

  private generateReliabilitySummary(): string {
    const m = this.summary.reliabilityMetrics;
    if (!m) return '⚠️ 無可靠性數據';

    return `
| 指標 | 數值 | 目標 | 狀態 |
|------|------|------|------|
| 系統可用性 | ${m.uptime.toFixed(3)}% | >99.9% | ${m.uptime > 99.9 ? '✅' : '❌'} |
| 錯誤率 | ${m.errorRate.toFixed(3)}% | <0.1% | ${m.errorRate < 0.1 ? '✅' : '❌'} |
| 故障恢復時間 | ${m.failureRecoveryTime}ms | <1000ms | ${m.failureRecoveryTime < 1000 ? '✅' : '⚠️'} |
| 數據一致性 | ${m.dataConsistency.toFixed(1)}% | >99.9% | ${m.dataConsistency > 99.9 ? '✅' : '⚠️'} |

**可靠性評估**: ${m.uptime > 99.9 && m.errorRate < 0.1 ? '✅ 生產級可靠性' : '⚠️ 需提升穩定性'}
`;
  }

  private generateQualityTargets(): string {
    const targets = [
      {
        category: '測試覆蓋',
        target: '所有核心功能 100% 測試通過',
        status: this.summary.testMetrics?.failed === 0 ? '✅ 達成' : '❌ 未達成',
      },
      {
        category: '效能表現',
        target: 'P95 延遲 < 500ms',
        status: this.summary.performanceMetrics && this.summary.performanceMetrics.p95Latency < 500 ? '✅ 達成' : '❌ 未達成',
      },
      {
        category: '成本控制',
        target: '月度成本 < $66',
        status: this.summary.costMetrics && this.summary.costMetrics.monthlyProjection < 66 ? '✅ 達成' : '❌ 未達成',
      },
      {
        category: '系統可用性',
        target: '可用性 > 99.9%',
        status: this.summary.reliabilityMetrics && this.summary.reliabilityMetrics.uptime > 99.9 ? '✅ 達成' : '❌ 未達成',
      },
      {
        category: '並發處理',
        target: '支援 100+ 並發任務',
        status: this.summary.performanceMetrics && this.summary.performanceMetrics.concurrentCapacity >= 100 ? '✅ 達成' : '❌ 未達成',
      },
      {
        category: '成本節省',
        target: '節省 > 83% (vs $400 baseline)',
        status: this.summary.costMetrics && this.summary.costMetrics.savingsVsBaseline > 83 ? '✅ 達成' : '❌ 未達成',
      },
    ];

    const achieved = targets.filter((t) => t.status.includes('✅')).length;
    const total = targets.length;
    const achievementRate = ((achieved / total) * 100).toFixed(1);

    let table = `
**達成率**: ${achieved}/${total} (${achievementRate}%)

| 類別 | 目標 | 狀態 |
|------|------|------|
`;

    targets.forEach((t) => {
      table += `| ${t.category} | ${t.target} | ${t.status} |\n`;
    });

    return table;
  }

  private generateIssuesList(): string {
    if (!this.summary.issues || this.summary.issues.length === 0) {
      return '✅ **無重大問題發現**\n\n所有測試和驗證均通過，系統運行正常。';
    }

    let list = `發現 ${this.summary.issues.length} 個問題需要關注:\n\n`;
    this.summary.issues.forEach((issue, index) => {
      list += `${index + 1}. ${issue}\n`;
    });

    return list;
  }

  private generateRecommendations(): string {
    if (!this.summary.recommendations || this.summary.recommendations.length === 0) {
      return '✅ **系統運行良好**\n\n目前無需特別改進，建議繼續監控系統表現。';
    }

    let list = `提供 ${this.summary.recommendations.length} 項改進建議:\n\n`;
    this.summary.recommendations.forEach((rec, index) => {
      list += `${index + 1}. ${rec}\n`;
    });

    return list;
  }

  private generateOverallAssessment(): string {
    const score = this.summary.qualityScore!;

    if (score >= 95) {
      return `
### 🌟🌟🌟 優秀 (${score.toFixed(1)}/100)

Phase 1 AI Agent Team 系統表現優異，所有關鍵指標均達到或超越目標。系統已準備好投入生產環境使用。

**亮點**:
- ✅ 所有測試通過，品質穩定
- ✅ 效能表現優異，滿足高併發需求
- ✅ 成本優化成功，大幅降低運營成本
- ✅ 系統可靠性達到生產級標準

**下一步**: 可以開始 Phase 2 (自主學習與深度優化) 的開發工作。
`;
    }

    if (score >= 85) {
      return `
### 🌟🌟 良好 (${score.toFixed(1)}/100)

Phase 1 AI Agent Team 系統整體表現良好，大部分指標達到目標，少數項目需要優化。

**建議**: 針對未達標項目進行優化後即可投入生產使用。
`;
    }

    if (score >= 75) {
      return `
### 🌟 合格 (${score.toFixed(1)}/100)

Phase 1 AI Agent Team 系統基本滿足要求，但存在一些需要改進的地方。

**建議**: 優先處理發現的問題，提升系統穩定性和效能後再投入生產。
`;
    }

    return `
### ⚠️ 需改進 (${score.toFixed(1)}/100)

Phase 1 AI Agent Team 系統存在較多問題，需要進行改進。

**建議**: 優先修復關鍵問題，進行全面測試後再考慮生產部署。
`;
  }

  saveReport(outputPath: string) {
    const report = this.generateMarkdownReport();
    fs.writeFileSync(outputPath, report, 'utf-8');
    console.log(`✅ 品質報告已生成: ${outputPath}`);
  }
}

// Export for use in tests
export default QualityReportGenerator;
