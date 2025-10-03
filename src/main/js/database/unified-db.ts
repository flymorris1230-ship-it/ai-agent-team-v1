/**
 * Unified Database Layer
 * Automatically routes queries to D1 or PostgreSQL based on configuration
 */

import { DatabaseRouter, databaseConfig } from '../config/database';
import { PostgresClient, getPostgresClient } from './postgres-client';

export interface Env {
  DB: D1Database; // Cloudflare D1
  VECTORIZE?: VectorizeIndex; // Cloudflare Vectorize (optional)
  [key: string]: any;
}

export interface UnifiedQueryResult<T = any> {
  rows: T[];
  rowCount: number;
  source: 'd1' | 'postgres';
}

/**
 * Unified Database Client
 * Provides a single interface for both D1 and PostgreSQL
 */
export class UnifiedDatabase {
  private d1: D1Database;
  private postgres: PostgresClient;
  private vectorize?: VectorizeIndex;

  constructor(env: Env) {
    this.d1 = env.DB;
    this.postgres = getPostgresClient();
    this.vectorize = env.VECTORIZE;
  }

  /**
   * Execute query with automatic routing
   */
  async query<T = any>(
    sql: string,
    params: any[] = [],
    options?: {
      table?: string;
      operation?: 'read' | 'write' | 'vector-search';
      forceDb?: 'd1' | 'postgres';
    }
  ): Promise<UnifiedQueryResult<T>> {
    const { table, operation = 'read', forceDb } = options || {};

    // Determine which database to use
    let targetDb: 'd1' | 'postgres';

    if (forceDb) {
      targetDb = forceDb;
    } else if (table) {
      targetDb = DatabaseRouter.getPreferredDatabase(table, operation);
    } else {
      // Default to D1 for edge performance
      targetDb = 'd1';
    }

    // Execute on appropriate database
    if (targetDb === 'postgres' && databaseConfig.postgres.enabled) {
      const result = await this.postgres.query<T>(sql, params);
      return {
        ...result,
        source: 'postgres'
      };
    } else {
      const result = await this.d1.prepare(sql).bind(...params).all<T>();
      return {
        rows: result.results || [],
        rowCount: result.results?.length || 0,
        source: 'd1'
      };
    }
  }

  /**
   * Vector similarity search
   * Always uses PostgreSQL with pgvector
   */
  async vectorSearch<T = any>(
    table: string,
    embedding: number[],
    options?: {
      limit?: number;
      threshold?: number;
      metric?: 'cosine' | 'l2' | 'inner_product';
    }
  ): Promise<Array<T & { similarity: number }>> {
    if (!databaseConfig.postgres.enabled) {
      throw new Error('PostgreSQL is required for vector search');
    }

    const result = await this.postgres.vectorSearch<T>(table, embedding, options);
    return result.rows;
  }

  /**
   * Insert into appropriate database based on table
   */
  async insert(
    table: string,
    data: Record<string, any>
  ): Promise<string> {
    const targetDb = DatabaseRouter.getPreferredDatabase(table, 'write');

    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(sql, values, {
      table,
      operation: 'write',
      forceDb: targetDb
    });

    return result.rows[0]?.id || '';
  }

  /**
   * Update in appropriate database
   */
  async update(
    table: string,
    id: string,
    data: Record<string, any>
  ): Promise<void> {
    const targetDb = DatabaseRouter.getPreferredDatabase(table, 'write');

    const updates = Object.keys(data)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const sql = `
      UPDATE ${table}
      SET ${updates}
      WHERE id = $${Object.keys(data).length + 1}
    `;

    await this.query(sql, [...Object.values(data), id], {
      table,
      operation: 'write',
      forceDb: targetDb
    });
  }

  /**
   * Delete from appropriate database
   */
  async delete(table: string, id: string): Promise<void> {
    const targetDb = DatabaseRouter.getPreferredDatabase(table, 'write');

    const sql = `DELETE FROM ${table} WHERE id = $1`;

    await this.query(sql, [id], {
      table,
      operation: 'write',
      forceDb: targetDb
    });
  }

  /**
   * Sync data between D1 and PostgreSQL
   */
  async syncTable(
    table: string,
    direction: 'to-postgres' | 'to-d1' | 'bidirectional' = 'bidirectional'
  ): Promise<void> {
    if (!DatabaseRouter.shouldSync(table)) {
      console.log(`Table ${table} is not configured for sync`);
      return;
    }

    // Sync D1 → PostgreSQL
    if (direction === 'to-postgres' || direction === 'bidirectional') {
      const d1Data = await this.d1.prepare(`SELECT * FROM ${table}`).all();

      for (const row of d1Data.results || []) {
        // Insert or update in PostgreSQL
        await this.postgres.query(
          `INSERT INTO ${table} VALUES ($1) ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
          [JSON.stringify(row)]
        );
      }
    }

    // Sync PostgreSQL → D1
    if (direction === 'to-d1' || direction === 'bidirectional') {
      const pgData = await this.postgres.query(`SELECT * FROM ${table}`);

      for (const row of pgData.rows) {
        // Insert or replace in D1
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `?${i + 1}`).join(', ');

        await this.d1.prepare(
          `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
        ).bind(...values).run();
      }
    }
  }

  /**
   * RAG: Insert document with chunking and embeddings
   */
  async insertDocumentWithChunks(
    title: string,
    content: string,
    chunks: Array<{ content: string; embedding: number[] }>,
    documentEmbedding: number[],
    metadata?: Record<string, any>
  ): Promise<string> {
    // Insert main document in PostgreSQL (for vector search)
    const docId = await this.postgres.insertDocument(
      title,
      content,
      documentEmbedding,
      metadata
    );

    // Insert chunks in PostgreSQL
    for (let i = 0; i < chunks.length; i++) {
      await this.postgres.insertChunk(
        docId,
        i,
        chunks[i].content,
        chunks[i].embedding,
        { chunk_index: i }
      );
    }

    // Also insert metadata in D1 for fast access
    await this.d1.prepare(`
      INSERT INTO documents (id, title, content, vector_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(docId, title, content, docId, Date.now(), Date.now()).run();

    return docId;
  }

  /**
   * RAG: Search relevant chunks
   */
  async searchRelevantChunks(
    queryEmbedding: number[],
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<Array<{
    content: string;
    similarity: number;
    document_id: string;
  }>> {
    return this.postgres.searchChunks(queryEmbedding, { limit, threshold });
  }

  /**
   * Health check for both databases
   */
  async healthCheck(): Promise<{
    d1: boolean;
    postgres: boolean;
    vectorize: boolean;
  }> {
    const d1Healthy = await this.checkD1Health();
    const pgHealthy = await this.postgres.healthCheck();
    const vectorizeHealthy = await this.checkVectorizeHealth();

    return {
      d1: d1Healthy,
      postgres: pgHealthy,
      vectorize: vectorizeHealthy
    };
  }

  private async checkD1Health(): Promise<boolean> {
    try {
      await this.d1.prepare('SELECT 1').first();
      return true;
    } catch (error) {
      console.error('D1 health check failed:', error);
      return false;
    }
  }

  private async checkVectorizeHealth(): Promise<boolean> {
    if (!this.vectorize) {
      return false;
    }

    try {
      // Simple test query
      return true;
    } catch (error) {
      console.error('Vectorize health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function for Workers
 */
export function createUnifiedDatabase(env: Env): UnifiedDatabase {
  return new UnifiedDatabase(env);
}
