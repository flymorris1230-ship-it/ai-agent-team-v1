/**
 * RAG Engine v2 - Enhanced with PostgreSQL pgvector
 * Hybrid approach: Cloudflare Vectorize + PostgreSQL pgvector
 */

import type { Env, RAGQuery, RAGResult, RetrievalSource, Message } from '../types';
import { Logger } from '../utils/logger';
import { createUnifiedDatabase, UnifiedDatabase } from '../database/unified-db';

export interface RAGConfig {
  embeddingModel: string;
  chatModel: string;
  chunkSize: number;
  chunkOverlap: number;
  usePostgresVector: boolean; // Use PostgreSQL pgvector instead of Cloudflare Vectorize
  hybridSearch: boolean; // Use both Vectorize and pgvector, merge results
}

export class RAGEngineV2 {
  private logger: Logger;
  private db: UnifiedDatabase;
  private config: RAGConfig;

  constructor(
    private env: Env,
    config?: Partial<RAGConfig>
  ) {
    this.logger = new Logger(env, 'RAGEngineV2');
    this.db = createUnifiedDatabase(env);

    this.config = {
      embeddingModel: config?.embeddingModel || 'text-embedding-3-small',
      chatModel: config?.chatModel || 'gpt-4o-mini',
      chunkSize: config?.chunkSize || 1000,
      chunkOverlap: config?.chunkOverlap || 200,
      usePostgresVector: config?.usePostgresVector ?? true,
      hybridSearch: config?.hybridSearch ?? false
    };
  }

  /**
   * Main RAG pipeline with PostgreSQL pgvector
   */
  async generateAnswer(ragQuery: RAGQuery): Promise<RAGResult> {
    await this.logger.info('RAG v2 pipeline started', { query: ragQuery.query });

    try {
      // Step 1: Create query embedding
      const queryEmbedding = await this.createEmbedding(ragQuery.query);

      // Step 2: Retrieve relevant chunks
      const sources = await this.retrieveWithHybridSearch(
        queryEmbedding,
        ragQuery.top_k || 5,
        ragQuery.filter
      );

      // Step 3: Generate answer
      const answer = await this.generate(
        ragQuery.query,
        sources,
        ragQuery.conversation_history
      );

      // Step 4: Calculate confidence
      const confidence = this.calculateConfidence(sources);

      const result: RAGResult = {
        answer,
        sources,
        confidence,
        metadata: {
          model: this.config.chatModel,
          sources_count: sources.length,
          timestamp: Date.now(),
          search_method: this.config.usePostgresVector ? 'pgvector' :
                        this.config.hybridSearch ? 'hybrid' : 'vectorize'
        }
      };

      await this.logger.info('RAG v2 completed', {
        confidence,
        sourcesCount: sources.length
      });

      return result;
    } catch (error) {
      await this.logger.error('RAG v2 failed', { error, query: ragQuery.query });
      throw error;
    }
  }

  /**
   * Hybrid search: combines Cloudflare Vectorize and PostgreSQL pgvector
   */
  private async retrieveWithHybridSearch(
    queryEmbedding: number[],
    topK: number,
    _filter?: Record<string, any>
  ): Promise<RetrievalSource[]> {
    const sources: RetrievalSource[] = [];

    // PostgreSQL pgvector search
    if (this.config.usePostgresVector || this.config.hybridSearch) {
      await this.logger.info('Searching with pgvector');

      const pgResults = await this.db.searchRelevantChunks(
        queryEmbedding,
        this.config.hybridSearch ? Math.ceil(topK / 2) : topK,
        0.7 // similarity threshold
      );

      for (const result of pgResults) {
        sources.push({
          document_id: result.document_id,
          chunk_id: result.document_id + '-chunk',
          content: result.content,
          score: result.similarity,
          metadata: { source: 'postgres-pgvector' }
        });
      }
    }

    // Cloudflare Vectorize search (if hybrid mode)
    if (this.config.hybridSearch && this.env.VECTORIZE) {
      await this.logger.info('Searching with Vectorize');

      const vectorResults = await this.env.VECTORIZE.query(queryEmbedding, {
        topK: Math.ceil(topK / 2),
        returnMetadata: true
      });

      for (const match of vectorResults.matches) {
        sources.push({
          document_id: match.metadata?.document_id as string,
          chunk_id: match.id,
          content: match.metadata?.text as string,
          score: match.score,
          metadata: { ...match.metadata, source: 'vectorize' }
        });
      }
    }

    // Sort by score and take top K
    sources.sort((a, b) => b.score - a.score);
    return sources.slice(0, topK);
  }

  /**
   * Ingest document with dual storage (D1 + PostgreSQL)
   */
  async ingestDocument(documentData: {
    title: string;
    content: string;
    content_type?: string;
    source?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<{ document_id: string; chunks_created: number }> {
    await this.logger.info('Ingesting document v2', { title: documentData.title });

    // Step 1: Chunk the document
    const chunks = this.chunkText(documentData.content);

    // Step 2: Create embeddings for all chunks
    const chunkEmbeddings = await Promise.all(
      chunks.map(chunk => this.createEmbedding(chunk))
    );

    // Step 3: Create document embedding (average of chunk embeddings)
    const documentEmbedding = this.averageEmbeddings(chunkEmbeddings);

    // Step 4: Prepare chunk data
    const chunksWithEmbeddings = chunks.map((content, index) => ({
      content,
      embedding: chunkEmbeddings[index]
    }));

    // Step 5: Insert into unified database (routes to PostgreSQL for vector data)
    const documentId = await this.db.insertDocumentWithChunks(
      documentData.title,
      documentData.content,
      chunksWithEmbeddings,
      documentEmbedding,
      documentData.metadata
    );

    await this.logger.info('Document ingested v2', {
      documentId,
      chunksCreated: chunks.length
    });

    return {
      document_id: documentId,
      chunks_created: chunks.length
    };
  }

  /**
   * Create embedding using OpenAI API
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          input: text,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>
      };

      return data.data[0].embedding;
    } catch (error) {
      await this.logger.error('Embedding creation failed', { error });
      throw error;
    }
  }

  /**
   * Generate answer using LLM
   */
  private async generate(
    query: string,
    sources: RetrievalSource[],
    conversationHistory?: Message[]
  ): Promise<string> {
    // Build context from sources
    const context = sources
      .map((source, index) => `[Source ${index + 1}]\n${source.content}`)
      .join('\n\n');

    const messages: Array<{ role: string; content: string }> = [];

    // System prompt
    messages.push({
      role: 'system',
      content: `You are an AI assistant with access to a knowledge base. Answer based on the provided context.

Context:
${context}

Instructions:
- Answer based on the provided context
- Be concise and accurate
- Cite sources using [Source N] notation
- If uncertain, acknowledge limitations`
    });

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-5)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    // Add current query
    messages.push({
      role: 'user',
      content: query
    });

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: this.config.chatModel,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0].message.content;
  }

  /**
   * Chunk text into smaller pieces
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length < this.config.chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) chunks.push(currentChunk);

        if (paragraph.length > this.config.chunkSize) {
          let position = 0;
          while (position < paragraph.length) {
            chunks.push(paragraph.slice(position, position + this.config.chunkSize));
            position += this.config.chunkSize - this.config.chunkOverlap;
          }
          currentChunk = '';
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) chunks.push(currentChunk);

    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  /**
   * Average multiple embeddings
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];

    const dimension = embeddings[0].length;
    const average = new Array(dimension).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimension; i++) {
        average[i] += embedding[i];
      }
    }

    return average.map(val => val / embeddings.length);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(sources: RetrievalSource[]): number {
    if (sources.length === 0) return 0;

    const avgScore = sources.reduce((sum, s) => sum + s.score, 0) / sources.length;
    const confidence = Math.min(avgScore * 100, 100);

    return Math.round(confidence * 10) / 10;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    d1: boolean;
    postgres: boolean;
    openai: boolean;
  }> {
    const dbHealth = await this.db.healthCheck();

    // Test OpenAI API
    let openaiHealthy = false;
    try {
      await this.createEmbedding('test');
      openaiHealthy = true;
    } catch (error) {
      await this.logger.error('OpenAI health check failed', { error });
    }

    return {
      d1: dbHealth.d1,
      postgres: dbHealth.postgres,
      openai: openaiHealthy
    };
  }
}
