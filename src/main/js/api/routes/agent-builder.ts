/**
 * Agent Builder API Routes
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { AgentBuilderSystem } from '../../core/agent-builder';

export const agentBuilderRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware
agentBuilderRoutes.use('*', authMiddleware);

/**
 * POST /agent-builder/agents - Create custom agent
 */
agentBuilderRoutes.post('/agents', async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const agentBuilder = new AgentBuilderSystem(c.env);
    const agent = await agentBuilder.createAgent(userId, body);

    return c.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'CREATE_AGENT_ERROR', message: (error as Error).message },
      },
      400
    );
  }
});

/**
 * GET /agent-builder/agents - List user's custom agents
 */
agentBuilderRoutes.get('/agents', async (c) => {
  try {
    const userId = c.get('userId');
    const includePublic = c.req.query('include_public') === 'true';

    const agentBuilder = new AgentBuilderSystem(c.env);
    const agents = await agentBuilder.listUserAgents(userId, includePublic);

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
        error: { code: 'LIST_AGENTS_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /agent-builder/agents/:id - Get agent details
 */
agentBuilderRoutes.get('/agents/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const agentId = c.req.param('id');

    const agentBuilder = new AgentBuilderSystem(c.env);
    const agent = await agentBuilder.getAgent(agentId, userId);

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
      data: agent,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'GET_AGENT_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * PUT /agent-builder/agents/:id - Update agent
 */
agentBuilderRoutes.put('/agents/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const agentId = c.req.param('id');
    const body = await c.req.json();

    const agentBuilder = new AgentBuilderSystem(c.env);
    const agent = await agentBuilder.updateAgent(agentId, userId, body);

    return c.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'UPDATE_AGENT_ERROR', message: (error as Error).message },
      },
        400
    );
  }
});

/**
 * DELETE /agent-builder/agents/:id - Delete agent
 */
agentBuilderRoutes.delete('/agents/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const agentId = c.req.param('id');

    const agentBuilder = new AgentBuilderSystem(c.env);
    await agentBuilder.deleteAgent(agentId, userId);

    return c.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'DELETE_AGENT_ERROR', message: (error as Error).message },
      },
      400
    );
  }
});

/**
 * GET /agent-builder/templates - List available templates
 */
agentBuilderRoutes.get('/templates', async (c) => {
  try {
    const category = c.req.query('category');

    const agentBuilder = new AgentBuilderSystem(c.env);
    const templates = await agentBuilder.listTemplates(category);

    return c.json({
      success: true,
      data: {
        templates,
        count: templates.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'LIST_TEMPLATES_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * POST /agent-builder/templates/:id/clone - Clone agent from template
 */
agentBuilderRoutes.post('/templates/:id/clone', async (c) => {
  try {
    const userId = c.get('userId');
    const templateId = c.req.param('id');
    const body = await c.req.json();

    const agentBuilder = new AgentBuilderSystem(c.env);
    const agent = await agentBuilder.cloneFromTemplate(templateId, userId, body.name);

    return c.json({
      success: true,
      data: agent,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'CLONE_TEMPLATE_ERROR', message: (error as Error).message },
      },
      400
    );
  }
});
