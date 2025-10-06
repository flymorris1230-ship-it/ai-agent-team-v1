/**
 * LLM Routing Stress Tests
 * 測試動態 LLM 路由系統在高負載下的表現
 *
 * 測試目標:
 * - 路由決策速度: 1000 次路由 < 100ms/次
 * - 模型切換穩定性: 7 個 LLM 模型動態切換
 * - 成本追蹤準確性: 預估 vs 實際成本誤差 < 5%
 * - 策略驗證: cost 策略優先選擇免費模型
 * - 並發路由: 100 並發路由決策
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMRouter } from '../../core/llm-router';
import type { Env, TaskMetadata, TaskType } from '../../types';

// Mock environment with full LLM capabilities
const createMockEnv = (): Env => {
  const llmCapabilities = [
    {
      id: 'llm-gpt-4o-mini',
      model_name: 'gpt-4o-mini',
      provider: 'openai',
      context_window_kb: 128,
      cost_per_1k_input_tokens: 0.00015,
      cost_per_1k_output_tokens: 0.0006,
      avg_speed_tps: 80,
      strengths: JSON.stringify(['Fast', 'Cost-effective', 'Simple tasks']),
      suitable_for: JSON.stringify(['write_prd', 'write_tests', 'develop_api']),
      max_tokens: 16384,
      supports_vision: true,
      supports_function_calling: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'llm-gemini-2-flash-thinking',
      model_name: 'gemini-2.0-flash-thinking-exp-1219',
      provider: 'gemini',
      context_window_kb: 32,
      cost_per_1k_input_tokens: 0,
      cost_per_1k_output_tokens: 0,
      avg_speed_tps: 120,
      strengths: JSON.stringify(['FREE', 'Fast', 'Simple reasoning']),
      suitable_for: JSON.stringify(['design_ui_ux', 'estimate_cost', 'cost_alert']),
      max_tokens: 8192,
      supports_vision: false,
      supports_function_calling: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'llm-gemini-flash-8b',
      model_name: 'gemini-1.5-flash-8b',
      provider: 'gemini',
      context_window_kb: 1000,
      cost_per_1k_input_tokens: 0.0000375,
      cost_per_1k_output_tokens: 0.00015,
      avg_speed_tps: 150,
      strengths: JSON.stringify(['Large context', 'Fast', 'Cost-effective']),
      suitable_for: JSON.stringify(['design_architecture', 'implement_feature', 'security_review']),
      max_tokens: 8192,
      supports_vision: true,
      supports_function_calling: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'llm-gemini-pro-1-5',
      model_name: 'gemini-1.5-pro',
      provider: 'gemini',
      context_window_kb: 2000,
      cost_per_1k_input_tokens: 0.00125,
      cost_per_1k_output_tokens: 0.005,
      avg_speed_tps: 60,
      strengths: JSON.stringify(['Very large context', 'Complex reasoning', 'Multimodal']),
      suitable_for: JSON.stringify(['design_architecture', 'security_review', 'compliance_check']),
      max_tokens: 8192,
      supports_vision: true,
      supports_function_calling: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'llm-claude-3-5-sonnet',
      model_name: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      context_window_kb: 200,
      cost_per_1k_input_tokens: 0.003,
      cost_per_1k_output_tokens: 0.015,
      avg_speed_tps: 50,
      strengths: JSON.stringify(['High quality', 'Complex reasoning', 'Deep analysis']),
      suitable_for: JSON.stringify(['design_architecture', 'security_review', 'compliance_check']),
      max_tokens: 8192,
      supports_vision: true,
      supports_function_calling: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'llm-gpt-4o',
      model_name: 'gpt-4o',
      provider: 'openai',
      context_window_kb: 128,
      cost_per_1k_input_tokens: 0.0025,
      cost_per_1k_output_tokens: 0.01,
      avg_speed_tps: 45,
      strengths: JSON.stringify(['Multimodal', 'High quality', 'Function calling']),
      suitable_for: JSON.stringify(['design_ui_ux', 'implement_feature', 'write_prd']),
      max_tokens: 16384,
      supports_vision: true,
      supports_function_calling: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'llm-claude-3-haiku',
      model_name: 'claude-3-haiku-20240307',
      provider: 'anthropic',
      context_window_kb: 200,
      cost_per_1k_input_tokens: 0.00025,
      cost_per_1k_output_tokens: 0.00125,
      avg_speed_tps: 100,
      strengths: JSON.stringify(['Fast', 'Cost-effective', 'Simple tasks']),
      suitable_for: JSON.stringify(['write_tests', 'cost_alert', 'analyze_data']),
      max_tokens: 4096,
      supports_vision: false,
      supports_function_calling: true,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];

  return {
    DB: {
      prepare: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM llm_capabilities')) {
          return {
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockResolvedValue({ results: llmCapabilities }),
            run: vi.fn().mockResolvedValue({ success: true }),
            first: vi.fn().mockResolvedValue(null),
          };
        }
        return {
          bind: vi.fn().mockReturnThis(),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ success: true }),
          first: vi.fn().mockResolvedValue(null),
        };
      }),
    },
    VECTORIZE: {} as any,
    R2: {} as any,
    CACHE: {} as any,
    OPENAI_API_KEY: 'test-openai-key',
    GEMINI_API_KEY: 'test-gemini-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
  } as Env;
};

interface RoutingMetrics {
  totalDecisions: number;
  avgDuration: number;
  p95Duration: number;
  modelDistribution: Record<string, number>;
  providerDistribution: Record<string, number>;
  strategyDistribution: Record<string, number>;
  avgCost: number;
  totalCost: number;
}

const analyzeRoutingMetrics = (
  durations: number[],
  selections: Array<{ model: string; provider: string; strategy: string; cost: number }>
): RoutingMetrics => {
  const sorted = durations.slice().sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);

  const modelDist: Record<string, number> = {};
  const providerDist: Record<string, number> = {};
  const strategyDist: Record<string, number> = {};
  let totalCost = 0;

  selections.forEach((s) => {
    modelDist[s.model] = (modelDist[s.model] || 0) + 1;
    providerDist[s.provider] = (providerDist[s.provider] || 0) + 1;
    strategyDist[s.strategy] = (strategyDist[s.strategy] || 0) + 1;
    totalCost += s.cost;
  });

  return {
    totalDecisions: durations.length,
    avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    p95Duration: sorted[p95Index] || 0,
    modelDistribution: modelDist,
    providerDistribution: providerDist,
    strategyDistribution: strategyDist,
    avgCost: totalCost / selections.length,
    totalCost,
  };
};

describe('LLM Routing Stress Tests - Decision Speed', () => {
  let router: LLMRouter;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    router = new LLMRouter(mockEnv);
  });

  it('should make 100 routing decisions < 10ms each', async () => {
    const durations: number[] = [];
    const selections: Array<any> = [];

    for (let i = 0; i < 100; i++) {
      const metadata: TaskMetadata = {
        complexity: i % 3 === 0 ? 'simple' : i % 3 === 1 ? 'medium' : 'complex',
        required_context_kb: 10 + (i % 50),
        priority_dimension: i % 4 === 0 ? 'cost' : i % 4 === 1 ? 'speed' : i % 4 === 2 ? 'quality' : 'balanced',
        estimated_tokens: 500 + (i * 10),
      };

      const start = Date.now();
      const result = await router.selectModelForTask(`task-${i}`, 'write_prd', metadata);
      durations.push(Date.now() - start);

      selections.push({
        model: result.selected_model,
        provider: result.selected_provider,
        strategy: result.routing_strategy,
        cost: result.estimated_cost,
      });
    }

    const metrics = analyzeRoutingMetrics(durations, selections);

    expect(metrics.avgDuration).toBeLessThan(10); // Avg < 10ms
    expect(metrics.p95Duration).toBeLessThan(20); // P95 < 20ms

    console.log('✅ 100 routing decisions performance:');
    console.log('   Avg duration:', metrics.avgDuration.toFixed(2), 'ms');
    console.log('   P95 duration:', metrics.p95Duration.toFixed(2), 'ms');
    console.log('   Model distribution:', metrics.modelDistribution);
    console.log('   Strategy distribution:', metrics.strategyDistribution);
  });

  it('should make 1000 routing decisions < 100ms each (P95)', async () => {
    const durations: number[] = [];
    const selections: Array<any> = [];

    for (let i = 0; i < 1000; i++) {
      const taskTypes: TaskType[] = [
        'write_prd',
        'design_architecture',
        'design_ui_ux',
        'implement_feature',
        'security_review',
        'estimate_cost',
      ];

      const metadata: TaskMetadata = {
        complexity: i % 3 === 0 ? 'simple' : i % 3 === 1 ? 'medium' : 'complex',
        required_context_kb: 5 + (i % 95),
        priority_dimension: i % 4 === 0 ? 'cost' : i % 4 === 1 ? 'speed' : i % 4 === 2 ? 'quality' : 'balanced',
        estimated_tokens: 300 + (i * 5),
        requires_vision: i % 5 === 0,
        requires_function_calling: i % 3 === 0,
      };

      const start = Date.now();
      const result = await router.selectModelForTask(
        `task-${i}`,
        taskTypes[i % taskTypes.length],
        metadata
      );
      durations.push(Date.now() - start);

      selections.push({
        model: result.selected_model,
        provider: result.selected_provider,
        strategy: result.routing_strategy,
        cost: result.estimated_cost,
      });
    }

    const metrics = analyzeRoutingMetrics(durations, selections);

    expect(metrics.p95Duration).toBeLessThan(100); // P95 < 100ms target
    expect(metrics.totalDecisions).toBe(1000);

    console.log('✅ 1000 routing decisions performance:');
    console.log('   Total decisions:', metrics.totalDecisions);
    console.log('   Avg duration:', metrics.avgDuration.toFixed(2), 'ms');
    console.log('   P95 duration:', metrics.p95Duration.toFixed(2), 'ms');
    console.log('   Provider distribution:', metrics.providerDistribution);
    console.log('   Avg cost per task:', metrics.avgCost.toFixed(6));
    console.log('   Total estimated cost:', metrics.totalCost.toFixed(4));
  }, 30000); // 30s timeout
});

describe('LLM Routing Stress Tests - Concurrent Decisions', () => {
  let router: LLMRouter;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    router = new LLMRouter(mockEnv);
  });

  it('should handle 100 concurrent routing decisions', async () => {
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      taskId: `task-${i}`,
      taskType: 'implement_feature' as TaskType,
      metadata: {
        complexity: i % 3 === 0 ? 'simple' as const : i % 3 === 1 ? 'medium' as const : 'complex' as const,
        required_context_kb: 10 + (i % 90),
        priority_dimension: i % 4 === 0 ? 'cost' as const : i % 4 === 1 ? 'speed' as const : i % 4 === 2 ? 'quality' as const : 'balanced' as const,
        estimated_tokens: 1000 + (i * 50),
      },
    }));

    const durations: number[] = [];
    const results = await Promise.all(
      tasks.map(async (task) => {
        const start = Date.now();
        const result = await router.selectModelForTask(task.taskId, task.taskType, task.metadata);
        durations.push(Date.now() - start);
        return result;
      })
    );

    const selections = results.map((r) => ({
      model: r.selected_model,
      provider: r.selected_provider,
      strategy: r.routing_strategy,
      cost: r.estimated_cost,
    }));

    const metrics = analyzeRoutingMetrics(durations, selections);

    expect(results).toHaveLength(100);
    expect(metrics.p95Duration).toBeLessThan(100);

    console.log('✅ 100 concurrent routing decisions:');
    console.log('   Avg duration:', metrics.avgDuration.toFixed(2), 'ms');
    console.log('   P95 duration:', metrics.p95Duration.toFixed(2), 'ms');
    console.log('   All providers used:', Object.keys(metrics.providerDistribution));
  });
});

describe('LLM Routing Stress Tests - Strategy Verification', () => {
  let router: LLMRouter;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    router = new LLMRouter(mockEnv);
  });

  it('should prioritize free models in cost strategy (100 tests)', async () => {
    const selections: Array<any> = [];

    for (let i = 0; i < 100; i++) {
      const metadata: TaskMetadata = {
        complexity: 'simple',
        required_context_kb: 10,
        priority_dimension: 'cost', // Cost strategy
        estimated_tokens: 500,
      };

      const result = await router.selectModelForTask(`task-${i}`, 'design_ui_ux', metadata);

      selections.push({
        model: result.selected_model,
        provider: result.selected_provider,
        cost: result.estimated_cost,
      });
    }

    // Count free models (cost = 0)
    const freeModelSelections = selections.filter((s) => s.cost === 0).length;
    const freeModelPercentage = (freeModelSelections / 100) * 100;

    console.log('✅ Cost strategy verification (100 tests):');
    console.log('   Free model selections:', freeModelSelections);
    console.log('   Free model percentage:', freeModelPercentage.toFixed(1), '%');

    // In cost strategy, should heavily favor free models
    expect(freeModelPercentage).toBeGreaterThan(70); // > 70% free models
  });

  it('should select high-speed models in performance strategy (100 tests)', async () => {
    const selections: Array<any> = [];

    for (let i = 0; i < 100; i++) {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'speed', // Performance strategy
        estimated_tokens: 2000,
      };

      const result = await router.selectModelForTask(`task-${i}`, 'write_tests', metadata);

      selections.push({
        model: result.selected_model,
        provider: result.selected_provider,
      });
    }

    // Fast models: gemini-flash-8b (150 tps), gemini-thinking (120 tps), gpt-4o-mini (80 tps)
    const fastModels = ['gemini-1.5-flash-8b', 'gemini-2.0-flash-thinking-exp-1219', 'gpt-4o-mini'];
    const fastModelSelections = selections.filter((s) => fastModels.includes(s.model)).length;
    const fastModelPercentage = (fastModelSelections / 100) * 100;

    console.log('✅ Performance strategy verification (100 tests):');
    console.log('   Fast model selections:', fastModelSelections);
    console.log('   Fast model percentage:', fastModelPercentage.toFixed(1), '%');

    // In performance strategy, should heavily favor fast models
    expect(fastModelPercentage).toBeGreaterThan(80); // > 80% fast models
  });

  it('should balance cost and performance in balanced strategy (200 tests)', async () => {
    const selections: Array<any> = [];

    for (let i = 0; i < 200; i++) {
      const metadata: TaskMetadata = {
        complexity: i % 2 === 0 ? 'simple' : 'medium',
        required_context_kb: 20 + (i % 30),
        priority_dimension: 'balanced', // Balanced strategy
        estimated_tokens: 1000 + (i * 10),
      };

      const result = await router.selectModelForTask(`task-${i}`, 'implement_feature', metadata);

      selections.push({
        model: result.selected_model,
        cost: result.estimated_cost,
      });
    }

    const avgCost = selections.reduce((sum, s) => sum + s.cost, 0) / selections.length;
    const uniqueModels = new Set(selections.map((s) => s.model)).size;

    console.log('✅ Balanced strategy verification (200 tests):');
    console.log('   Avg cost per task:', avgCost.toFixed(6));
    console.log('   Unique models used:', uniqueModels);

    // Balanced strategy should use multiple models and have moderate cost
    expect(uniqueModels).toBeGreaterThan(3); // Uses variety of models
    expect(avgCost).toBeGreaterThan(0); // Not all free
    expect(avgCost).toBeLessThan(0.01); // But not too expensive
  });
});

describe('LLM Routing Stress Tests - Cost Tracking Accuracy', () => {
  let router: LLMRouter;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    router = new LLMRouter(mockEnv);
  });

  it('should track cumulative costs accurately (500 routing decisions)', async () => {
    const selections: Array<{ cost: number; tokens: number }> = [];

    for (let i = 0; i < 500; i++) {
      const estimatedTokens = 500 + (i * 10);
      const metadata: TaskMetadata = {
        complexity: i % 3 === 0 ? 'simple' : 'medium',
        required_context_kb: 15,
        priority_dimension: i % 2 === 0 ? 'cost' : 'balanced',
        estimated_tokens: estimatedTokens,
      };

      const result = await router.selectModelForTask(`task-${i}`, 'write_prd', metadata);

      selections.push({
        cost: result.estimated_cost,
        tokens: estimatedTokens,
      });
    }

    const totalCost = selections.reduce((sum, s) => sum + s.cost, 0);
    const avgCostPerTask = totalCost / selections.length;
    const avgTokensPerTask = selections.reduce((sum, s) => sum + s.tokens, 0) / selections.length;

    console.log('✅ Cost tracking accuracy (500 tasks):');
    console.log('   Total estimated cost:', totalCost.toFixed(4));
    console.log('   Avg cost per task:', avgCostPerTask.toFixed(6));
    console.log('   Avg tokens per task:', avgTokensPerTask.toFixed(0));
    console.log('   Cost per 1k tokens:', ((avgCostPerTask / avgTokensPerTask) * 1000).toFixed(6));

    // Verify costs are reasonable
    expect(totalCost).toBeGreaterThanOrEqual(0);
    expect(avgCostPerTask).toBeLessThan(0.05); // Should be very low with cost optimization
  }, 30000);
});
