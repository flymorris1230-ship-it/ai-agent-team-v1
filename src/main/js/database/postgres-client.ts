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

    // PostgreSQL HTTP endpoint (using PostgREST or similar)
    this.baseUrl = `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Execute raw SQL query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    // Note: This is a placeholder implementation
    // In production, you would use:
    // 1. Cloudflare Workers TCP Sockets (when available)
    // 2. PostgREST API
    // 3. Cloudflare Tunnel to NAS
    // 4. Or a dedicated proxy service

    console.log('PostgreSQL Query:', sql, params);

    // For now, return mock structure
    return {
      rows: [],
      rowCount: 0
    };
  }

  /**
   * Vector similarity search using pgvector
   */
  async vectorSearch<T = any>(
    table: string,
    embedding: number[],
    options: VectorSearchOptions = {}
  ): Promise<QueryResult<T & { similarity: number }>> {
    const { limit = 10, threshold = 0.7, metric = 'cosine' } = options;

    const operator = metric === 'cosine' ? '<=>' :
                     metric === 'l2' ? '<->' :
                     '<#>';

    const sql = `
      SELECT *,
             1 - (embedding ${operator} $1::vector) AS similarity
      FROM ${table}
      WHERE 1 - (embedding ${operator} $1::vector) >= $2
      ORDER BY embedding ${operator} $1::vector
      LIMIT $3
    `;

    return this.query<T & { similarity: number }>(sql, [
      `[${embedding.join(',')}]`,
      threshold,
      limit
    ]);
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
    const result = await this.vectorSearch<{
      id: string;
      document_id: string;
      content: string;
      metadata: string;
    }>('document_chunks', queryEmbedding, options);

    return result.rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
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
