/**
 * Claude Provider Unit Tests
 * Testing Claude 3.5 Sonnet integration, cost estimation, and API functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeProvider } from '../llm/providers/claude-provider';

// Mock environment variable
const mockClaudeKey = process.env.ANTHROPIC_API_KEY || 'test-claude-key';

describe('Claude Provider - Initialization', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(mockClaudeKey);
  });

  it('should initialize with correct provider name', () => {
    expect(provider.name).toBe('claude');
  });

  it('should initialize with API key', () => {
    expect(provider).toBeDefined();
    expect(provider.name).toBe('claude');
  });
});

describe('Claude Provider - Chat Completion', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(mockClaudeKey);
  });

  it('should create chat completion with simple message', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const result = await provider.createChatCompletion({
      messages: [{ role: 'user', content: 'Say "Hello, World!" and nothing else.' }],
      max_tokens: 50,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.provider).toBe('claude');
    expect(result.model).toContain('claude');
    expect(result.usage).toBeDefined();
    expect(result.usage.prompt_tokens).toBeGreaterThan(0);
    expect(result.usage.completion_tokens).toBeGreaterThan(0);
    expect(result.usage.total_tokens).toBe(
      result.usage.prompt_tokens + result.usage.completion_tokens
    );

    console.log('✅ Claude chat completion successful');
    console.log(`   Response: ${result.content}`);
    console.log(`   Tokens: ${result.usage.total_tokens} (input: ${result.usage.prompt_tokens}, output: ${result.usage.completion_tokens})`);
    console.log(`   Cost: $${result.cost}`);
  }, 15000);

  it('should handle system messages correctly', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const result = await provider.createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful assistant that only responds with "OK".' },
        { role: 'user', content: 'Hello' },
      ],
      max_tokens: 10,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    console.log('✅ Claude system message handling successful');
    console.log(`   Response: ${result.content}`);
  }, 15000);

  it('should handle temperature parameter', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const result = await provider.createChatCompletion({
      messages: [{ role: 'user', content: 'Generate a random number between 1 and 10' }],
      temperature: 1.0,
      max_tokens: 20,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    console.log('✅ Claude temperature parameter working');
    console.log(`   Response: ${result.content}`);
  }, 15000);

  it('should handle complex multi-turn conversation', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const result = await provider.createChatCompletion({
      messages: [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '2+2 equals 4.' },
        { role: 'user', content: 'What about 3+3?' },
      ],
      max_tokens: 50,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    console.log('✅ Claude multi-turn conversation successful');
    console.log(`   Response: ${result.content}`);
  }, 15000);
});

describe('Claude Provider - Cost Estimation', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(mockClaudeKey);
  });

  it('should estimate cost correctly for Claude 3.5 Sonnet', () => {
    // Claude 3.5 Sonnet pricing: $3/1M input, $15/1M output
    const inputTokens = 1000;
    const outputTokens = 500;

    const cost = provider.estimateCost(inputTokens, outputTokens, 'claude-3-5-sonnet-20241022');

    // Expected: (1000/1M * $3) + (500/1M * $15) = $0.003 + $0.0075 = $0.0105
    expect(cost).toBeCloseTo(0.0105, 4);

    console.log('✅ Cost estimation accurate');
    console.log(`   Input: ${inputTokens} tokens`);
    console.log(`   Output: ${outputTokens} tokens`);
    console.log(`   Estimated cost: $${cost}`);
  });

  it('should estimate cost for large volume', () => {
    // 1 million tokens input, 500k tokens output
    const inputTokens = 1_000_000;
    const outputTokens = 500_000;

    const cost = provider.estimateCost(inputTokens, outputTokens, 'claude-3-5-sonnet-20241022');

    // Expected: (1M/1M * $3) + (500k/1M * $15) = $3 + $7.5 = $10.5
    expect(cost).toBeCloseTo(10.5, 2);

    console.log('✅ Large volume cost estimation');
    console.log(`   Input: ${inputTokens.toLocaleString()} tokens`);
    console.log(`   Output: ${outputTokens.toLocaleString()} tokens`);
    console.log(`   Estimated cost: $${cost}`);
  });

  it('should calculate cost from actual API response', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const result = await provider.createChatCompletion({
      messages: [{ role: 'user', content: 'Write a haiku about AI agents' }],
      max_tokens: 100,
    });

    expect(result.cost).toBeDefined();
    expect(result.cost).toBeGreaterThan(0);

    const manualCost = provider.estimateCost(
      result.usage.prompt_tokens,
      result.usage.completion_tokens,
      result.model
    );

    expect(result.cost).toBeCloseTo(manualCost, 6);

    console.log('✅ API response cost matches manual calculation');
    console.log(`   API cost: $${result.cost}`);
    console.log(`   Manual cost: $${manualCost}`);
  }, 15000);
});

describe('Claude Provider - Embedding (Not Supported)', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(mockClaudeKey);
  });

  it('should throw error for embedding requests', async () => {
    await expect(
      provider.createEmbedding({ text: 'Test embedding' })
    ).rejects.toThrow('Claude does not support embeddings');

    console.log('✅ Claude correctly rejects embedding requests');
  });
});

describe('Claude Provider - Health Check', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(mockClaudeKey);
  });

  it('should perform health check successfully', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const healthy = await provider.healthCheck();

    expect(healthy).toBe(true);

    console.log('✅ Claude provider health check passed');
  }, 10000);

  it('should detect unhealthy provider with invalid key', async () => {
    const badProvider = new ClaudeProvider('invalid-api-key');
    const healthy = await badProvider.healthCheck();

    expect(healthy).toBe(false);

    console.log('✅ Claude provider correctly detects invalid API key');
  }, 10000);
});

describe('Claude Provider - Error Handling', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(mockClaudeKey);
  });

  it('should handle API errors gracefully', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const badProvider = new ClaudeProvider('invalid-key-12345');

    await expect(
      badProvider.createChatCompletion({
        messages: [{ role: 'user', content: 'Test' }],
      })
    ).rejects.toThrow();

    console.log('✅ API errors handled gracefully');
  }, 10000);
});

describe('Claude Provider - Latency Tracking', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    provider = new ClaudeProvider(mockClaudeKey);
  });

  it('should track response latency', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const result = await provider.createChatCompletion({
      messages: [{ role: 'user', content: 'Quick response test' }],
      max_tokens: 10,
    });

    expect(result.latency).toBeDefined();
    expect(result.latency).toBeGreaterThan(0);
    expect(result.latency).toBeLessThan(30000); // Should respond within 30 seconds

    console.log('✅ Latency tracking working');
    console.log(`   Latency: ${result.latency}ms`);
  }, 15000);
});

describe('Claude Provider - Message Formatting', () => {
  it('should format messages correctly for Claude API', async () => {
    if (mockClaudeKey === 'test-claude-key') {
      console.log('⏭️  Skipping: ANTHROPIC_API_KEY not configured');
      return;
    }

    const provider = new ClaudeProvider(mockClaudeKey);

    // Test with system message that should be extracted
    const result = await provider.createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a test assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ],
      max_tokens: 20,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();

    console.log('✅ Message formatting correct');
    console.log(`   Response: ${result.content}`);
  }, 15000);
});
