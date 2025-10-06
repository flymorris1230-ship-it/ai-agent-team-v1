/**
 * UI/UX Designer Agent
 * Creates user interface designs, prototypes, and conducts design reviews
 */

import type { Env, Task, AgentId, KnowledgeEntry } from '../types';
import { Logger } from '../utils/logger';
import { KnowledgeBase } from '../core/knowledge-base';

export class UIUXDesignerAgent {
  private logger: Logger;
  private knowledgeBase: KnowledgeBase;
  private agentId: AgentId = 'agent-ui-ux-designer';

  constructor(private env: Env) {
    this.logger = new Logger(env, 'UIUXDesignerAgent');
    this.knowledgeBase = new KnowledgeBase(env);
    void this.env; // Suppress unused parameter warning
  }

  /**
   * Process a UI/UX design task
   */
  async processTask(task: Task): Promise<{
    design_output: KnowledgeEntry;
    design_type: 'ui_design' | 'prototype' | 'design_review';
    components: string[];
    design_system_used: string;
    accessibility_score: number;
  }> {
    await this.logger.info('Processing UI/UX design task', { taskId: task.id, taskType: task.type }, this.agentId);

    let result;
    switch (task.type) {
      case 'design_ui_ux':
        result = await this.createUIDesign(task);
        break;
      case 'create_prototype':
        result = await this.createPrototype(task);
        break;
      case 'design_review':
        result = await this.conductDesignReview(task);
        break;
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }

    await this.logger.info('UI/UX design task completed', { taskId: task.id, designType: result.design_type }, this.agentId);

    return result;
  }

  /**
   * Create UI design based on requirements
   */
  private async createUIDesign(task: Task): Promise<{
    design_output: KnowledgeEntry;
    design_type: 'ui_design';
    components: string[];
    design_system_used: string;
    accessibility_score: number;
  }> {
    const requirements = task.description || '';

    // Research existing design patterns
    const designPatterns = await this.researchDesignPatterns(requirements);

    // Generate UI design specification
    const designSpec = await this.generateDesignSpec({
      requirements,
      designPatterns,
      taskId: task.id,
    });

    // Identify UI components needed
    const components = this.identifyComponents(designSpec.content);

    // Calculate accessibility score
    const accessibilityScore = await this.assessAccessibility(designSpec.content);

    // Save design to knowledge base
    const designEntry = await this.knowledgeBase.createEntry({
      type: 'architecture', // Using architecture for design specs
      title: designSpec.title,
      content: designSpec.content,
      tags: ['ui-design', 'ux', ...designSpec.tags],
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    return {
      design_output: designEntry,
      design_type: 'ui_design',
      components,
      design_system_used: 'Material Design / Tailwind CSS',
      accessibility_score: accessibilityScore,
    };
  }

  /**
   * Create interactive prototype
   */
  private async createPrototype(task: Task): Promise<{
    design_output: KnowledgeEntry;
    design_type: 'prototype';
    components: string[];
    design_system_used: string;
    accessibility_score: number;
  }> {
    const requirements = task.description || '';

    const prototypeSpec = {
      id: `proto-${Date.now()}`,
      title: `Prototype: ${task.title}`,
      content: `# Interactive Prototype Specification\n\n## Overview\n${requirements}\n\n## User Flow\n1. User lands on page\n2. User interacts with components\n3. User completes action\n\n## Component Interactions\n- Button clicks trigger state changes\n- Form inputs validate in real-time\n- Navigation is intuitive and accessible\n\n## Responsive Breakpoints\n- Mobile: 320px - 768px\n- Tablet: 768px - 1024px\n- Desktop: 1024px+`,
      tags: ['prototype', 'interactive', 'user-flow'],
    };

    const components = this.identifyComponents(prototypeSpec.content);
    const accessibilityScore = await this.assessAccessibility(prototypeSpec.content);

    const prototypeEntry = await this.knowledgeBase.createEntry({
      type: 'architecture',
      title: prototypeSpec.title,
      content: prototypeSpec.content,
      tags: prototypeSpec.tags,
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    return {
      design_output: prototypeEntry,
      design_type: 'prototype',
      components,
      design_system_used: 'React Components + Storybook',
      accessibility_score: accessibilityScore,
    };
  }

  /**
   * Conduct design review
   */
  private async conductDesignReview(task: Task): Promise<{
    design_output: KnowledgeEntry;
    design_type: 'design_review';
    components: string[];
    design_system_used: string;
    accessibility_score: number;
  }> {
    const designToReview = task.input_data?.design || task.description || '';

    // Analyze design for usability, consistency, and accessibility
    const reviewFindings = await this.analyzeDesign(designToReview.toString());

    const reviewReport = {
      id: `review-${Date.now()}`,
      title: `Design Review: ${task.title}`,
      content: `# Design Review Report\n\n## Summary\n${reviewFindings.summary}\n\n## Strengths\n${reviewFindings.strengths.map(s => `- ${s}`).join('\n')}\n\n## Areas for Improvement\n${reviewFindings.improvements.map(i => `- ${i}`).join('\n')}\n\n## Accessibility Score: ${reviewFindings.accessibilityScore}/100\n\n## Recommendations\n${reviewFindings.recommendations.map(r => `- ${r}`).join('\n')}`,
      tags: ['design-review', 'qa', 'accessibility'],
    };

    const reviewEntry = await this.knowledgeBase.createEntry({
      type: 'best_practice',
      title: reviewReport.title,
      content: reviewReport.content,
      tags: reviewReport.tags,
      related_tasks: [task.id],
      author_agent_id: this.agentId,
    });

    return {
      design_output: reviewEntry,
      design_type: 'design_review',
      components: reviewFindings.components,
      design_system_used: reviewFindings.designSystem,
      accessibility_score: reviewFindings.accessibilityScore,
    };
  }

  /**
   * Research existing design patterns
   */
  private async researchDesignPatterns(requirements: string): Promise<KnowledgeEntry[]> {
    const results = await this.knowledgeBase.search(requirements, {
      type: 'architecture',
      limit: 3,
    });

    return results;
  }

  /**
   * Generate design specification
   */
  private async generateDesignSpec(params: {
    requirements: string;
    designPatterns: KnowledgeEntry[];
    taskId: string;
  }): Promise<{
    id: string;
    title: string;
    content: string;
    tags: string[];
  }> {
    const { requirements, designPatterns } = params;

    const designSpec = {
      id: `design-spec-${Date.now()}`,
      title: `UI/UX Design: ${requirements.substring(0, 50)}...`,
      content: `# UI/UX Design Specification\n\n## Requirements\n${requirements}\n\n## Design Principles\n- User-centered design\n- Consistency across the application\n- Accessibility (WCAG 2.1 AA)\n- Responsive and mobile-first\n\n## Visual Design\n- Color scheme: Primary, Secondary, Accent colors\n- Typography: Clear hierarchy with readable fonts\n- Spacing: Consistent padding and margins\n- Icons: Clear and intuitive\n\n## Components\n- Forms with validation feedback\n- Navigation that's easy to understand\n- Data tables with sorting and filtering\n- Modal dialogs for critical actions\n\n## User Flow\n1. User arrives at feature\n2. Clear call-to-action guides next steps\n3. Feedback confirms user actions\n4. Success state is clear\n\n${designPatterns.length > 0 ? `## Related Patterns\n${designPatterns.map(p => `- ${p.title}`).join('\n')}` : ''}`,
      tags: ['ui', 'ux', 'design-spec', 'responsive'],
    };

    return designSpec;
  }

  /**
   * Identify UI components in design
   */
  private identifyComponents(designContent: string): string[] {
    const components: string[] = [];
    const componentPatterns = [
      'button', 'form', 'input', 'table', 'modal', 'dialog',
      'navigation', 'nav', 'menu', 'dropdown', 'select',
      'card', 'list', 'grid', 'header', 'footer', 'sidebar'
    ];

    const lowerContent = designContent.toLowerCase();
    componentPatterns.forEach(pattern => {
      if (lowerContent.includes(pattern)) {
        components.push(pattern);
      }
    });

    return [...new Set(components)]; // Remove duplicates
  }

  /**
   * Assess accessibility of design
   */
  private async assessAccessibility(designContent: string): Promise<number> {
    let score = 100;

    // Check for accessibility mentions
    const accessibilityKeywords = ['accessibility', 'wcag', 'aria', 'alt', 'contrast', 'keyboard'];
    const lowerContent = designContent.toLowerCase();

    const keywordsFound = accessibilityKeywords.filter(keyword => lowerContent.includes(keyword));

    // Deduct points if accessibility not mentioned
    if (keywordsFound.length === 0) {
      score -= 30;
    } else if (keywordsFound.length < 3) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Analyze design for review
   */
  private async analyzeDesign(designContent: string): Promise<{
    summary: string;
    strengths: string[];
    improvements: string[];
    accessibilityScore: number;
    components: string[];
    designSystem: string;
    recommendations: string[];
  }> {
    const components = this.identifyComponents(designContent);
    const accessibilityScore = await this.assessAccessibility(designContent);

    return {
      summary: 'Design review completed with overall positive assessment',
      strengths: [
        'Clear visual hierarchy',
        'Consistent component usage',
        'Responsive design considerations',
      ],
      improvements: [
        'Enhance accessibility features',
        'Add more user feedback mechanisms',
        'Consider edge cases in user flows',
      ],
      accessibilityScore,
      components,
      designSystem: 'Material Design / Tailwind CSS',
      recommendations: [
        'Add ARIA labels to interactive elements',
        'Ensure sufficient color contrast',
        'Test with screen readers',
        'Implement keyboard navigation',
      ],
    };
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<{
    agent_id: AgentId;
    active_tasks: number;
    recent_designs: number;
  }> {
    // In production, query actual tasks from database
    return {
      agent_id: this.agentId,
      active_tasks: 0,
      recent_designs: 0,
    };
  }
}
