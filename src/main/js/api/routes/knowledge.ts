/**
 * Knowledge Base Routes
 */

import { Hono } from 'hono';
import type { Env, KnowledgeEntryType, AgentId } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { KnowledgeBase } from '../../core/knowledge-base';

export const knowledgeRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all knowledge routes
knowledgeRoutes.use('*', authMiddleware);

/**
 * POST /knowledge - Create knowledge entry
 */
knowledgeRoutes.post('/', async (c) => {
  try {
    const { type, title, content, tags, related_tasks, author_agent_id, metadata } = await c.req.json();

    if (!type || !title || !content) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Type, title, and content are required' },
        },
        400
      );
    }

    const knowledgeBase = new KnowledgeBase(c.env);

    const entry = await knowledgeBase.createEntry({
      type: type as KnowledgeEntryType,
      title,
      content,
      tags,
      related_tasks,
      author_agent_id: author_agent_id as AgentId,
      metadata,
    });

    return c.json({
      success: true,
      data: entry,
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
 * GET /knowledge - Search knowledge base
 */
knowledgeRoutes.get('/', async (c) => {
  try {
    const query = c.req.query('q');
    const type = c.req.query('type') as KnowledgeEntryType | undefined;
    const limit = parseInt(c.req.query('limit') || '10');

    if (!query) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Search query is required' },
        },
        400
      );
    }

    const knowledgeBase = new KnowledgeBase(c.env);

    const results = await knowledgeBase.search(query, {
      top_k: limit,
      type,
    });

    return c.json({
      success: true,
      data: {
        query,
        results,
        count: results.length,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'SEARCH_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /knowledge/:id - Get knowledge entry
 */
knowledgeRoutes.get('/:id', async (c) => {
  try {
    const entryId = c.req.param('id');

    const knowledgeBase = new KnowledgeBase(c.env);
    const entry = await knowledgeBase.getEntry(entryId);

    if (!entry) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Knowledge entry not found' },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: entry,
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
 * PUT /knowledge/:id - Update knowledge entry
 */
knowledgeRoutes.put('/:id', async (c) => {
  try {
    const entryId = c.req.param('id');
    const { title, content, tags, metadata } = await c.req.json();

    const knowledgeBase = new KnowledgeBase(c.env);

    const entry = await knowledgeBase.getEntry(entryId);
    if (!entry) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Knowledge entry not found' },
        },
        404
      );
    }

    const updatedEntry = await knowledgeBase.updateEntry(entryId, {
      title,
      content,
      tags,
      metadata,
    });

    return c.json({
      success: true,
      data: updatedEntry,
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

/**
 * DELETE /knowledge/:id - Delete knowledge entry
 */
knowledgeRoutes.delete('/:id', async (c) => {
  try {
    const entryId = c.req.param('id');

    const knowledgeBase = new KnowledgeBase(c.env);
    const deleted = await knowledgeBase.deleteEntry(entryId);

    if (!deleted) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Knowledge entry not found' },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'DELETE_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});
