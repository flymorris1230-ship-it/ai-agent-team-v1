/**
 * Task Queue Manager
 * Manages task creation, assignment, and lifecycle
 */

import type { Env, Task, TaskStatus, TaskPriority, TaskType, AgentId, TaskHistoryEntry } from '../types';
import { Logger } from '../utils/logger';

export class TaskQueueManager {
  private logger: Logger;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'TaskQueueManager');
  }

  /**
   * Create a new task
   */
  async createTask(taskData: {
    type: TaskType;
    title: string;
    description?: string;
    priority?: TaskPriority;
    created_by: string;
    dependencies?: string[];
    input_data?: Record<string, unknown>;
    deadline?: number;
  }): Promise<Task> {
    const task: Task = {
      id: `task-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      type: taskData.type,
      title: taskData.title,
      description: taskData.description,
      status: 'pending',
      priority: taskData.priority || 'medium',
      created_by: taskData.created_by,
      dependencies: taskData.dependencies,
      input_data: taskData.input_data,
      deadline: taskData.deadline,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Insert task into database
    await this.env.DB.prepare(
      `INSERT INTO tasks (id, type, title, description, status, priority, created_by, dependencies, input_data, deadline, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        task.id,
        task.type,
        task.title,
        task.description || null,
        task.status,
        task.priority,
        task.created_by,
        task.dependencies ? JSON.stringify(task.dependencies) : null,
        task.input_data ? JSON.stringify(task.input_data) : null,
        task.deadline || null,
        task.created_at,
        task.updated_at
      )
      .run();

    // Log task history
    await this.logTaskHistory({
      task_id: task.id,
      action: 'created',
      to_status: 'pending',
      notes: `Task created by ${taskData.created_by}`,
    });

    await this.logger.info(`Task created: ${task.id}`, { task });

    return task;
  }

  /**
   * Assign task to an agent
   */
  async assignTask(taskId: string, agentId: AgentId): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Check dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const dependenciesMet = await this.checkDependencies(task.dependencies);
      if (!dependenciesMet) {
        throw new Error('Task dependencies not met');
      }
    }

    // Update task
    await this.updateTaskStatus(taskId, 'assigned', agentId);

    // Update agent status
    await this.env.DB.prepare('UPDATE agents SET status = ?, current_task_id = ?, updated_at = ? WHERE id = ?')
      .bind('busy', taskId, Date.now(), agentId)
      .run();

    // Log history
    await this.logTaskHistory({
      task_id: taskId,
      agent_id: agentId,
      action: 'assigned',
      from_status: task.status,
      to_status: 'assigned',
      notes: `Task assigned to ${agentId}`,
    });

    await this.logger.info(`Task assigned: ${taskId} to ${agentId}`, { taskId, agentId });

    return await this.getTask(taskId) as Task;
  }

  /**
   * Start task execution
   */
  async startTask(taskId: string, agentId: AgentId): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.assigned_to !== agentId) {
      throw new Error('Task not assigned to this agent');
    }

    await this.env.DB.prepare('UPDATE tasks SET status = ?, started_at = ?, updated_at = ? WHERE id = ?')
      .bind('in_progress', Date.now(), Date.now(), taskId)
      .run();

    await this.logTaskHistory({
      task_id: taskId,
      agent_id: agentId,
      action: 'started',
      from_status: 'assigned',
      to_status: 'in_progress',
    });

    await this.logger.info(`Task started: ${taskId}`, { taskId, agentId });

    return await this.getTask(taskId) as Task;
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string, agentId: AgentId, outputData?: Record<string, unknown>): Promise<Task> {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    await this.env.DB.prepare(
      'UPDATE tasks SET status = ?, output_data = ?, completed_at = ?, updated_at = ? WHERE id = ?'
    )
      .bind('completed', outputData ? JSON.stringify(outputData) : null, Date.now(), Date.now(), taskId)
      .run();

    // Free up agent
    await this.env.DB.prepare('UPDATE agents SET status = ?, current_task_id = NULL, updated_at = ? WHERE id = ?')
      .bind('idle', Date.now(), agentId)
      .run();

    await this.logTaskHistory({
      task_id: taskId,
      agent_id: agentId,
      action: 'completed',
      from_status: 'in_progress',
      to_status: 'completed',
    });

    await this.logger.info(`Task completed: ${taskId}`, { taskId, agentId, outputData });

    return await this.getTask(taskId) as Task;
  }

  /**
   * Fail a task
   */
  async failTask(taskId: string, agentId: AgentId, errorMessage: string): Promise<Task> {
    await this.env.DB.prepare(
      'UPDATE tasks SET status = ?, error_message = ?, completed_at = ?, updated_at = ? WHERE id = ?'
    )
      .bind('failed', errorMessage, Date.now(), Date.now(), taskId)
      .run();

    // Free up agent
    await this.env.DB.prepare('UPDATE agents SET status = ?, current_task_id = NULL, updated_at = ? WHERE id = ?')
      .bind('idle', Date.now(), agentId)
      .run();

    await this.logTaskHistory({
      task_id: taskId,
      agent_id: agentId,
      action: 'failed',
      from_status: 'in_progress',
      to_status: 'failed',
      notes: errorMessage,
    });

    await this.logger.error(`Task failed: ${taskId}`, { taskId, agentId, errorMessage });

    return await this.getTask(taskId) as Task;
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    const result = await this.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first();

    if (!result) return null;

    return this.deserializeTask(result);
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: TaskStatus, limit = 50): Promise<Task[]> {
    const result = await this.env.DB.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY priority DESC, created_at ASC LIMIT ?')
      .bind(status, limit)
      .all();

    return result.results.map((row) => this.deserializeTask(row));
  }

  /**
   * Get tasks by agent
   */
  async getTasksByAgent(agentId: AgentId, limit = 50): Promise<Task[]> {
    const result = await this.env.DB.prepare('SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC LIMIT ?')
      .bind(agentId, limit)
      .all();

    return result.results.map((row) => this.deserializeTask(row));
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(taskId: string, status: TaskStatus, assignedTo?: AgentId): Promise<void> {
    if (assignedTo) {
      await this.env.DB.prepare('UPDATE tasks SET status = ?, assigned_to = ?, updated_at = ? WHERE id = ?')
        .bind(status, assignedTo, Date.now(), taskId)
        .run();
    } else {
      await this.env.DB.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
        .bind(status, Date.now(), taskId)
        .run();
    }
  }

  /**
   * Check if task dependencies are met
   */
  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    for (const depId of dependencies) {
      const task = await this.getTask(depId);
      if (!task || task.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Log task history
   */
  private async logTaskHistory(data: {
    task_id: string;
    agent_id?: AgentId;
    action: TaskHistoryEntry['action'];
    from_status?: TaskStatus;
    to_status?: TaskStatus;
    notes?: string;
  }): Promise<void> {
    const entry: TaskHistoryEntry = {
      id: crypto.randomUUID(),
      task_id: data.task_id,
      agent_id: data.agent_id,
      action: data.action,
      from_status: data.from_status,
      to_status: data.to_status,
      notes: data.notes,
      created_at: Date.now(),
    };

    await this.env.DB.prepare(
      `INSERT INTO task_history (id, task_id, agent_id, action, from_status, to_status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        entry.id,
        entry.task_id,
        entry.agent_id || null,
        entry.action,
        entry.from_status || null,
        entry.to_status || null,
        entry.notes || null,
        entry.created_at
      )
      .run();
  }

  /**
   * Deserialize task from database row
   */
  private deserializeTask(row: Record<string, unknown>): Task {
    return {
      ...row,
      dependencies: row.dependencies ? JSON.parse(row.dependencies as string) : undefined,
      input_data: row.input_data ? JSON.parse(row.input_data as string) : undefined,
      output_data: row.output_data ? JSON.parse(row.output_data as string) : undefined,
    } as Task;
  }
}
