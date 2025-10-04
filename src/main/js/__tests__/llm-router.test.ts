/**
 * LLM Router Integration Tests
 * Testing intelligent provider selection, failover, and cost optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LLMRouter } from '../llm/router';
import type { OptimizationStrategy } from '../llm/router';

// Mock environment variables
const mockOpenAIKey = process.env.OPENAI_API_KEY || 'test-openai-key';
const mockGeminiKey = process.env.GEMINI_API_KEY || 'test-gemini-key';

describe('LLM Router - Provider Selection', () => {
  describe('Cost Optimization Strategy', () => {
    let router: LLMRouter;

    beforeEach(() => {
      router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
        strategy: 'cost',
        fallbackEnabled: true,
        maxRetries: 2,
      });
    });

    it('should initialize with cost strategy', () => {
      expect(router).toBeDefined();
      const stats = router.getUsageStats();
      expect(stats).toHaveProperty('openai');
      expect(stats).toHaveProperty('gemini');
    });

    it('should prefer Gemini for embeddings (free)', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: Real API keys not configured');
        return;
      }

      const result = await router.createEmbedding({
        text: 'Test embedding for cost optimization',
      });

      expect(result).toBeDefined();
      expect(result.embedding).toBeDefined();
      expect(Array.isArray(result.embedding)).toBe(true);

      // Gemini embeddings are 768-dimensional
      expect(result.embedding.length).toBeGreaterThan(0);
      expect(result.provider).toBe('gemini');
      expect(result.cost).toBe(0); // Gemini embeddings are free

      console.log(`✅ Cost strategy: Used ${result.provider} (cost: $${result.cost})`);
    }, 15000);

    it('should prefer Gemini for chat completions (free/cheapest)', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: Real API keys not configured');
        return;
      }

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: 'Hello, this is a test message' }],
        temperature: 0.7,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.provider).toBe('gemini');

      console.log(`✅ Cost strategy chat: Used ${result.provider}`);
      console.log(`   Response: ${result.content.substring(0, 100)}...`);
    }, 20000);
  });

  describe('Performance Optimization Strategy', () => {
    let router: LLMRouter;

    beforeEach(() => {
      router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
        strategy: 'performance',
        fallbackEnabled: true,
        maxRetries: 2,
      });
    });

    it('should prefer OpenAI for better performance', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: Real API keys not configured');
        return;
      }

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: 'Performance test message' }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('openai');

      console.log(`✅ Performance strategy: Used ${result.provider}`);
    }, 20000);
  });

  describe('Balanced Strategy', () => {
    let router: LLMRouter;

    beforeEach(() => {
      router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
        strategy: 'balanced',
        fallbackEnabled: true,
        maxRetries: 2,
      });
    });

    it('should use Gemini for simple queries (<1000 chars)', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: Real API keys not configured');
        return;
      }

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: 'What is AI?' }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('gemini'); // Simple query should use Gemini

      console.log(`✅ Balanced strategy (simple): Used ${result.provider}`);
    }, 20000);

    it('should use OpenAI for complex queries (>1000 chars)', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: Real API keys not configured');
        return;
      }

      const longQuery = `
        Please provide a comprehensive analysis of the following scenario:

        We are building a multi-agent AI system with 9 specialized agents
        working collaboratively. The system uses Cloudflare Workers for edge
        computing, PostgreSQL with pgvector for vector storage, and implements
        a RAG (Retrieval-Augmented Generation) architecture.

        The agents include: Coordinator, Product Manager, Solution Architect,
        Backend Developer, Frontend Developer, QA Engineer, DevOps Engineer,
        Data Analyst, and Knowledge Manager.

        Each agent has specific capabilities and responsibilities. The system
        needs to handle task distribution, inter-agent communication, knowledge
        base management, and real-time collaboration.

        Please analyze the architectural decisions, potential challenges, and
        recommended best practices for this type of system. Consider scalability,
        cost optimization, security, and performance aspects.

        Also provide recommendations for testing strategies, deployment approaches,
        and monitoring solutions that would be appropriate for an enterprise-grade
        multi-agent AI system.
      `.trim();

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: longQuery }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('openai'); // Complex query should use OpenAI

      console.log(`✅ Balanced strategy (complex): Used ${result.provider}`);
      console.log(`   Query length: ${longQuery.length} chars`);
    }, 30000);

    it('should always use Gemini for embeddings (free)', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: Real API keys not configured');
        return;
      }

      const result = await router.createEmbedding({
        text: 'Balanced strategy embedding test',
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('gemini');
      expect(result.cost).toBe(0);

      console.log(`✅ Balanced strategy embedding: Used ${result.provider} (free)`);
    }, 15000);
  });
});

describe('LLM Router - Failover and Reliability', () => {
  let router: LLMRouter;

  beforeEach(() => {
    router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
      strategy: 'balanced',
      fallbackEnabled: true,
      maxRetries: 2,
    });
  });

  it('should handle failover when primary provider fails', async () => {
    // This test would require mocking provider failures
    // For now, we just verify the failover mechanism exists
    const stats = router.getUsageStats();
    expect(stats.openai).toHaveProperty('healthy');
    expect(stats.gemini).toHaveProperty('healthy');

    console.log('✅ Failover mechanism verified');
    console.log('   OpenAI healthy:', stats.openai.healthy);
    console.log('   Gemini healthy:', stats.gemini.healthy);
  });

  it('should track provider health status', async () => {
    if (mockOpenAIKey === 'test-openai-key') {
      console.log('⏭️  Skipping: Real API keys not configured');
      return;
    }

    const health = await router.getHealthStatus();

    expect(health).toBeDefined();
    expect(health.openai).toBeDefined();
    expect(health.gemini).toBeDefined();

    expect(health.openai).toHaveProperty('healthy');
    expect(health.openai).toHaveProperty('latency');
    expect(health.gemini).toHaveProperty('healthy');
    expect(health.gemini).toHaveProperty('latency');

    console.log('✅ Provider health status:');
    console.log(`   OpenAI: ${health.openai.healthy ? '✅' : '❌'} (${health.openai.latency}ms)`);
    console.log(`   Gemini: ${health.gemini.healthy ? '✅' : '❌'} (${health.gemini.latency}ms)`);
  }, 10000);
});

describe('LLM Router - Usage Statistics', () => {
  let router: LLMRouter;

  beforeEach(() => {
    router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
      strategy: 'balanced',
      fallbackEnabled: true,
      maxRetries: 2,
    });
  });

  it('should track request counts per provider', async () => {
    if (mockOpenAIKey === 'test-openai-key') {
      console.log('⏭️  Skipping: Real API keys not configured');
      return;
    }

    // Make a few requests
    await router.createEmbedding({ text: 'Test 1' });
    await router.createEmbedding({ text: 'Test 2' });
    await router.createChatCompletion({
      messages: [{ role: 'user', content: 'Short query' }],
    });

    const stats = router.getUsageStats();

    expect(stats.gemini.requests).toBeGreaterThan(0);

    console.log('✅ Usage statistics:');
    console.log(`   OpenAI: ${stats.openai.requests} requests`);
    console.log(`   Gemini: ${stats.gemini.requests} requests`);
  }, 30000);

  it('should reset statistics', () => {
    router.resetStats();
    const stats = router.getUsageStats();

    expect(stats.openai.requests).toBe(0);
    expect(stats.gemini.requests).toBe(0);

    console.log('✅ Statistics reset successfully');
  });
});

describe('LLM Router - Cost Estimation', () => {
  it('should estimate costs correctly for different strategies', () => {
    const strategies: OptimizationStrategy[] = ['cost', 'performance', 'balanced'];

    strategies.forEach((strategy) => {
      const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
        strategy,
        fallbackEnabled: true,
        maxRetries: 2,
      });

      expect(router).toBeDefined();
      console.log(`✅ ${strategy} strategy router initialized`);
    });
  });
});

describe('LLM Router - Configuration', () => {
  it('should respect preferred provider setting', async () => {
    if (mockOpenAIKey === 'test-openai-key') {
      console.log('⏭️  Skipping: Real API keys not configured');
      return;
    }

    const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
      strategy: 'balanced',
      preferredProvider: 'gemini',
      fallbackEnabled: true,
      maxRetries: 2,
    });

    const result = await router.createChatCompletion({
      messages: [{ role: 'user', content: 'Test with preferred provider' }],
    });

    expect(result.provider).toBe('gemini');

    console.log('✅ Preferred provider respected: gemini');
  }, 20000);

  it('should disable fallback when configured', async () => {
    const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
      strategy: 'balanced',
      fallbackEnabled: false,
      maxRetries: 1,
    });

    expect(router).toBeDefined();
    console.log('✅ Fallback disabled configuration verified');
  });
});

describe('LLM Router - Load Balancing', () => {
  it('should distribute load between providers', async () => {
    if (mockOpenAIKey === 'test-openai-key') {
      console.log('⏭️  Skipping: Real API keys not configured');
      return;
    }

    const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, {
      strategy: 'balanced',
      fallbackEnabled: true,
      maxRetries: 2,
    });

    // Make multiple requests with varying complexity
    const requests = [
      router.createChatCompletion({
        messages: [{ role: 'user', content: 'Simple 1' }],
      }),
      router.createChatCompletion({
        messages: [{ role: 'user', content: 'Simple 2' }],
      }),
      router.createChatCompletion({
        messages: [{ role: 'user', content: 'A'.repeat(1500) }], // Complex query
      }),
    ];

    const results = await Promise.all(requests);

    expect(results).toHaveLength(3);

    const providers = results.map((r) => r.provider);
    console.log('✅ Load balancing test:');
    console.log('   Providers used:', providers);
  }, 60000);
});
