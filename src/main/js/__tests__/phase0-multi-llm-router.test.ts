/**
 * Phase 0: Multi-LLM Router Tests with Claude Integration
 * Testing quality-first routing strategy with Claude + GPT + Gemini
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LLMRouter } from '../llm/router';

// Mock environment variables
const mockOpenAIKey = process.env.OPENAI_API_KEY || 'test-openai-key';
const mockGeminiKey = process.env.GEMINI_API_KEY || 'test-gemini-key';
const mockClaudeKey = process.env.ANTHROPIC_API_KEY || 'test-claude-key';

describe('Phase 0: Multi-LLM Router - Claude Integration', () => {
  describe('Router Initialization with Claude', () => {
    it('should initialize with three providers (Claude + GPT + Gemini)', () => {
      const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, mockClaudeKey, {
        strategy: 'balanced',
        fallbackEnabled: true,
        maxRetries: 2,
      });

      expect(router).toBeDefined();
      const stats = router.getUsageStats();

      expect(stats).toHaveProperty('openai');
      expect(stats).toHaveProperty('gemini');
      expect(stats).toHaveProperty('claude');

      console.log('✅ Three-provider router initialized');
      console.log('   Providers:', Object.keys(stats));
    });

    it('should initialize without Claude if no API key provided', () => {
      const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, undefined, {
        strategy: 'balanced',
      });

      expect(router).toBeDefined();
      const stats = router.getUsageStats();

      expect(stats).toHaveProperty('openai');
      expect(stats).toHaveProperty('gemini');
      expect(stats).not.toHaveProperty('claude');

      console.log('✅ Two-provider router (without Claude) initialized');
    });

    it('should support preferred provider configuration for Claude', () => {
      const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, mockClaudeKey, {
        strategy: 'balanced',
        preferredProvider: 'claude',
      });

      expect(router).toBeDefined();

      console.log('✅ Claude preferred provider configuration accepted');
    });
  });

  describe('Quality-First Routing Strategy', () => {
    let router: LLMRouter;

    beforeEach(() => {
      router = new LLMRouter(mockOpenAIKey, mockGeminiKey, mockClaudeKey, {
        strategy: 'balanced',
        fallbackEnabled: true,
        maxRetries: 2,
      });
    });

    it('should use Claude for high-complexity tasks (complexity >= 8)', async () => {
      if (mockClaudeKey === 'test-claude-key') {
        console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
        return;
      }

      // High complexity query with architecture keywords
      const complexQuery = `
        Design a comprehensive microservices architecture for a distributed
        multi-tenant AI agent system with the following requirements:

        1. Database design with schema migrations and performance optimization
        2. Security architecture including authentication, authorization, and encryption
        3. Scalability considerations for handling 10,000+ concurrent users
        4. Algorithm selection for efficient task distribution and load balancing
        5. Data structure design for real-time collaboration between agents

        Please provide detailed architecture decisions, security measures,
        performance optimization strategies, and potential challenges.
      `.trim();

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: complexQuery }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('claude'); // Should use Claude for high complexity
      expect(result.content).toBeDefined();

      console.log('✅ High-complexity task routed to Claude');
      console.log(`   Query length: ${complexQuery.length} chars`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Cost: $${result.cost}`);
    }, 30000);

    it('should use Claude for security-critical tasks', async () => {
      if (mockClaudeKey === 'test-claude-key') {
        console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
        return;
      }

      const securityQuery = `
        Implement a secure authentication system with JWT tokens, Row Level Security,
        and protection against XSS, CSRF, and SQL injection attacks. Include
        encryption for sensitive data and proper API key management.
      `.trim();

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: securityQuery }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('claude'); // Should use Claude for security
      expect(result.content).toBeDefined();

      console.log('✅ Security task routed to Claude');
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Response length: ${result.content.length} chars`);
    }, 30000);

    it('should use OpenAI for UI/frontend tasks', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: OPENAI_API_KEY not configured');
        return;
      }

      const uiQuery = `
        Create a React component with Tailwind CSS styling for a responsive
        modal dialog with a form. Include button styling and layout design.
      `.trim();

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: uiQuery }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('openai'); // Should use OpenAI for UI
      expect(result.content).toBeDefined();

      console.log('✅ UI task routed to OpenAI');
      console.log(`   Provider: ${result.provider}`);
    }, 30000);

    it('should use Gemini for simple queries (<1000 chars)', async () => {
      if (mockGeminiKey === 'test-gemini-key') {
        console.log('⏭️  Skipping: GEMINI_API_KEY not configured');
        return;
      }

      const simpleQuery = 'What is the capital of France?';

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: simpleQuery }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('gemini'); // Should use Gemini for simple
      expect(result.content).toBeDefined();

      console.log('✅ Simple query routed to Gemini');
      console.log(`   Query: "${simpleQuery}"`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Cost: $${result.cost}`);
    }, 20000);

    it('should use OpenAI for complex queries without security keywords', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: OPENAI_API_KEY not configured');
        return;
      }

      // Complex but not security-critical
      const complexQuery = `
        Please analyze the trade-offs between different state management
        solutions in modern frontend applications. Compare Redux, Zustand,
        and React Query, discussing their performance characteristics,
        developer experience, and best use cases for each. ${' '.repeat(500)}
      `.trim();

      const result = await router.createChatCompletion({
        messages: [{ role: 'user', content: complexQuery }],
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('openai'); // Should use OpenAI for complex non-security
      expect(result.content).toBeDefined();

      console.log('✅ Complex non-security query routed to OpenAI');
      console.log(`   Query length: ${complexQuery.length} chars`);
      console.log(`   Provider: ${result.provider}`);
    }, 30000);

    it('should always use Gemini for embeddings (free)', async () => {
      if (mockGeminiKey === 'test-gemini-key') {
        console.log('⏭️  Skipping: GEMINI_API_KEY not configured');
        return;
      }

      const result = await router.createEmbedding({
        text: 'Test embedding with quality-first strategy',
      });

      expect(result).toBeDefined();
      expect(result.provider).toBe('gemini');
      expect(result.cost).toBe(0); // Gemini embeddings are free
      expect(Array.isArray(result.embedding)).toBe(true);

      console.log('✅ Embedding routed to Gemini (free)');
      console.log(`   Embedding dimensions: ${result.embedding.length}`);
    }, 15000);
  });

  describe('Task Complexity Analysis', () => {
    let router: LLMRouter;

    beforeEach(() => {
      router = new LLMRouter(mockOpenAIKey, mockGeminiKey, mockClaudeKey, {
        strategy: 'balanced',
      });
    });

    it('should correctly identify security-related keywords', async () => {
      if (mockClaudeKey === 'test-claude-key') {
        console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
        return;
      }

      const securityKeywords = [
        'authentication and authorization',
        'JWT token encryption',
        'SQL injection prevention',
        'XSS and CSRF protection',
        'Row Level Security policies',
      ];

      for (const query of securityKeywords) {
        const result = await router.createChatCompletion({
          messages: [{ role: 'user', content: `Explain ${query}` }],
        });

        expect(result.provider).toBe('claude');
      }

      console.log('✅ Security keyword detection working');
    }, 60000);

    it('should correctly identify UI-related keywords', async () => {
      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: OPENAI_API_KEY not configured');
        return;
      }

      const uiKeywords = [
        'React component design',
        'Tailwind CSS styling',
        'responsive layout',
        'button and form UI',
        'frontend navigation menu',
      ];

      for (const query of uiKeywords) {
        const result = await router.createChatCompletion({
          messages: [{ role: 'user', content: `Create ${query}` }],
        });

        expect(result.provider).toBe('openai');
      }

      console.log('✅ UI keyword detection working');
    }, 60000);
  });

  describe('Fallback Mechanism with Claude', () => {
    it('should fallback to GPT/Gemini if Claude fails', async () => {
      // Create router with invalid Claude key
      const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, 'invalid-claude-key', {
        strategy: 'balanced',
        fallbackEnabled: true,
        maxRetries: 1,
      });

      if (mockOpenAIKey === 'test-openai-key') {
        console.log('⏭️  Skipping: OPENAI_API_KEY not configured');
        return;
      }

      // Security query should try Claude first, then fallback
      const result = await router.createChatCompletion({
        messages: [
          {
            role: 'user',
            content: 'Implement authentication with JWT and encryption',
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.provider).not.toBe('claude'); // Should fallback to another provider
      expect(['openai', 'gemini']).toContain(result.provider);

      console.log('✅ Fallback mechanism working');
      console.log(`   Primary: claude (failed)`);
      console.log(`   Fallback: ${result.provider} (succeeded)`);
    }, 30000);
  });

  describe('Cost Optimization with Quality Balance', () => {
    let router: LLMRouter;

    beforeEach(() => {
      router = new LLMRouter(mockOpenAIKey, mockGeminiKey, mockClaudeKey, {
        strategy: 'balanced',
      });
    });

    it('should optimize costs while maintaining quality', async () => {
      if (
        mockOpenAIKey === 'test-openai-key' ||
        mockGeminiKey === 'test-gemini-key' ||
        mockClaudeKey === 'test-claude-key'
      ) {
        console.log('⏭️  Skipping: API keys not configured');
        return;
      }

      const queries = [
        { query: 'What is 2+2?', expectedProvider: 'gemini' }, // Simple
        {
          query: 'Create a button component with React and Tailwind',
          expectedProvider: 'openai',
        }, // UI
        {
          query: 'Design a secure authentication system with encryption',
          expectedProvider: 'claude',
        }, // Security
      ];

      let totalCost = 0;

      for (const { query, expectedProvider } of queries) {
        const result = await router.createChatCompletion({
          messages: [{ role: 'user', content: query }],
        });

        expect(result.provider).toBe(expectedProvider);
        totalCost += result.cost || 0;

        console.log(`   ${query.substring(0, 50)}...`);
        console.log(`   → ${result.provider} ($${result.cost})`);
      }

      console.log('✅ Cost-quality balance optimized');
      console.log(`   Total cost: $${totalCost.toFixed(6)}`);
    }, 90000);
  });

  describe('Provider Health Monitoring', () => {
    it('should monitor health of all three providers', async () => {
      if (
        mockOpenAIKey === 'test-openai-key' ||
        mockGeminiKey === 'test-gemini-key' ||
        mockClaudeKey === 'test-claude-key'
      ) {
        console.log('⏭️  Skipping: API keys not configured');
        return;
      }

      const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, mockClaudeKey, {
        strategy: 'balanced',
      });

      const health = await router.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.openai).toBeDefined();
      expect(health.gemini).toBeDefined();
      expect(health.claude).toBeDefined();

      expect(health.openai).toHaveProperty('healthy');
      expect(health.openai).toHaveProperty('latency');
      expect(health.gemini).toHaveProperty('healthy');
      expect(health.gemini).toHaveProperty('latency');
      expect(health.claude).toHaveProperty('healthy');
      expect(health.claude).toHaveProperty('latency');

      console.log('✅ Three-provider health monitoring:');
      console.log(`   OpenAI: ${health.openai.healthy ? '✅' : '❌'} (${health.openai.latency}ms)`);
      console.log(`   Gemini: ${health.gemini.healthy ? '✅' : '❌'} (${health.gemini.latency}ms)`);
      console.log(`   Claude: ${health.claude.healthy ? '✅' : '❌'} (${health.claude.latency}ms)`);
    }, 30000);
  });

  describe('Usage Statistics with Claude', () => {
    it('should track usage across all three providers', async () => {
      if (
        mockOpenAIKey === 'test-openai-key' ||
        mockGeminiKey === 'test-gemini-key' ||
        mockClaudeKey === 'test-claude-key'
      ) {
        console.log('⏭️  Skipping: API keys not configured');
        return;
      }

      const router = new LLMRouter(mockOpenAIKey, mockGeminiKey, mockClaudeKey, {
        strategy: 'balanced',
      });

      // Make requests to different providers
      await router.createEmbedding({ text: 'Embedding test' }); // Gemini
      await router.createChatCompletion({
        messages: [{ role: 'user', content: 'Simple test' }],
      }); // Gemini
      await router.createChatCompletion({
        messages: [{ role: 'user', content: 'Create a React button component UI' }],
      }); // OpenAI
      await router.createChatCompletion({
        messages: [
          { role: 'user', content: 'Implement secure authentication with encryption' },
        ],
      }); // Claude

      const stats = router.getUsageStats();

      expect(stats.gemini.requests).toBeGreaterThan(0);
      expect(stats.openai.requests).toBeGreaterThan(0);
      expect(stats.claude.requests).toBeGreaterThan(0);

      console.log('✅ Usage statistics across three providers:');
      console.log(`   OpenAI: ${stats.openai.requests} requests`);
      console.log(`   Gemini: ${stats.gemini.requests} requests`);
      console.log(`   Claude: ${stats.claude.requests} requests`);
    }, 90000);
  });
});
