/**
 * Real-World Scenarios Simulation Tests
 * 模擬真實世界使用場景的端到端測試
 *
 * 場景:
 * 1. 高峰時段: 100 個用戶同時請求 PRD 生成
 * 2. 混合負載: design + security + cost 任務混合高負載
 * 3. 長時間運行: 24 小時運行模擬（加速執行）
 * 4. 成本優化實戰: 月度 $66 預算驗證
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator } from '../../core/agent-orchestrator';
import { LLMRouter } from '../../core/llm-router';
import { UIUXDesignerAgent } from '../../agents/ui-ux-designer';
import { FinOpsGuardianAgent } from '../../agents/finops-guardian';
import { SecurityGuardianAgent } from '../../agents/security-guardian';
import type { Env, Task, Workflow } from '../../types';

// Comprehensive mock environment
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
      id: 'llm-claude-3-5-haiku',
      model_name: 'claude-3-5-haiku-20241022',
      provider: 'anthropic',
      context_window_kb: 200,
      cost_per_1k_input_tokens: 0.001,
      cost_per_1k_output_tokens: 0.005,
      avg_speed_tps: 100,
      strengths: JSON.stringify(['Fast', 'Cost-effective', 'Good quality']),
      suitable_for: JSON.stringify(['write_prd', 'write_tests', 'develop_api', 'implement_feature']),
      max_tokens: 8192,
      supports_vision: false,
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
      avg_speed_tps: 60,
      strengths: JSON.stringify(['High quality', 'Multimodal', 'Complex tasks']),
      suitable_for: JSON.stringify(['design_architecture', 'security_review', 'implement_feature']),
      max_tokens: 16384,
      supports_vision: true,
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
    OPENAI_API_KEY: 'test-key',
    GEMINI_API_KEY: 'test-key',
    ANTHROPIC_API_KEY: 'test-key',
  } as Env;
};

// Mock KnowledgeBase
vi.mock('../../core/knowledge-base', () => ({
  KnowledgeBase: vi.fn().mockImplementation(() => ({
    createEntry: vi.fn().mockImplementation((params: any) =>
      Promise.resolve({
        id: `kb-${Date.now()}`,
        type: params.type,
        title: params.title,
        content: params.content,
        tags: params.tags || [],
        related_tasks: params.related_tasks || [],
        author_agent_id: params.author_agent_id,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
    ),
    search: vi.fn().mockResolvedValue([]),
  })),
}));

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'design_ui_ux',
  description: 'Test task',
  status: 'pending',
  priority: 'medium',
  created_at: Date.now(),
  updated_at: Date.now(),
  ...overrides,
});

describe('Scenario 1: 高峰時段 - 100 用戶同時請求', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  it('should handle 100 concurrent PRD generation requests', async () => {
    const orchestrator = new AgentOrchestrator(mockEnv);
    const llmRouter = new LLMRouter(mockEnv);

    const requests = Array.from({ length: 100 }, (_, i) => ({
      userId: `user-${i}`,
      taskId: `task-${i}`,
      metadata: {
        complexity: 'medium' as const,
        required_context_kb: 20,
        priority_dimension: 'balanced' as const,
        estimated_tokens: 3000,
      },
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      requests.map(async (req) => {
        const taskMetadata = await orchestrator.annotateTaskMetadata(
          createTask({
            id: req.taskId,
            type: 'write_prd',
            description: `PRD for user ${req.userId}`,
          })
        );

        const routingResult = await llmRouter.selectModelForTask(
          req.taskId,
          'write_prd',
          taskMetadata
        );

        return {
          userId: req.userId,
          taskId: req.taskId,
          selectedModel: routingResult.selected_model,
          cost: routingResult.estimated_cost,
          duration: Date.now() - startTime,
        };
      })
    );
    const totalDuration = Date.now() - startTime;

    const successRate = (results.length / 100) * 100;
    const avgCost = results.reduce((sum, r) => sum + r.cost, 0) / results.length;
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);

    console.log('🎯 Scenario 1 Results - 100 Concurrent Users:');
    console.log('   Total duration:', totalDuration, 'ms');
    console.log('   Success rate:', successRate.toFixed(1), '%');
    console.log('   Avg cost per user:', avgCost.toFixed(6));
    console.log('   Total cost:', totalCost.toFixed(4));
    console.log('   Throughput:', (100 / (totalDuration / 1000)).toFixed(2), 'req/sec');

    expect(results).toHaveLength(100);
    expect(successRate).toBe(100);
    expect(totalDuration).toBeLessThan(30000); // < 30 seconds for 100 users
  }, 60000);
});

describe('Scenario 2: 混合負載 - 多類型任務高並發', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  it('should handle mixed workload: 30 UI + 30 Security + 40 FinOps tasks', async () => {
    const uiAgent = new UIUXDesignerAgent(mockEnv);
    const secAgent = new SecurityGuardianAgent(mockEnv);
    const finAgent = new FinOpsGuardianAgent(mockEnv);

    const uiTasks = Array.from({ length: 30 }, (_, i) =>
      createTask({
        type: 'design_ui_ux',
        description: `Design task ${i}`,
      })
    );

    const secTasks = Array.from({ length: 30 }, (_, i) =>
      createTask({
        type: 'security_review',
        description: `Security review ${i}`,
        input_data: { architecture: 'API with JWT' },
      })
    );

    const finTasks = Array.from({ length: 40 }, (_, i) =>
      createTask({
        type: 'estimate_cost',
        description: `Cost estimation ${i}`,
      })
    );

    const startTime = Date.now();

    const [uiResults, secResults, finResults] = await Promise.all([
      Promise.all(uiTasks.map((t) => uiAgent.processTask(t))),
      Promise.all(secTasks.map((t) => secAgent.processTask(t))),
      Promise.all(finTasks.map((t) => finAgent.processTask(t))),
    ]);

    const totalDuration = Date.now() - startTime;

    console.log('🎯 Scenario 2 Results - Mixed Workload:');
    console.log('   Total tasks:', 100);
    console.log('   UI tasks:', uiResults.length);
    console.log('   Security tasks:', secResults.length);
    console.log('   FinOps tasks:', finResults.length);
    console.log('   Total duration:', totalDuration, 'ms');
    console.log('   Avg per task:', (totalDuration / 100).toFixed(2), 'ms');

    expect(uiResults).toHaveLength(30);
    expect(secResults).toHaveLength(30);
    expect(finResults).toHaveLength(40);
    expect(totalDuration).toBeLessThan(60000); // < 60 seconds
  }, 90000);
});

describe('Scenario 3: 長時間運行 - 24小時模擬', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  it('should simulate 24-hour operation (1440 tasks, 1 per minute)', async () => {
    const orchestrator = new AgentOrchestrator(mockEnv);
    const llmRouter = new LLMRouter(mockEnv);

    // Simulate 1440 tasks (24 hours * 60 minutes)
    const tasksPerHour = 60;
    const totalTasks = 24 * tasksPerHour;
    const tasks: Task[] = [];

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < tasksPerHour; minute++) {
        tasks.push(
          createTask({
            type: minute % 6 === 0 ? 'design_ui_ux' : minute % 6 === 1 ? 'security_review' : minute % 6 === 2 ? 'estimate_cost' : minute % 6 === 3 ? 'write_prd' : minute % 6 === 4 ? 'implement_feature' : 'write_tests',
            description: `Task at ${hour}:${minute.toString().padStart(2, '0')}`,
          })
        );
      }
    }

    const startTime = Date.now();
    let totalCost = 0;
    const results: Array<{ hour: number; cost: number }> = [];

    // Process in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (task, idx) => {
          const taskMetadata = await orchestrator.annotateTaskMetadata(task);
          const routingResult = await llmRouter.selectModelForTask(
            task.id,
            task.type,
            taskMetadata
          );

          totalCost += routingResult.estimated_cost;
          const hour = Math.floor((i + idx) / tasksPerHour);
          results.push({ hour, cost: routingResult.estimated_cost });
        })
      );
    }

    const duration = Date.now() - startTime;
    const hourlyAvg = totalCost / 24;

    console.log('🎯 Scenario 3 Results - 24-Hour Simulation:');
    console.log('   Total tasks processed:', totalTasks);
    console.log('   Total duration:', duration, 'ms');
    console.log('   Total cost:', totalCost.toFixed(4));
    console.log('   Hourly avg cost:', hourlyAvg.toFixed(6));
    console.log('   Monthly projection (30 days):', (totalCost * 30).toFixed(2));

    expect(results).toHaveLength(totalTasks);
    expect(totalCost * 30).toBeLessThan(66); // Monthly cost < $66 target
  }, 300000); // 5 minutes timeout
});

describe('Scenario 4: 成本優化實戰 - 月度預算驗證', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  it('should stay within $66/month budget for typical workload', async () => {
    const llmRouter = new LLMRouter(mockEnv);
    const orchestrator = new AgentOrchestrator(mockEnv);

    // Typical daily workload: 200 tasks
    const dailyTasks = 200;
    const monthlyTasks = dailyTasks * 30;

    // Task distribution based on typical usage
    const taskDistribution = [
      { type: 'write_prd', count: Math.floor(monthlyTasks * 0.15) },
      { type: 'design_architecture', count: Math.floor(monthlyTasks * 0.1) },
      { type: 'design_ui_ux', count: Math.floor(monthlyTasks * 0.2) },
      { type: 'implement_feature', count: Math.floor(monthlyTasks * 0.25) },
      { type: 'security_review', count: Math.floor(monthlyTasks * 0.1) },
      { type: 'estimate_cost', count: Math.floor(monthlyTasks * 0.1) },
      { type: 'write_tests', count: Math.floor(monthlyTasks * 0.1) },
    ];

    let totalCost = 0;
    const costByStrategy: Record<string, number> = {
      cost: 0,
      performance: 0,
      balanced: 0,
    };

    for (const { type, count } of taskDistribution) {
      for (let i = 0; i < count; i++) {
        const task = createTask({
          type: type as any,
          description: `${type} task ${i}`,
        });

        const metadata = await orchestrator.annotateTaskMetadata(task);
        const result = await llmRouter.selectModelForTask(task.id, task.type, metadata);

        totalCost += result.estimated_cost;
        costByStrategy[result.routing_strategy] += result.estimated_cost;
      }
    }

    const monthlyCost = totalCost;
    const savingsVsBaseline = ((80 - monthlyCost) / 80) * 100; // Baseline: $80

    console.log('🎯 Scenario 4 Results - Monthly Budget Verification:');
    console.log('   Total monthly tasks:', monthlyTasks);
    console.log('   Total monthly cost:', monthlyCost.toFixed(2));
    console.log('   Budget limit:', '$66');
    console.log('   Budget remaining:', (66 - monthlyCost).toFixed(2));
    console.log('   Savings vs baseline ($80):', savingsVsBaseline.toFixed(1), '%');
    console.log('   Cost by strategy:', {
      cost: costByStrategy.cost.toFixed(4),
      performance: costByStrategy.performance.toFixed(4),
      balanced: costByStrategy.balanced.toFixed(4),
    });

    expect(monthlyCost).toBeLessThan(66); // Within budget!
    expect(savingsVsBaseline).toBeGreaterThan(80); // > 80% savings
  }, 300000); // 5 minutes timeout
});
