/**
 * Chat Routes - RAG-powered chat endpoints
 */

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { RAGEngine } from '../../core/rag-engine';

export const chatRoutes = new Hono<{ Bindings: Env }>();

// Apply auth middleware to all chat routes
chatRoutes.use('*', authMiddleware);

/**
 * POST /chat - Send message and get RAG response
 */
chatRoutes.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { conversation_id, message } = await c.req.json();

    if (!message) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Message is required' },
        },
        400
      );
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      convId = `conv-${Date.now()}`;
      await c.env.DB.prepare(
        `INSERT INTO conversations (id, user_id, title, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(convId, user.user_id, 'New Conversation', 'active', Date.now(), Date.now())
        .run();
    }

    // Save user message
    const userMessageId = `msg-${Date.now()}-user`;
    await c.env.DB.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(userMessageId, convId, 'user', message, Date.now())
      .run();

    // Get conversation history
    const history = await c.env.DB.prepare(
      `SELECT role, content FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at DESC LIMIT 10`
    )
      .bind(convId)
      .all();

    // Generate RAG response
    const ragEngine = new RAGEngine(c.env);
    const result = await ragEngine.generateAnswer({
      query: message,
      top_k: 5,
      conversation_history: history.results.map((msg) => ({
        id: '',
        conversation_id: convId,
        role: msg.role as 'user' | 'assistant',
        content: msg.content as string,
        created_at: Date.now(),
      })),
    });

    // Save assistant message
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    await c.env.DB.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        assistantMessageId,
        convId,
        'assistant',
        result.answer,
        JSON.stringify({ sources: result.sources, confidence: result.confidence }),
        Date.now()
      )
      .run();

    return c.json({
      success: true,
      data: {
        message_id: assistantMessageId,
        conversation_id: convId,
        content: result.answer,
        sources: result.sources,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'CHAT_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /chat/conversations - Get user conversations
 */
chatRoutes.get('/conversations', async (c) => {
  try {
    const user = c.get('user');

    const conversations = await c.env.DB.prepare(
      `SELECT * FROM conversations
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 50`
    )
      .bind(user.user_id)
      .all();

    return c.json({
      success: true,
      data: {
        conversations: conversations.results,
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
 * GET /chat/conversations/:id - Get conversation messages
 */
chatRoutes.get('/conversations/:id', async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    // Verify ownership
    const conversation = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
      .bind(conversationId, user.user_id)
      .first();

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        },
        404
      );
    }

    // Get messages
    const messages = await c.env.DB.prepare(
      `SELECT * FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
      .bind(conversationId)
      .all();

    return c.json({
      success: true,
      data: {
        conversation,
        messages: messages.results,
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
 * DELETE /chat/conversations/:id - Delete conversation
 */
chatRoutes.delete('/conversations/:id', async (c) => {
  try {
    const user = c.get('user');
    const conversationId = c.req.param('id');

    // Verify ownership
    const conversation = await c.env.DB.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?')
      .bind(conversationId, user.user_id)
      .first();

    if (!conversation) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Conversation not found' },
        },
        404
      );
    }

    // Delete messages and conversation
    await c.env.DB.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(conversationId).run();
    await c.env.DB.prepare('DELETE FROM conversations WHERE id = ?').bind(conversationId).run();

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
