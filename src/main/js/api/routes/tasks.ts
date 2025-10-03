/**
 * Task Management Routes
 */

import { Hono } from 'hono';
import type { Env, TaskType, TaskPriority } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { TaskQueueManager } from '../../core/task-queue';

export const taskRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all task routes
taskRoutes.use('*', authMiddleware);

/**
 * POST /tasks - Create task
 */
taskRoutes.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { type, title, description, priority, dependencies, input_data, deadline } = await c.req.json();

    if (!type || !title) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Type and title are required' },
        },
        400
      );
    }

    const taskQueue = new TaskQueueManager(c.env);

    const task = await taskQueue.createTask({
      type: type as TaskType,
      title,
      description,
      priority: priority as TaskPriority || 'medium',
      created_by: user.user_id,
      dependencies,
      input_data,
      deadline,
    });

    return c.json({
      success: true,
      data: task,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'CREATE_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /tasks - List tasks
 */
taskRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const limit = parseInt(c.req.query('limit') || '50');

    let query = 'SELECT * FROM tasks WHERE created_by = ?';
    const params: any[] = [user.user_id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY priority DESC, created_at DESC LIMIT ?';
    params.push(limit);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const tasks = result.results.map((row) => ({
      ...row,
      dependencies: row.dependencies ? JSON.parse(row.dependencies as string) : undefined,
      input_data: row.input_data ? JSON.parse(row.input_data as string) : undefined,
      output_data: row.output_data ? JSON.parse(row.output_data as string) : undefined,
    }));

    return c.json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'FETCH_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /tasks/:id - Get task details
 */
taskRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const taskId = c.req.param('id');

    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND created_by = ?')
      .bind(taskId, user.user_id)
      .first();

    if (!task) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Task not found' },
        },
        404
      );
    }

    // Get task history
    const history = await c.env.DB.prepare('SELECT * FROM task_history WHERE task_id = ? ORDER BY created_at DESC')
      .bind(taskId)
      .all();

    return c.json({
      success: true,
      data: {
        task: {
          ...task,
          dependencies: task.dependencies ? JSON.parse(task.dependencies as string) : undefined,
          input_data: task.input_data ? JSON.parse(task.input_data as string) : undefined,
          output_data: task.output_data ? JSON.parse(task.output_data as string) : undefined,
        },
        history: history.results,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'FETCH_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * PUT /tasks/:id/assign - Assign task to agent
 */
taskRoutes.put('/:id/assign', async (c) => {
  try {
    const user = c.get('user');
    const taskId = c.req.param('id');
    const { agent_id } = await c.req.json();

    if (!agent_id) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Agent ID is required' },
        },
        400
      );
    }

    // Verify task ownership
    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND created_by = ?')
      .bind(taskId, user.user_id)
      .first();

    if (!task) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Task not found' },
        },
        404
      );
    }

    // Verify agent exists
    const agent = await c.env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(agent_id).first();

    if (!agent) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
        },
        404
      );
    }

    const taskQueue = new TaskQueueManager(c.env);
    const updatedTask = await taskQueue.assignTask(taskId, agent_id);

    return c.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'ASSIGN_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * PUT /tasks/:id/status - Update task status
 */
taskRoutes.put('/:id/status', async (c) => {
  try {
    const user = c.get('user');
    const taskId = c.req.param('id');
    const { status, output_data, error_message } = await c.req.json();

    if (!status) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Status is required' },
        },
        400
      );
    }

    // Verify task ownership
    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND created_by = ?')
      .bind(taskId, user.user_id)
      .first();

    if (!task) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Task not found' },
        },
        404
      );
    }

    const taskQueue = new TaskQueueManager(c.env);
    let updatedTask;

    if (status === 'completed') {
      if (!task.assigned_to) {
        return c.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Cannot complete unassigned task' },
          },
          400
        );
      }
      updatedTask = await taskQueue.completeTask(taskId, task.assigned_to as any, output_data);
    } else if (status === 'failed') {
      if (!task.assigned_to) {
        return c.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Cannot fail unassigned task' },
          },
          400
        );
      }
      updatedTask = await taskQueue.failTask(taskId, task.assigned_to as any, error_message || 'Task failed');
    } else if (status === 'in_progress') {
      if (!task.assigned_to) {
        return c.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Cannot start unassigned task' },
          },
          400
        );
      }
      updatedTask = await taskQueue.startTask(taskId, task.assigned_to as any);
    } else {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid status transition' },
        },
        400
      );
    }

    return c.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'UPDATE_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});
