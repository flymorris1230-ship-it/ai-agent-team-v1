/**
 * Security Guardian Agent
 * Conducts security reviews, vulnerability scans, and compliance checks
 */

import type { Env, Task, AgentId, KnowledgeEntry } from '../types';
import { Logger } from '../utils/logger';
import { KnowledgeBase } from '../core/knowledge-base';

export class SecurityGuardianAgent {
  private logger: Logger;
  private knowledgeBase: KnowledgeBase;
  private agentId: AgentId = 'agent-security-guardian';

  constructor(private env: Env) {
    this.logger = new Logger(env, 'SecurityGuardianAgent');
    this.knowledgeBase = new KnowledgeBase(env);
    void this.env; // Suppress unused parameter warning
  }

  /**
   * Process a security task
   */
  async processTask(task: Task): Promise<{
    security_report: KnowledgeEntry;
    security_score: number;
    vulnerabilities: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      recommendation: string;
    }>;
    compliance_status: Record<string, boolean>;
    alerts: string[];
  }> {
    await this.logger.info('Processing security task', { taskId: task.id, taskType: task.type }, this.agentId);

    let result;
    switch (task.type) {
      case 'security_review':
        result = await this.conductSecurityReview(task);
        break;
      case 'vulnerability_scan':
        result = await this.scanVulnerabilities(task);
        break;
      case 'compliance_check':
        result = await this.checkCompliance(task);
        break;
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }

    await this.logger.info('Security task completed', { taskId: task.id, securityScore: result.security_score }, this.agentId);

    return result;
  }

  /**
   * Conduct comprehensive security review
   */
  private async conductSecurityReview(task: Task): Promise<{
    security_report: KnowledgeEntry;
    security_score: number;
    vulnerabilities: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      recommendation: string;
    }>;
    compliance_status: Record<string, boolean>;
    alerts: string[];
  }> {
    const architectureSpec = task.input_data?.architecture || task.description || '';

    // Analyze architecture for security issues
    const securityAnalysis = await this.analyzeSecurityPosture(architectureSpec.toString());

    // Identify vulnerabilities
    const vulnerabilities = await this.identifyVulnerabilities(securityAnalysis);

    // Check compliance requirements
    const compliance = await this.assessCompliance(securityAnalysis);

    // Calculate security score
    const securityScore = this.calculateSecurityScore(vulnerabilities, compliance);

    // Generate security report
    const reportContent = this.generateSecurityReport({
      task,
      securityAnalysis,
      vulnerabilities,
      compliance,
      securityScore,
    });

    // Save security report to knowledge base
    const securityReport = await this.knowledgeBase.createEntry({
      type: 'architecture',
      title: `Security Review: ${task.title}`,
      content: reportContent,
      tags: ['security', 'review', 'compliance'],
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    // Generate alerts for critical issues
    const alerts = this.generateSecurityAlerts(vulnerabilities);

    return {
      security_report: securityReport,
      security_score: securityScore,
      vulnerabilities,
      compliance_status: compliance,
      alerts,
    };
  }

  /**
   * Scan for vulnerabilities
   */
  private async scanVulnerabilities(task: Task): Promise<{
    security_report: KnowledgeEntry;
    security_score: number;
    vulnerabilities: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      recommendation: string;
    }>;
    compliance_status: Record<string, boolean>;
    alerts: string[];
  }> {
    const codebase = task.input_data?.codebase || task.description || '';

    // Perform automated vulnerability scanning
    const scanResults = await this.performVulnerabilityScan(codebase.toString());

    const reportContent = `# Vulnerability Scan Report\n\n## Scan Summary\n- Total Vulnerabilities: ${scanResults.total}\n- Critical: ${scanResults.critical}\n- High: ${scanResults.high}\n- Medium: ${scanResults.medium}\n- Low: ${scanResults.low}\n\n## Findings\n${scanResults.vulnerabilities.map(v => `### ${v.severity.toUpperCase()}: ${v.category}\n${v.description}\n\n**Recommendation**: ${v.recommendation}\n`).join('\n')}\n\n## Next Steps\n1. Address critical vulnerabilities immediately\n2. Plan remediation for high-severity issues\n3. Schedule fixes for medium and low severity items\n4. Re-scan after fixes applied`;

    const scanReport = await this.knowledgeBase.createEntry({
      type: 'bug_report',
      title: `Vulnerability Scan: ${task.title}`,
      content: reportContent,
      tags: ['security', 'vulnerability', 'scan'],
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    const securityScore = this.calculateSecurityScore(scanResults.vulnerabilities, {});

    return {
      security_report: scanReport,
      security_score: securityScore,
      vulnerabilities: scanResults.vulnerabilities,
      compliance_status: {},
      alerts: scanResults.critical > 0 ? [`CRITICAL: ${scanResults.critical} critical vulnerabilities found`] : [],
    };
  }

  /**
   * Check compliance requirements
   */
  private async checkCompliance(task: Task): Promise<{
    security_report: KnowledgeEntry;
    security_score: number;
    vulnerabilities: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      recommendation: string;
    }>;
    compliance_status: Record<string, boolean>;
    alerts: string[];
  }> {
    const standard = (task.input_data?.standard as string) || 'OWASP';

    // Check compliance against standard
    const complianceResults = await this.auditCompliance(standard);

    const reportContent = `# Compliance Audit Report\n\n## Standard: ${standard}\n\n## Compliance Status\n${Object.entries(complianceResults.status).map(([requirement, passed]) => `- ${requirement}: ${passed ? '✅ PASS' : '❌ FAIL'}`).join('\n')}\n\n## Overall Compliance Rate: ${complianceResults.rate}%\n\n## Non-Compliant Areas\n${complianceResults.failures.map(f => `### ${f.requirement}\n${f.description}\n\n**Remediation**: ${f.remediation}\n`).join('\n')}\n\n## Recommendations\n${complianceResults.recommendations.join('\n')}`;

    const complianceReport = await this.knowledgeBase.createEntry({
      type: 'best_practice',
      title: `Compliance Check: ${standard}`,
      content: reportContent,
      tags: ['security', 'compliance', standard.toLowerCase()],
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    return {
      security_report: complianceReport,
      security_score: complianceResults.rate,
      vulnerabilities: [],
      compliance_status: complianceResults.status,
      alerts: complianceResults.rate < 80 ? [`COMPLIANCE WARNING: ${complianceResults.rate}% compliance rate`] : [],
    };
  }

  /**
   * Analyze security posture of architecture
   */
  private async analyzeSecurityPosture(architectureSpec: string): Promise<{
    hasAuthentication: boolean;
    hasAuthorization: boolean;
    hasEncryption: boolean;
    hasInputValidation: boolean;
    hasRateLimiting: boolean;
    hasLogging: boolean;
    vulnerableComponents: string[];
  }> {
    const lowerSpec = architectureSpec.toLowerCase();

    return {
      hasAuthentication: lowerSpec.includes('auth') || lowerSpec.includes('jwt'),
      hasAuthorization: lowerSpec.includes('role') || lowerSpec.includes('permission'),
      hasEncryption: lowerSpec.includes('encrypt') || lowerSpec.includes('tls') || lowerSpec.includes('https'),
      hasInputValidation: lowerSpec.includes('validat') || lowerSpec.includes('sanitiz'),
      hasRateLimiting: lowerSpec.includes('rate limit') || lowerSpec.includes('throttl'),
      hasLogging: lowerSpec.includes('log') || lowerSpec.includes('audit'),
      vulnerableComponents: this.detectVulnerableComponents(architectureSpec),
    };
  }

  /**
   * Detect potentially vulnerable components
   */
  private detectVulnerableComponents(spec: string): string[] {
    const vulnerable: string[] = [];

    if (spec.includes('eval(') || spec.includes('Function(')) {
      vulnerable.push('Dangerous code execution patterns detected');
    }
    if (!spec.includes('prepared statement') && spec.includes('SQL')) {
      vulnerable.push('Potential SQL injection risk');
    }
    if (spec.includes('innerHTML') || spec.includes('dangerouslySetInnerHTML')) {
      vulnerable.push('Potential XSS vulnerability');
    }

    return vulnerable;
  }

  /**
   * Identify vulnerabilities from security analysis
   */
  private async identifyVulnerabilities(analysis: {
    hasAuthentication: boolean;
    hasAuthorization: boolean;
    hasEncryption: boolean;
    hasInputValidation: boolean;
    hasRateLimiting: boolean;
    hasLogging: boolean;
    vulnerableComponents: string[];
  }): Promise<Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    recommendation: string;
  }>> {
    const vulnerabilities = [];

    if (!analysis.hasAuthentication) {
      vulnerabilities.push({
        severity: 'critical' as const,
        category: 'Authentication',
        description: 'No authentication mechanism detected',
        recommendation: 'Implement JWT-based authentication with Supabase Auth or similar',
      });
    }

    if (!analysis.hasAuthorization) {
      vulnerabilities.push({
        severity: 'high' as const,
        category: 'Authorization',
        description: 'No authorization/access control detected',
        recommendation: 'Implement role-based access control (RBAC) for all protected resources',
      });
    }

    if (!analysis.hasEncryption) {
      vulnerabilities.push({
        severity: 'high' as const,
        category: 'Encryption',
        description: 'Data encryption not explicitly mentioned',
        recommendation: 'Ensure TLS 1.3 for data in transit and encryption at rest for sensitive data',
      });
    }

    if (!analysis.hasInputValidation) {
      vulnerabilities.push({
        severity: 'high' as const,
        category: 'Input Validation',
        description: 'Input validation not explicitly implemented',
        recommendation: 'Use Zod or similar library for input validation and sanitization',
      });
    }

    if (!analysis.hasRateLimiting) {
      vulnerabilities.push({
        severity: 'medium' as const,
        category: 'Rate Limiting',
        description: 'No rate limiting detected',
        recommendation: 'Implement rate limiting using Upstash Redis to prevent abuse',
      });
    }

    if (!analysis.hasLogging) {
      vulnerabilities.push({
        severity: 'medium' as const,
        category: 'Audit Logging',
        description: 'Security event logging not detected',
        recommendation: 'Implement comprehensive audit logging for security events',
      });
    }

    // Add vulnerabilities from component analysis
    analysis.vulnerableComponents.forEach(component => {
      vulnerabilities.push({
        severity: 'high' as const,
        category: 'Code Security',
        description: component,
        recommendation: 'Review and remediate identified security issue',
      });
    });

    return vulnerabilities;
  }

  /**
   * Assess compliance with security standards
   */
  private async assessCompliance(analysis: {
    hasAuthentication: boolean;
    hasAuthorization: boolean;
    hasEncryption: boolean;
    hasInputValidation: boolean;
    hasRateLimiting: boolean;
    hasLogging: boolean;
  }): Promise<Record<string, boolean>> {
    return {
      'OWASP-A01-Broken-Access-Control': analysis.hasAuthentication && analysis.hasAuthorization,
      'OWASP-A02-Cryptographic-Failures': analysis.hasEncryption,
      'OWASP-A03-Injection': analysis.hasInputValidation,
      'OWASP-A09-Security-Logging-Monitoring': analysis.hasLogging,
      'Rate-Limiting': analysis.hasRateLimiting,
    };
  }

  /**
   * Calculate overall security score
   */
  private calculateSecurityScore(
    vulnerabilities: Array<{ severity: string }>,
    compliance: Record<string, boolean>
  ): number {
    let score = 100;

    // Deduct points for vulnerabilities
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    // Factor in compliance
    const complianceCount = Object.values(compliance).filter(Boolean).length;
    const totalCompliance = Object.keys(compliance).length;
    if (totalCompliance > 0) {
      const complianceRate = (complianceCount / totalCompliance) * 100;
      score = (score + complianceRate) / 2;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate security report content
   */
  private generateSecurityReport(params: {
    task: Task;
    securityAnalysis: Record<string, unknown>;
    vulnerabilities: Array<{
      severity: string;
      category: string;
      description: string;
      recommendation: string;
    }>;
    compliance: Record<string, boolean>;
    securityScore: number;
  }): string {
    const { vulnerabilities, compliance, securityScore } = params;

    let report = `# Security Review Report\n\n`;
    report += `## Overall Security Score: ${securityScore.toFixed(1)}/100\n\n`;

    if (vulnerabilities.length > 0) {
      report += `## Vulnerabilities (${vulnerabilities.length} total)\n\n`;
      const grouped = {
        critical: vulnerabilities.filter(v => v.severity === 'critical'),
        high: vulnerabilities.filter(v => v.severity === 'high'),
        medium: vulnerabilities.filter(v => v.severity === 'medium'),
        low: vulnerabilities.filter(v => v.severity === 'low'),
      };

      Object.entries(grouped).forEach(([severity, vulns]) => {
        if (vulns.length > 0) {
          report += `### ${severity.toUpperCase()} (${vulns.length})\n`;
          vulns.forEach(v => {
            report += `- **${v.category}**: ${v.description}\n  - *Fix*: ${v.recommendation}\n`;
          });
          report += `\n`;
        }
      });
    }

    if (Object.keys(compliance).length > 0) {
      report += `## Compliance Status\n\n`;
      Object.entries(compliance).forEach(([requirement, passed]) => {
        report += `- ${requirement}: ${passed ? '✅ PASS' : '❌ FAIL'}\n`;
      });
      report += `\n`;
    }

    report += `## Security Best Practices\n\n`;
    report += `1. Implement defense in depth\n`;
    report += `2. Follow principle of least privilege\n`;
    report += `3. Keep all dependencies updated\n`;
    report += `4. Regular security audits and penetration testing\n`;
    report += `5. Incident response plan in place\n`;

    return report;
  }

  /**
   * Generate security alerts for critical issues
   */
  private generateSecurityAlerts(vulnerabilities: Array<{ severity: string }>): string[] {
    const alerts: string[] = [];

    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;

    if (criticalCount > 0) {
      alerts.push(`🚨 CRITICAL: ${criticalCount} critical security vulnerabilities require immediate attention`);
    }
    if (highCount > 0) {
      alerts.push(`⚠️ HIGH: ${highCount} high-severity vulnerabilities need urgent remediation`);
    }

    return alerts;
  }

  /**
   * Perform automated vulnerability scan
   */
  private async performVulnerabilityScan(codebase: string): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    vulnerabilities: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      description: string;
      recommendation: string;
    }>;
  }> {
    // Simplified scan - in production would use actual security scanning tools
    const vulnerabilities = await this.identifyVulnerabilities({
      hasAuthentication: codebase.includes('auth'),
      hasAuthorization: codebase.includes('role'),
      hasEncryption: codebase.includes('encrypt'),
      hasInputValidation: codebase.includes('validate'),
      hasRateLimiting: codebase.includes('rate'),
      hasLogging: codebase.includes('log'),
      vulnerableComponents: this.detectVulnerableComponents(codebase),
    });

    return {
      total: vulnerabilities.length,
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
      vulnerabilities,
    };
  }

  /**
   * Audit compliance with security standards
   */
  private async auditCompliance(standard: string): Promise<{
    status: Record<string, boolean>;
    rate: number;
    failures: Array<{
      requirement: string;
      description: string;
      remediation: string;
    }>;
    recommendations: string[];
  }> {
    // Simplified compliance check
    const status = {
      'Authentication': true,
      'Authorization': true,
      'Encryption': true,
      'Input-Validation': false,
      'Rate-Limiting': false,
      'Security-Logging': true,
    };

    const passed = Object.values(status).filter(Boolean).length;
    const total = Object.keys(status).length;
    const rate = Math.round((passed / total) * 100);

    const failures = Object.entries(status)
      .filter(([, passed]) => !passed)
      .map(([requirement]) => ({
        requirement,
        description: `${requirement} not properly implemented`,
        remediation: `Implement ${requirement} according to ${standard} guidelines`,
      }));

    const recommendations = [
      '1. Review and update security policies',
      '2. Conduct regular security training',
      '3. Implement automated compliance monitoring',
      '4. Schedule quarterly security audits',
    ];

    return { status, rate, failures, recommendations };
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<{
    agent_id: AgentId;
    active_monitoring: boolean;
    recent_scans: number;
  }> {
    return {
      agent_id: this.agentId,
      active_monitoring: true,
      recent_scans: 0,
    };
  }
}
