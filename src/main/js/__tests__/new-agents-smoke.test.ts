/**
 * Smoke Tests for New Agents (Phase 1)
 * Quick validation that 3 new agents can execute basic tasks
 *
 * Note: These tests use mocked KnowledgeBase to avoid real LLM API calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIUXDesignerAgent } from '../agents/ui-ux-designer';
import { FinOpsGuardianAgent } from '../agents/finops-guardian';
import { SecurityGuardianAgent } from '../agents/security-guardian';
import type { Env, Task } from '../types';

// Mock KnowledgeBase to avoid real LLM calls
vi.mock('../core/knowledge-base', () => {
  return {
    KnowledgeBase: vi.fn().mockImplementation(() => ({
      createEntry: vi.fn().mockImplementation((params: any) => Promise.resolve({
        id: `mock-kb-entry-${Date.now()}`,
        type: params.type,
        title: params.title,
        content: params.content,
        tags: params.tags || [],
        related_tasks: params.related_tasks || [],
        author_agent_id: params.author_agent_id,
        created_at: Date.now(),
        updated_at: Date.now(),
      })),
      search: vi.fn().mockResolvedValue([]),
    })),
  };
});

// Mock Env for testing
const createMockEnv = (): Env => {
  return {
    DB: {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
          first: async () => null,
        }),
      }),
    } as any,
    VECTORIZE: {
      insert: async () => ({ count: 1, ids: ['test-vec-1'] }),
      query: async () => ({ matches: [] }),
    } as any,
    STORAGE: {} as any,
    CACHE: {
      get: async () => null,
      put: async () => {},
    } as any,
    TASK_QUEUE: {} as any,
    BACKUP_QUEUE: {} as any,
    OPENAI_API_KEY: 'test-openai-key',
    GEMINI_API_KEY: 'test-gemini-key',
    JWT_SECRET: 'test-jwt-secret',
    ENVIRONMENT: 'test',
    LOG_LEVEL: 'info',
  };
};

// Mock Task creator
const createMockTask = (overrides: Partial<Task> = {}): Task => {
  return {
    id: `test-task-${Date.now()}`,
    type: 'design_ui_ux',
    title: 'Test Task',
    description: 'This is a test task',
    status: 'pending',
    priority: 'medium',
    created_by: 'test-user',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
};

describe('New Agents Smoke Tests', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  describe('UIUXDesigner Agent', () => {
    it('should instantiate without errors', () => {
      expect(() => new UIUXDesignerAgent(mockEnv)).not.toThrow();
    });

    it('should process design_ui_ux task and return valid result', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const task = createMockTask({
        type: 'design_ui_ux',
        description: 'Create a user dashboard with charts and tables',
      });

      const result = await agent.processTask(task);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.design_output).toBeDefined();
      expect(result.design_output.id).toBeDefined();
      expect(result.design_output.title).toContain('UI/UX Design');
      expect(result.design_type).toBe('ui_design');

      // Verify components are identified
      expect(result.components).toBeInstanceOf(Array);
      expect(result.components.length).toBeGreaterThan(0);

      // Verify accessibility score exists
      expect(result.accessibility_score).toBeGreaterThanOrEqual(0);
      expect(result.accessibility_score).toBeLessThanOrEqual(100);

      // Verify design system
      expect(result.design_system_used).toBeDefined();
    });

    it('should process create_prototype task', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const task = createMockTask({
        type: 'create_prototype',
        description: 'Interactive prototype for mobile app',
      });

      const result = await agent.processTask(task);

      expect(result.design_type).toBe('prototype');
      expect(result.design_output.title).toContain('Prototype');
    });

    it('should process design_review task', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const task = createMockTask({
        type: 'design_review',
        description: 'Review current dashboard design',
      });

      const result = await agent.processTask(task);

      expect(result.design_type).toBe('design_review');
      expect(result.design_output.title).toContain('Design Review');
    });

    it('should return agent status', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const status = await agent.getStatus();

      expect(status).toBeDefined();
      expect(status.agent_id).toBe('agent-ui-ux-designer');
      expect(status.active_tasks).toBeGreaterThanOrEqual(0);
    });
  });

  describe('FinOpsGuardian Agent', () => {
    it('should instantiate without errors', () => {
      expect(() => new FinOpsGuardianAgent(mockEnv)).not.toThrow();
    });

    it('should process estimate_cost task and return valid result', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'estimate_cost',
        description: 'Architecture uses Cloudflare Workers, D1, R2, and OpenAI GPT-4',
      });

      const result = await agent.processTask(task);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.cost_report).toBeDefined();
      expect(result.cost_report.id).toBeDefined();
      expect(result.cost_report.title).toContain('Cost Estimation');

      // Verify cost estimation
      expect(result.estimated_monthly_cost).toBeGreaterThan(0);
      expect(typeof result.estimated_monthly_cost).toBe('number');

      // Verify optimization opportunities
      expect(result.optimization_opportunities).toBeInstanceOf(Array);

      // Verify alerts
      expect(result.alerts).toBeInstanceOf(Array);
    });

    it('should identify Vectorize optimization opportunity', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'estimate_cost',
        description: 'System uses Cloudflare Vectorize for vector storage',
      });

      const result = await agent.processTask(task);

      // Should identify Vectorize→pgvector optimization
      const vectorizeOpt = result.optimization_opportunities.find(
        opt => opt.area === 'Vector Database'
      );

      expect(vectorizeOpt).toBeDefined();
      expect(vectorizeOpt?.potential_savings).toBe(60);
    });

    it('should process optimize_resources task', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'optimize_resources',
        description: 'Optimize current infrastructure',
        input_data: { usage: { workers: 1000, d1_queries: 5000 } },
      });

      const result = await agent.processTask(task);

      expect(result.cost_report.title).toContain('Resource Optimization');
      expect(result.optimization_opportunities.length).toBeGreaterThan(0);
    });

    it('should process cost_alert task', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'cost_alert',
        description: 'Cost alert check',
        input_data: { threshold: 100, current_spend: 120 },
      });

      const result = await agent.processTask(task);

      expect(result.cost_report.title).toContain('Cost Alert');
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0]).toContain('CRITICAL');
    });

    it('should return agent status', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const status = await agent.getStatus();

      expect(status).toBeDefined();
      expect(status.agent_id).toBe('agent-finops-guardian');
      expect(status.active_monitoring).toBe(true);
    });
  });

  describe('SecurityGuardian Agent', () => {
    it('should instantiate without errors', () => {
      expect(() => new SecurityGuardianAgent(mockEnv)).not.toThrow();
    });

    it('should process security_review task and return valid result', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'security_review',
        description: 'API with JWT authentication, TLS encryption, and input validation',
        input_data: {
          architecture: 'REST API with JWT auth, HTTPS, Zod validation, rate limiting',
        },
      });

      const result = await agent.processTask(task);

      // Verify result structure
      expect(result).toBeDefined();
      expect(result.security_report).toBeDefined();
      expect(result.security_report.id).toBeDefined();
      expect(result.security_report.title).toContain('Security Review');

      // Verify security score
      expect(result.security_score).toBeGreaterThanOrEqual(0);
      expect(result.security_score).toBeLessThanOrEqual(100);

      // Verify vulnerabilities
      expect(result.vulnerabilities).toBeInstanceOf(Array);

      // Verify compliance status
      expect(result.compliance_status).toBeDefined();
      expect(typeof result.compliance_status).toBe('object');

      // Verify alerts
      expect(result.alerts).toBeInstanceOf(Array);
    });

    it('should detect missing authentication as critical vulnerability', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'security_review',
        description: 'Public API with no security',
        input_data: { architecture: 'Public REST API, completely open' },
      });

      const result = await agent.processTask(task);

      // Should detect critical authentication vulnerability
      const authVuln = result.vulnerabilities.find(
        v => v.category === 'Authentication'
      );

      expect(authVuln).toBeDefined();
      expect(authVuln?.severity).toBe('critical');
      expect(result.security_score).toBeLessThan(80);
    });

    it('should process vulnerability_scan task', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'vulnerability_scan',
        description: 'Scan codebase for vulnerabilities',
        input_data: { codebase: 'const x = eval(userInput); // dangerous' },
      });

      const result = await agent.processTask(task);

      expect(result.security_report.title).toContain('Vulnerability Scan');
      expect(result.vulnerabilities.length).toBeGreaterThan(0);
    });

    it('should process compliance_check task', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const task = createMockTask({
        type: 'compliance_check',
        description: 'Check OWASP compliance',
        input_data: { standard: 'OWASP' },
      });

      const result = await agent.processTask(task);

      expect(result.security_report.title).toContain('Compliance Check');
      expect(result.compliance_status).toBeDefined();
      expect(Object.keys(result.compliance_status).length).toBeGreaterThan(0);
    });

    it('should return agent status', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const status = await agent.getStatus();

      expect(status).toBeDefined();
      expect(status.agent_id).toBe('agent-security-guardian');
      expect(status.active_monitoring).toBe(true);
    });
  });

  describe('Integration: All 3 New Agents', () => {
    it('should all agents instantiate and execute without conflicts', async () => {
      const uiAgent = new UIUXDesignerAgent(mockEnv);
      const finAgent = new FinOpsGuardianAgent(mockEnv);
      const secAgent = new SecurityGuardianAgent(mockEnv);

      // Execute tasks in parallel
      const [uiResult, finResult, secResult] = await Promise.all([
        uiAgent.processTask(createMockTask({
          type: 'design_ui_ux',
          description: 'Create dashboard UI'
        })),
        finAgent.processTask(createMockTask({
          type: 'estimate_cost',
          description: 'Architecture uses Cloudflare Workers and D1'
        })),
        secAgent.processTask(createMockTask({
          type: 'security_review',
          description: 'API with JWT auth and HTTPS'
        })),
      ]);

      // All should complete successfully
      expect(uiResult.design_output).toBeDefined();
      expect(finResult.estimated_monthly_cost).toBeGreaterThanOrEqual(0);
      expect(secResult.security_score).toBeGreaterThanOrEqual(0);
    });
  });
});
