/**
 * LLM Router
 * Intelligently selects the best LLM model for each task based on:
 * - Task complexity and context requirements
 * - Cost optimization (83% savings target: $66/month)
 * - Performance requirements (speed vs quality)
 * - Model capabilities (vision, function calling, context window)
 */

import type { Env, TaskMetadata, TaskType, LLMCapability, LLMRoutingDecision } from '../types';
import { Logger } from '../utils/logger';

export interface ModelSelectionResult {
  selected_model: string;
  selected_provider: 'openai' | 'gemini' | 'anthropic';
  selection_reason: string;
  estimated_cost: number;
  alternative_models: string[];
  routing_strategy: 'cost' | 'performance' | 'balanced';
}

export class LLMRouter {
  private logger: Logger;
  private llmCapabilities: Map<string, LLMCapability> = new Map();

  constructor(private env: Env) {
    this.logger = new Logger(env, 'LLMRouter');
  }

  /**
   * Select the best LLM model for a task based on metadata
   */
  async selectModelForTask(
    taskId: string,
    taskType: TaskType,
    metadata: TaskMetadata
  ): Promise<ModelSelectionResult> {
    await this.logger.info('Selecting LLM model for task', { taskId, taskType, metadata });

    // Load LLM capabilities from database
    await this.loadLLMCapabilities();

    // Determine routing strategy based on priority dimension
    const routingStrategy = this.determineRoutingStrategy(metadata);

    // Filter models based on requirements
    const capableModels = this.filterCapableModels(taskType, metadata);

    if (capableModels.length === 0) {
      throw new Error(`No capable LLM models found for task type: ${taskType}`);
    }

    // Score and rank models
    const rankedModels = this.rankModels(capableModels, metadata, routingStrategy);

    // Select best model
    const selectedModel = rankedModels[0];
    const alternativeModels = rankedModels.slice(1, 3).map((m) => m.model_name);

    // Estimate cost
    const estimatedCost = this.estimateCost(selectedModel, metadata.estimated_tokens || 1000);

    const result: ModelSelectionResult = {
      selected_model: selectedModel.model_name,
      selected_provider: selectedModel.provider,
      selection_reason: this.generateSelectionReason(selectedModel, metadata, routingStrategy),
      estimated_cost: estimatedCost,
      alternative_models: alternativeModels,
      routing_strategy: routingStrategy,
    };

    await this.logger.info('LLM model selected', {
      taskId,
      selectedModel: result.selected_model,
      estimatedCost: result.estimated_cost,
    });

    return result;
  }

  /**
   * Load LLM capabilities from database
   */
  private async loadLLMCapabilities(): Promise<void> {
    if (this.llmCapabilities.size > 0) {
      return; // Already loaded
    }

    const result = await this.env.DB.prepare('SELECT * FROM llm_capabilities').all();

    for (const row of result.results) {
      const capability = row as unknown as LLMCapability;
      this.llmCapabilities.set(capability.id, capability);
    }

    await this.logger.info(`Loaded ${this.llmCapabilities.size} LLM capabilities`);
  }

  /**
   * Determine routing strategy based on task metadata
   */
  private determineRoutingStrategy(
    metadata: TaskMetadata
  ): 'cost' | 'performance' | 'balanced' {
    switch (metadata.priority_dimension) {
      case 'cost':
        return 'cost';
      case 'speed':
      case 'quality':
        return 'performance';
      case 'balanced':
      default:
        return 'balanced';
    }
  }

  /**
   * Filter models that are capable of handling the task
   */
  private filterCapableModels(
    taskType: TaskType,
    metadata: TaskMetadata
  ): LLMCapability[] {
    const capableModels: LLMCapability[] = [];

    for (const capability of this.llmCapabilities.values()) {
      // Check if model supports task type
      const supportsTaskType = capability.suitable_for?.includes(taskType) ?? true;

      // Check context window requirement
      const hasEnoughContext = capability.context_window_kb >= metadata.required_context_kb;

      // Check vision requirement
      const supportsVision = metadata.requires_vision
        ? capability.supports_vision === true
        : true;

      // Check function calling requirement
      const supportsFunctionCalling = metadata.requires_function_calling
        ? capability.supports_function_calling === true
        : true;

      if (supportsTaskType && hasEnoughContext && supportsVision && supportsFunctionCalling) {
        capableModels.push(capability);
      }
    }

    return capableModels;
  }

  /**
   * Rank models based on routing strategy
   */
  private rankModels(
    models: LLMCapability[],
    metadata: TaskMetadata,
    strategy: 'cost' | 'performance' | 'balanced'
  ): LLMCapability[] {
    return models.sort((a, b) => {
      const scoreA = this.calculateModelScore(a, metadata, strategy);
      const scoreB = this.calculateModelScore(b, metadata, strategy);
      return scoreB - scoreA; // Higher score is better
    });
  }

  /**
   * Calculate model score based on strategy
   */
  private calculateModelScore(
    model: LLMCapability,
    metadata: TaskMetadata,
    strategy: 'cost' | 'performance' | 'balanced'
  ): number {
    let score = 0;

    // Base score from model strengths
    const strengthMatch = model.strengths.some((strength) =>
      this.matchesTaskRequirement(strength, metadata)
    );
    if (strengthMatch) score += 20;

    // Cost factor (lower cost = higher score for cost strategy)
    const avgCostPer1kTokens =
      (model.cost_per_1k_input_tokens + model.cost_per_1k_output_tokens) / 2;
    const costScore = 1 / (avgCostPer1kTokens + 0.0001); // Avoid division by zero

    // Speed factor (higher TPS = higher score for performance)
    const speedScore = model.avg_speed_tps;

    // Context factor (more context = better for complex tasks)
    const contextScore =
      metadata.complexity === 'complex'
        ? model.context_window_kb / 100
        : model.context_window_kb / 200;

    // Apply strategy weights
    switch (strategy) {
      case 'cost':
        score += costScore * 100; // Heavily weight cost
        score += speedScore * 0.5;
        score += contextScore * 0.5;
        break;

      case 'performance':
        score += speedScore * 50; // Heavily weight speed
        score += contextScore * 10;
        score += costScore * 0.1; // Minimal cost consideration
        break;

      case 'balanced':
      default:
        score += costScore * 30; // Balanced weights
        score += speedScore * 20;
        score += contextScore * 10;
        break;
    }

    // Bonus for free models in cost strategy
    if (strategy === 'cost' && avgCostPer1kTokens === 0) {
      score += 1000; // Huge bonus for free models
    }

    return score;
  }

  /**
   * Check if model strength matches task requirement
   */
  private matchesTaskRequirement(strength: string, metadata: TaskMetadata): boolean {
    const lowerStrength = strength.toLowerCase();

    // Match complexity
    if (metadata.complexity === 'complex' && lowerStrength.includes('complex')) return true;
    if (metadata.complexity === 'simple' && lowerStrength.includes('simple')) return true;

    // Match speed requirement
    if (metadata.priority_dimension === 'speed' && lowerStrength.includes('fast')) return true;

    // Match quality requirement
    if (
      metadata.priority_dimension === 'quality' &&
      (lowerStrength.includes('quality') || lowerStrength.includes('reasoning'))
    )
      return true;

    return false;
  }

  /**
   * Estimate cost for selected model
   */
  private estimateCost(model: LLMCapability, estimatedTokens: number): number {
    const inputTokens = estimatedTokens * 0.6; // Assume 60% input
    const outputTokens = estimatedTokens * 0.4; // Assume 40% output

    const inputCost = (inputTokens / 1000) * model.cost_per_1k_input_tokens;
    const outputCost = (outputTokens / 1000) * model.cost_per_1k_output_tokens;

    return parseFloat((inputCost + outputCost).toFixed(6));
  }

  /**
   * Generate human-readable selection reason
   */
  private generateSelectionReason(
    model: LLMCapability,
    metadata: TaskMetadata,
    strategy: string
  ): string {
    const reasons: string[] = [];

    // Strategy reason
    reasons.push(`Selected via ${strategy} strategy`);

    // Cost reason
    const avgCost = (model.cost_per_1k_input_tokens + model.cost_per_1k_output_tokens) / 2;
    if (avgCost === 0) {
      reasons.push('free tier model (max cost savings)');
    } else if (avgCost < 0.001) {
      reasons.push('low-cost model');
    }

    // Complexity reason
    if (metadata.complexity === 'complex') {
      reasons.push(`handles complex tasks with ${model.context_window_kb}KB context`);
    }

    // Speed reason
    if (metadata.priority_dimension === 'speed') {
      reasons.push(`fast performance (${model.avg_speed_tps} tokens/sec)`);
    }

    // Capability reasons
    if (metadata.requires_vision && model.supports_vision) {
      reasons.push('supports vision capabilities');
    }

    if (metadata.requires_function_calling && model.supports_function_calling) {
      reasons.push('supports function calling');
    }

    return reasons.join(', ');
  }

  /**
   * Log routing decision to database
   */
  async logRoutingDecision(
    taskId: string,
    taskType: TaskType,
    metadata: TaskMetadata,
    selection: ModelSelectionResult
  ): Promise<string> {
    const decisionId = `llm-routing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const now = Date.now();

    const decision: LLMRoutingDecision = {
      id: decisionId,
      task_id: taskId,
      task_type: taskType,
      task_metadata: metadata,
      selected_model: selection.selected_model,
      selected_provider: selection.selected_provider,
      selection_reason: selection.selection_reason,
      alternative_models: selection.alternative_models,
      estimated_cost: selection.estimated_cost,
      routing_strategy: selection.routing_strategy,
      decided_at: now,
      created_at: now,
    };

    await this.env.DB.prepare(
      `INSERT INTO llm_routing_decisions (
        id, task_id, task_type, task_metadata, selected_model, selected_provider,
        selection_reason, alternative_models, estimated_cost, routing_strategy, decided_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        decision.id,
        decision.task_id,
        decision.task_type,
        JSON.stringify(decision.task_metadata),
        decision.selected_model,
        decision.selected_provider,
        decision.selection_reason,
        JSON.stringify(decision.alternative_models || []),
        decision.estimated_cost,
        decision.routing_strategy,
        decision.decided_at
      )
      .run();

    await this.logger.info('Routing decision logged', { decisionId, taskId });

    return decisionId;
  }

  /**
   * Get routing statistics
   */
  async getRoutingStatistics(timeRangeMs: number = 86400000): Promise<{
    total_decisions: number;
    models_used: Record<string, number>;
    avg_cost_per_task: number;
    total_estimated_cost: number;
    strategy_distribution: Record<string, number>;
  }> {
    const cutoffTime = Date.now() - timeRangeMs;

    const result = await this.env.DB.prepare(
      'SELECT * FROM llm_routing_decisions WHERE decided_at >= ?'
    )
      .bind(cutoffTime)
      .all();

    const decisions = result.results as unknown as LLMRoutingDecision[];

    const stats = {
      total_decisions: decisions.length,
      models_used: {} as Record<string, number>,
      avg_cost_per_task: 0,
      total_estimated_cost: 0,
      strategy_distribution: {} as Record<string, number>,
    };

    for (const decision of decisions) {
      // Count models used
      stats.models_used[decision.selected_model] =
        (stats.models_used[decision.selected_model] || 0) + 1;

      // Sum costs
      stats.total_estimated_cost += decision.estimated_cost;

      // Count strategies
      stats.strategy_distribution[decision.routing_strategy] =
        (stats.strategy_distribution[decision.routing_strategy] || 0) + 1;
    }

    stats.avg_cost_per_task =
      decisions.length > 0 ? stats.total_estimated_cost / decisions.length : 0;

    return stats;
  }
}
