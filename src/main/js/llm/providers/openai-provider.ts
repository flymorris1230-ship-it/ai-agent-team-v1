/**
 * OpenAI LLM Provider
 * Implementation for OpenAI API (GPT-4, GPT-3.5, etc.)
 */

import {
  BaseLLMProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  ChatRequest,
  ChatResponse,
  ProviderPricing,
  ProviderCapabilities,
} from './base-provider';

export class OpenAIProvider extends BaseLLMProvider {
  private baseUrl = 'https://api.openai.com/v1';
  private defaultEmbeddingModel = 'text-embedding-3-small';
  private defaultChatModel = 'gpt-4o-mini';

  get name(): string {
    return 'openai';
  }

  getPricing(model: string): ProviderPricing {
    const pricing: Record<string, ProviderPricing> = {
      'gpt-4o': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 2.5,
        outputCostPer1mTokens: 10.0,
      },
      'gpt-4o-mini': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 0.15,
        outputCostPer1mTokens: 0.6,
      },
      'gpt-4-turbo': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 10.0,
        outputCostPer1mTokens: 30.0,
      },
      'gpt-3.5-turbo': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 0.5,
        outputCostPer1mTokens: 1.5,
      },
      'text-embedding-3-small': {
        embeddingCostPer1kTokens: 0.02,
        inputCostPer1mTokens: 0,
        outputCostPer1mTokens: 0,
      },
      'text-embedding-3-large': {
        embeddingCostPer1kTokens: 0.13,
        inputCostPer1mTokens: 0,
        outputCostPer1mTokens: 0,
      },
    };

    return pricing[model] || pricing['gpt-4o-mini'];
  }

  getCapabilities(model: string): ProviderCapabilities {
    const capabilities: Record<string, ProviderCapabilities> = {
      'gpt-4o': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        maxContextTokens: 128000,
        embeddingDimension: 0,
      },
      'gpt-4o-mini': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        maxContextTokens: 128000,
        embeddingDimension: 0,
      },
      'gpt-4-turbo': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        maxContextTokens: 128000,
        embeddingDimension: 0,
      },
      'gpt-3.5-turbo': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: false,
        supportsFunctionCalling: true,
        maxContextTokens: 16385,
        embeddingDimension: 0,
      },
      'text-embedding-3-small': {
        supportsEmbedding: true,
        supportsChat: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        maxContextTokens: 8191,
        embeddingDimension: 1536,
      },
      'text-embedding-3-large': {
        supportsEmbedding: true,
        supportsChat: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        maxContextTokens: 8191,
        embeddingDimension: 3072,
      },
    };

    return capabilities[model] || capabilities['gpt-4o-mini'];
  }

  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.defaultEmbeddingModel;

    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: request.text,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>;
        usage: { prompt_tokens: number; total_tokens: number };
        model: string;
      };

      return {
        embedding: data.data[0].embedding,
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      throw new Error(`OpenAI embedding failed: ${(error as Error).message}`);
    }
  }

  async createChatCompletion(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || this.defaultChatModel;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens ?? 1000,
          stream: request.stream ?? false,
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

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage,
        finish_reason: data.choices[0].finish_reason,
      };
    } catch (error) {
      throw new Error(`OpenAI chat completion failed: ${(error as Error).message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple test: create a small embedding
      await this.createEmbedding({ text: 'test' });
      return true;
    } catch (error) {
      return false;
    }
  }
}
