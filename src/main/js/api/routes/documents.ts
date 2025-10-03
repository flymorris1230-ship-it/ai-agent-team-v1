/**
 * Document Management Routes
 */

import { Hono } from 'hono';
import type { Env, JWTPayload } from '../../types';
import { authMiddleware } from '../middleware/auth';
import { RAGEngine } from '../../core/rag-engine';

export const documentRoutes = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// Apply auth middleware to all document routes
documentRoutes.use('*', authMiddleware);

/**
 * POST /documents - Upload document
 */
documentRoutes.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { title, content, content_type, source, source_url, category, tags } = await c.req.json();

    if (!title || !content) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Title and content are required' },
        },
        400
      );
    }

    // Create document
    const documentId = `doc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const ragEngine = new RAGEngine(c.env);

    // Create embedding and index document
    const embedding = await ragEngine.createEmbedding(content);
    const vectorId = `vec-${documentId}`;

    await c.env.VECTORIZE.insert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          document_id: documentId,
          title,
          content_type: content_type || 'text',
          category: category || null,
        },
      },
    ]);

    // Store document in database
    const now = Date.now();
    await c.env.DB.prepare(
      `INSERT INTO documents (id, title, content, content_type, source, source_url, category, tags, vector_id, user_id, indexed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        documentId,
        title,
        content,
        content_type || 'text',
        source || null,
        source_url || null,
        category || null,
        tags ? JSON.stringify(tags) : null,
        vectorId,
        user.user_id,
        now,
        now,
        now
      )
      .run();

    return c.json({
      success: true,
      data: {
        id: documentId,
        title,
        content_type: content_type || 'text',
        category,
        tags,
        indexed_at: now,
        created_at: now,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'UPLOAD_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});

/**
 * GET /documents - List documents
 */
documentRoutes.get('/', async (c) => {
  try {
    const user = c.get('user');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const category = c.req.query('category');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM documents WHERE user_id = ?';
    const params: any[] = [user.user_id];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const documents = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM documents WHERE user_id = ?';
    const countParams: any[] = [user.user_id];
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = (countResult?.total as number) || 0;

    return c.json({
      success: true,
      data: {
        documents: documents.results.map((doc) => ({
          ...doc,
          tags: doc.tags ? JSON.parse(doc.tags as string) : [],
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
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
 * GET /documents/:id - Get document
 */
documentRoutes.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const documentId = c.req.param('id');

    const document = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
      .bind(documentId, user.user_id)
      .first();

    if (!document) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        ...document,
        tags: document.tags ? JSON.parse(document.tags as string) : [],
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
 * DELETE /documents/:id - Delete document
 */
documentRoutes.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const documentId = c.req.param('id');

    const document = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
      .bind(documentId, user.user_id)
      .first();

    if (!document) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        },
        404
      );
    }

    // Delete vector
    if (document.vector_id) {
      await c.env.VECTORIZE.deleteByIds([document.vector_id as string]);
    }

    // Delete document
    await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(documentId).run();

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

/**
 * POST /documents/:id/reindex - Reindex document
 */
documentRoutes.post('/:id/reindex', async (c) => {
  try {
    const user = c.get('user');
    const documentId = c.req.param('id');

    const document = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?')
      .bind(documentId, user.user_id)
      .first();

    if (!document) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        },
        404
      );
    }

    const ragEngine = new RAGEngine(c.env);

    // Delete old vector
    if (document.vector_id) {
      await c.env.VECTORIZE.deleteByIds([document.vector_id as string]);
    }

    // Create new embedding
    const embedding = await ragEngine.createEmbedding(document.content as string);
    const vectorId = `vec-${documentId}-${Date.now()}`;

    await c.env.VECTORIZE.insert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          document_id: documentId,
          title: document.title as string,
          content_type: (document.content_type as string) || 'text',
          category: (document.category as string) || '',
        } as Record<string, string>,
      },
    ]);

    // Update document
    await c.env.DB.prepare('UPDATE documents SET vector_id = ?, indexed_at = ?, updated_at = ? WHERE id = ?')
      .bind(vectorId, Date.now(), Date.now(), documentId)
      .run();

    return c.json({
      success: true,
      data: {
        id: documentId,
        vector_id: vectorId,
        reindexed_at: Date.now(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { code: 'REINDEX_ERROR', message: (error as Error).message },
      },
      500
    );
  }
});
