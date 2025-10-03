/**
 * RAG (Retrieval-Augmented Generation) Engine
 * Core engine for document retrieval and answer generation
 */

import type { Env, RAGQuery, RAGResult, RetrievalSource, Message } from '../types';
import { Logger } from '../utils/logger';
// KnowledgeBaseManager import kept for backward compatibility
// import { KnowledgeBaseManager } from './knowledge-base';

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
}

export class RAGEngine {
  private logger: Logger;
  private embeddingModel = 'text-embedding-3-small';
  private chatModel = 'gpt-4o-mini';

  constructor(private env: Env) {
    this.logger = new Logger(env, 'RAGEngine');
  }

  /**
   * Main RAG pipeline: retrieve relevant documents and generate answer
   */
  async generateAnswer(ragQuery: RAGQuery): Promise<RAGResult> {
    await this.logger.info('Starting RAG pipeline', { query: ragQuery.query });

    try {
      // Step 1: Retrieve relevant documents
      const sources = await this.retrieve(ragQuery);

      // Step 2: Generate answer using retrieved context
      const answer = await this.generate(ragQuery.query, sources, ragQuery.conversation_history);

      // Step 3: Calculate confidence score
      const confidence = this.calculateConfidence(sources);

      const result: RAGResult = {
        answer,
        sources,
        confidence,
        metadata: {
          model: this.chatModel,
          sources_count: sources.length,
          timestamp: Date.now(),
        },
      };

      await this.logger.info('RAG pipeline completed', { confidence, sourcesCount: sources.length });

      return result;
    } catch (error) {
      await this.logger.error('RAG pipeline failed', { error, query: ragQuery.query });
      throw error;
    }
  }

  /**
   * Retrieve relevant documents using semantic search
   */
  private async retrieve(ragQuery: RAGQuery): Promise<RetrievalSource[]> {
    const { query, top_k = 5, filter } = ragQuery;

    await this.logger.info('Retrieving documents', { query, top_k });

    // Create query embedding
    const queryEmbedding = await this.createEmbedding(query);

    // Query Vectorize for similar documents
    const vectorResults = await this.env.VECTORIZE.query(queryEmbedding, {
      topK: top_k,
      returnMetadata: true,
    });

    // Map results to RetrievalSource format
    const sources: RetrievalSource[] = [];

    for (const match of vectorResults.matches) {
      // Apply filters if provided
      if (filter) {
        let passesFilter = true;
        for (const [key, value] of Object.entries(filter)) {
          if (match.metadata?.[key] !== value) {
            passesFilter = false;
            break;
          }
        }
        if (!passesFilter) continue;
      }

      sources.push({
        document_id: match.metadata?.document_id as string,
        chunk_id: match.id,
        content: match.metadata?.text as string,
        score: match.score,
        metadata: match.metadata,
      });
    }

    await this.logger.info('Documents retrieved', { count: sources.length });

    return sources;
  }

  /**
   * Generate answer using retrieved context
   */
  private async generate(
    query: string,
    sources: RetrievalSource[],
    conversationHistory?: Message[]
  ): Promise<string> {
    await this.logger.info('Generating answer', { query, sourcesCount: sources.length });

    // Build context from retrieved sources
    const context = sources
      .map((source, index) => `[Source ${index + 1}]\n${source.content}`)
      .join('\n\n');

    // Build conversation history
    const messages = [];

    // System prompt
    messages.push({
      role: 'system',
      content: `You are a helpful AI assistant with access to a knowledge base. Answer questions based on the provided context. If the context doesn't contain enough information, say so honestly.

Context:
${context}

Instructions:
- Answer based on the provided context
- Be concise and accurate
- Cite sources when relevant using [Source N] notation
- If unsure, acknowledge limitations
- Maintain a professional and helpful tone`,
    });

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-5)) {
        // Last 5 messages
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current query
    messages.push({
      role: 'user',
      content: query,
    });

    // Call OpenAI API
    const completion = await this.chatCompletion(messages);

    await this.logger.info('Answer generated', {
      model: completion.model,
      tokens: completion.usage.total_tokens,
    });

    return completion.content;
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
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };

      if (!data.data || data.data.length === 0) {
        throw new Error('No embedding returned from OpenAI');
      }

      return data.data[0].embedding;
    } catch (error) {
      await this.logger.error('Failed to create embedding', { error, text: text.slice(0, 100) });
      throw error;
    }
  }

  /**
   * Chat completion using OpenAI API
   */
  private async chatCompletion(
    messages: Array<{ role: string; content: string }>
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.chatModel,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string }; finish_reason: string }>;
        model: string;
        usage: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      };

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No completion returned from OpenAI');
      }

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage,
        finish_reason: data.choices[0].finish_reason,
      };
    } catch (error) {
      await this.logger.error('Failed to generate completion', { error });
      throw error;
    }
  }

  /**
   * Calculate confidence score based on retrieval quality
   */
  private calculateConfidence(sources: RetrievalSource[]): number {
    if (sources.length === 0) return 0;

    // Calculate average score
    const avgScore = sources.reduce((sum, source) => sum + source.score, 0) / sources.length;

    // Normalize to 0-100 scale
    const confidence = Math.min(avgScore * 100, 100);

    return Math.round(confidence * 10) / 10;
  }

  /**
   * Ingest document into knowledge base (wrapper)
   */
  async ingestDocument(documentData: {
    title: string;
    content: string;
    content_type?: string;
    source?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<{ document_id: string; chunks_created: number }> {
    await this.logger.info('Ingesting document', { title: documentData.title });

    // Chunk the document
    const chunks = this.chunkText(documentData.content);

    // Create document record
    const documentId = `doc-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    await this.env.DB.prepare(
      `INSERT INTO documents (id, title, content, content_type, source, tags, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        documentId,
        documentData.title,
        documentData.content,
        documentData.content_type || 'text',
        documentData.source || 'upload',
        documentData.tags ? JSON.stringify(documentData.tags) : null,
        documentData.metadata ? JSON.stringify(documentData.metadata) : null,
        Date.now(),
        Date.now()
      )
      .run();

    // Process chunks and create embeddings
    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${documentId}-chunk-${i}`;
      const embedding = await this.createEmbedding(chunks[i]);

      // Store chunk
      await this.env.DB.prepare(
        `INSERT INTO document_chunks (id, document_id, chunk_index, content, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(chunkId, documentId, i, chunks[i], Date.now())
        .run();

      // Prepare vector for batch insert
      vectors.push({
        id: chunkId,
        values: embedding,
        metadata: {
          document_id: documentId,
          chunk_index: i,
          title: documentData.title,
          text: chunks[i],
          ...documentData.metadata,
        },
      });
    }

    // Batch insert vectors into Vectorize
    if (vectors.length > 0) {
      await this.env.VECTORIZE.insert(vectors);
    }

    // Update indexed timestamp
    await this.env.DB.prepare('UPDATE documents SET indexed_at = ? WHERE id = ?')
      .bind(Date.now(), documentId)
      .run();

    await this.logger.info('Document ingested successfully', {
      documentId,
      chunksCreated: chunks.length,
    });

    return {
      document_id: documentId,
      chunks_created: chunks.length,
    };
  }

  /**
   * Chunk text into smaller pieces
   */
  private chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];

    // Try to split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length < chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // Handle very long paragraphs
        if (paragraph.length > chunkSize) {
          let position = 0;
          while (position < paragraph.length) {
            chunks.push(paragraph.slice(position, position + chunkSize));
            position += chunkSize - overlap;
          }
          currentChunk = '';
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
  }

  /**
   * Evaluate RAG performance
   */
  async evaluateRAG(testQueries: Array<{ query: string; expected_answer: string }>): Promise<{
    accuracy: number;
    avg_confidence: number;
    avg_retrieval_count: number;
    results: Array<{
      query: string;
      passed: boolean;
      confidence: number;
      sources_count: number;
    }>;
  }> {
    const results = [];
    let totalConfidence = 0;
    let totalSourcesCount = 0;
    let passedCount = 0;

    for (const test of testQueries) {
      const result = await this.generateAnswer({ query: test.query, top_k: 5 });

      const passed = result.answer.toLowerCase().includes(test.expected_answer.toLowerCase());

      results.push({
        query: test.query,
        passed,
        confidence: result.confidence || 0,
        sources_count: result.sources.length,
      });

      if (passed) passedCount++;
      totalConfidence += result.confidence || 0;
      totalSourcesCount += result.sources.length;
    }

    return {
      accuracy: (passedCount / testQueries.length) * 100,
      avg_confidence: totalConfidence / testQueries.length,
      avg_retrieval_count: totalSourcesCount / testQueries.length,
      results,
    };
  }

  /**
   * Re-index document (update embeddings)
   */
  async reindexDocument(documentId: string): Promise<void> {
    await this.logger.info('Re-indexing document', { documentId });

    // Get document
    const doc = await this.env.DB.prepare('SELECT * FROM documents WHERE id = ?')
      .bind(documentId)
      .first();

    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Delete old chunks and vectors
    const oldChunks = await this.env.DB.prepare('SELECT id FROM document_chunks WHERE document_id = ?')
      .bind(documentId)
      .all();

    for (const chunk of oldChunks.results) {
      await this.env.VECTORIZE.deleteByIds([chunk.id as string]);
    }

    await this.env.DB.prepare('DELETE FROM document_chunks WHERE document_id = ?')
      .bind(documentId)
      .run();

    // Re-chunk and re-vectorize
    const chunks = this.chunkText(doc.content as string);
    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${documentId}-chunk-${i}`;
      const embedding = await this.createEmbedding(chunks[i]);

      await this.env.DB.prepare(
        `INSERT INTO document_chunks (id, document_id, chunk_index, content, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(chunkId, documentId, i, chunks[i], Date.now())
        .run();

      vectors.push({
        id: chunkId,
        values: embedding,
        metadata: {
          document_id: documentId,
          chunk_index: i,
          title: doc.title as string,
          text: chunks[i],
        },
      });
    }

    if (vectors.length > 0) {
      await this.env.VECTORIZE.insert(vectors);
    }

    await this.env.DB.prepare('UPDATE documents SET indexed_at = ? WHERE id = ?')
      .bind(Date.now(), documentId)
      .run();

    await this.logger.info('Document re-indexed', { documentId, chunksCreated: chunks.length });
  }
}
