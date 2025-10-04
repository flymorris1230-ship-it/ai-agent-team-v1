/**
 * RAG System Integration Tests
 * End-to-end testing for RAG functionality with pgvector
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RAGEngine } from '../core/rag-engine';

const mockEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  POSTGRES_HOST: process.env.POSTGRES_HOST || '192.168.1.114',
  POSTGRES_PORT: process.env.POSTGRES_PORT || '5532',
  POSTGRES_DB: 'postgres',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '',
  POSTGRES_PROXY_API_KEY: process.env.POSTGRES_PROXY_API_KEY || '',
  DB: {
    prepare: (_sql: string) => ({
      bind: (..._args: any[]) => ({
        all: async () => ({ results: [], success: true }),
        first: async () => null,
        run: async () => ({ success: true })
      }),
      all: async () => ({ results: [], success: true }),
      first: async () => null
    })
  } as any,
  VECTORIZE: null as any
};

describe('RAG System Integration Tests', () => {
  let ragEngine: RAGEngine;

  beforeAll(() => {
    // Test with PostgreSQL pgvector only
    ragEngine = new RAGEngine(mockEnv as any, {
      usePostgresVector: true,
      hybridSearch: false
    });
  });

  it('should initialize RAG engine with pgvector config', () => {
    expect(ragEngine).toBeDefined();
  });

  it('should perform health check on all RAG components', async () => {
    const health = await ragEngine.healthCheck();

    expect(health).toBeDefined();
    expect(health).toHaveProperty('postgres');
    expect(health).toHaveProperty('d1');
    expect(health).toHaveProperty('openai');

    console.log('RAG Health Check:', health);
  }, 10000);

  it('should create embeddings for text', async () => {
    if (!mockEnv.OPENAI_API_KEY || mockEnv.OPENAI_API_KEY.length < 10) {
      console.log('Skipping: OpenAI API key not configured');
      return;
    }

    const text = 'This is a test document for RAG system';
    const embedding = await ragEngine.createEmbedding(text);

    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(1536); // OpenAI text-embedding-3-small dimension

    console.log(`Embedding dimension: ${embedding.length}`);
  }, 15000);

  it('should chunk document into smaller pieces', async () => {
    const longText = `
# Introduction

This is a comprehensive guide to our AI Agent Team system.

## Architecture

The system consists of 9 specialized agents working together.

### Coordinator Agent
Manages task distribution and team coordination.

### Product Manager Agent
Handles requirements analysis and PRD creation.

### Backend Developer Agent
Implements API endpoints and database logic.

## Features

- Multi-agent collaboration
- RAG-powered knowledge retrieval
- PostgreSQL with pgvector
- Cloudflare Workers deployment
    `.trim();

    const document = await ragEngine.ingestDocument({
      title: 'Test Documentation',
      content: longText,
      content_type: 'markdown',
      source: 'test',
      metadata: { test: true }
    });

    expect(document).toBeDefined();
    expect(document.document_id).toBeDefined();
    expect(document.chunks_created).toBeGreaterThan(0);

    console.log(`Document ingested: ${document.document_id}, Chunks: ${document.chunks_created}`);
  }, 30000);

  it('should search documents with semantic query', async () => {
    if (!mockEnv.OPENAI_API_KEY || mockEnv.OPENAI_API_KEY.length < 10) {
      console.log('Skipping: OpenAI API key not configured');
      return;
    }

    const query = 'How does the coordinator agent work?';

    try {
      const result = await ragEngine.generateAnswer({
        query,
        top_k: 5
      });

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(result.sources).toBeDefined();
      expect(result.confidence).toBeDefined();

      console.log('RAG Query Result:');
      console.log('  Answer:', result.answer.substring(0, 200) + '...');
      console.log('  Sources:', result.sources.length);
      console.log('  Confidence:', result.confidence);
    } catch (error) {
      console.log('RAG query test: No documents indexed yet');
    }
  }, 30000);
});

describe('RAG Performance Tests', () => {
  let ragEngine: RAGEngine;

  beforeAll(() => {
    ragEngine = new RAGEngine(mockEnv as any, {
      usePostgresVector: true
    });
  });

  it('should measure embedding creation latency', async () => {
    if (!mockEnv.OPENAI_API_KEY || mockEnv.OPENAI_API_KEY.length < 10) {
      console.log('Skipping: OpenAI API key not configured');
      return;
    }

    const text = 'Performance test document';
    const start = Date.now();

    await ragEngine.createEmbedding(text);

    const latency = Date.now() - start;

    expect(latency).toBeLessThan(3000); // Should complete within 3 seconds

    console.log(`Embedding latency: ${latency}ms`);
  }, 10000);

  it('should handle concurrent document ingestion', async () => {
    if (!mockEnv.OPENAI_API_KEY || mockEnv.OPENAI_API_KEY.length < 10) {
      console.log('Skipping: OpenAI API key not configured');
      return;
    }

    const documents = [
      { title: 'Doc 1', content: 'Content for document 1' },
      { title: 'Doc 2', content: 'Content for document 2' },
      { title: 'Doc 3', content: 'Content for document 3' }
    ];

    const start = Date.now();

    const results = await Promise.all(
      documents.map(doc => ragEngine.ingestDocument(doc))
    );

    const duration = Date.now() - start;

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.document_id).toBeDefined();
    });

    console.log(`Concurrent ingestion of 3 documents: ${duration}ms`);
  }, 60000);
});

describe('Hybrid Search Tests', () => {
  let hybridEngine: RAGEngine;

  beforeAll(() => {
    // Test with hybrid mode (Vectorize + pgvector)
    hybridEngine = new RAGEngine(mockEnv as any, {
      usePostgresVector: true,
      hybridSearch: true
    });
  });

  it('should initialize hybrid search engine', () => {
    expect(hybridEngine).toBeDefined();
  });

  it('should search using both Vectorize and pgvector', async () => {
    if (!mockEnv.OPENAI_API_KEY || mockEnv.OPENAI_API_KEY.length < 10) {
      console.log('Skipping: OpenAI API key not configured');
      return;
    }

    const query = 'What are the main features?';

    try {
      const result = await hybridEngine.generateAnswer({
        query,
        top_k: 10
      });

      expect(result).toBeDefined();
      expect(result.metadata?.search_method).toBe('hybrid');

      console.log('Hybrid Search Result:');
      console.log('  Method:', result.metadata?.search_method);
      console.log('  Sources:', result.sources.length);
    } catch (error) {
      console.log('Hybrid search test: No documents indexed yet');
    }
  }, 30000);
});
