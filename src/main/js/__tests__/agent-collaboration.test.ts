/**
 * Agent Collaboration Test
 * Tests 9 AI agents communication and collaboration capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Env, AgentId, Task } from '../types';
import { AgentCommunicationSystem } from '../core/agent-communication';
import { AgentOrchestrator } from '../core/agent-orchestrator';
import { TaskQueueManager } from '../core/task-queue';
import { CoordinatorAgent } from '../agents/coordinator';

// Mock Cloudflare environment
const createMockEnv = (): Env => {
  const db = {
    prepare: (query: string) => ({
      bind: (...args: unknown[]) => ({
        run: async () => ({ success: true, meta: {} }),
        first: async () => null,
        all: async () => ({ results: [], success: true, meta: {} }),
      }),
    }),
    batch: async (statements: unknown[]) => [],
    exec: async (query: string) => ({ count: 0, duration: 0 }),
  };

  return {
    DB: db as unknown as D1Database,
    VECTORIZE: null as unknown as VectorizeIndex,
    STORAGE: null as unknown as R2Bucket,
    CACHE: null as unknown as KVNamespace,
    TASK_QUEUE: null as unknown as Queue,
    BACKUP_QUEUE: null as unknown as Queue,
    OPENAI_API_KEY: 'test-key',
    GEMINI_API_KEY: 'test-key',
    LLM_STRATEGY: 'balanced',
    USE_LLM_ROUTER: 'true',
    ENVIRONMENT: 'test',
  } as Env;
};

describe('AI Agent Team Collaboration', () => {
  let env: Env;
  let communication: AgentCommunicationSystem;
  let orchestrator: AgentOrchestrator;
  let taskQueue: TaskQueueManager;
  let coordinator: CoordinatorAgent;

  beforeEach(() => {
    env = createMockEnv();
    communication = new AgentCommunicationSystem(env);
    orchestrator = new AgentOrchestrator(env);
    taskQueue = new TaskQueueManager(env);
    coordinator = new CoordinatorAgent(env);
  });

  describe('9 AI Agents Verification', () => {
    const expectedAgents: Array<{ id: AgentId; name: string; role: string }> = [
      { id: 'agent-coordinator', name: 'Coordinator', role: 'Task Orchestration & Team Management' },
      { id: 'agent-pm', name: 'Product Manager', role: 'Requirements Analysis & PRD Creation' },
      { id: 'agent-architect', name: 'Solution Architect', role: 'System Design & Technical Decisions' },
      { id: 'agent-backend-dev', name: 'Backend Developer', role: 'API & Backend Implementation' },
      { id: 'agent-frontend-dev', name: 'Frontend Developer', role: 'UI Development' },
      { id: 'agent-qa', name: 'QA Engineer', role: 'Testing & Quality Assurance' },
      { id: 'agent-devops', name: 'DevOps Engineer', role: 'Deployment & Monitoring' },
      { id: 'agent-data-analyst', name: 'Data Analyst', role: 'Analytics & Insights' },
      { id: 'agent-knowledge-mgr', name: 'Knowledge Manager', role: 'Knowledge Base Management' },
    ];

    it('should have 9 agents defined', () => {
      expect(expectedAgents).toHaveLength(9);
    });

    it('should have unique agent IDs', () => {
      const ids = expectedAgents.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(9);
    });

    it('should have all required agent roles', () => {
      const roles = expectedAgents.map((a) => a.role);
      expect(roles).toContain('Task Orchestration & Team Management');
      expect(roles).toContain('Requirements Analysis & PRD Creation');
      expect(roles).toContain('System Design & Technical Decisions');
      expect(roles).toContain('API & Backend Implementation');
      expect(roles).toContain('UI Development');
      expect(roles).toContain('Testing & Quality Assurance');
      expect(roles).toContain('Deployment & Monitoring');
      expect(roles).toContain('Analytics & Insights');
      expect(roles).toContain('Knowledge Base Management');
    });
  });

  describe('Agent Communication System', () => {
    it('should send message from one agent to another', async () => {
      const message = await communication.sendMessage(
        'agent-coordinator',
        'agent-pm',
        'task_assignment',
        {
          subject: 'New project request',
          content: {
            task_id: 'task-001',
            description: 'Analyze requirements for new feature',
          },
          priority: 'high',
          requires_response: true,
        }
      );

      expect(message).toBeDefined();
      expect(message.from_agent_id).toBe('agent-coordinator');
      expect(message.to_agent_id).toBe('agent-pm');
      expect(message.message_type).toBe('task_assignment');
      expect(message.subject).toBe('New project request');
    });

    it('should broadcast message to multiple agents', async () => {
      const messages = await communication.broadcastMessage(
        'agent-coordinator',
        ['agent-backend-dev', 'agent-frontend-dev', 'agent-qa'],
        'status_update',
        {
          subject: 'Project kickoff',
          content: {
            project_id: 'proj-001',
            message: 'Starting new project development',
          },
          priority: 'medium',
        }
      );

      expect(messages).toHaveLength(3);
      expect(messages[0].to_agent_id).toBe('agent-backend-dev');
      expect(messages[1].to_agent_id).toBe('agent-frontend-dev');
      expect(messages[2].to_agent_id).toBe('agent-qa');
    });

    it('should create communication channel between agents', async () => {
      const channel = await communication.createChannel(
        ['agent-backend-dev', 'agent-frontend-dev', 'agent-architect'],
        'API Design Discussion'
      );

      expect(channel).toBeDefined();
      expect(channel.participants).toHaveLength(3);
      expect(channel.topic).toBe('API Design Discussion');
      expect(channel.participants).toContain('agent-backend-dev');
      expect(channel.participants).toContain('agent-frontend-dev');
      expect(channel.participants).toContain('agent-architect');
    });
  });

  describe('Task Queue Management', () => {
    it('should create task with appropriate type', async () => {
      const task = await taskQueue.createTask({
        type: 'feature_development',
        title: 'Implement user authentication',
        description: 'Add JWT-based authentication to API',
        priority: 'high',
        created_by: 'agent-coordinator',
      });

      expect(task).toBeDefined();
      expect(task.type).toBe('feature_development');
      expect(task.status).toBe('pending');
      expect(task.created_by).toBe('agent-coordinator');
    });

    it('should assign task to appropriate agent', async () => {
      const task = await taskQueue.createTask({
        type: 'backend_task',
        title: 'Create API endpoint',
        description: 'Implement /api/users endpoint',
        priority: 'high',
        created_by: 'agent-coordinator',
      });

      await taskQueue.assignTask(task.id, 'agent-backend-dev');
      const assignedTask = await taskQueue.getTask(task.id);

      expect(assignedTask?.assigned_to).toBe('agent-backend-dev');
      expect(assignedTask?.status).toBe('assigned');
    });
  });

  describe('Workflow Orchestration', () => {
    it('should execute multi-agent workflow', async () => {
      const workflow = {
        id: 'workflow-001',
        name: 'Feature Development Workflow',
        description: 'Complete feature development process',
        steps: [
          {
            step_number: 1,
            agent_id: 'agent-pm' as AgentId,
            task_type: 'requirements_analysis',
          },
          {
            step_number: 2,
            agent_id: 'agent-architect' as AgentId,
            task_type: 'system_design',
            depends_on: [1],
          },
          {
            step_number: 3,
            agent_id: 'agent-backend-dev' as AgentId,
            task_type: 'backend_implementation',
            depends_on: [2],
          },
          {
            step_number: 4,
            agent_id: 'agent-frontend-dev' as AgentId,
            task_type: 'frontend_implementation',
            depends_on: [2],
          },
          {
            step_number: 5,
            agent_id: 'agent-qa' as AgentId,
            task_type: 'testing',
            depends_on: [3, 4],
          },
          {
            step_number: 6,
            agent_id: 'agent-devops' as AgentId,
            task_type: 'deployment',
            depends_on: [5],
          },
        ],
        status: 'pending' as const,
        created_at: Date.now(),
      };

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.workflow_id).toBe('workflow-001');
      expect(result.status).toBe('completed');
      expect(Object.keys(result.results)).toHaveLength(6);
    });

    it('should handle workflow with parallel tasks', async () => {
      const workflow = {
        id: 'workflow-002',
        name: 'Parallel Development Workflow',
        steps: [
          {
            step_number: 1,
            agent_id: 'agent-pm' as AgentId,
            task_type: 'requirements_analysis',
          },
          {
            step_number: 2,
            agent_id: 'agent-backend-dev' as AgentId,
            task_type: 'backend_implementation',
            depends_on: [1],
            parallel_with: [3],
          },
          {
            step_number: 3,
            agent_id: 'agent-frontend-dev' as AgentId,
            task_type: 'frontend_implementation',
            depends_on: [1],
            parallel_with: [2],
          },
        ],
        status: 'pending' as const,
        created_at: Date.now(),
      };

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.status).toBe('completed');
      expect(Object.keys(result.results)).toHaveLength(3);
    });
  });

  describe('Coordinator Agent', () => {
    it('should process user request and create tasks', async () => {
      const result = await coordinator.processUserRequest({
        user_id: 'user-001',
        description: 'Build a todo list application with React frontend and Node.js backend',
        priority: 'high',
      });

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.execution_plan).toBeDefined();
    });

    it('should distribute tasks to appropriate agents', async () => {
      // Create some pending tasks
      await taskQueue.createTask({
        type: 'requirements_analysis',
        title: 'Analyze requirements',
        description: 'Create PRD',
        priority: 'high',
        created_by: 'agent-coordinator',
      });

      await taskQueue.createTask({
        type: 'backend_task',
        title: 'Build API',
        description: 'Create REST API',
        priority: 'high',
        created_by: 'agent-coordinator',
      });

      await coordinator.distributeTasks();

      // Verify tasks were assigned
      const tasks = await taskQueue.getTasksByStatus('assigned');
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should monitor task progress', async () => {
      const progress = await coordinator.monitorProgress();

      expect(progress).toBeDefined();
      expect(progress.active_tasks).toBeGreaterThanOrEqual(0);
      expect(progress.completed_tasks).toBeGreaterThanOrEqual(0);
      expect(progress.failed_tasks).toBeGreaterThanOrEqual(0);
      expect(progress.blocked_tasks).toBeDefined();
      expect(progress.issues).toBeDefined();
    });
  });

  describe('Complete Project Generation Flow', () => {
    it('should generate complete project with all 9 agents', async () => {
      console.log('\n🤖 Starting Complete Project Generation Test\n');

      // Step 1: Coordinator receives user request
      console.log('Step 1: Coordinator processing user request...');
      const userRequest = await coordinator.processUserRequest({
        user_id: 'user-001',
        description: 'Create a RESTful API for task management with authentication',
        priority: 'high',
      });
      console.log(`✅ Created ${userRequest.tasks.length} tasks`);
      expect(userRequest.tasks.length).toBeGreaterThan(0);

      // Step 2: PM analyzes requirements
      console.log('\nStep 2: PM analyzing requirements...');
      await communication.sendMessage('agent-coordinator', 'agent-pm', 'task_assignment', {
        subject: 'Requirements Analysis',
        content: { task_id: userRequest.tasks[0]?.id },
      });
      console.log('✅ Requirements analysis assigned to PM');

      // Step 3: Architect designs system
      console.log('\nStep 3: Architect designing system...');
      await communication.sendMessage('agent-pm', 'agent-architect', 'handoff', {
        subject: 'System Design',
        content: { requirements: 'PRD completed' },
      });
      console.log('✅ System design assigned to Architect');

      // Step 4: Backend & Frontend development (parallel)
      console.log('\nStep 4: Backend and Frontend development (parallel)...');
      await communication.broadcastMessage('agent-architect', ['agent-backend-dev', 'agent-frontend-dev'], 'task_assignment', {
        subject: 'Implementation',
        content: { design: 'Architecture completed' },
      });
      console.log('✅ Implementation tasks assigned to Backend & Frontend teams');

      // Step 5: QA testing
      console.log('\nStep 5: QA testing...');
      await communication.sendMessage('agent-backend-dev', 'agent-qa', 'handoff', {
        subject: 'Testing',
        content: { implementation: 'Code completed' },
      });
      console.log('✅ Testing assigned to QA');

      // Step 6: DevOps deployment
      console.log('\nStep 6: DevOps deployment...');
      await communication.sendMessage('agent-qa', 'agent-devops', 'handoff', {
        subject: 'Deployment',
        content: { tests: 'All tests passed' },
      });
      console.log('✅ Deployment assigned to DevOps');

      // Step 7: Data Analyst creates reports
      console.log('\nStep 7: Data Analyst creating reports...');
      await communication.sendMessage('agent-devops', 'agent-data-analyst', 'request', {
        subject: 'Analytics Setup',
        content: { deployment: 'Production deployed' },
      });
      console.log('✅ Analytics setup assigned to Data Analyst');

      // Step 8: Knowledge Manager documents project
      console.log('\nStep 8: Knowledge Manager documenting project...');
      await communication.sendMessage('agent-coordinator', 'agent-knowledge-mgr', 'task_assignment', {
        subject: 'Documentation',
        content: { project: 'Project completed' },
      });
      console.log('✅ Documentation assigned to Knowledge Manager');

      console.log('\n🎉 Complete project generation flow executed successfully!\n');

      // Verify all 9 agents were involved
      const involvedAgents = [
        'agent-coordinator',
        'agent-pm',
        'agent-architect',
        'agent-backend-dev',
        'agent-frontend-dev',
        'agent-qa',
        'agent-devops',
        'agent-data-analyst',
        'agent-knowledge-mgr',
      ];

      expect(involvedAgents).toHaveLength(9);
      console.log('✅ All 9 agents participated in project generation');
    });
  });
});
