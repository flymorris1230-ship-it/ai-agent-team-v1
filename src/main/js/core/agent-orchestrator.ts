/**
 * Agent Orchestrator
 * Coordinates agent interactions and workflow execution
 */

import type { Env, Task, AgentId, Agent, TaskMetadata, TaskType } from '../types';
import { Logger } from '../utils/logger';
import { AgentCommunicationSystem } from './agent-communication';
import { TaskQueueManager } from './task-queue';

export interface WorkflowStep {
  step_number: number;
  agent_id: AgentId;
  task_type: string;
  depends_on?: number[];
  parallel_with?: number[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  current_step?: number;
  created_at: number;
  started_at?: number;
  completed_at?: number;
}

export class AgentOrchestrator {
  private logger: Logger;
  private communication: AgentCommunicationSystem;
  private taskQueue: TaskQueueManager;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'AgentOrchestrator');
    this.communication = new AgentCommunicationSystem(env);
    this.taskQueue = new TaskQueueManager(env);
  }

  /**
   * Execute a workflow with multiple agent steps
   */
  async executeWorkflow(workflow: Workflow): Promise<{
    workflow_id: string;
    status: 'completed' | 'failed';
    results: Record<number, unknown>;
    errors?: string[];
  }> {
    await this.logger.info(`Starting workflow: ${workflow.name}`, { workflowId: workflow.id });

    workflow.status = 'running';
    workflow.started_at = Date.now();

    const results: Record<number, unknown> = {};
    const errors: string[] = [];

    try {
      // Execute steps in order, respecting dependencies
      for (const step of workflow.steps.sort((a, b) => a.step_number - b.step_number)) {
        // Check dependencies
        if (step.depends_on) {
          const allDependenciesComplete = step.depends_on.every((depStep) => results[depStep] !== undefined);

          if (!allDependenciesComplete) {
            throw new Error(`Step ${step.step_number} dependencies not met`);
          }
        }

        // Execute step
        try {
          await this.logger.info(`Executing workflow step ${step.step_number}`, {
            agentId: step.agent_id,
            taskType: step.task_type,
          });

          const result = await this.executeWorkflowStep(step, results);
          results[step.step_number] = result;

          workflow.current_step = step.step_number;
        } catch (error) {
          const errorMsg = `Step ${step.step_number} failed: ${(error as Error).message}`;
          errors.push(errorMsg);
          await this.logger.error(errorMsg, { error, step });
          throw error;
        }
      }

      workflow.status = 'completed';
      workflow.completed_at = Date.now();

      await this.logger.info(`Workflow completed: ${workflow.name}`, {
        workflowId: workflow.id,
        duration: workflow.completed_at - (workflow.started_at || 0),
      });

      return {
        workflow_id: workflow.id,
        status: 'completed',
        results,
      };
    } catch (error) {
      workflow.status = 'failed';
      workflow.completed_at = Date.now();

      await this.logger.error(`Workflow failed: ${workflow.name}`, { error, workflowId: workflow.id });

      return {
        workflow_id: workflow.id,
        status: 'failed',
        results,
        errors,
      };
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    step: WorkflowStep,
    previousResults: Record<number, unknown>
  ): Promise<unknown> {
    // Create task for the step
    const task = await this.taskQueue.createTask({
      type: step.task_type as any,
      title: `Workflow Step ${step.step_number}`,
      description: `Execute ${step.task_type} by ${step.agent_id}`,
      priority: 'high',
      created_by: 'agent-coordinator',
      input_data: {
        workflow_step: step.step_number,
        previous_results: step.depends_on?.map((depStep) => previousResults[depStep]),
      },
    });

    // Assign to agent
    await this.taskQueue.assignTask(task.id, step.agent_id);

    // Notify agent
    await this.communication.notifyTaskAssignment('agent-coordinator', step.agent_id, task.id, {
      title: task.title,
      description: task.description,
      priority: task.priority,
      deadline: task.deadline,
    });

    // Wait for task completion (polling)
    const completedTask = await this.waitForTaskCompletion(task.id, 300000); // 5 min timeout

    if (!completedTask || completedTask.status === 'failed') {
      throw new Error(`Task ${task.id} failed or timed out`);
    }

    return completedTask.output_data;
  }

  /**
   * Wait for task completion with timeout
   */
  private async waitForTaskCompletion(taskId: string, timeoutMs: number): Promise<Task | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const task = await this.taskQueue.getTask(taskId);

      if (task && (task.status === 'completed' || task.status === 'failed')) {
        return task;
      }

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return null;
  }

  /**
   * Create a standard feature development workflow
   * Enhanced with Phase 1 agents: UI/UX Designer, FinOps Guardian, Security Guardian
   */
  async createFeatureWorkflow(featureDescription: string): Promise<Workflow> {
    const workflowId = `workflow-${Date.now()}`;

    const workflow: Workflow = {
      id: workflowId,
      name: `Feature: ${featureDescription}`,
      description: featureDescription,
      status: 'pending',
      steps: [
        // Step 1: PRD + Cost Estimation (Parallel)
        {
          step_number: 1,
          agent_id: 'agent-pm',
          task_type: 'write_prd',
        },
        {
          step_number: 2,
          agent_id: 'agent-finops-guardian',
          task_type: 'estimate_cost',
          parallel_with: [1],
        },
        // Step 2: Architecture Design
        {
          step_number: 3,
          agent_id: 'agent-architect',
          task_type: 'design_architecture',
          depends_on: [1],
        },
        // Step 3: UI/UX Design + Security Review (Parallel with Architecture)
        {
          step_number: 4,
          agent_id: 'agent-ui-ux-designer',
          task_type: 'design_ui_ux',
          depends_on: [1],
          parallel_with: [3],
        },
        {
          step_number: 5,
          agent_id: 'agent-security-guardian',
          task_type: 'security_review',
          depends_on: [3],
        },
        // Step 4: Implementation (Backend + Frontend parallel)
        {
          step_number: 6,
          agent_id: 'agent-backend-dev',
          task_type: 'implement_feature',
          depends_on: [3, 5], // Depends on architecture + security approval
        },
        {
          step_number: 7,
          agent_id: 'agent-frontend-dev',
          task_type: 'implement_feature',
          depends_on: [4], // Depends on UI/UX design
          parallel_with: [6],
        },
        // Step 5: QA Testing
        {
          step_number: 8,
          agent_id: 'agent-qa',
          task_type: 'write_tests',
          depends_on: [6, 7],
        },
        // Step 6: Final Security Scan + Resource Optimization
        {
          step_number: 9,
          agent_id: 'agent-security-guardian',
          task_type: 'vulnerability_scan',
          depends_on: [8],
        },
        {
          step_number: 10,
          agent_id: 'agent-finops-guardian',
          task_type: 'optimize_resources',
          depends_on: [8],
          parallel_with: [9],
        },
        // Step 7: Deployment
        {
          step_number: 11,
          agent_id: 'agent-devops',
          task_type: 'deploy',
          depends_on: [9, 10], // Deploy after security + cost checks
        },
      ],
      created_at: Date.now(),
    };

    await this.logger.info('Enhanced feature workflow created with Phase 1 agents', {
      workflowId,
      featureDescription,
      totalSteps: workflow.steps.length,
    });

    return workflow;
  }

  /**
   * Coordinate agent collaboration for a complex task
   */
  async coordinateCollaboration(params: {
    task_id: string;
    primary_agent: AgentId;
    supporting_agents: AgentId[];
    collaboration_type: 'sequential' | 'parallel' | 'review';
  }): Promise<{
    collaboration_id: string;
    channel_id: string;
    status: string;
  }> {
    const collaborationId = `collab-${Date.now()}`;

    // Create communication channel
    const channel = await this.communication.createChannel(
      [params.primary_agent, ...params.supporting_agents],
      `Collaboration: ${params.task_id}`
    );

    // Notify all agents
    await this.communication.sendToChannel(channel.id, 'agent-coordinator', 'notification', {
      subject: `New Collaboration: ${params.task_id}`,
      content: {
        collaboration_id: collaborationId,
        task_id: params.task_id,
        type: params.collaboration_type,
        primary_agent: params.primary_agent,
        supporting_agents: params.supporting_agents,
      },
    });

    await this.logger.info('Collaboration coordinated', {
      collaborationId,
      channelId: channel.id,
      agentCount: params.supporting_agents.length + 1,
    });

    return {
      collaboration_id: collaborationId,
      channel_id: channel.id,
      status: 'active',
    };
  }

  /**
   * Handle agent handoff (task transfer)
   */
  async handoffTask(params: {
    task_id: string;
    from_agent: AgentId;
    to_agent: AgentId;
    reason: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    // Update task assignment
    await this.taskQueue.assignTask(params.task_id, params.to_agent);

    // Notify both agents
    await Promise.all([
      this.communication.sendMessage(params.from_agent, params.to_agent, 'notification', {
        subject: `Task Handoff: ${params.task_id}`,
        content: {
          type: 'task_handoff',
          task_id: params.task_id,
          reason: params.reason,
          context: params.context,
          from_agent: params.from_agent,
        },
        priority: 'high',
      }),
      this.communication.sendMessage('agent-coordinator', params.from_agent, 'notification', {
        subject: `Task Reassigned: ${params.task_id}`,
        content: {
          type: 'task_reassignment',
          task_id: params.task_id,
          new_agent: params.to_agent,
          reason: params.reason,
        },
      }),
    ]);

    await this.logger.info('Task handed off', {
      taskId: params.task_id,
      fromAgent: params.from_agent,
      toAgent: params.to_agent,
      reason: params.reason,
    });
  }

  /**
   * Monitor agent health and availability
   */
  async monitorAgentHealth(): Promise<
    Record<
      AgentId,
      {
        status: 'healthy' | 'busy' | 'unresponsive';
        current_task?: string;
        task_count: number;
        last_active?: number;
      }
    >
  > {
    const agents = await this.env.DB.prepare('SELECT * FROM agents').all();

    const healthStatus: Record<string, any> = {};

    for (const agent of agents.results) {
      const agentData = agent as unknown as Agent;
      const agentId = agentData.id;

      // Get task count
      const tasks = await this.taskQueue.getTasksByAgent(agentId, 100);
      const activeTasks = tasks.filter((t) => t.status === 'in_progress');

      // Determine status
      let status: 'healthy' | 'busy' | 'unresponsive' = 'healthy';

      if (activeTasks.length > 3) {
        status = 'busy';
      }

      const lastActive = agentData.performance_metrics?.last_active;
      if (lastActive && Date.now() - lastActive > 300000) {
        // 5 minutes
        status = 'unresponsive';
      }

      healthStatus[agentId] = {
        status,
        current_task: activeTasks[0]?.id,
        task_count: tasks.length,
        last_active: lastActive,
      };
    }

    return healthStatus;
  }

  /**
   * Rebalance workload across agents
   */
  async rebalanceWorkload(): Promise<{
    reassigned_tasks: number;
    agent_loads: Record<AgentId, number>;
  }> {
    await this.logger.info('Starting workload rebalancing');

    const agentLoads: Record<string, number> = {};
    let reassignedCount = 0;

    // Get all agents and their task counts
    const agents = await this.env.DB.prepare('SELECT * FROM agents').all();

    for (const agent of agents.results) {
      const agentId = (agent as unknown as Agent).id;
      const tasks = await this.taskQueue.getTasksByAgent(agentId, 1000);
      const activeTasks = tasks.filter((t) => t.status === 'in_progress' || t.status === 'assigned');
      agentLoads[agentId] = activeTasks.length;
    }

    // Find overloaded and underloaded agents
    const avgLoad = Object.values(agentLoads).reduce((a, b) => a + b, 0) / agents.results.length;

    for (const [agentId, load] of Object.entries(agentLoads)) {
      if (load > avgLoad * 1.5) {
        // Overloaded
        const tasks = await this.taskQueue.getTasksByAgent(agentId as AgentId, 10);
        const tasksToReassign = tasks
          .filter((t) => t.status === 'assigned')
          .slice(0, Math.floor(load - avgLoad));

        for (const task of tasksToReassign) {
          // Find least loaded agent with same capabilities
          const targetAgent = this.findLeastLoadedAgent(agentLoads, task.type);

          if (targetAgent && targetAgent !== agentId) {
            await this.handoffTask({
              task_id: task.id,
              from_agent: agentId as AgentId,
              to_agent: targetAgent,
              reason: 'Workload rebalancing',
            });
            reassignedCount++;
            agentLoads[agentId]--;
            agentLoads[targetAgent]++;
          }
        }
      }
    }

    await this.logger.info('Workload rebalancing completed', {
      reassignedTasks: reassignedCount,
      agentLoads,
    });

    return {
      reassigned_tasks: reassignedCount,
      agent_loads: agentLoads as Record<AgentId, number>,
    };
  }

  /**
   * Annotate task with metadata for intelligent LLM routing
   * Automatically analyzes task and assigns complexity, context size, and priority dimension
   */
  async annotateTaskMetadata(task: Task): Promise<TaskMetadata> {
    await this.logger.info('Annotating task metadata', { taskId: task.id, taskType: task.type });

    // Analyze task complexity based on type and description
    const complexity = this.estimateTaskComplexity(task);

    // Estimate required context size
    const requiredContextKb = this.estimateRequiredContext(task);

    // Determine priority dimension based on task attributes
    const priorityDimension = this.determinePriorityDimension(task);

    // Estimate token count
    const estimatedTokens = this.estimateTokenCount(task);

    // Check if vision or function calling is required
    const requiresVision = this.checkRequiresVision(task);
    const requiresFunctionCalling = this.checkRequiresFunctionCalling(task);

    const metadata: TaskMetadata = {
      complexity,
      required_context_kb: requiredContextKb,
      priority_dimension: priorityDimension,
      estimated_tokens: estimatedTokens,
      requires_vision: requiresVision,
      requires_function_calling: requiresFunctionCalling,
    };

    await this.logger.info('Task metadata annotated', { taskId: task.id, metadata });

    return metadata;
  }

  /**
   * Estimate task complexity based on type and description
   */
  private estimateTaskComplexity(task: Task): 'simple' | 'medium' | 'complex' {
    const descriptionLength = (task.description || '').length;
    const inputDataSize = task.input_data ? JSON.stringify(task.input_data).length : 0;

    // Complex task types
    const complexTaskTypes: TaskType[] = [
      'design_architecture',
      'implement_feature',
      'security_review',
      'compliance_check',
    ];

    // Medium task types
    const mediumTaskTypes: TaskType[] = [
      'write_prd',
      'design_ui_ux',
      'create_prototype',
      'write_tests',
      'estimate_cost',
      'vulnerability_scan',
    ];

    if (complexTaskTypes.includes(task.type)) {
      return 'complex';
    }

    if (mediumTaskTypes.includes(task.type)) {
      return descriptionLength > 500 || inputDataSize > 1000 ? 'complex' : 'medium';
    }

    // Simple task types or short descriptions
    if (descriptionLength < 200 && inputDataSize < 500) {
      return 'simple';
    }

    return 'medium';
  }

  /**
   * Estimate required context size in KB
   */
  private estimateRequiredContext(task: Task): number {
    const baseContext = 5; // 5KB minimum

    // Task types that need large context
    const largeContextTasks: TaskType[] = [
      'design_architecture',
      'implement_feature',
      'security_review',
      'design_review',
    ];

    if (largeContextTasks.includes(task.type)) {
      return 50; // 50KB for complex tasks
    }

    // Check if input data references large documents
    if (task.input_data) {
      const inputSize = JSON.stringify(task.input_data).length;
      return Math.min(baseContext + Math.ceil(inputSize / 1024), 100); // Cap at 100KB
    }

    return baseContext;
  }

  /**
   * Determine priority dimension based on task attributes
   */
  private determinePriorityDimension(task: Task): 'speed' | 'quality' | 'cost' | 'balanced' {
    // High priority tasks favor speed
    if (task.priority === 'critical' || task.priority === 'high') {
      return 'speed';
    }

    // Security and compliance tasks favor quality
    const qualityTasks: TaskType[] = [
      'security_review',
      'compliance_check',
      'vulnerability_scan',
      'design_review',
    ];

    if (qualityTasks.includes(task.type)) {
      return 'quality';
    }

    // Cost estimation and optimization tasks favor cost
    const costTasks: TaskType[] = ['estimate_cost', 'optimize_resources', 'cost_alert'];

    if (costTasks.includes(task.type)) {
      return 'cost';
    }

    // Default to balanced
    return 'balanced';
  }

  /**
   * Estimate token count for task processing
   */
  private estimateTokenCount(task: Task): number {
    const descriptionTokens = Math.ceil((task.description || '').length / 4); // ~4 chars per token
    const inputDataTokens = task.input_data
      ? Math.ceil(JSON.stringify(task.input_data).length / 4)
      : 0;
    const outputEstimate = 500; // Estimated output tokens

    const totalTokens = descriptionTokens + inputDataTokens + outputEstimate;

    // Cap at 100k tokens maximum
    return Math.min(totalTokens, 100000);
  }

  /**
   * Check if task requires vision capabilities
   */
  private checkRequiresVision(task: Task): boolean {
    const visionKeywords = ['image', 'screenshot', 'diagram', 'visual', 'ui', 'design'];
    const description = (task.description || '').toLowerCase();

    return visionKeywords.some((keyword) => description.includes(keyword));
  }

  /**
   * Check if task requires function calling
   */
  private checkRequiresFunctionCalling(task: Task): boolean {
    const functionCallingTasks: TaskType[] = [
      'develop_api',
      'implement_feature',
      'write_tests',
      'deploy',
      'analyze_data',
    ];

    return functionCallingTasks.includes(task.type);
  }

  /**
   * Find least loaded agent capable of handling task type
   */
  private findLeastLoadedAgent(
    agentLoads: Record<string, number>,
    taskType: string
  ): AgentId | null {
    // Map task types to capable agents (Updated with Phase 1 agents)
    const capableAgents: Record<string, AgentId[]> = {
      write_prd: ['agent-pm'],
      design_architecture: ['agent-architect'],
      design_ui_ux: ['agent-ui-ux-designer'],
      create_prototype: ['agent-ui-ux-designer'],
      design_review: ['agent-ui-ux-designer'],
      implement_feature: ['agent-backend-dev', 'agent-frontend-dev'],
      develop_api: ['agent-backend-dev'],
      write_tests: ['agent-qa'],
      deploy: ['agent-devops'],
      estimate_cost: ['agent-finops-guardian'],
      optimize_resources: ['agent-finops-guardian'],
      cost_alert: ['agent-finops-guardian'],
      security_review: ['agent-security-guardian'],
      vulnerability_scan: ['agent-security-guardian'],
      compliance_check: ['agent-security-guardian'],
      analyze_data: ['agent-data-analyst'],
      manage_knowledge: ['agent-knowledge-mgr'],
    };

    const candidates = capableAgents[taskType] || [];
    if (candidates.length === 0) return null;

    // Find candidate with lowest load
    let minLoad = Infinity;
    let bestAgent: AgentId | null = null;

    for (const agent of candidates) {
      const load = agentLoads[agent] || 0;
      if (load < minLoad) {
        minLoad = load;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }
}
