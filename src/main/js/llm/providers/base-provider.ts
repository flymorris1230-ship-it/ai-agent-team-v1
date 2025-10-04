/**
 * Base LLM Provider Interface
 * Abstract interface for all LLM providers (OpenAI, Gemini, etc.)
 */

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
}

export interface ProviderPricing {
  embeddingCostPer1kTokens: number;  // USD per 1K tokens
  inputCostPer1mTokens: number;      // USD per 1M input tokens
  outputCostPer1mTokens: number;     // USD per 1M output tokens
}

export interface ProviderCapabilities {
  supportsEmbedding: boolean;
  supportsChat: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  maxContextTokens: number;
  embeddingDimension: number;
}

/**
 * Abstract base class for LLM providers
 */
export abstract class BaseLLMProvider {
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Provider name
   */
  abstract get name(): string;

  /**
   * Get provider pricing information
   */
  abstract getPricing(model: string): ProviderPricing;

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(model: string): ProviderCapabilities;

  /**
   * Create text embedding
   */
  abstract createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Generate chat completion
   */
  abstract createChatCompletion(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Health check
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Estimate cost for a request
   */
  estimateCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = this.getPricing(model);
    const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1mTokens;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1mTokens;
    return inputCost + outputCost;
  }

  /**
   * Estimate embedding cost
   */
  estimateEmbeddingCost(tokens: number, model: string): number {
    const pricing = this.getPricing(model);
    return (tokens / 1_000) * pricing.embeddingCostPer1kTokens;
  }

  /**
   * Simple token estimation (approximate)
   */
  protected estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
