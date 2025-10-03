/**
 * AI Agent Team - Main Entry Point
 * Cloudflare Workers Application
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, APIResponse } from './types';
import { CoordinatorAgent } from './agents/coordinator';
import { BackendDeveloperAgent } from './agents/backend-developer';
import { TaskQueueManager } from './core/task-queue';
import { KnowledgeBaseManager } from './core/knowledge-base';
import { Logger } from './utils/logger';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('/*', cors());

// ==========================================
// Health Check
// ==========================================
app.get('/health', (c) => {
  return c.json({
    success: true,
    data: {
      status: 'healthy',
      environment: c.env.ENVIRONMENT,
      timestamp: Date.now(),
    },
  } as APIResponse);
});

// ==========================================
// Task Management Endpoints
// ==========================================

/**
 * Create a new task
 */
app.post('/api/tasks', async (c) => {
  try {
    const body = await c.req.json();
    const taskQueue = new TaskQueueManager(c.env);

    const task = await taskQueue.createTask({
      type: body.type,
      title: body.title,
      description: body.description,
      priority: body.priority,
      created_by: body.created_by || 'user',
      dependencies: body.dependencies,
      input_data: body.input_data,
      deadline: body.deadline,
    });

    return c.json({
      success: true,
      data: task,
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'TASK_CREATE_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

/**
 * Get task by ID
 */
app.get('/api/tasks/:id', async (c) => {
  try {
    const taskId = c.req.param('id');
    const taskQueue = new TaskQueueManager(c.env);
    const task = await taskQueue.getTask(taskId);

    if (!task) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found',
          },
        } as APIResponse,
        404
      );
    }

    return c.json({
      success: true,
      data: task,
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'TASK_FETCH_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

/**
 * Get tasks by status
 */
app.get('/api/tasks/status/:status', async (c) => {
  try {
    const status = c.req.param('status');
    const taskQueue = new TaskQueueManager(c.env);
    const tasks = await taskQueue.getTasksByStatus(status as any);

    return c.json({
      success: true,
      data: tasks,
      metadata: { timestamp: Date.now(), count: tasks.length },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'TASKS_FETCH_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

// ==========================================
// Coordinator Endpoints
// ==========================================

/**
 * Process user request through coordinator
 */
app.post('/api/coordinator/process', async (c) => {
  try {
    const body = await c.req.json();
    const coordinator = new CoordinatorAgent(c.env);

    const result = await coordinator.processUserRequest({
      user_id: body.user_id || 'anonymous',
      description: body.description,
      priority: body.priority,
      deadline: body.deadline,
    });

    return c.json({
      success: true,
      data: result,
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'COORDINATOR_PROCESS_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

/**
 * Distribute pending tasks to agents
 */
app.post('/api/coordinator/distribute', async (c) => {
  try {
    const coordinator = new CoordinatorAgent(c.env);
    await coordinator.distributeTasks();

    return c.json({
      success: true,
      data: { message: 'Tasks distributed successfully' },
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'TASK_DISTRIBUTION_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

/**
 * Get progress monitoring report
 */
app.get('/api/coordinator/progress', async (c) => {
  try {
    const coordinator = new CoordinatorAgent(c.env);
    const report = await coordinator.monitorProgress();

    return c.json({
      success: true,
      data: report,
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'PROGRESS_MONITOR_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

// ==========================================
// Knowledge Base Endpoints
// ==========================================

/**
 * Ingest document
 */
app.post('/api/knowledge/documents', async (c) => {
  try {
    const body = await c.req.json();
    const kb = new KnowledgeBaseManager(c.env);

    const document = await kb.ingestDocument({
      title: body.title,
      content: body.content,
      content_type: body.content_type,
      source: body.source,
      source_url: body.source_url,
      category: body.category,
      tags: body.tags,
      user_id: body.user_id,
      metadata: body.metadata,
    });

    return c.json({
      success: true,
      data: document,
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DOCUMENT_INGEST_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

/**
 * Search knowledge base
 */
app.post('/api/knowledge/search', async (c) => {
  try {
    const body = await c.req.json();
    const kb = new KnowledgeBaseManager(c.env);

    const results = await kb.search(body.query, {
      top_k: body.top_k,
      filter: body.filter,
    });

    return c.json({
      success: true,
      data: results,
      metadata: { timestamp: Date.now(), count: results.length },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

/**
 * Get document by ID
 */
app.get('/api/knowledge/documents/:id', async (c) => {
  try {
    const documentId = c.req.param('id');
    const kb = new KnowledgeBaseManager(c.env);
    const document = await kb.getDocument(documentId);

    if (!document) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found',
          },
        } as APIResponse,
        404
      );
    }

    return c.json({
      success: true,
      data: document,
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'DOCUMENT_FETCH_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

// ==========================================
// Agent Endpoints
// ==========================================

/**
 * Get agent metrics
 */
app.get('/api/agents/:id/metrics', async (c) => {
  try {
    const agentId = c.req.param('id');
    const coordinator = new CoordinatorAgent(c.env);
    const metrics = await coordinator.getAgentMetrics(agentId as any);

    return c.json({
      success: true,
      data: metrics,
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'METRICS_FETCH_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

/**
 * Trigger backend developer agent
 */
app.post('/api/agents/backend-dev/process', async (c) => {
  try {
    const backendDev = new BackendDeveloperAgent(c.env);
    await backendDev.processTasks();

    return c.json({
      success: true,
      data: { message: 'Backend developer tasks processed' },
      metadata: { timestamp: Date.now() },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'BACKEND_DEV_PROCESS_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

// ==========================================
// System Logs Endpoints
// ==========================================

/**
 * Query system logs
 */
app.get('/api/logs', async (c) => {
  try {
    const query = c.req.query();
    const logs = await Logger.queryLogs(c.env, {
      level: query.level as any,
      component: query.component,
      agent_id: query.agent_id as any,
      task_id: query.task_id,
      limit: query.limit ? parseInt(query.limit) : 100,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return c.json({
      success: true,
      data: logs,
      metadata: { timestamp: Date.now(), count: logs.length },
    } as APIResponse);
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'LOGS_FETCH_FAILED',
          message: (error as Error).message,
        },
      } as APIResponse,
      500
    );
  }
});

// ==========================================
// Export Cloudflare Workers Handler
// ==========================================
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async queue(batch: MessageBatch, env: Env): Promise<void> {
    const logger = new Logger(env, 'QueueHandler');
    await logger.info(`Processing queue batch with ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      try {
        const data = message.body as any;

        if (data.type === 'task_assignment') {
          // Handle task assignment
          const coordinator = new CoordinatorAgent(env);
          await coordinator.distributeTasks();
        } else if (data.type === 'backup') {
          // Handle backup tasks
          await logger.info('Processing backup task', { data });
        }

        message.ack();
      } catch (error) {
        await logger.error('Queue message processing failed', { error, message });
        message.retry();
      }
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const logger = new Logger(env, 'ScheduledHandler');
    await logger.info(`Running scheduled event at ${new Date(event.scheduledTime).toISOString()}`);

    // Distribute pending tasks
    const coordinator = new CoordinatorAgent(env);
    await coordinator.distributeTasks();

    // Monitor progress
    const report = await coordinator.monitorProgress();
    await logger.info('Scheduled progress report', { report });
  },
};
