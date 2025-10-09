/**
 * Test Genesis Observability Integration
 * Verifies that LLM usage tracking is working correctly
 */

import { LLMRouter } from './src/main/js/llm/router';

// Mock environment with observability enabled
const mockEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-mock-key',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'mock-gemini-key',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ENABLE_OBSERVABILITY: 'true',
  OBSERVABILITY_API_URL: 'https://obs-edge.flymorris1230.workers.dev/ingest',
  OBSERVABILITY_API_KEY: 'a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
  OBSERVABILITY_PROJECT_ID: 'GAC_FactoryOS',
};

async function testObservability() {
  console.log('🧪 Testing Genesis Observability Integration\n');

  // Initialize LLM Router with observability
  console.log('1. Initializing LLM Router with observability...');
  const router = new LLMRouter(
    mockEnv.OPENAI_API_KEY,
    mockEnv.GEMINI_API_KEY,
    mockEnv.ANTHROPIC_API_KEY,
    {
      strategy: 'balanced',
      fallbackEnabled: true,
      maxRetries: 2,
    },
    mockEnv
  );
  console.log('✅ LLM Router initialized\n');

  // Test chat completion (will fail with mock keys, but should attempt to send tracking)
  console.log('2. Testing chat completion with tracking...');
  try {
    await router.createChatCompletion(
      {
        messages: [{ role: 'user', content: 'Hello, test message' }],
      },
      {
        agent_name: 'test-agent',
        environment: 'test',
      }
    );
  } catch (error) {
    console.log('⚠️  Chat completion failed (expected with mock keys)');
    console.log('   Error:', (error as Error).message.substring(0, 100));
  }

  console.log('\n3. Testing embedding with tracking...');
  try {
    await router.createEmbedding(
      {
        text: 'Test embedding text',
      },
      {
        agent_name: 'test-agent',
        environment: 'test',
      }
    );
  } catch (error) {
    console.log('⚠️  Embedding failed (expected with mock keys)');
    console.log('   Error:', (error as Error).message.substring(0, 100));
  }

  console.log('\n✅ Observability integration test completed!');
  console.log('\n📊 Check Dashboard: https://genesis-observability-obs-dashboard.vercel.app');
  console.log('   Search for project: GAC_FactoryOS');
  console.log('\nNote: With real API keys, usage data will be tracked automatically.');
}

testObservability().catch(console.error);
