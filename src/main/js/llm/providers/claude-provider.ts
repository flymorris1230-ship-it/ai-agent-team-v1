/**
 * Claude Provider for Multi-LLM Router
 * Anthropic Claude 3.5 Sonnet Integration
 */

import { BaseLLMProvider, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from './base-provider';

export class ClaudeProvider extends BaseLLMProvider {
  private readonly apiBaseUrl = 'https://api.anthropic.com/v1';
  private readonly defaultModel = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string) {
    super(apiKey);
  }

  /**
   * Provider name
   */
  get name(): string {
    return 'claude';
  }

  /**
   * Get provider pricing information
   */
  getPricing(model: string): import('./base-provider').ProviderPricing {
    // Claude 3.5 Sonnet pricing
    return {
      embeddingCostPer1kTokens: 0, // Claude doesn't support embeddings
      inputCostPer1mTokens: 3.0,
      outputCostPer1mTokens: 15.0,
    };
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(model: string): import('./base-provider').ProviderCapabilities {
    return {
      supportsEmbedding: false,
      supportsChat: true,
      supportsVision: true,
      supportsFunctionCalling: true,
      maxContextTokens: 200000, // Claude 3.5 Sonnet has 200K context
      embeddingDimension: 0, // No embedding support
    };
  }

  /**
   * Create chat completion using Claude API
   */
  async createChatCompletion(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.apiBaseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || this.defaultModel,
          max_tokens: request.max_tokens || 4096,
          messages: this.formatMessages(request.messages),
          temperature: request.temperature ?? 0.7,
          system: this.extractSystemMessage(request.messages),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error (${response.status}): ${error}`);
      }

      const data = (await response.json()) as {
        id: string;
        model: string;
        content: Array<{ text: string }>;
        usage: { input_tokens: number; output_tokens: number };
        stop_reason: string;
      };
      const latency = Date.now() - startTime;

      return {
        model: data.model,
        content: data.content[0].text,
        usage: {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        },
        finish_reason: data.stop_reason,
        provider: 'claude',
        cost: this.estimateCost(
          data.usage.input_tokens,
          data.usage.output_tokens,
          data.model
        ),
      };
    } catch (error) {
      throw new Error(`Claude provider error: ${(error as Error).message}`);
    }
  }

  /**
   * Create embedding - Claude doesn't support embeddings
   * Fallback to Gemini or OpenAI
   */
  async createEmbedding(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new Error(
      'Claude does not support embeddings. Use Gemini or OpenAI for embedding tasks.'
    );
  }

  /**
   * Format messages for Claude API
   * Claude requires alternating user/assistant messages
   */
  private formatMessages(messages: any[]): any[] {
    return messages
      .filter((msg) => msg.role !== 'system') // System messages handled separately
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));
  }

  /**
   * Extract system message for Claude API
   */
  private extractSystemMessage(messages: any[]): string | undefined {
    const systemMsg = messages.find((msg) => msg.role === 'system');
    return systemMsg?.content;
  }

  /**
   * Health check for Claude API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.createChatCompletion({
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 10,
      });
      return response.content.length > 0;
    } catch (error) {
      console.error('Claude health check failed:', error);
      return false;
    }
  }
}
