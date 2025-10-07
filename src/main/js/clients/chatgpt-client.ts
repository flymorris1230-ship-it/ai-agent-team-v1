/**
 * ChatGPT / OpenAI Client for Multi-AI Collaboration
 * Supports GPT-4o, GPT-4o-mini, and other OpenAI models
 */

import OpenAI from 'openai';

export interface ChatGPTResponse {
  content: string;
  tokens: number;
  cost: number;
  model: string;
  metadata: {
    input_tokens: number;
    output_tokens: number;
    finish_reason: string;
  };
}

export interface ChatGPTConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class ChatGPTClient {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  // Pricing per million tokens
  private readonly PRICING = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  };

  constructor(config: ChatGPTConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-4o-mini';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens || 4096;
  }

  /**
   * Complete a single prompt
   */
  async complete(prompt: string): Promise<ChatGPTResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant specialized in software development.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    const content = response.choices[0].message.content || '';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;
    const cost = this.calculateCost(inputTokens, outputTokens);

    return {
      content,
      tokens: totalTokens,
      cost,
      model: this.model,
      metadata: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        finish_reason: response.choices[0].finish_reason,
      },
    };
  }

  /**
   * Complete with conversation history
   */
  async chat(messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<ChatGPTResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    const content = response.choices[0].message.content || '';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;
    const cost = this.calculateCost(inputTokens, outputTokens);

    return {
      content,
      tokens: totalTokens,
      cost,
      model: this.model,
      metadata: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        finish_reason: response.choices[0].finish_reason,
      },
    };
  }

  /**
   * Generate code with system context
   */
  async generateCode(
    task: string,
    language: string = 'typescript'
  ): Promise<ChatGPTResponse> {
    const prompt = `Generate ${language} code for the following task:\n\n${task}\n\nProvide clean, production-ready code with comments.`;
    return this.complete(prompt);
  }

  /**
   * Review code
   */
  async reviewCode(code: string): Promise<ChatGPTResponse> {
    const prompt = `Review the following code and provide feedback:\n\n\`\`\`\n${code}\n\`\`\`\n\nProvide:\n1. Code quality assessment\n2. Potential bugs\n3. Performance improvements\n4. Best practices suggestions`;
    return this.complete(prompt);
  }

  /**
   * Refactor code
   */
  async refactor(code: string, requirements: string): Promise<ChatGPTResponse> {
    const prompt = `Refactor the following code according to these requirements:\n\nRequirements: ${requirements}\n\nCode:\n\`\`\`\n${code}\n\`\`\`\n\nProvide improved code.`;
    return this.complete(prompt);
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = this.PRICING[this.model as keyof typeof this.PRICING] || this.PRICING['gpt-4o-mini'];
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
}
