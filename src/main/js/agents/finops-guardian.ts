/**
 * FinOps Guardian Agent
 * Monitors costs, optimizes resources, and provides budget recommendations
 */

import type { Env, Task, AgentId, KnowledgeEntry } from '../types';
import { Logger } from '../utils/logger';
import { KnowledgeBase } from '../core/knowledge-base';

export class FinOpsGuardianAgent {
  private logger: Logger;
  private knowledgeBase: KnowledgeBase;
  private agentId: AgentId = 'agent-finops-guardian';

  constructor(private env: Env) {
    this.logger = new Logger(env, 'FinOpsGuardianAgent');
    this.knowledgeBase = new KnowledgeBase(env);
    void this.env; // Suppress unused parameter warning
  }

  /**
   * Process a FinOps task
   */
  async processTask(task: Task): Promise<{
    cost_report: KnowledgeEntry;
    estimated_monthly_cost: number;
    optimization_opportunities: Array<{
      area: string;
      current_cost: number;
      potential_savings: number;
      recommendation: string;
    }>;
    alerts: string[];
  }> {
    await this.logger.info('Processing FinOps task', { taskId: task.id, taskType: task.type }, this.agentId);

    let result;
    switch (task.type) {
      case 'estimate_cost':
        result = await this.estimateCost(task);
        break;
      case 'optimize_resources':
        result = await this.optimizeResources(task);
        break;
      case 'cost_alert':
        result = await this.generateCostAlert(task);
        break;
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }

    await this.logger.info('FinOps task completed', { taskId: task.id, estimatedCost: result.estimated_monthly_cost }, this.agentId);

    return result;
  }

  /**
   * Estimate costs for architecture or feature
   */
  private async estimateCost(task: Task): Promise<{
    cost_report: KnowledgeEntry;
    estimated_monthly_cost: number;
    optimization_opportunities: Array<{
      area: string;
      current_cost: number;
      potential_savings: number;
      recommendation: string;
    }>;
    alerts: string[];
  }> {
    const architectureSpec = task.input_data?.architecture || task.description || '';

    // Analyze architecture for cost components
    const costBreakdown = await this.analyzeCostComponents(architectureSpec.toString());

    // Identify optimization opportunities
    const optimizations = await this.identifyOptimizations(costBreakdown);

    // Generate cost estimation report
    const reportContent = this.generateCostReport({
      task,
      costBreakdown,
      optimizations,
    });

    // Save cost report to knowledge base
    const costReport = await this.knowledgeBase.createEntry({
      type: 'architecture',
      title: `Cost Estimation: ${task.title}`,
      content: reportContent,
      tags: ['finops', 'cost-estimation', 'budget'],
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    // Generate alerts if costs exceed thresholds
    const alerts = this.generateAlerts(costBreakdown.totalCost);

    return {
      cost_report: costReport,
      estimated_monthly_cost: costBreakdown.totalCost,
      optimization_opportunities: optimizations,
      alerts,
    };
  }

  /**
   * Optimize resources for cost efficiency
   */
  private async optimizeResources(task: Task): Promise<{
    cost_report: KnowledgeEntry;
    estimated_monthly_cost: number;
    optimization_opportunities: Array<{
      area: string;
      current_cost: number;
      potential_savings: number;
      recommendation: string;
    }>;
    alerts: string[];
  }> {
    const currentUsage = task.input_data?.usage || {};

    // Analyze current resource usage
    const usageAnalysis = await this.analyzeResourceUsage(currentUsage);

    // Generate optimization recommendations
    const optimizations = await this.generateOptimizationRecommendations(usageAnalysis);

    const reportContent = `# Resource Optimization Report\n\n## Current Usage Analysis\n${JSON.stringify(usageAnalysis, null, 2)}\n\n## Optimization Opportunities\n${optimizations.map(opt => `### ${opt.area}\n- Current Cost: $${opt.current_cost}/month\n- Potential Savings: $${opt.potential_savings}/month\n- Recommendation: ${opt.recommendation}\n`).join('\n')}\n\n## Implementation Priority\n1. Quick wins (0-1 week)\n2. Medium-term optimizations (1-4 weeks)\n3. Long-term strategic changes (1-3 months)`;

    const optimizationReport = await this.knowledgeBase.createEntry({
      type: 'best_practice',
      title: `Resource Optimization: ${task.title}`,
      content: reportContent,
      tags: ['finops', 'optimization', 'cost-savings'],
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    const totalSavings = optimizations.reduce((sum, opt) => sum + opt.potential_savings, 0);

    return {
      cost_report: optimizationReport,
      estimated_monthly_cost: usageAnalysis.currentCost - totalSavings,
      optimization_opportunities: optimizations,
      alerts: [`Potential savings of $${totalSavings}/month identified`],
    };
  }

  /**
   * Generate cost alert
   */
  private async generateCostAlert(task: Task): Promise<{
    cost_report: KnowledgeEntry;
    estimated_monthly_cost: number;
    optimization_opportunities: Array<{
      area: string;
      current_cost: number;
      potential_savings: number;
      recommendation: string;
    }>;
    alerts: string[];
  }> {
    const threshold = (task.input_data?.threshold as number) || 100;
    const currentSpend = (task.input_data?.current_spend as number) || 0;

    const alertLevel = currentSpend > threshold ? 'CRITICAL' : currentSpend > threshold * 0.8 ? 'WARNING' : 'INFO';

    const alertContent = `# Cost Alert Report\n\n## Alert Level: ${alertLevel}\n\n## Current Spend\n- Monthly spend: $${currentSpend}\n- Budget threshold: $${threshold}\n- Utilization: ${((currentSpend / threshold) * 100).toFixed(1)}%\n\n## Immediate Actions\n${alertLevel === 'CRITICAL' ? '- Review and pause non-essential services\n- Implement emergency cost controls\n- Schedule urgent cost review meeting\n' : '- Monitor spending trends\n- Review resource utilization\n- Plan optimization initiatives\n'}`;

    const alertReport = await this.knowledgeBase.createEntry({
      type: 'bug_report', // Using bug_report for alerts
      title: `Cost Alert: ${alertLevel}`,
      content: alertContent,
      tags: ['finops', 'alert', alertLevel.toLowerCase()],
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    return {
      cost_report: alertReport,
      estimated_monthly_cost: currentSpend,
      optimization_opportunities: [],
      alerts: [`${alertLevel}: Current spend $${currentSpend} vs threshold $${threshold}`],
    };
  }

  /**
   * Analyze cost components from architecture
   */
  private async analyzeCostComponents(architectureSpec: string): Promise<{
    components: Array<{ name: string; cost: number }>;
    totalCost: number;
  }> {
    const components: Array<{ name: string; cost: number }> = [];

    // Detect Cloudflare services
    if (architectureSpec.includes('Workers')) {
      components.push({ name: 'Cloudflare Workers', cost: 5 }); // $5/month paid plan
    }
    if (architectureSpec.includes('D1') || architectureSpec.includes('database')) {
      components.push({ name: 'D1 Database', cost: 5 }); // Storage + operations
    }
    if (architectureSpec.includes('R2') || architectureSpec.includes('storage')) {
      components.push({ name: 'R2 Storage', cost: 3 }); // Assuming 100GB
    }
    if (architectureSpec.includes('KV')) {
      components.push({ name: 'KV Namespace', cost: 2 });
    }
    if (architectureSpec.includes('Queue')) {
      components.push({ name: 'Queues', cost: 3 });
    }

    // Detect LLM usage
    if (architectureSpec.includes('OpenAI') || architectureSpec.includes('GPT')) {
      components.push({ name: 'OpenAI API', cost: 10 }); // Estimated usage
    }
    if (architectureSpec.includes('Gemini')) {
      components.push({ name: 'Gemini API', cost: 0 }); // Free tier
    }

    // Detect vector database
    if (architectureSpec.includes('pgvector') || architectureSpec.includes('PostgreSQL')) {
      components.push({ name: 'PostgreSQL (NAS)', cost: 0 }); // Self-hosted
    }
    if (architectureSpec.includes('Vectorize')) {
      components.push({ name: 'Vectorize', cost: 60 }); // Expensive!
    }

    const totalCost = components.reduce((sum, comp) => sum + comp.cost, 0);

    return { components, totalCost };
  }

  /**
   * Identify cost optimization opportunities
   */
  private async identifyOptimizations(costBreakdown: {
    components: Array<{ name: string; cost: number }>;
    totalCost: number;
  }): Promise<Array<{
    area: string;
    current_cost: number;
    potential_savings: number;
    recommendation: string;
  }>> {
    const optimizations = [];

    // Check for Vectorize usage
    const vectorize = costBreakdown.components.find(c => c.name === 'Vectorize');
    if (vectorize) {
      optimizations.push({
        area: 'Vector Database',
        current_cost: 60,
        potential_savings: 60,
        recommendation: 'Migrate from Cloudflare Vectorize to PostgreSQL pgvector (self-hosted on NAS). Saves $60/month.',
      });
    }

    // Check for OpenAI usage
    const openai = costBreakdown.components.find(c => c.name === 'OpenAI API');
    if (openai && openai.cost > 5) {
      optimizations.push({
        area: 'LLM Costs',
        current_cost: openai.cost,
        potential_savings: openai.cost * 0.7,
        recommendation: 'Use intelligent LLM router to prefer Gemini (free tier) for simple tasks. Potential 70% savings.',
      });
    }

    // Check for Cloudflare Queue usage
    const queue = costBreakdown.components.find(c => c.name === 'Queues');
    if (queue) {
      optimizations.push({
        area: 'Task Queue',
        current_cost: 3,
        potential_savings: 2,
        recommendation: 'Consider using KV namespace for lightweight task queuing to reduce Queue costs.',
      });
    }

    return optimizations;
  }

  /**
   * Generate cost report content
   */
  private generateCostReport(params: {
    task: Task;
    costBreakdown: { components: Array<{ name: string; cost: number }>; totalCost: number };
    optimizations: Array<{
      area: string;
      current_cost: number;
      potential_savings: number;
      recommendation: string;
    }>;
  }): string {
    const { costBreakdown, optimizations } = params;

    let report = `# Cost Estimation Report\n\n`;
    report += `## Monthly Cost Breakdown\n\n`;
    costBreakdown.components.forEach(comp => {
      report += `- **${comp.name}**: $${comp.cost}/month\n`;
    });
    report += `\n**Total Estimated Monthly Cost**: $${costBreakdown.totalCost}\n\n`;

    if (optimizations.length > 0) {
      report += `## Optimization Opportunities\n\n`;
      const totalSavings = optimizations.reduce((sum, opt) => sum + opt.potential_savings, 0);
      report += `**Total Potential Savings**: $${totalSavings.toFixed(2)}/month (${((totalSavings / costBreakdown.totalCost) * 100).toFixed(1)}%)\n\n`;

      optimizations.forEach(opt => {
        report += `### ${opt.area}\n`;
        report += `- Current: $${opt.current_cost}/month\n`;
        report += `- Savings: $${opt.potential_savings}/month\n`;
        report += `- ${opt.recommendation}\n\n`;
      });
    }

    report += `## Cost Management Recommendations\n\n`;
    report += `1. Set up budget alerts at 80% and 100% thresholds\n`;
    report += `2. Review cost reports weekly\n`;
    report += `3. Implement usage monitoring and dashboards\n`;
    report += `4. Optimize high-cost components first\n`;
    report += `5. Consider reserved capacity for predictable workloads\n`;

    return report;
  }

  /**
   * Generate alerts based on cost thresholds
   */
  private generateAlerts(estimatedCost: number): string[] {
    const alerts: string[] = [];

    if (estimatedCost > 100) {
      alerts.push(`HIGH COST ALERT: Estimated cost $${estimatedCost}/month exceeds $100 threshold`);
    } else if (estimatedCost > 50) {
      alerts.push(`MODERATE COST: Estimated $${estimatedCost}/month. Monitor closely.`);
    } else {
      alerts.push(`Cost within acceptable range: $${estimatedCost}/month`);
    }

    return alerts;
  }

  /**
   * Analyze current resource usage
   */
  private async analyzeResourceUsage(_usage: unknown): Promise<{
    currentCost: number;
    utilizationRate: number;
    wastePercentage: number;
  }> {
    // In production, fetch actual usage data from Cloudflare Analytics
    return {
      currentCost: 50,
      utilizationRate: 65,
      wastePercentage: 35,
    };
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(analysis: {
    currentCost: number;
    utilizationRate: number;
    wastePercentage: number;
  }): Promise<Array<{
    area: string;
    current_cost: number;
    potential_savings: number;
    recommendation: string;
  }>> {
    const optimizations = [];

    if (analysis.wastePercentage > 30) {
      optimizations.push({
        area: 'Resource Utilization',
        current_cost: analysis.currentCost,
        potential_savings: analysis.currentCost * (analysis.wastePercentage / 100),
        recommendation: `Reduce waste by ${analysis.wastePercentage}% through right-sizing and auto-scaling`,
      });
    }

    return optimizations;
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<{
    agent_id: AgentId;
    active_monitoring: boolean;
    alerts_count: number;
  }> {
    return {
      agent_id: this.agentId,
      active_monitoring: true,
      alerts_count: 0,
    };
  }
}
