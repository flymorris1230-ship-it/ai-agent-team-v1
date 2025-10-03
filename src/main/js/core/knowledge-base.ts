/**
 * Knowledge Base Manager
 * Handles document storage, retrieval, and RAG operations
 */

import type { Env, Document, DocumentChunk, KnowledgeEntry, KnowledgeEntryType, AgentId } from '../types';
import { Logger } from '../utils/logger';
import { RAGEngine } from './rag-engine';

export class KnowledgeBase {
  private logger: Logger;
  private ragEngine: RAGEngine;

  constructor(private env: Env) {
    this.logger = new Logger(env, 'KnowledgeBase');
    this.ragEngine = new RAGEngine(env);
  }

  /**
   * Create a knowledge entry (PRD, decision, best practice, etc.)
   */
  async createEntry(entryData: {
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

    // Create vector embedding using RAG engine
    const embedding = await this.ragEngine.createEmbedding(`${entry.title}\n\n${entry.content}`);
    const vectorId = `vec-${entry.id}`;

    // Insert vector into Vectorize
    await this.env.VECTORIZE.insert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          type: entry.type,
          title: entry.title,
          text: `${entry.title}\n\n${entry.content}`,
        },
      },
    ]);

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
   * Search knowledge base using semantic search
   */
  async search(
    query: string,
    options?: {
      top_k?: number;
      type?: KnowledgeEntryType;
      related_tasks?: string[];
      limit?: number;
    }
  ): Promise<KnowledgeEntry[]> {
    const topK = options?.top_k || options?.limit || 5;

    // Create query embedding using RAG engine
    const queryEmbedding = await this.ragEngine.createEmbedding(query);

    // Query Vectorize for similar entries
    const results = await this.env.VECTORIZE.query(queryEmbedding, {
      topK: topK * 2, // Get more to allow for filtering
      returnMetadata: true,
    });

    // Get full knowledge entries from database
    const entries: KnowledgeEntry[] = [];

    for (const match of results.matches) {
      // Apply type filter if specified
      if (options?.type && match.metadata?.type !== options.type) {
        continue;
      }

      // Try to get from knowledge_entries table
      const entry = await this.env.DB.prepare('SELECT * FROM knowledge_entries WHERE vector_id = ?')
        .bind(match.id)
        .first();

      if (entry) {
        const deserializedEntry = this.deserializeKnowledgeEntry(entry);

        // Apply related_tasks filter if specified
        if (options?.related_tasks) {
          const hasMatchingTask = options.related_tasks.some((task) =>
            deserializedEntry.related_tasks?.includes(task)
          );
          if (!hasMatchingTask) continue;
        }

        entries.push(deserializedEntry);

        // Stop when we have enough entries
        if (entries.length >= topK) break;
      }
    }

    return entries;
  }

  /**
   * Get knowledge entry by ID
   */
  async getEntry(entryId: string): Promise<KnowledgeEntry | null> {
    const result = await this.env.DB.prepare('SELECT * FROM knowledge_entries WHERE id = ?')
      .bind(entryId)
      .first();

    if (!result) return null;

    return this.deserializeKnowledgeEntry(result);
  }

  /**
   * Get knowledge entries by type
   */
  async getEntriesByType(type: KnowledgeEntryType, limit = 50): Promise<KnowledgeEntry[]> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM knowledge_entries WHERE type = ? ORDER BY created_at DESC LIMIT ?'
    )
      .bind(type, limit)
      .all();

    return result.results.map((row) => this.deserializeKnowledgeEntry(row));
  }

  /**
   * Update knowledge entry
   */
  async updateEntry(
    entryId: string,
    updates: {
      title?: string;
      content?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<KnowledgeEntry | null> {
    const entry = await this.getEntry(entryId);
    if (!entry) return null;

    const updatedEntry = {
      ...entry,
      ...updates,
      updated_at: Date.now(),
    };

    // If content changed, update vector
    if (updates.title || updates.content) {
      const text = `${updatedEntry.title}\n\n${updatedEntry.content}`;
      const embedding = await this.ragEngine.createEmbedding(text);

      // Delete old vector
      if (entry.vector_id) {
        await this.env.VECTORIZE.deleteByIds([entry.vector_id]);
      }

      // Insert new vector
      const vectorId = `vec-${entryId}`;
      await this.env.VECTORIZE.insert([
        {
          id: vectorId,
          values: embedding,
          metadata: {
            type: updatedEntry.type,
            title: updatedEntry.title,
            text,
          },
        },
      ]);

      updatedEntry.vector_id = vectorId;
    }

    // Update database
    await this.env.DB.prepare(
      `UPDATE knowledge_entries
       SET title = ?, content = ?, tags = ?, metadata = ?, vector_id = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        updatedEntry.title,
        updatedEntry.content,
        updatedEntry.tags ? JSON.stringify(updatedEntry.tags) : null,
        updatedEntry.metadata ? JSON.stringify(updatedEntry.metadata) : null,
        updatedEntry.vector_id || null,
        updatedEntry.updated_at,
        entryId
      )
      .run();

    return updatedEntry;
  }

  /**
   * Delete knowledge entry
   */
  async deleteEntry(entryId: string): Promise<boolean> {
    const entry = await this.getEntry(entryId);
    if (!entry) return false;

    // Delete vector
    if (entry.vector_id) {
      await this.env.VECTORIZE.deleteByIds([entry.vector_id]);
    }

    // Delete from database
    await this.env.DB.prepare('DELETE FROM knowledge_entries WHERE id = ?').bind(entryId).run();

    await this.logger.info(`Knowledge entry deleted: ${entryId}`);

    return true;
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
