/**
 * Google Gemini LLM Provider
 * Implementation for Google Gemini API (Gemini Pro, Gemini Flash, etc.)
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

export class GeminiProvider extends BaseLLMProvider {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private defaultEmbeddingModel = 'text-embedding-004';
  private defaultChatModel = 'gemini-2.0-flash-exp';

  get name(): string {
    return 'gemini';
  }

  getPricing(model: string): ProviderPricing {
    const pricing: Record<string, ProviderPricing> = {
      // Gemini 2.0 Flash - 最新、最快、最便宜
      'gemini-2.0-flash-exp': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 0,      // 免費 (目前實驗階段)
        outputCostPer1mTokens: 0,     // 免費
      },
      'gemini-1.5-flash': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 0.075,   // $0.075 per 1M tokens (128K context)
        outputCostPer1mTokens: 0.30,   // $0.30 per 1M tokens
      },
      'gemini-1.5-flash-8b': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 0.0375,  // $0.0375 per 1M tokens (最便宜)
        outputCostPer1mTokens: 0.15,   // $0.15 per 1M tokens
      },
      'gemini-1.5-pro': {
        embeddingCostPer1kTokens: 0,
        inputCostPer1mTokens: 1.25,    // $1.25 per 1M tokens (128K context)
        outputCostPer1mTokens: 5.0,    // $5.00 per 1M tokens
      },
      'text-embedding-004': {
        embeddingCostPer1kTokens: 0,   // 免費
        inputCostPer1mTokens: 0,
        outputCostPer1mTokens: 0,
      },
    };

    return pricing[model] || pricing['gemini-2.0-flash-exp'];
  }

  getCapabilities(model: string): ProviderCapabilities {
    const capabilities: Record<string, ProviderCapabilities> = {
      'gemini-2.0-flash-exp': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        maxContextTokens: 1048576,  // 1M tokens!
        embeddingDimension: 0,
      },
      'gemini-1.5-flash': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        maxContextTokens: 1048576,
        embeddingDimension: 0,
      },
      'gemini-1.5-flash-8b': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: false,
        supportsFunctionCalling: true,
        maxContextTokens: 1048576,
        embeddingDimension: 0,
      },
      'gemini-1.5-pro': {
        supportsEmbedding: false,
        supportsChat: true,
        supportsVision: true,
        supportsFunctionCalling: true,
        maxContextTokens: 2097152,  // 2M tokens!
        embeddingDimension: 0,
      },
      'text-embedding-004': {
        supportsEmbedding: true,
        supportsChat: false,
        supportsVision: false,
        supportsFunctionCalling: false,
        maxContextTokens: 2048,
        embeddingDimension: 768,
      },
    };

    return capabilities[model] || capabilities['gemini-2.0-flash-exp'];
  }

  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const model = request.model || this.defaultEmbeddingModel;

    try {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:embedContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: {
              parts: [{ text: request.text }],
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        embedding: { values: number[] };
      };

      // Estimate tokens (Gemini doesn't return usage for embeddings)
      const estimatedTokens = this.estimateTokens(request.text);

      return {
        embedding: data.embedding.values,
        model,
        usage: {
          prompt_tokens: estimatedTokens,
          total_tokens: estimatedTokens,
        },
      };
    } catch (error) {
      throw new Error(`Gemini embedding failed: ${(error as Error).message}`);
    }
  }

  async createChatCompletion(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || this.defaultChatModel;

    try {
      // Convert messages to Gemini format
      const contents = this.convertMessagesToGeminiFormat(request.messages);

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: request.temperature ?? 0.7,
              maxOutputTokens: request.max_tokens ?? 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as {
        candidates: Array<{
          content: { parts: Array<{ text: string }> };
          finishReason: string;
        }>;
        usageMetadata?: {
          promptTokenCount: number;
          candidatesTokenCount: number;
          totalTokenCount: number;
        };
      };

      const content = data.candidates[0]?.content.parts[0]?.text || '';
      const usage = data.usageMetadata || {
        promptTokenCount: this.estimateTokens(JSON.stringify(request.messages)),
        candidatesTokenCount: this.estimateTokens(content),
        totalTokenCount: this.estimateTokens(JSON.stringify(request.messages) + content),
      };

      return {
        content,
        model,
        usage: {
          prompt_tokens: usage.promptTokenCount,
          completion_tokens: usage.candidatesTokenCount,
          total_tokens: usage.totalTokenCount,
        },
        finish_reason: data.candidates[0]?.finishReason || 'stop',
      };
    } catch (error) {
      throw new Error(`Gemini chat completion failed: ${(error as Error).message}`);
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

  /**
   * Convert OpenAI message format to Gemini format
   */
  private convertMessagesToGeminiFormat(
    messages: Array<{ role: string; content: string }>
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    const geminiMessages: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let systemInstruction = '';

    for (const message of messages) {
      if (message.role === 'system') {
        // Gemini handles system messages differently - prepend to first user message
        systemInstruction += message.content + '\n\n';
      } else {
        const role = message.role === 'assistant' ? 'model' : 'user';
        const content =
          role === 'user' && systemInstruction
            ? systemInstruction + message.content
            : message.content;

        geminiMessages.push({
          role,
          parts: [{ text: content }],
        });

        if (systemInstruction) systemInstruction = ''; // Clear after first use
      }
    }

    return geminiMessages;
  }
}
