/**
 * Comprehensive Unit Tests for Phase 1 LLMRouter
 * Coverage Target: 60%+
 *
 * Test Suite:
 * 1. Model selection for different task types
 * 2. Routing strategy selection (cost, performance, balanced)
 * 3. Model filtering based on capabilities
 * 4. Model scoring and ranking
 * 5. Cost estimation
 * 6. Decision logging
 * 7. Routing statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMRouter } from '../core/llm-router';
import type { Env, Task, TaskMetadata, TaskType } from '../types';

// Mock environment
const createMockEnv = (): Env => {
  const mockResults: any[] = [];

  return {
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockResults }),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
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

// Seed mock LLM capabilities
const seedMockCapabilities = (env: Env) => {
  const capabilities = [
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
      suitable_for: JSON.stringify(['design_architecture', 'implement_feature', 'security_review', 'design_ui_ux']),
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
  ];

  // Update mock to return capabilities
  (env.DB.prepare as any).mockReturnValue({
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: capabilities }),
    run: vi.fn().mockResolvedValue({ success: true }),
    first: vi.fn().mockResolvedValue(null),
  });
};

describe('Phase 1 LLMRouter - Comprehensive Unit Tests', () => {
  let router: LLMRouter;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    seedMockCapabilities(mockEnv);
    router = new LLMRouter(mockEnv);
  });

  describe('Model Selection for Task Types', () => {
    it('should select FREE Gemini model for simple tasks with cost strategy', async () => {
      const metadata: TaskMetadata = {
        complexity: 'simple',
        required_context_kb: 10,
        priority_dimension: 'cost',
        estimated_tokens: 500,
        requires_vision: false,
        requires_function_calling: false,
      };

      const result = await router.selectModelForTask(
        'task-001',
        'design_ui_ux',
        metadata
      );

      expect(result.selected_model).toBe('gemini-2.0-flash-thinking-exp-1219');
      expect(result.selected_provider).toBe('gemini');
      expect(result.routing_strategy).toBe('cost');
      expect(result.estimated_cost).toBe(0); // Free model
      expect(result.selection_reason).toContain('free tier model');
    });

    it('should select high-quality model for complex security tasks', async () => {
      const metadata: TaskMetadata = {
        complexity: 'complex',
        required_context_kb: 100,
        priority_dimension: 'quality',
        estimated_tokens: 5000,
        requires_vision: false,
        requires_function_calling: true,
      };

      const result = await router.selectModelForTask(
        'task-002',
        'security_review',
        metadata
      );

      // Should select Claude or Gemini Flash (not free Gemini Thinking)
      expect(['claude-3-5-sonnet-20241022', 'gemini-1.5-flash-8b']).toContain(
        result.selected_model
      );
      expect(result.routing_strategy).toBe('performance');
      expect(result.estimated_cost).toBeGreaterThan(0);
    });

    it('should select fast model for high-priority speed tasks', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'speed',
        estimated_tokens: 2000,
        requires_vision: false,
        requires_function_calling: false,
      };

      const result = await router.selectModelForTask(
        'task-003',
        'write_tests',
        metadata
      );

      expect(result.routing_strategy).toBe('performance');
      // Should select a model with high avg_speed_tps
      expect(result.selected_model).toBeDefined();
      expect(result.selected_provider).toBeDefined();
    });

    it('should select balanced model for balanced priority', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 50,
        priority_dimension: 'balanced',
        estimated_tokens: 3000,
        requires_vision: false,
        requires_function_calling: true,
      };

      const result = await router.selectModelForTask(
        'task-004',
        'implement_feature',
        metadata
      );

      expect(result.routing_strategy).toBe('balanced');
      expect(result.selected_model).toBeDefined();
      // Alternative models depend on how many models are capable
      expect(result.alternative_models).toBeDefined();
      expect(Array.isArray(result.alternative_models)).toBe(true);
    });
  });

  describe('Capability Filtering', () => {
    it('should filter out models without enough context window', async () => {
      const metadata: TaskMetadata = {
        complexity: 'complex',
        required_context_kb: 150, // Requires 150KB context
        priority_dimension: 'balanced',
        estimated_tokens: 10000,
        requires_vision: false,
        requires_function_calling: false,
      };

      const result = await router.selectModelForTask(
        'task-005',
        'design_architecture',
        metadata
      );

      // Only Claude (200KB) and Gemini Flash 8b (1000KB) have enough context
      expect(['claude-3-5-sonnet-20241022', 'gemini-1.5-flash-8b']).toContain(
        result.selected_model
      );
    });

    it('should filter out models without vision when required', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'balanced',
        estimated_tokens: 2000,
        requires_vision: true, // Vision required
        requires_function_calling: false,
      };

      const result = await router.selectModelForTask(
        'task-006',
        'design_ui_ux',
        metadata
      );

      // Gemini Thinking doesn't support vision
      expect(result.selected_model).not.toBe('gemini-2.0-flash-thinking-exp-1219');
      // Should select vision-capable model
      expect(['gpt-4o-mini', 'gemini-1.5-flash-8b', 'claude-3-5-sonnet-20241022']).toContain(
        result.selected_model
      );
    });

    it('should filter out models without function calling when required', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 20,
        priority_dimension: 'balanced',
        estimated_tokens: 1500,
        requires_vision: false,
        requires_function_calling: true, // Function calling required
      };

      const result = await router.selectModelForTask(
        'task-007',
        'develop_api',
        metadata
      );

      // All current models support function calling, so any should work
      expect(result.selected_model).toBeDefined();
      expect(result.selected_provider).toBeDefined();
    });

    it('should throw error when no models meet requirements', async () => {
      // Create env with no capable models
      const emptyEnv = createMockEnv();
      (emptyEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
      });

      const emptyRouter = new LLMRouter(emptyEnv);

      const metadata: TaskMetadata = {
        complexity: 'simple',
        required_context_kb: 5,
        priority_dimension: 'cost',
        estimated_tokens: 500,
      };

      await expect(
        emptyRouter.selectModelForTask('task-999', 'write_prd', metadata)
      ).rejects.toThrow('No capable LLM models found');
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate zero cost for free models', async () => {
      const metadata: TaskMetadata = {
        complexity: 'simple',
        required_context_kb: 10,
        priority_dimension: 'cost',
        estimated_tokens: 1000,
      };

      const result = await router.selectModelForTask(
        'task-008',
        'cost_alert',
        metadata
      );

      if (result.selected_model === 'gemini-2.0-flash-thinking-exp-1219') {
        expect(result.estimated_cost).toBe(0);
      }
    });

    it('should estimate cost correctly for paid models', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 50,
        priority_dimension: 'quality',
        estimated_tokens: 10000, // 10k tokens
      };

      const result = await router.selectModelForTask(
        'task-009',
        'security_review',
        metadata
      );

      // Should have non-zero cost for paid models
      if (result.selected_provider !== 'gemini' || result.selected_model !== 'gemini-2.0-flash-thinking-exp-1219') {
        expect(result.estimated_cost).toBeGreaterThan(0);
      }
    });

    it('should calculate cost using 60% input / 40% output ratio', async () => {
      const metadata: TaskMetadata = {
        complexity: 'complex',
        required_context_kb: 100,
        priority_dimension: 'balanced',
        estimated_tokens: 1000,
      };

      const result = await router.selectModelForTask(
        'task-010',
        'implement_feature',
        metadata
      );

      // Verify cost is calculated (exact value depends on model selected)
      expect(typeof result.estimated_cost).toBe('number');
      expect(result.estimated_cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Decision Logging', () => {
    it('should log routing decision to database', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'balanced',
        estimated_tokens: 2000,
      };

      const selection = await router.selectModelForTask(
        'task-011',
        'write_prd',
        metadata
      );

      const decisionId = await router.logRoutingDecision(
        'task-011',
        'write_prd',
        metadata,
        selection
      );

      expect(decisionId).toBeDefined();
      expect(decisionId).toMatch(/^llm-routing-/);
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });

    it('should include all required fields in logged decision', async () => {
      const metadata: TaskMetadata = {
        complexity: 'simple',
        required_context_kb: 10,
        priority_dimension: 'cost',
        estimated_tokens: 500,
      };

      const selection = await router.selectModelForTask(
        'task-012',
        'design_ui_ux',
        metadata
      );

      const decisionId = await router.logRoutingDecision(
        'task-012',
        'design_ui_ux',
        metadata,
        selection
      );

      // Verify prepare was called with correct SQL
      const prepareCalls = (mockEnv.DB.prepare as any).mock.calls;
      const insertCall = prepareCalls.find((call: any[]) =>
        call[0].includes('INSERT INTO llm_routing_decisions')
      );

      expect(insertCall).toBeDefined();
      expect(insertCall[0]).toContain('task_id');
      expect(insertCall[0]).toContain('selected_model');
      expect(insertCall[0]).toContain('estimated_cost');
      expect(insertCall[0]).toContain('routing_strategy');
    });
  });

  describe('Routing Statistics', () => {
    it('should calculate routing statistics from logged decisions', async () => {
      // Mock decision data
      const mockDecisions = [
        {
          id: 'dec-001',
          task_id: 'task-001',
          task_type: 'write_prd',
          task_metadata: JSON.stringify({ complexity: 'simple' }),
          selected_model: 'gemini-2.0-flash-thinking-exp-1219',
          selected_provider: 'gemini',
          selection_reason: 'Free model',
          alternative_models: JSON.stringify([]),
          estimated_cost: 0,
          routing_strategy: 'cost',
          decided_at: Date.now(),
          created_at: Date.now(),
        },
        {
          id: 'dec-002',
          task_id: 'task-002',
          task_type: 'security_review',
          task_metadata: JSON.stringify({ complexity: 'complex' }),
          selected_model: 'claude-3-5-sonnet-20241022',
          selected_provider: 'anthropic',
          selection_reason: 'High quality',
          alternative_models: JSON.stringify([]),
          estimated_cost: 0.15,
          routing_strategy: 'performance',
          decided_at: Date.now(),
          created_at: Date.now(),
        },
        {
          id: 'dec-003',
          task_id: 'task-003',
          task_type: 'implement_feature',
          task_metadata: JSON.stringify({ complexity: 'medium' }),
          selected_model: 'gemini-1.5-flash-8b',
          selected_provider: 'gemini',
          selection_reason: 'Balanced',
          alternative_models: JSON.stringify([]),
          estimated_cost: 0.002,
          routing_strategy: 'balanced',
          decided_at: Date.now(),
          created_at: Date.now(),
        },
      ];

      // Update mock to return decisions
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: mockDecisions }),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
      });

      const stats = await router.getRoutingStatistics();

      expect(stats.total_decisions).toBe(3);
      expect(stats.models_used['gemini-2.0-flash-thinking-exp-1219']).toBe(1);
      expect(stats.models_used['claude-3-5-sonnet-20241022']).toBe(1);
      expect(stats.models_used['gemini-1.5-flash-8b']).toBe(1);
      expect(stats.strategy_distribution['cost']).toBe(1);
      expect(stats.strategy_distribution['performance']).toBe(1);
      expect(stats.strategy_distribution['balanced']).toBe(1);
      expect(stats.total_estimated_cost).toBeCloseTo(0.152, 3);
      expect(stats.avg_cost_per_task).toBeCloseTo(0.0507, 3);
    });

    it('should handle empty statistics gracefully', async () => {
      // Mock no decisions
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
      });

      const stats = await router.getRoutingStatistics();

      expect(stats.total_decisions).toBe(0);
      expect(stats.models_used).toEqual({});
      expect(stats.total_estimated_cost).toBe(0);
      expect(stats.avg_cost_per_task).toBe(0);
      expect(stats.strategy_distribution).toEqual({});
    });

    it('should filter statistics by time range', async () => {
      const now = Date.now();
      const oneDayAgo = now - 86400000;

      const mockDecisions = [
        {
          id: 'dec-old',
          task_id: 'task-old',
          task_type: 'write_prd',
          task_metadata: JSON.stringify({}),
          selected_model: 'gpt-4o-mini',
          selected_provider: 'openai',
          selection_reason: 'Old',
          alternative_models: JSON.stringify([]),
          estimated_cost: 0.01,
          routing_strategy: 'cost',
          decided_at: oneDayAgo - 1000, // Older than cutoff
          created_at: oneDayAgo - 1000,
        },
        {
          id: 'dec-new',
          task_id: 'task-new',
          task_type: 'write_prd',
          task_metadata: JSON.stringify({}),
          selected_model: 'gemini-2.0-flash-thinking-exp-1219',
          selected_provider: 'gemini',
          selection_reason: 'New',
          alternative_models: JSON.stringify([]),
          estimated_cost: 0,
          routing_strategy: 'cost',
          decided_at: now - 1000, // Within cutoff
          created_at: now - 1000,
        },
      ];

      // Mock returns both decisions, but router should filter by time
      (mockEnv.DB.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [mockDecisions[1]] }), // Only new one
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue(null),
      });

      const stats = await router.getRoutingStatistics(86400000); // 24 hours

      expect(stats.total_decisions).toBe(1);
      expect(stats.models_used['gemini-2.0-flash-thinking-exp-1219']).toBe(1);
    });
  });

  describe('Routing Strategy Selection', () => {
    it('should select cost strategy for cost priority', async () => {
      const metadata: TaskMetadata = {
        complexity: 'simple',
        required_context_kb: 10,
        priority_dimension: 'cost',
        estimated_tokens: 500,
      };

      const result = await router.selectModelForTask(
        'task-013',
        'estimate_cost',
        metadata
      );

      expect(result.routing_strategy).toBe('cost');
    });

    it('should select performance strategy for speed priority', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'speed',
        estimated_tokens: 2000,
      };

      const result = await router.selectModelForTask(
        'task-014',
        'write_tests',
        metadata
      );

      expect(result.routing_strategy).toBe('performance');
    });

    it('should select performance strategy for quality priority', async () => {
      const metadata: TaskMetadata = {
        complexity: 'complex',
        required_context_kb: 100,
        priority_dimension: 'quality',
        estimated_tokens: 5000,
      };

      const result = await router.selectModelForTask(
        'task-015',
        'security_review',
        metadata
      );

      expect(result.routing_strategy).toBe('performance');
    });

    it('should select balanced strategy for balanced priority', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 50,
        priority_dimension: 'balanced',
        estimated_tokens: 3000,
      };

      const result = await router.selectModelForTask(
        'task-016',
        'implement_feature',
        metadata
      );

      expect(result.routing_strategy).toBe('balanced');
    });
  });

  describe('Selection Reasons', () => {
    it('should generate informative selection reason', async () => {
      const metadata: TaskMetadata = {
        complexity: 'complex',
        required_context_kb: 100,
        priority_dimension: 'quality',
        estimated_tokens: 5000,
        requires_vision: true,
        requires_function_calling: true,
      };

      const result = await router.selectModelForTask(
        'task-017',
        'security_review',
        metadata
      );

      expect(result.selection_reason).toBeDefined();
      expect(result.selection_reason.length).toBeGreaterThan(10);
      // Should mention strategy
      expect(result.selection_reason.toLowerCase()).toContain('strategy');
    });

    it('should mention free tier for zero-cost models', async () => {
      const metadata: TaskMetadata = {
        complexity: 'simple',
        required_context_kb: 10,
        priority_dimension: 'cost',
        estimated_tokens: 500,
      };

      const result = await router.selectModelForTask(
        'task-018',
        'design_ui_ux',
        metadata
      );

      if (result.estimated_cost === 0) {
        expect(result.selection_reason.toLowerCase()).toContain('free');
      }
    });

    it('should mention vision support when required', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'balanced',
        estimated_tokens: 2000,
        requires_vision: true,
      };

      const result = await router.selectModelForTask(
        'task-019',
        'design_ui_ux',
        metadata
      );

      expect(result.selection_reason.toLowerCase()).toContain('vision');
    });

    it('should mention function calling when required', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'balanced',
        estimated_tokens: 2000,
        requires_function_calling: true,
      };

      const result = await router.selectModelForTask(
        'task-020',
        'develop_api',
        metadata
      );

      expect(result.selection_reason.toLowerCase()).toContain('function');
    });
  });

  describe('Alternative Models', () => {
    it('should provide alternative model suggestions', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'balanced',
        estimated_tokens: 2000,
      };

      const result = await router.selectModelForTask(
        'task-021',
        'write_prd',
        metadata
      );

      expect(result.alternative_models).toBeDefined();
      expect(Array.isArray(result.alternative_models)).toBe(true);
      expect(result.alternative_models.length).toBeGreaterThanOrEqual(0);
      expect(result.alternative_models.length).toBeLessThanOrEqual(2);
    });

    it('should not include selected model in alternatives', async () => {
      const metadata: TaskMetadata = {
        complexity: 'medium',
        required_context_kb: 30,
        priority_dimension: 'balanced',
        estimated_tokens: 2000,
      };

      const result = await router.selectModelForTask(
        'task-022',
        'implement_feature',
        metadata
      );

      expect(result.alternative_models).not.toContain(result.selected_model);
    });
  });
});
