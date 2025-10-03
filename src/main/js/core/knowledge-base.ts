/**
 * Knowledge Base Manager
 * Handles document storage, retrieval, and RAG operations
 */

import type { Env, Document, DocumentChunk, KnowledgeEntry, KnowledgeEntryType, AgentId } from '../types';
import { Logger } from '../utils/logger';

export class KnowledgeBaseManager {
  private logger: Logger;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'KnowledgeBaseManager');
  }

  /**
   * Ingest a document into the knowledge base
   */
  async ingestDocument(documentData: {
    title: string;
    content: string;
    content_type?: string;
    source?: string;
    source_url?: string;
    category?: string;
    tags?: string[];
    user_id?: string;
    agent_id?: AgentId;
    metadata?: Record<string, unknown>;
  }): Promise<Document> {
    const document: Document = {
      id: `doc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      title: documentData.title,
      content: documentData.content,
      content_type: documentData.content_type || 'text',
      source: documentData.source || 'upload',
      source_url: documentData.source_url,
      category: documentData.category,
      tags: documentData.tags,
      user_id: documentData.user_id,
      agent_id: documentData.agent_id,
      metadata: documentData.metadata,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Store document in database
    await this.env.DB.prepare(
      `INSERT INTO documents (id, title, content, content_type, source, source_url, category, tags, user_id, agent_id, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        document.id,
        document.title,
        document.content,
        document.content_type || null,
        document.source || null,
        document.source_url || null,
        document.category || null,
        document.tags ? JSON.stringify(document.tags) : null,
        document.user_id || null,
        document.agent_id || null,
        document.metadata ? JSON.stringify(document.metadata) : null,
        document.created_at,
        document.updated_at
      )
      .run();

    // Chunk and vectorize the document
    await this.chunkAndVectorize(document);

    await this.logger.info(`Document ingested: ${document.id}`, { documentId: document.id }, document.agent_id);

    return document;
  }

  /**
   * Chunk document and create vector embeddings
   */
  private async chunkAndVectorize(document: Document): Promise<void> {
    const chunks = this.chunkText(document.content);

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `chunk-${document.id}-${i}`;

      // Create embedding using Vectorize (simplified - actual implementation would use AI model)
      const vectorId = await this.createEmbedding(chunks[i], {
        document_id: document.id,
        chunk_index: i,
        title: document.title,
        category: document.category,
      });

      // Store chunk in database
      const chunk: DocumentChunk = {
        id: chunkId,
        document_id: document.id,
        chunk_index: i,
        content: chunks[i],
        vector_id: vectorId,
        metadata: {
          document_title: document.title,
          category: document.category,
        },
        created_at: Date.now(),
      };

      await this.env.DB.prepare(
        `INSERT INTO document_chunks (id, document_id, chunk_index, content, vector_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          chunk.id,
          chunk.document_id,
          chunk.chunk_index,
          chunk.content,
          chunk.vector_id || null,
          chunk.metadata ? JSON.stringify(chunk.metadata) : null,
          chunk.created_at
        )
        .run();
    }

    // Update document with indexed timestamp
    await this.env.DB.prepare('UPDATE documents SET indexed_at = ? WHERE id = ?').bind(Date.now(), document.id).run();

    await this.logger.info(`Document chunked and vectorized: ${document.id}`, { chunks: chunks.length });
  }

  /**
   * Chunk text into smaller pieces for RAG
   */
  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const chunk = text.slice(position, position + chunkSize);
      chunks.push(chunk);
      position += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Create vector embedding (placeholder - would use actual embedding model)
   */
  private async createEmbedding(text: string, metadata: Record<string, unknown>): Promise<string> {
    const vectorId = `vec-${crypto.randomUUID()}`;

    // In production, this would:
    // 1. Call an embedding model (OpenAI, Cohere, etc.)
    // 2. Get the vector representation
    // 3. Insert into Vectorize index
    // For now, we'll create a placeholder

    try {
      // Simplified: Create a mock vector (in production, use actual embedding model)
      const mockVector = Array(1536).fill(0).map(() => Math.random());

      // Insert into Vectorize
      await this.env.VECTORIZE.insert([
        {
          id: vectorId,
          values: mockVector,
          metadata: {
            text,
            ...metadata,
          },
        },
      ]);
    } catch (error) {
      await this.logger.error('Failed to create embedding', { error, text: text.slice(0, 100) });
    }

    return vectorId;
  }

  /**
   * Search knowledge base using semantic search
   */
  async search(query: string, options?: { top_k?: number; filter?: Record<string, unknown> }): Promise<
    Array<{
      document_id: string;
      chunk_id: string;
      content: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>
  > {
    const topK = options?.top_k || 5;

    // Create query embedding
    const queryVectorId = await this.createEmbedding(query, { type: 'query' });

    // Query Vectorize for similar chunks
    const results = await this.env.VECTORIZE.query(queryVectorId as unknown as number[], {
      topK,
      returnMetadata: true,
    });

    // Map results to response format
    return results.matches.map((match: { id: string; score: number; metadata?: Record<string, unknown> }) => ({
      document_id: match.metadata?.document_id as string,
      chunk_id: match.id,
      content: match.metadata?.text as string,
      score: match.score,
      metadata: match.metadata,
    }));
  }

  /**
   * Create a knowledge entry (PRD, decision, best practice, etc.)
   */
  async createKnowledgeEntry(entryData: {
    type: KnowledgeEntryType;
    title: string;
    content: string;
    tags?: string[];
    related_tasks?: string[];
    author_agent_id?: AgentId;
    metadata?: Record<string, unknown>;
  }): Promise<KnowledgeEntry> {
    const entry: KnowledgeEntry = {
      id: `kb-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      type: entryData.type,
      title: entryData.title,
      content: entryData.content,
      tags: entryData.tags,
      related_tasks: entryData.related_tasks,
      author_agent_id: entryData.author_agent_id,
      metadata: entryData.metadata,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Create vector embedding
    const vectorId = await this.createEmbedding(`${entry.title}\n\n${entry.content}`, {
      type: entry.type,
      title: entry.title,
    });

    entry.vector_id = vectorId;

    // Store in database
    await this.env.DB.prepare(
      `INSERT INTO knowledge_entries (id, type, title, content, tags, related_tasks, author_agent_id, vector_id, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        entry.id,
        entry.type,
        entry.title,
        entry.content,
        entry.tags ? JSON.stringify(entry.tags) : null,
        entry.related_tasks ? JSON.stringify(entry.related_tasks) : null,
        entry.author_agent_id || null,
        entry.vector_id || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.created_at,
        entry.updated_at
      )
      .run();

    await this.logger.info(`Knowledge entry created: ${entry.id}`, { type: entry.type }, entry.author_agent_id);

    return entry;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    const result = await this.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(documentId).first();

    if (!result) return null;

    return this.deserializeDocument(result);
  }

  /**
   * Search knowledge entries by type
   */
  async getKnowledgeEntriesByType(type: KnowledgeEntryType, limit = 50): Promise<KnowledgeEntry[]> {
    const result = await this.env.DB.prepare('SELECT * FROM knowledge_entries WHERE type = ? ORDER BY created_at DESC LIMIT ?')
      .bind(type, limit)
      .all();

    return result.results.map((row) => this.deserializeKnowledgeEntry(row));
  }

  /**
   * Deserialize document from database row
   */
  private deserializeDocument(row: Record<string, unknown>): Document {
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    } as Document;
  }

  /**
   * Deserialize knowledge entry from database row
   */
  private deserializeKnowledgeEntry(row: Record<string, unknown>): KnowledgeEntry {
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags as string) : undefined,
      related_tasks: row.related_tasks ? JSON.parse(row.related_tasks as string) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    } as KnowledgeEntry;
  }
}
