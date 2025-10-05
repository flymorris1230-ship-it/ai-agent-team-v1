/**
 * PostgreSQL Client for Cloudflare Workers
 * Connects to NAS PostgreSQL with pgvector support
 */

import { databaseConfig } from '../config/database';

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: { name: string; dataTypeID: number }[];
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  metric?: 'cosine' | 'l2' | 'inner_product';
}

/**
 * PostgreSQL Client using HTTP protocol
 * Compatible with Cloudflare Workers (no TCP sockets)
 */
export class PostgresClient {
  private config: PostgresConfig;
  private baseUrl: string;

  constructor(config?: Partial<PostgresConfig>) {
    this.config = {
      host: config?.host || databaseConfig.postgres.host,
      port: config?.port || databaseConfig.postgres.port,
      database: config?.database || databaseConfig.postgres.database,
      user: config?.user || databaseConfig.postgres.user,
      password: config?.password || databaseConfig.postgres.password
    };

    // PostgreSQL HTTP Proxy endpoint (running on NAS)
    // Default: http://192.168.1.114:8000
    this.baseUrl = `http://${this.config.host}:8000`;
  }

  /**
   * Execute raw SQL query via HTTP proxy
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.POSTGRES_PROXY_API_KEY || 'your-secure-api-key-here'
        },
        body: JSON.stringify({ sql, params })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`PostgreSQL proxy error: ${response.status} - ${error}`);
      }

      const result = await response.json() as { rows?: T[]; rowCount?: number };
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      console.error('PostgreSQL query failed:', error);
      throw error;
    }
  }

  /**
   * Vector similarity search using pgvector via HTTP proxy
   */
  async vectorSearch<T = any>(
    table: string,
    embedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<QueryResult<T & { similarity: number }>> {
    const { limit = 10, threshold = 0.7, metric = 'cosine' } = options;

    try {
      const response = await fetch(`${this.baseUrl}/vector-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.POSTGRES_PROXY_API_KEY || 'your-secure-api-key-here'
        },
        body: JSON.stringify({
          table,
          embedding,
          limit,
          threshold,
          metric
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Vector search error: ${response.status} - ${error}`);
      }

      const result = await response.json() as { rows?: (T & { similarity: number })[]; rowCount?: number };
      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      console.error('Vector search failed:', error);
      throw error;
    }
  }

  /**
   * Insert document with embedding
   */
  async insertDocument(
    title: string,
    content: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<string> {
    const sql = `
      INSERT INTO documents (
        title, content, embedding, metadata,
        content_type, source, created_at, updated_at
      ) VALUES ($1, $2, $3::vector, $4::jsonb, $5, $6, NOW(), NOW())
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(sql, [
      title,
      content,
      `[${embedding.join(',')}]`,
      JSON.stringify(metadata || {}),
      'text',
      'api'
    ]);

    return result.rows[0]?.id || '';
  }

  /**
   * Insert document chunk with embedding
   */
  async insertChunk(
    documentId: string,
    chunkIndex: number,
    content: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<string> {
    const sql = `
      INSERT INTO document_chunks (
        document_id, chunk_index, content, embedding, metadata, created_at
      ) VALUES ($1, $2, $3, $4::vector, $5::jsonb, NOW())
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(sql, [
      documentId,
      chunkIndex,
      content,
      `[${embedding.join(',')}]`,
      JSON.stringify(metadata || {})
    ]);

    return result.rows[0]?.id || '';
  }

  /**
   * Search similar documents
   */
  async searchDocuments(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<Array<{
    id: string;
    title: string;
    content: string;
    similarity: number;
    metadata?: any;
  }>> {
    const result = await this.vectorSearch<{
      id: string;
      title: string;
      content: string;
      metadata: string;
    }>('documents', queryEmbedding, options);

    return result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Search similar chunks (for RAG)
   * Uses knowledge_vectors table (production table with pgvector)
   */
  async searchChunks(
    queryEmbedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<Array<{
    id: string;
    document_id: string;
    content: string;
    similarity: number;
    metadata?: any;
  }>> {
    // Use knowledge_vectors table (created via pgAdmin4 with pgvector)
    const result = await this.vectorSearch<{
      id: string;
      content: string;
      metadata: string;
    }>('knowledge_vectors', queryEmbedding, options);

    return result.rows.map(row => ({
      ...row,
      document_id: row.metadata ? JSON.parse(row.metadata).document_id || row.id : row.id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Insert knowledge vector (for RAG)
   * Uses knowledge_vectors table with pgvector
   */
  async insertKnowledgeVector(
    content: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<string> {
    const sql = `
      INSERT INTO knowledge_vectors (
        id, content, metadata, embedding, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2::jsonb, $3::vector, NOW(), NOW()
      )
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(sql, [
      content,
      JSON.stringify(metadata || {}),
      `[${embedding.join(',')}]`
    ]);

    return result.rows[0]?.id || '';
  }

  /**
   * Get all agents
   */
  async getAgents(): Promise<Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    capabilities: string[];
  }>> {
    const result = await this.query<{
      id: string;
      name: string;
      role: string;
      status: string;
      capabilities: string;
    }>('SELECT * FROM agents ORDER BY created_at');

    return result.rows.map(row => ({
      ...row,
      capabilities: JSON.parse(row.capabilities || '[]')
    }));
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(agentId: string, status: string): Promise<void> {
    await this.query(
      'UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, agentId]
    );
  }

  /**
   * Create task
   */
  async createTask(task: {
    type: string;
    title: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
    created_by?: string;
    input_data?: any;
  }): Promise<string> {
    const sql = `
      INSERT INTO tasks (
        type, title, description, priority, assigned_to, created_by,
        input_data, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'pending', NOW(), NOW())
      RETURNING id
    `;

    const result = await this.query<{ id: string }>(sql, [
      task.type,
      task.title,
      task.description || '',
      task.priority || 'medium',
      task.assigned_to || null,
      task.created_by || 'system',
      JSON.stringify(task.input_data || {})
    ]);

    return result.rows[0]?.id || '';
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
      return false;
    }
  }

  /**
   * Test pgvector extension
   */
  async testPgVector(): Promise<boolean> {
    try {
      const result = await this.query(
        "SELECT * FROM pg_available_extensions WHERE name = 'vector'"
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('pgvector test failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create PostgreSQL client
 */
export function createPostgresClient(config?: Partial<PostgresConfig>): PostgresClient {
  return new PostgresClient(config);
}

/**
 * Singleton instance for Workers
 */
let postgresClient: PostgresClient | null = null;

export function getPostgresClient(config?: Partial<PostgresConfig>): PostgresClient {
  if (!postgresClient) {
    postgresClient = new PostgresClient(config);
  }
  return postgresClient;
}
