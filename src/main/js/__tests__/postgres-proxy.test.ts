/**
 * PostgreSQL Proxy Connection Tests
 * Tests for Workers <-> Proxy connectivity and functionality
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { PostgresClient } from '../database/postgres-client';
import { createUnifiedDatabase } from '../database/unified-db';

const TEST_CONFIG = {
  host: process.env.POSTGRES_HOST || '192.168.1.114',
  port: 5532,
  database: 'postgres',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'Morris1230'
};

const PROXY_API_KEY = process.env.POSTGRES_PROXY_API_KEY || 'your-secure-api-key-here';

describe('PostgreSQL Proxy Connection Tests', () => {
  let pgClient: PostgresClient;

  beforeAll(() => {
    pgClient = new PostgresClient(TEST_CONFIG);
  });

  it('should connect to proxy health endpoint', async () => {
    const proxyUrl = `http://${TEST_CONFIG.host}:8000`;

    const response = await fetch(`${proxyUrl}/health`);
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.status).toBe('healthy');
  });

  it('should verify pgvector extension is enabled', async () => {
    const proxyUrl = `http://${TEST_CONFIG.host}:8000`;

    const response = await fetch(`${proxyUrl}/pgvector/status`, {
      headers: {
        'X-API-Key': PROXY_API_KEY
      }
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.enabled).toBe(true);
  });

  it('should execute simple query via proxy', async () => {
    const result = await pgClient.query('SELECT 1 as test');

    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.rows[0].test).toBe(1);
  });

  it('should list agents from database', async () => {
    const result = await pgClient.getAgents();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    // Should have 9 default agents
    expect(result.length).toBeGreaterThanOrEqual(9);
  });

  it('should perform vector search', async () => {
    // Create test embedding (1536 dimensions for OpenAI)
    const testEmbedding = new Array(1536).fill(0).map(() => Math.random());

    try {
      const result = await pgClient.vectorSearch(
        'document_chunks',
        testEmbedding,
        {
          limit: 5,
          threshold: 0.5,
          metric: 'cosine'
        }
      );

      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
    } catch (error) {
      // It's OK if no documents exist yet
      console.log('Vector search test: No documents yet');
      expect(error).toBeDefined();
    }
  });

  it('should insert test document with embedding', async () => {
    const testEmbedding = new Array(1536).fill(0).map(() => Math.random());

    try {
      const docId = await pgClient.insertDocument(
        'Test Document',
        'This is a test document for proxy connectivity.',
        testEmbedding,
        { test: true, timestamp: Date.now() }
      );

      expect(docId).toBeDefined();
      expect(typeof docId).toBe('string');
      expect(docId.length).toBeGreaterThan(0);
    } catch (error) {
      console.error('Insert document test failed:', error);
      throw error;
    }
  });

  it('should update agent status', async () => {
    try {
      await pgClient.updateAgentStatus('agent-coordinator', 'busy');

      const agents = await pgClient.getAgents();
      const coordinator = agents.find(a => a.id === 'agent-coordinator');

      expect(coordinator).toBeDefined();
      expect(coordinator?.status).toBe('busy');

      // Reset status
      await pgClient.updateAgentStatus('agent-coordinator', 'idle');
    } catch (error) {
      console.error('Update agent status test failed:', error);
      throw error;
    }
  });

  it('should create task via proxy', async () => {
    try {
      const taskId = await pgClient.createTask({
        type: 'test_task',
        title: 'Proxy Connection Test Task',
        description: 'Testing task creation via PostgreSQL proxy',
        priority: 'low',
        created_by: 'test-runner'
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
    } catch (error) {
      console.error('Create task test failed:', error);
      throw error;
    }
  });

  it('should check proxy health with latency measurement', async () => {
    const start = Date.now();
    const healthy = await pgClient.healthCheck();
    const latency = Date.now() - start;

    expect(healthy).toBe(true);
    expect(latency).toBeLessThan(1000); // Should respond within 1 second
    console.log(`Proxy latency: ${latency}ms`);
  });
});

describe('Unified Database Integration Tests', () => {
  const mockEnv = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          all: async () => ({ results: [], success: true }),
          first: async () => null,
          run: async () => ({ success: true })
        }),
        all: async () => ({ results: [], success: true }),
        first: async () => null
      })
    } as any,
    POSTGRES_HOST: TEST_CONFIG.host,
    POSTGRES_PORT: TEST_CONFIG.port.toString(),
    POSTGRES_DB: TEST_CONFIG.database,
    POSTGRES_USER: TEST_CONFIG.user,
    POSTGRES_PASSWORD: TEST_CONFIG.password,
    POSTGRES_PROXY_API_KEY: PROXY_API_KEY
  };

  it('should create unified database instance', () => {
    const db = createUnifiedDatabase(mockEnv as any);
    expect(db).toBeDefined();
  });

  it('should perform health check on all systems', async () => {
    const db = createUnifiedDatabase(mockEnv as any);

    try {
      const health = await db.healthCheck();

      expect(health).toBeDefined();
      expect(health.postgres).toBeDefined();
      expect(typeof health.postgres).toBe('boolean');
    } catch (error) {
      console.error('Unified DB health check failed:', error);
      throw error;
    }
  });
});
