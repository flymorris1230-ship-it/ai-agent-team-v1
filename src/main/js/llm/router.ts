/**
 * Intelligent LLM Router
 * Automatically selects the best LLM provider based on:
 * - Cost optimization
 * - Task type
 * - Provider availability
 * - Performance requirements
 */

import { BaseLLMProvider, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from './providers/base-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { ClaudeProvider } from './providers/claude-provider';
import { sendToObservability, createObservabilityConfig, ObservabilityConfig } from '../utils/observability';

export type TaskType = 'embedding' | 'chat' | 'vision' | 'function-calling';
export type OptimizationStrategy = 'cost' | 'performance' | 'balanced';
export type ProviderType = 'openai' | 'gemini' | 'claude';

export interface RouterConfig {
  strategy: OptimizationStrategy;
  preferredProvider?: ProviderType;
  fallbackEnabled: boolean;
  maxRetries: number;
}

export interface ProviderHealth {
  provider: string;
  healthy: boolean;
  lastCheck: number;
  latency?: number;
}

/**
 * LLM Router - Intelligent provider selection
 */
export class LLMRouter {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private config: RouterConfig;
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private observabilityConfig?: ObservabilityConfig;

  constructor(
    openaiKey: string,
    geminiKey: string,
    claudeKey?: string,
    config?: Partial<RouterConfig>,
    env?: any
  ) {
    // Initialize providers
    this.providers.set('openai', new OpenAIProvider(openaiKey));
    this.providers.set('gemini', new GeminiProvider(geminiKey));

    // Add Claude provider if API key provided
    if (claudeKey) {
      this.providers.set('claude', new ClaudeProvider(claudeKey));
    }

    // Default configuration
    this.config = {
      strategy: config?.strategy || 'balanced',
      preferredProvider: config?.preferredProvider,
      fallbackEnabled: config?.fallbackEnabled ?? true,
      maxRetries: config?.maxRetries ?? 2,
    };

    // Initialize health status
    this.providers.forEach((_, name) => {
      this.healthStatus.set(name, {
        provider: name,
        healthy: true,
        lastCheck: Date.now(),
      });
      this.requestCounts.set(name, 0);
    });

    // Initialize observability config if env provided
    if (env) {
      this.observabilityConfig = createObservabilityConfig(env);
    }
  }

  /**
   * Select best provider for embedding
   */
  async createEmbedding(request: EmbeddingRequest, metadata?: Record<string, any>): Promise<EmbeddingResponse> {
    const startTime = Date.now();
    const provider = this.selectProvider('embedding', request);
    const response = await this.executeWithFallback(
      provider,
      'embedding',
      async (p) => await p.createEmbedding(request)
    );
    const latency = Date.now() - startTime;

    // Add provider metadata and cost information
    response.provider = provider.name;
    response.cost = provider.estimateCost(response.usage.total_tokens, 0, response.model);

    // Send to observability (non-blocking)
    if (this.observabilityConfig) {
      sendToObservability(
        {
          model: response.model,
          provider: response.provider as 'openai' | 'gemini' | 'anthropic',
          input_tokens: response.usage.prompt_tokens || response.usage.total_tokens,
          output_tokens: 0, // Embeddings don't have output tokens
          latency_ms: latency,
          metadata: {
            ...metadata,
            task_type: 'embedding',
          },
        },
        this.observabilityConfig
      ).catch((err) => console.error('[LLMRouter] Observability error:', err));
    }

    return response;
  }

  /**
   * Select best provider for chat completion
   */
  async createChatCompletion(request: ChatRequest, metadata?: Record<string, any>): Promise<ChatResponse> {
    const startTime = Date.now();
    const taskType: TaskType = 'chat';
    const provider = this.selectProvider(taskType, request);
    const response = await this.executeWithFallback(
      provider,
      taskType,
      async (p) => await p.createChatCompletion(request)
    );
    const latency = Date.now() - startTime;

    // Add provider metadata and cost information
    response.provider = provider.name;
    response.cost = provider.estimateCost(
      response.usage.prompt_tokens,
      response.usage.completion_tokens,
      response.model
    );

    // Send to observability (non-blocking)
    if (this.observabilityConfig) {
      sendToObservability(
        {
          model: response.model,
          provider: response.provider as 'openai' | 'gemini' | 'anthropic',
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
          latency_ms: latency,
          metadata: {
            ...metadata,
            task_type: 'chat',
          },
        },
        this.observabilityConfig
      ).catch((err) => console.error('[LLMRouter] Observability error:', err));
    }

    return response;
  }

  /**
   * Select the best provider based on task and strategy
   */
  private selectProvider(taskType: TaskType, request: any): BaseLLMProvider {
    // If user specified a preferred provider, use it
    if (this.config.preferredProvider) {
      const preferred = this.providers.get(this.config.preferredProvider);
      if (preferred && this.isProviderHealthy(this.config.preferredProvider)) {
        return preferred;
      }
    }

    // Get healthy providers
    const healthyProviders = Array.from(this.providers.entries()).filter(([name]) =>
      this.isProviderHealthy(name)
    );

    if (healthyProviders.length === 0) {
      throw new Error('No healthy LLM providers available');
    }

    // Select based on strategy
    switch (this.config.strategy) {
      case 'cost':
        return this.selectByCost(healthyProviders, taskType, request);
      case 'performance':
        return this.selectByPerformance(healthyProviders, taskType);
      case 'balanced':
      default:
        return this.selectBalanced(healthyProviders, taskType, request);
    }
  }

  /**
   * Select provider optimized for cost
   */
  private selectByCost(
    providers: [string, BaseLLMProvider][],
    taskType: TaskType,
    _request: any
  ): BaseLLMProvider {
    if (taskType === 'embedding') {
      // Gemini embeddings are FREE
      const gemini = providers.find(([name]) => name === 'gemini');
      if (gemini) return gemini[1];
    }

    if (taskType === 'chat') {
      // For chat: Gemini 2.0 Flash is FREE (experimental) or Gemini 1.5 Flash 8B is cheapest paid
      const gemini = providers.find(([name]) => name === 'gemini');
      if (gemini) return gemini[1];
    }

    // Fallback to first available provider
    return providers[0][1];
  }

  /**
   * Select provider optimized for performance
   */
  private selectByPerformance(
    providers: [string, BaseLLMProvider][],
    _taskType: TaskType
  ): BaseLLMProvider {
    // OpenAI generally has better performance and more reliable
    const openai = providers.find(([name]) => name === 'openai');
    if (openai) return openai[1];

    // Fallback to first available
    return providers[0][1];
  }

  /**
   * Balanced selection: Quality-first for complex tasks, cost-effective for simple ones
   */
  private selectBalanced(
    providers: [string, BaseLLMProvider][],
    taskType: TaskType,
    request: any
  ): BaseLLMProvider {
    if (taskType === 'embedding') {
      // Embeddings: Always use Gemini (FREE)
      const gemini = providers.find(([name]) => name === 'gemini');
      if (gemini) return gemini[1];
    }

    if (taskType === 'chat') {
      // Analyze task complexity and requirements
      const complexity = this.analyzeComplexity(request);
      const isSecurityCritical = this.isSecurityTask(request);
      const isUITask = this.isUITask(request);

      // High complexity or security-critical: Use Claude (best quality)
      if (complexity >= 8 || isSecurityCritical) {
        const claude = providers.find(([name]) => name === 'claude');
        if (claude) return claude[1];
      }

      // UI tasks: Use OpenAI (good frontend experience)
      if (isUITask) {
        const openai = providers.find(([name]) => name === 'openai');
        if (openai) return openai[1];
      }

      // Medium complexity: Estimate message length
      const messages = (request as ChatRequest).messages || [];
      const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);

      // Simple queries (< 1000 chars): Use Gemini (cheaper/free)
      // Complex queries (>= 1000 chars): Use OpenAI (better quality)
      if (totalLength < 1000) {
        const gemini = providers.find(([name]) => name === 'gemini');
        if (gemini) return gemini[1];
      } else {
        const openai = providers.find(([name]) => name === 'openai');
        if (openai) return openai[1];
      }
    }

    // Default: Load balance between providers
    return this.loadBalance(providers);
  }

  /**
   * Simple load balancing
   */
  private loadBalance(providers: [string, BaseLLMProvider][]): BaseLLMProvider {
    // Select provider with least requests
    let minRequests = Infinity;
    let selectedProvider = providers[0][1];

    for (const [name, provider] of providers) {
      const count = this.requestCounts.get(name) || 0;
      if (count < minRequests) {
        minRequests = count;
        selectedProvider = provider;
      }
    }

    return selectedProvider;
  }

  /**
   * Execute request with automatic fallback
   */
  private async executeWithFallback<T>(
    primaryProvider: BaseLLMProvider,
    taskType: TaskType,
    operation: (provider: BaseLLMProvider) => Promise<T>
  ): Promise<T> {
    const primaryName = primaryProvider.name;
    let lastError: Error | null = null;

    // Try primary provider
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation(primaryProvider);
        const latency = Date.now() - startTime;

        // Update success metrics
        this.updateProviderHealth(primaryName, true, latency);
        this.incrementRequestCount(primaryName);

        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`${primaryName} attempt ${attempt + 1} failed:`, error);

        // Mark provider as unhealthy if all retries fail
        if (attempt === this.config.maxRetries - 1) {
          this.updateProviderHealth(primaryName, false);
        }
      }
    }

    // Try fallback if enabled
    if (this.config.fallbackEnabled) {
      const fallbackProvider = this.getFallbackProvider(primaryName, taskType);
      if (fallbackProvider) {
        console.log(`Falling back to ${fallbackProvider.name}`);
        try {
          const result = await operation(fallbackProvider);
          this.incrementRequestCount(fallbackProvider.name);
          return result;
        } catch (error) {
          console.error(`Fallback to ${fallbackProvider.name} also failed:`, error);
        }
      }
    }

    throw lastError || new Error('All LLM providers failed');
  }

  /**
   * Get fallback provider
   */
  private getFallbackProvider(
    failedProvider: string,
    _taskType: TaskType
  ): BaseLLMProvider | null {
    const candidates = Array.from(this.providers.entries())
      .filter(([name]) => name !== failedProvider && this.isProviderHealthy(name))
      .map(([, provider]) => provider);

    return candidates[0] || null;
  }

  /**
   * Check if provider is healthy
   */
  private isProviderHealthy(providerName: string): boolean {
    const health = this.healthStatus.get(providerName);
    if (!health) return false;

    // Consider unhealthy if last check was more than 5 minutes ago
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - health.lastCheck > fiveMinutes) {
      return true; // Reset to healthy after cooldown
    }

    return health.healthy;
  }

  /**
   * Update provider health status
   */
  private updateProviderHealth(providerName: string, healthy: boolean, latency?: number): void {
    this.healthStatus.set(providerName, {
      provider: providerName,
      healthy,
      lastCheck: Date.now(),
      latency,
    });
  }

  /**
   * Increment request count
   */
  private incrementRequestCount(providerName: string): void {
    const current = this.requestCounts.get(providerName) || 0;
    this.requestCounts.set(providerName, current + 1);
  }

  /**
   * Get health status for all providers
   */
  async getHealthStatus(): Promise<Record<string, ProviderHealth>> {
    const status: Record<string, ProviderHealth> = {};

    for (const [name, provider] of this.providers.entries()) {
      const startTime = Date.now();
      const healthy = await provider.healthCheck();
      const latency = Date.now() - startTime;

      this.updateProviderHealth(name, healthy, latency);
      status[name] = this.healthStatus.get(name)!;
    }

    return status;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): Record<string, { requests: number; healthy: boolean }> {
    const stats: Record<string, { requests: number; healthy: boolean }> = {};

    for (const [name] of this.providers.entries()) {
      stats[name] = {
        requests: this.requestCounts.get(name) || 0,
        healthy: this.isProviderHealthy(name),
      };
    }

    return stats;
  }

  /**
   * Reset usage statistics
   */
  resetStats(): void {
    this.requestCounts.clear();
    this.providers.forEach((_, name) => {
      this.requestCounts.set(name, 0);
    });
  }

  /**
   * Analyze task complexity based on message content
   * Returns complexity score from 1-10
   */
  private analyzeComplexity(request: any): number {
    const messages = (request as ChatRequest).messages || [];
    const totalContent = messages.map((m) => m.content).join(' ');

    let complexity = 5; // Base complexity

    // Length-based complexity
    if (totalContent.length > 5000) complexity += 2;
    else if (totalContent.length > 2000) complexity += 1;

    // High-complexity keywords (architecture, system design, security)
    const highComplexityKeywords = [
      'architecture',
      'system design',
      'security',
      'authentication',
      'authorization',
      'encryption',
      'scalability',
      'distributed',
      'microservices',
      'database design',
      'schema',
      'migration',
      'performance optimization',
      'algorithm',
      'data structure',
    ];

    const keywordMatches = highComplexityKeywords.filter((keyword) =>
      totalContent.toLowerCase().includes(keyword)
    );

    if (keywordMatches.length >= 3) complexity += 2;
    else if (keywordMatches.length >= 1) complexity += 1;

    // Cap at 10
    return Math.min(complexity, 10);
  }

  /**
   * Detect if task is security-critical
   */
  private isSecurityTask(request: any): boolean {
    const messages = (request as ChatRequest).messages || [];
    const totalContent = messages.map((m) => m.content).join(' ').toLowerCase();

    const securityKeywords = [
      'security',
      'auth',
      'authentication',
      'authorization',
      'rls',
      'row level security',
      'permission',
      'access control',
      'encryption',
      'jwt',
      'token',
      'api key',
      'secret',
      'vulnerability',
      'xss',
      'csrf',
      'sql injection',
      'owasp',
    ];

    return securityKeywords.some((keyword) => totalContent.includes(keyword));
  }

  /**
   * Detect if task is UI/frontend related
   */
  private isUITask(request: any): boolean {
    const messages = (request as ChatRequest).messages || [];
    const totalContent = messages.map((m) => m.content).join(' ').toLowerCase();

    const uiKeywords = [
      'ui',
      'user interface',
      'frontend',
      'component',
      'react',
      'vue',
      'svelte',
      'css',
      'tailwind',
      'styling',
      'layout',
      'responsive',
      'design',
      'button',
      'form',
      'modal',
      'dialog',
      'navigation',
      'menu',
    ];

    return uiKeywords.some((keyword) => totalContent.includes(keyword));
  }
}
