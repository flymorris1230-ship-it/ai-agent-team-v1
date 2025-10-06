/**
 * Coordinator Agent
 * Orchestrates team activities, assigns tasks, and monitors progress
 */

import type { Env, Task, Agent, AgentId, TaskType, TaskPriority } from '../types';
import { Logger } from '../utils/logger';
import { TaskQueueManager } from '../core/task-queue';

export class CoordinatorAgent {
  private logger: Logger;
  private taskQueue: TaskQueueManager;
  private agentId: AgentId = 'agent-coordinator';

  constructor(private env: Env) {
    this.logger = new Logger(env, 'CoordinatorAgent');
    this.taskQueue = new TaskQueueManager(env);
  }

  /**
   * Main coordinator loop - analyze requirements and create tasks
   */
  async processUserRequest(request: {
    user_id: string;
    description: string;
    priority?: TaskPriority;
    deadline?: number;
  }): Promise<{
    tasks: Task[];
    execution_plan: string;
  }> {
    await this.logger.info('Processing user request', { request }, this.agentId);

    // Analyze the request and determine task breakdown
    const taskBreakdown = await this.analyzeRequest(request.description);

    // Create tasks based on analysis
    const tasks: Task[] = [];
    for (const taskPlan of taskBreakdown) {
      const task = await this.taskQueue.createTask({
        type: taskPlan.type,
        title: taskPlan.title,
        description: taskPlan.description,
        priority: request.priority || taskPlan.priority,
        created_by: this.agentId,
        dependencies: taskPlan.dependencies,
        input_data: taskPlan.input_data,
        deadline: request.deadline,
      });
      tasks.push(task);
    }

    // Create execution plan
    const executionPlan = this.createExecutionPlan(tasks);

    await this.logger.info(`Created ${tasks.length} tasks for user request`, { taskIds: tasks.map((t) => t.id) }, this.agentId);

    return { tasks, execution_plan: executionPlan };
  }

  /**
   * Assign tasks to appropriate agents
   */
  async distributeTasks(): Promise<void> {
    await this.logger.info('Starting task distribution', {}, this.agentId);

    // Get pending tasks
    const pendingTasks = await this.taskQueue.getTasksByStatus('pending');

    for (const task of pendingTasks) {
      try {
        // Select best agent for this task
        const agent = await this.selectAgent(task);

        if (agent) {
          await this.taskQueue.assignTask(task.id, agent.id as AgentId);
          await this.logger.info(`Assigned task ${task.id} to ${agent.id}`, { taskId: task.id, agentId: agent.id }, this.agentId);
        } else {
          await this.logger.warning(`No available agent for task ${task.id}`, { task }, this.agentId);
        }
      } catch (error) {
        await this.logger.error(`Failed to assign task ${task.id}`, { error, task }, this.agentId);
      }
    }
  }

  /**
   * Monitor task progress and handle issues
   */
  async monitorProgress(): Promise<{
    active_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    blocked_tasks: Task[];
    issues: string[];
  }> {
    const [inProgress, completed, failed] = await Promise.all([
      this.taskQueue.getTasksByStatus('in_progress'),
      this.taskQueue.getTasksByStatus('completed'),
      this.taskQueue.getTasksByStatus('failed'),
    ]);

    const blockedTasks: Task[] = [];
    const issues: string[] = [];

    // Check for blocked or overdue tasks
    for (const task of inProgress) {
      if (task.deadline && task.deadline < Date.now()) {
        blockedTasks.push(task);
        issues.push(`Task ${task.id} is overdue`);
      }
    }

    // Check for failed tasks that need reassignment
    for (const task of failed) {
      issues.push(`Task ${task.id} failed: ${task.error_message}`);
    }

    const report = {
      active_tasks: inProgress.length,
      completed_tasks: completed.length,
      failed_tasks: failed.length,
      blocked_tasks: blockedTasks,
      issues,
    };

    await this.logger.info('Progress monitoring complete', report, this.agentId);

    return report;
  }

  /**
   * Handle task failures and reassignment
   */
  async handleFailedTask(taskId: string): Promise<void> {
    const task = await this.taskQueue.getTask(taskId);
    if (!task) {
      await this.logger.error(`Task not found: ${taskId}`, {}, this.agentId);
      return;
    }

    await this.logger.warning(`Handling failed task: ${taskId}`, { task }, this.agentId);

    // Create a new task with updated parameters
    const retryTask = await this.taskQueue.createTask({
      type: task.type,
      title: `[RETRY] ${task.title}`,
      description: task.description,
      priority: 'high', // Increase priority for retries
      created_by: this.agentId,
      input_data: {
        ...task.input_data,
        retry_of: taskId,
        previous_error: task.error_message,
      },
    });

    await this.logger.info(`Created retry task ${retryTask.id} for failed task ${taskId}`, {}, this.agentId);
  }

  /**
   * Analyze user request and break down into tasks
   */
  private async analyzeRequest(description: string): Promise<
    Array<{
      type: TaskType;
      title: string;
      description?: string;
      priority: TaskPriority;
      dependencies?: string[];
      input_data?: Record<string, unknown>;
    }>
  > {
    // This is a simplified version - in production, this would use AI to analyze
    const tasks: Array<{
      type: TaskType;
      title: string;
      description?: string;
      priority: TaskPriority;
      dependencies?: string[];
      input_data?: Record<string, unknown>;
    }> = [];

    // Default workflow for feature requests
    if (description.toLowerCase().includes('feature') || description.toLowerCase().includes('implement')) {
      tasks.push({
        type: 'write_prd',
        title: 'Write Product Requirements Document',
        description: `Analyze and document requirements for: ${description}`,
        priority: 'high',
      });

      tasks.push({
        type: 'design_architecture',
        title: 'Design Technical Architecture',
        description: 'Design system architecture and technical approach',
        priority: 'high',
        dependencies: tasks.length > 0 ? [`task-${tasks[0].type}`] : undefined,
      });

      tasks.push({
        type: 'implement_feature',
        title: 'Implement Feature',
        description: description,
        priority: 'medium',
        dependencies: tasks.length > 1 ? [`task-${tasks[1].type}`] : undefined,
      });

      tasks.push({
        type: 'write_tests',
        title: 'Write Tests',
        description: 'Write comprehensive tests for the feature',
        priority: 'medium',
        dependencies: tasks.length > 2 ? [`task-${tasks[2].type}`] : undefined,
      });

      tasks.push({
        type: 'deploy',
        title: 'Deploy to Production',
        description: 'Deploy feature to production environment',
        priority: 'low',
        dependencies: tasks.length > 3 ? [`task-${tasks[3].type}`] : undefined,
      });
    } else {
      // Generic task
      tasks.push({
        type: 'coordinate',
        title: description,
        description: description,
        priority: 'medium',
      });
    }

    return tasks;
  }

  /**
   * Select the best agent for a task
   */
  private async selectAgent(task: Task): Promise<Agent | null> {
    // Define task-to-agent mapping
    const agentMapping: Record<TaskType, AgentId> = {
      write_prd: 'agent-pm',
      design_architecture: 'agent-architect',
      design_ui_ux: 'agent-ui-ux-designer',
      create_prototype: 'agent-ui-ux-designer',
      design_review: 'agent-ui-ux-designer',
      develop_api: 'agent-backend-dev',
      implement_feature: 'agent-backend-dev',
      write_tests: 'agent-qa',
      deploy: 'agent-devops',
      estimate_cost: 'agent-finops-guardian',
      optimize_resources: 'agent-finops-guardian',
      cost_alert: 'agent-finops-guardian',
      security_review: 'agent-security-guardian',
      vulnerability_scan: 'agent-security-guardian',
      compliance_check: 'agent-security-guardian',
      analyze_data: 'agent-data-analyst',
      manage_knowledge: 'agent-knowledge-mgr',
      coordinate: 'agent-coordinator',
    };

    const targetAgentId = agentMapping[task.type];
    if (!targetAgentId) {
      return null;
    }

    // Check if agent is available
    const agent = await this.env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(targetAgentId).first();

    if (!agent) {
      return null;
    }

    const agentData = agent as unknown as Agent;

    // If agent is busy, return null (task will wait)
    if (agentData.status === 'busy') {
      return null;
    }

    return agentData;
  }

  /**
   * Create execution plan description
   */
  private createExecutionPlan(tasks: Task[]): string {
    let plan = '# Execution Plan\n\n';
    plan += `Total Tasks: ${tasks.length}\n\n`;

    tasks.forEach((task, index) => {
      plan += `${index + 1}. **${task.title}** (${task.type})\n`;
      plan += `   - Priority: ${task.priority}\n`;
      plan += `   - Status: ${task.status}\n`;
      if (task.dependencies && task.dependencies.length > 0) {
        plan += `   - Dependencies: ${task.dependencies.join(', ')}\n`;
      }
      plan += '\n';
    });

    return plan;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentMetrics(agentId: AgentId): Promise<{
    total_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    success_rate: number;
    avg_completion_time: number;
  }> {
    // Get all tasks for this agent
    const tasks = await this.taskQueue.getTasksByAgent(agentId, 1000);

    const completed = tasks.filter((t) => t.status === 'completed');
    const failed = tasks.filter((t) => t.status === 'failed');

    let totalTime = 0;
    for (const task of completed) {
      if (task.started_at && task.completed_at) {
        totalTime += task.completed_at - task.started_at;
      }
    }

    const avgTime = completed.length > 0 ? totalTime / completed.length : 0;
    const successRate = tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0;

    return {
      total_tasks: tasks.length,
      completed_tasks: completed.length,
      failed_tasks: failed.length,
      success_rate: successRate,
      avg_completion_time: avgTime,
    };
  }
}
