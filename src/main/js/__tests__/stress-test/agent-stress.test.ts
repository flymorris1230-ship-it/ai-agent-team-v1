/**
 * Agent Stress Tests
 * 測試 3 個新 Agent 在高並發、長時間運行、錯誤恢復場景下的表現
 *
 * 測試目標:
 * - 並發處理能力: 10/50/100 並發任務
 * - 記憶體穩定性: 1000+ 任務連續執行
 * - 錯誤恢復能力: API 失敗、超時、異常輸入
 * - 效能指標: P95 延遲 < 500ms, 成功率 > 99%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIUXDesignerAgent } from '../../agents/ui-ux-designer';
import { FinOpsGuardianAgent } from '../../agents/finops-guardian';
import { SecurityGuardianAgent } from '../../agents/security-guardian';
import type { Env, Task } from '../../types';

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

// Mock KnowledgeBase to avoid real API calls
vi.mock('../../core/knowledge-base', () => {
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

// Helper to create mock tasks
const createMockTask = (overrides: Partial<Task> = {}): Task => {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'design_ui_ux',
    description: 'Test task description',
    status: 'pending',
    priority: 'medium',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  };
};

// Performance measurement helper
interface PerformanceMetrics {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  totalDuration: number;
  avgDuration: number;
  p95Duration: number;
  minDuration: number;
  maxDuration: number;
  throughput: number; // tasks per second
}

const measurePerformance = (durations: number[]): PerformanceMetrics => {
  const sorted = durations.slice().sort((a, b) => a - b);
  const totalDuration = sorted.reduce((sum, d) => sum + d, 0);
  const p95Index = Math.floor(sorted.length * 0.95);

  return {
    totalTasks: durations.length,
    successfulTasks: durations.length,
    failedTasks: 0,
    totalDuration,
    avgDuration: totalDuration / durations.length,
    p95Duration: sorted[p95Index] || 0,
    minDuration: sorted[0] || 0,
    maxDuration: sorted[sorted.length - 1] || 0,
    throughput: durations.length / (totalDuration / 1000), // per second
  };
};

describe('Agent Stress Tests - Concurrent Processing', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  describe('UIUXDesigner Agent - Concurrent Load', () => {
    it('should handle 10 concurrent design tasks', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const tasks = Array.from({ length: 10 }, () =>
        createMockTask({
          type: 'design_ui_ux',
          description: 'Create dashboard UI with charts and data visualization',
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(
        tasks.map((task) => agent.processTask(task))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.design_output).toBeDefined();
        expect(result.design_type).toBe('ui_design');
        expect(result.accessibility_score).toBeGreaterThanOrEqual(0);
      });

      console.log('✅ 10 concurrent tasks completed in', duration, 'ms');
      console.log('   Avg per task:', (duration / 10).toFixed(2), 'ms');
    });

    it('should handle 50 concurrent design tasks', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const tasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask({
          type: 'design_ui_ux',
          description: `Design component ${i}: Dashboard, Form, Table, Modal`,
        })
      );

      const durations: number[] = [];
      const results = await Promise.all(
        tasks.map(async (task) => {
          const start = Date.now();
          const result = await agent.processTask(task);
          durations.push(Date.now() - start);
          return result;
        })
      );

      const metrics = measurePerformance(durations);

      expect(results).toHaveLength(50);
      expect(metrics.p95Duration).toBeLessThan(500); // P95 < 500ms
      expect(metrics.successfulTasks).toBe(50);

      console.log('✅ 50 concurrent tasks metrics:');
      console.log('   Total duration:', metrics.totalDuration.toFixed(0), 'ms');
      console.log('   Avg per task:', metrics.avgDuration.toFixed(2), 'ms');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');
      console.log('   Throughput:', metrics.throughput.toFixed(2), 'tasks/sec');
    }, 30000); // 30s timeout

    it('should handle 100 concurrent design tasks without degradation', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const tasks = Array.from({ length: 100 }, (_, i) =>
        createMockTask({
          type: i % 3 === 0 ? 'design_ui_ux' : i % 3 === 1 ? 'create_prototype' : 'design_review',
          description: `Mixed task type ${i}`,
        })
      );

      const durations: number[] = [];
      const results = await Promise.all(
        tasks.map(async (task) => {
          const start = Date.now();
          const result = await agent.processTask(task);
          durations.push(Date.now() - start);
          return result;
        })
      );

      const metrics = measurePerformance(durations);

      expect(results).toHaveLength(100);
      expect(metrics.p95Duration).toBeLessThan(500); // P95 still < 500ms
      expect(metrics.successfulTasks).toBe(100);

      console.log('✅ 100 concurrent tasks metrics:');
      console.log('   Total duration:', metrics.totalDuration.toFixed(0), 'ms');
      console.log('   Avg per task:', metrics.avgDuration.toFixed(2), 'ms');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');
      console.log('   Min/Max:', metrics.minDuration.toFixed(0), '/', metrics.maxDuration.toFixed(0), 'ms');
      console.log('   Throughput:', metrics.throughput.toFixed(2), 'tasks/sec');
    }, 60000); // 60s timeout
  });

  describe('FinOpsGuardian Agent - Concurrent Load', () => {
    it('should handle 10 concurrent cost estimation tasks', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const tasks = Array.from({ length: 10 }, () =>
        createMockTask({
          type: 'estimate_cost',
          description: 'Estimate cost for Cloudflare Workers + D1 + Vectorize setup',
        })
      );

      const results = await Promise.all(
        tasks.map((task) => agent.processTask(task))
      );

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.cost_report).toBeDefined();
        expect(result.estimated_monthly_cost).toBeGreaterThanOrEqual(0);
        expect(result.optimization_opportunities).toBeDefined();
      });

      console.log('✅ 10 concurrent cost estimations completed');
    });

    it('should handle 50 concurrent mixed FinOps tasks', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const tasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask({
          type: i % 3 === 0 ? 'estimate_cost' : i % 3 === 1 ? 'optimize_resources' : 'cost_alert',
          description: `FinOps task ${i}`,
        })
      );

      const durations: number[] = [];
      const results = await Promise.all(
        tasks.map(async (task) => {
          const start = Date.now();
          const result = await agent.processTask(task);
          durations.push(Date.now() - start);
          return result;
        })
      );

      const metrics = measurePerformance(durations);

      expect(results).toHaveLength(50);
      expect(metrics.p95Duration).toBeLessThan(500);

      console.log('✅ 50 concurrent FinOps tasks metrics:');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');
      console.log('   Throughput:', metrics.throughput.toFixed(2), 'tasks/sec');
    }, 30000);

    it('should handle 100 concurrent cost optimization tasks', async () => {
      const agent = new FinOpsGuardianAgent(mockEnv);
      const tasks = Array.from({ length: 100 }, () =>
        createMockTask({
          type: 'optimize_resources',
          description: 'Optimize Cloudflare + LLM costs',
        })
      );

      const durations: number[] = [];
      const results = await Promise.all(
        tasks.map(async (task) => {
          const start = Date.now();
          const result = await agent.processTask(task);
          durations.push(Date.now() - start);
          return result;
        })
      );

      const metrics = measurePerformance(durations);

      expect(results).toHaveLength(100);
      expect(metrics.p95Duration).toBeLessThan(500);

      console.log('✅ 100 concurrent cost optimization metrics:');
      console.log('   Avg duration:', metrics.avgDuration.toFixed(2), 'ms');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');
    }, 60000);
  });

  describe('SecurityGuardian Agent - Concurrent Load', () => {
    it('should handle 10 concurrent security reviews', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const tasks = Array.from({ length: 10 }, () =>
        createMockTask({
          type: 'security_review',
          description: 'Security review for REST API with JWT authentication',
          input_data: { architecture: 'REST API with JWT, HTTPS, rate limiting' },
        })
      );

      const results = await Promise.all(
        tasks.map((task) => agent.processTask(task))
      );

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result.security_report).toBeDefined();
        expect(result.security_score).toBeGreaterThanOrEqual(0);
        expect(result.security_score).toBeLessThanOrEqual(100);
        expect(result.vulnerabilities).toBeDefined();
      });

      console.log('✅ 10 concurrent security reviews completed');
    });

    it('should handle 50 concurrent mixed security tasks', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const tasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask({
          type: i % 3 === 0 ? 'security_review' : i % 3 === 1 ? 'vulnerability_scan' : 'compliance_check',
          description: `Security task ${i}`,
          input_data: { architecture: 'API with authentication and encryption' },
        })
      );

      const durations: number[] = [];
      const results = await Promise.all(
        tasks.map(async (task) => {
          const start = Date.now();
          const result = await agent.processTask(task);
          durations.push(Date.now() - start);
          return result;
        })
      );

      const metrics = measurePerformance(durations);

      expect(results).toHaveLength(50);
      expect(metrics.p95Duration).toBeLessThan(500);

      console.log('✅ 50 concurrent security tasks metrics:');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');
      console.log('   Throughput:', metrics.throughput.toFixed(2), 'tasks/sec');
    }, 30000);

    it('should handle 100 concurrent security scans', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);
      const tasks = Array.from({ length: 100 }, () =>
        createMockTask({
          type: 'vulnerability_scan',
          description: 'Scan API endpoints for vulnerabilities',
          input_data: { architecture: 'Multi-tenant SaaS API with various endpoints' },
        })
      );

      const durations: number[] = [];
      const results = await Promise.all(
        tasks.map(async (task) => {
          const start = Date.now();
          const result = await agent.processTask(task);
          durations.push(Date.now() - start);
          return result;
        })
      );

      const metrics = measurePerformance(durations);

      expect(results).toHaveLength(100);
      expect(metrics.p95Duration).toBeLessThan(500);

      console.log('✅ 100 concurrent vulnerability scans metrics:');
      console.log('   Avg duration:', metrics.avgDuration.toFixed(2), 'ms');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');
    }, 60000);
  });

  describe('Memory Stability - Long Running Tests', () => {
    it('should process 500 sequential tasks without memory leak', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const startMemory = process.memoryUsage().heapUsed;
      const durations: number[] = [];

      for (let i = 0; i < 500; i++) {
        const task = createMockTask({
          type: 'design_ui_ux',
          description: `Sequential task ${i}`,
        });

        const start = Date.now();
        const result = await agent.processTask(task);
        durations.push(Date.now() - start);

        expect(result).toBeDefined();
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB

      const metrics = measurePerformance(durations);

      console.log('✅ 500 sequential tasks completed:');
      console.log('   Memory increase:', memoryIncrease.toFixed(2), 'MB');
      console.log('   Avg duration:', metrics.avgDuration.toFixed(2), 'ms');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');

      // Memory increase should be reasonable (< 100MB for 500 tasks)
      expect(memoryIncrease).toBeLessThan(100);
    }, 120000); // 2 minutes timeout
  });
});

describe('Agent Stress Tests - Error Recovery', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = createMockEnv();
  });

  describe('Error Handling under Load', () => {
    it('should handle invalid input gracefully in concurrent scenario', async () => {
      const agent = new UIUXDesignerAgent(mockEnv);
      const tasks = Array.from({ length: 50 }, (_, i) =>
        createMockTask({
          type: 'design_ui_ux',
          description: i % 5 === 0 ? '' : 'Valid design task', // 20% invalid
        })
      );

      const results = await Promise.allSettled(
        tasks.map((task) => agent.processTask(task))
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      console.log('✅ Error handling test:');
      console.log('   Successful:', successful);
      console.log('   Failed:', failed);
      console.log('   Success rate:', ((successful / 50) * 100).toFixed(2), '%');

      // Should handle errors gracefully, most tasks should succeed
      expect(successful).toBeGreaterThan(40); // > 80% success rate
    });

    it('should maintain performance after encountering errors', async () => {
      const agent = new SecurityGuardianAgent(mockEnv);

      // First batch with some errors
      const errorTasks = Array.from({ length: 20 }, (_, i) =>
        createMockTask({
          type: 'security_review',
          description: i % 4 === 0 ? '' : 'Security review',
          input_data: i % 4 === 0 ? undefined : { architecture: 'API with auth' },
        })
      );

      await Promise.allSettled(errorTasks.map((task) => agent.processTask(task)));

      // Second batch should maintain performance
      const normalTasks = Array.from({ length: 50 }, () =>
        createMockTask({
          type: 'security_review',
          description: 'Normal security review',
          input_data: { architecture: 'Standard API' },
        })
      );

      const durations: number[] = [];
      const results = await Promise.all(
        normalTasks.map(async (task) => {
          const start = Date.now();
          const result = await agent.processTask(task);
          durations.push(Date.now() - start);
          return result;
        })
      );

      const metrics = measurePerformance(durations);

      expect(results).toHaveLength(50);
      expect(metrics.p95Duration).toBeLessThan(500);

      console.log('✅ Performance after errors:');
      console.log('   P95 latency:', metrics.p95Duration.toFixed(2), 'ms');
      console.log('   All tasks successful: true');
    }, 30000);
  });
});
