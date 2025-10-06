/**
 * Comprehensive Unit Tests for Agent Orchestrator Metadata Annotation
 * Coverage Target: 60%+
 *
 * Test Suite:
 * 1. Task complexity estimation
 * 2. Required context estimation
 * 3. Priority dimension determination
 * 4. Token count estimation
 * 5. Vision requirement detection
 * 6. Function calling requirement detection
 * 7. Full metadata annotation integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator } from '../core/agent-orchestrator';
import type { Env, Task, TaskType } from '../types';

// Mock environment
const createMockEnv = (): Env => {
  return {
    DB: {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
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

// Helper to create mock tasks
const createMockTask = (overrides: Partial<Task> = {}): Task => {
  return {
    id: `task-${Date.now()}`,
    type: 'write_prd',
    description: 'Test task description',
    status: 'pending',
    priority: 'medium',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
};

describe('AgentOrchestrator - Metadata Annotation', () => {
  let orchestrator: AgentOrchestrator;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
    orchestrator = new AgentOrchestrator(mockEnv);
  });

  describe('Task Complexity Estimation', () => {
    it('should classify simple tasks correctly', async () => {
      const task = createMockTask({
        type: 'cost_alert',
        description: 'Simple cost alert',
        input_data: { message: 'Test' },
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.complexity).toBe('simple');
    });

    it('should classify medium tasks correctly', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'Write product requirements document with moderate detail',
        input_data: { feature: 'User dashboard' },
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.complexity).toBe('medium');
    });

    it('should classify complex tasks correctly', async () => {
      const task = createMockTask({
        type: 'design_architecture',
        description: 'Design complete system architecture for multi-agent AI platform',
        input_data: { requirements: 'A'.repeat(1500) }, // Large input
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.complexity).toBe('complex');
    });

    it('should consider description length in complexity', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'A'.repeat(600), // Long description
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.complexity).toBe('complex');
    });

    it('should classify complex task types as complex', async () => {
      const complexTaskTypes: TaskType[] = [
        'design_architecture',
        'implement_feature',
        'security_review',
        'compliance_check',
      ];

      for (const taskType of complexTaskTypes) {
        const task = createMockTask({
          type: taskType,
          description: 'Short description',
        });

        const metadata = await orchestrator.annotateTaskMetadata(task);

        expect(metadata.complexity).toBe('complex');
      }
    });
  });

  describe('Required Context Estimation', () => {
    it('should return minimum context for simple tasks', async () => {
      const task = createMockTask({
        type: 'cost_alert',
        description: 'Alert',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.required_context_kb).toBe(5); // Base context
    });

    it('should return large context for architecture tasks', async () => {
      const task = createMockTask({
        type: 'design_architecture',
        description: 'Design system architecture',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.required_context_kb).toBe(50); // Large context tasks
    });

    it('should scale context with input data size', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'Write PRD',
        input_data: { spec: 'A'.repeat(10000) }, // 10KB input
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.required_context_kb).toBeGreaterThan(5);
      expect(metadata.required_context_kb).toBeLessThanOrEqual(100); // Max 100KB
    });

    it('should cap context at 100KB maximum', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'Write PRD',
        input_data: { spec: 'A'.repeat(200000) }, // 200KB input
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.required_context_kb).toBeLessThanOrEqual(100);
    });
  });

  describe('Priority Dimension Determination', () => {
    it('should select speed for critical priority tasks', async () => {
      const task = createMockTask({
        type: 'write_prd',
        priority: 'critical',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.priority_dimension).toBe('speed');
    });

    it('should select speed for high priority tasks', async () => {
      const task = createMockTask({
        type: 'write_prd',
        priority: 'high',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.priority_dimension).toBe('speed');
    });

    it('should select quality for security tasks', async () => {
      const securityTasks: TaskType[] = [
        'security_review',
        'compliance_check',
        'vulnerability_scan',
      ];

      for (const taskType of securityTasks) {
        const task = createMockTask({
          type: taskType,
          priority: 'medium',
        });

        const metadata = await orchestrator.annotateTaskMetadata(task);

        expect(metadata.priority_dimension).toBe('quality');
      }
    });

    it('should select quality for design review tasks', async () => {
      const task = createMockTask({
        type: 'design_review',
        priority: 'medium',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.priority_dimension).toBe('quality');
    });

    it('should select cost for cost-related tasks', async () => {
      const costTasks: TaskType[] = [
        'estimate_cost',
        'optimize_resources',
        'cost_alert',
      ];

      for (const taskType of costTasks) {
        const task = createMockTask({
          type: taskType,
          priority: 'medium',
        });

        const metadata = await orchestrator.annotateTaskMetadata(task);

        expect(metadata.priority_dimension).toBe('cost');
      }
    });

    it('should select balanced for normal tasks', async () => {
      const task = createMockTask({
        type: 'write_prd',
        priority: 'medium',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.priority_dimension).toBe('balanced');
    });
  });

  describe('Token Count Estimation', () => {
    it('should estimate tokens for short descriptions', async () => {
      const task = createMockTask({
        description: 'Short task', // ~10 chars
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      // Short task (~10 chars / 4 = 3 tokens) + 500 output estimate = ~503
      expect(metadata.estimated_tokens).toBeGreaterThan(500);
      expect(metadata.estimated_tokens).toBeLessThan(600);
    });

    it('should estimate tokens for long descriptions', async () => {
      const task = createMockTask({
        description: 'A'.repeat(2000), // 2000 chars
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.estimated_tokens).toBeGreaterThan(500);
    });

    it('should include input data in token estimation', async () => {
      const task = createMockTask({
        description: 'Short task',
        input_data: { spec: 'A'.repeat(5000) }, // 5000 chars
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.estimated_tokens).toBeGreaterThan(1000);
    });

    it('should have minimum 500 tokens (from output estimate)', async () => {
      const task = createMockTask({
        description: '',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      // Empty description = 0 tokens + 500 output estimate = 500
      expect(metadata.estimated_tokens).toBeGreaterThanOrEqual(500);
    });

    it('should cap tokens at 100000 maximum', async () => {
      const task = createMockTask({
        description: 'A'.repeat(500000), // 500k chars
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.estimated_tokens).toBeLessThanOrEqual(100000);
    });
  });

  describe('Vision Requirement Detection', () => {
    it('should detect vision requirement from task type', async () => {
      const task = createMockTask({
        type: 'design_ui_ux',
        description: 'Create user interface design',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.requires_vision).toBe(true);
    });

    it('should detect vision requirement from description keywords', async () => {
      const visionKeywords = ['screenshot', 'image', 'visual', 'diagram', 'mockup'];

      for (const keyword of visionKeywords) {
        const task = createMockTask({
          type: 'write_prd',
          description: `Analyze the ${keyword} for requirements`,
        });

        const metadata = await orchestrator.annotateTaskMetadata(task);

        expect(metadata.requires_vision).toBe(true);
      }
    });

    it('should not require vision for text-only tasks', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'Write detailed specification for backend API',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.requires_vision).toBe(false);
    });
  });

  describe('Function Calling Requirement Detection', () => {
    it('should detect function calling for API development', async () => {
      const task = createMockTask({
        type: 'develop_api',
        description: 'Build REST API',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.requires_function_calling).toBe(true);
    });

    it('should detect function calling from description keywords', async () => {
      const functionKeywords = ['api', 'function', 'method', 'endpoint', 'service'];

      for (const keyword of functionKeywords) {
        const task = createMockTask({
          type: 'implement_feature',
          description: `Implement ${keyword} for the system`,
        });

        const metadata = await orchestrator.annotateTaskMetadata(task);

        expect(metadata.requires_function_calling).toBe(true);
      }
    });

    it('should not require function calling for documentation tasks', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'Write documentation',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata.requires_function_calling).toBe(false);
    });
  });

  describe('Full Metadata Annotation Integration', () => {
    it('should return complete metadata object', async () => {
      const task = createMockTask({
        type: 'security_review',
        description: 'Review security architecture with diagram analysis',
        priority: 'high',
        input_data: { architecture: 'A'.repeat(2000) },
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata).toHaveProperty('complexity');
      expect(metadata).toHaveProperty('required_context_kb');
      expect(metadata).toHaveProperty('priority_dimension');
      expect(metadata).toHaveProperty('estimated_tokens');
      expect(metadata).toHaveProperty('requires_vision');
      expect(metadata).toHaveProperty('requires_function_calling');
    });

    it('should produce consistent metadata for same task', async () => {
      const task = createMockTask({
        type: 'implement_feature',
        description: 'Implement user authentication',
        priority: 'high',
      });

      const metadata1 = await orchestrator.annotateTaskMetadata(task);
      const metadata2 = await orchestrator.annotateTaskMetadata(task);

      expect(metadata1.complexity).toBe(metadata2.complexity);
      expect(metadata1.required_context_kb).toBe(metadata2.required_context_kb);
      expect(metadata1.priority_dimension).toBe(metadata2.priority_dimension);
      expect(metadata1.estimated_tokens).toBe(metadata2.estimated_tokens);
      expect(metadata1.requires_vision).toBe(metadata2.requires_vision);
      expect(metadata1.requires_function_calling).toBe(metadata2.requires_function_calling);
    });

    it('should handle all task types without errors', async () => {
      const allTaskTypes: TaskType[] = [
        'write_prd',
        'design_architecture',
        'design_ui_ux',
        'create_prototype',
        'design_review',
        'develop_api',
        'implement_feature',
        'write_tests',
        'deploy',
        'estimate_cost',
        'optimize_resources',
        'cost_alert',
        'security_review',
        'vulnerability_scan',
        'compliance_check',
        'analyze_data',
        'manage_knowledge',
        'coordinate',
      ];

      for (const taskType of allTaskTypes) {
        const task = createMockTask({
          type: taskType,
          description: `Test task for ${taskType}`,
        });

        const metadata = await orchestrator.annotateTaskMetadata(task);

        expect(metadata).toBeDefined();
        expect(metadata.complexity).toBeDefined();
        expect(metadata.required_context_kb).toBeGreaterThan(0);
        expect(metadata.priority_dimension).toBeDefined();
        expect(metadata.estimated_tokens).toBeGreaterThanOrEqual(100);
        expect(typeof metadata.requires_vision).toBe('boolean');
        expect(typeof metadata.requires_function_calling).toBe('boolean');
      }
    });

    it('should handle tasks with minimal information', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: '',
        priority: undefined as any,
        input_data: undefined,
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata).toBeDefined();
      expect(metadata.complexity).toBeDefined();
      expect(metadata.required_context_kb).toBeGreaterThanOrEqual(5);
      expect(metadata.priority_dimension).toBeDefined();
      expect(metadata.estimated_tokens).toBeGreaterThanOrEqual(100);
    });

    it('should handle tasks with maximum information', async () => {
      const task = createMockTask({
        type: 'design_architecture',
        description: 'A'.repeat(1000),
        priority: 'critical',
        input_data: {
          requirements: 'A'.repeat(10000),
          constraints: 'B'.repeat(5000),
          architecture: 'C'.repeat(8000),
        },
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata).toBeDefined();
      expect(metadata.complexity).toBe('complex');
      expect(metadata.required_context_kb).toBeLessThanOrEqual(100);
      expect(metadata.priority_dimension).toBe('speed');
      expect(metadata.estimated_tokens).toBeGreaterThan(1000);
      expect(metadata.estimated_tokens).toBeLessThanOrEqual(100000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined input_data gracefully', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'Test',
        input_data: undefined,
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata).toBeDefined();
      expect(metadata.required_context_kb).toBe(5); // Base context
    });

    it('should handle null description gracefully', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: null as any,
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata).toBeDefined();
      expect(metadata.complexity).toBeDefined();
    });

    it('should handle empty string description', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: '',
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata).toBeDefined();
      expect(metadata.complexity).toBeDefined();
    });

    it('should handle very long task descriptions', async () => {
      const task = createMockTask({
        type: 'write_prd',
        description: 'A'.repeat(50000), // 50k chars
      });

      const metadata = await orchestrator.annotateTaskMetadata(task);

      expect(metadata).toBeDefined();
      expect(metadata.estimated_tokens).toBeLessThanOrEqual(100000);
    });
  });
});
