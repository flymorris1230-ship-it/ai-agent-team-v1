/**
 * Gemini / Google AI Client for Multi-AI Collaboration
 * Supports Gemini 1.5 Pro, Flash, and other Google AI models
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

export interface GeminiResponse {
  content: string;
  tokens: number; // Estimated
  cost: number;
  model: string;
  metadata: {
    estimated_input_tokens: number;
    estimated_output_tokens: number;
    finish_reason?: string;
  };
}

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private generationConfig: GenerationConfig;

  // Pricing per million tokens (approximate)
  private readonly PRICING = {
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.0-pro': { input: 0.50, output: 1.50 },
  };

  constructor(config: GeminiConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-1.5-flash';
    this.generationConfig = {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens || 4096,
    };
  }

  /**
   * Generate content from prompt
   */
  async generate(prompt: string): Promise<GeminiResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: this.generationConfig,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    // Gemini doesn't provide token counts directly
    // We estimate based on character count (rough approximation: 1 token ≈ 4 chars)
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(content.length / 4);
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;
    const cost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens);

    return {
      content,
      tokens: totalTokens,
      cost,
      model: this.model,
      metadata: {
        estimated_input_tokens: estimatedInputTokens,
        estimated_output_tokens: estimatedOutputTokens,
        finish_reason: response.candidates?.[0]?.finishReason,
      },
    };
  }

  /**
   * Generate with conversation history
   */
  async chat(history: { role: string; text: string }[]): Promise<GeminiResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: this.generationConfig,
    });

    // Convert history to Gemini format
    const chat = model.startChat({
      history: history.slice(0, -1).map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      })),
    });

    const lastMessage = history[history.length - 1];
    const result = await chat.sendMessage(lastMessage.text);
    const response = await result.response;
    const content = response.text();

    // Estimate tokens
    const totalInputChars = history.reduce((sum, msg) => sum + msg.text.length, 0);
    const estimatedInputTokens = Math.ceil(totalInputChars / 4);
    const estimatedOutputTokens = Math.ceil(content.length / 4);
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;
    const cost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens);

    return {
      content,
      tokens: totalTokens,
      cost,
      model: this.model,
      metadata: {
        estimated_input_tokens: estimatedInputTokens,
        estimated_output_tokens: estimatedOutputTokens,
        finish_reason: response.candidates?.[0]?.finishReason,
      },
    };
  }

  /**
   * Generate code
   */
  async generateCode(
    task: string,
    language: string = 'typescript'
  ): Promise<GeminiResponse> {
    const prompt = `Generate ${language} code for the following task:\n\n${task}\n\nProvide clean, production-ready code with comments.`;
    return this.generate(prompt);
  }

  /**
   * Review code
   */
  async reviewCode(code: string): Promise<GeminiResponse> {
    const prompt = `Review the following code and provide detailed feedback:\n\n\`\`\`\n${code}\n\`\`\`\n\nProvide:\n1. Code quality assessment\n2. Potential bugs or issues\n3. Performance improvements\n4. Best practices recommendations`;
    return this.generate(prompt);
  }

  /**
   * Summarize text
   */
  async summarize(text: string, maxLength: number = 500): Promise<GeminiResponse> {
    const prompt = `Summarize the following text in approximately ${maxLength} characters:\n\n${text}`;
    return this.generate(prompt);
  }

  /**
   * Analyze document (multimodal capability)
   */
  async analyzeDocument(
    text: string,
    imageData?: string
  ): Promise<GeminiResponse> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro', // Use Pro for multimodal
      generationConfig: this.generationConfig,
    });

    const parts: any[] = [{ text }];

    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageData,
        },
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const content = response.text();

    // Estimate tokens
    const estimatedInputTokens = Math.ceil(text.length / 4) + (imageData ? 258 : 0); // Images ~258 tokens
    const estimatedOutputTokens = Math.ceil(content.length / 4);
    const totalTokens = estimatedInputTokens + estimatedOutputTokens;
    const cost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens);

    return {
      content,
      tokens: totalTokens,
      cost,
      model: 'gemini-1.5-pro',
      metadata: {
        estimated_input_tokens: estimatedInputTokens,
        estimated_output_tokens: estimatedOutputTokens,
      },
    };
  }

  /**
   * Calculate cost based on estimated token usage
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = this.PRICING[this.model as keyof typeof this.PRICING] || this.PRICING['gemini-1.5-flash'];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.model;
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    const models = await this.genAI.listModels();
    return models.map((m) => m.name);
  }
}
