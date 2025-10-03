/**
 * Agent Management Routes
 */

import { Hono } from 'hono';
import type { Env, AgentId } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { TaskQueueManager } from '../../core/task-queue';

export const agentRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all agent routes
agentRoutes.use('*', authMiddleware);

/**
 * GET /agents - List all agents
 */
agentRoutes.get('/', async (c) => {
  try {
    const status = c.req.query('status');

    let query = 'SELECT * FROM agents';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY name ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const agents = result.results.map((agent) => ({
      ...agent,
      capabilities: agent.capabilities ? JSON.parse(agent.capabilities as string) : [],
      performance_metrics: agent.performance_metrics
        ? JSON.parse(agent.performance_metrics as string)
        : {},
    }));

    return c.json({
      success: true,
      data: {
        agents,
        count: agents.length,
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
 * GET /agents/:id - Get agent details
 */
agentRoutes.get('/:id', async (c) => {
  try {
    const agentId = c.req.param('id');

    const agent = await c.env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(agentId).first();

    if (!agent) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        ...agent,
        capabilities: agent.capabilities ? JSON.parse(agent.capabilities as string) : [],
        performance_metrics: agent.performance_metrics
          ? JSON.parse(agent.performance_metrics as string)
          : {},
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
 * GET /agents/:id/metrics - Get agent performance metrics
 */
agentRoutes.get('/:id/metrics', async (c) => {
  try {
    const agentId = c.req.param('id') as AgentId;

    const agent = await c.env.DB.prepare('SELECT * FROM agents WHERE id = ?').bind(agentId).first();

    if (!agent) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
        },
        404
      );
    }

    // Get task statistics
    const taskQueue = new TaskQueueManager(c.env);
    const allTasks = await taskQueue.getTasksByAgent(agentId, 1000);

    const completedTasks = allTasks.filter((t) => t.status === 'completed');
    const failedTasks = allTasks.filter((t) => t.status === 'failed');
    const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress');

    // Calculate average completion time
    const completionTimes = completedTasks
      .filter((t) => t.started_at && t.completed_at)
      .map((t) => (t.completed_at! - t.started_at!) / 1000); // in seconds

    const avgCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    const successRate =
      allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    const metrics = {
      total_tasks: allTasks.length,
      completed_tasks: completedTasks.length,
      failed_tasks: failedTasks.length,
      in_progress_tasks: inProgressTasks.length,
      success_rate: parseFloat(successRate.toFixed(2)),
      avg_completion_time: parseFloat(avgCompletionTime.toFixed(2)),
      last_active: agent.updated_at,
      status: agent.status,
      current_task_id: agent.current_task_id,
    };

    return c.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'METRICS_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /agents/:id/tasks - Get agent tasks
 */
agentRoutes.get('/:id/tasks', async (c) => {
  try {
    const agentId = c.req.param('id') as AgentId;
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');

    // Verify agent exists
    const agent = await c.env.DB.prepare('SELECT id FROM agents WHERE id = ?').bind(agentId).first();

    if (!agent) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Agent not found' },
        },
        404
      );
    }

    // Get tasks
    let query = 'SELECT * FROM tasks WHERE assigned_to = ?';
    const params: any[] = [agentId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
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
        agent_id: agentId,
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
