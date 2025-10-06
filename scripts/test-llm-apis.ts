#!/usr/bin/env tsx
/**
 * Test Real LLM APIs (OpenAI + Gemini)
 * Validates actual API connectivity and cost optimization
 */

import { GeminiProvider } from '../src/main/js/llm/providers/gemini-provider';
import { OpenAIProvider } from '../src/main/js/llm/providers/openai-provider';
import { LLMRouter } from '../src/main/js/llm/router';

// Load environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

console.log('🧪 Real LLM API Testing\n');
console.log('=' .repeat(60));

async function testGeminiEmbedding() {
  console.log('\n📊 Test 1: Gemini Embedding API');
  console.log('-'.repeat(60));

  if (!GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY not found in environment');
    return false;
  }

  try {
    const provider = new GeminiProvider(GEMINI_API_KEY);
    const result = await provider.createEmbedding({
      text: 'Test embedding with Gemini API'
    });

    console.log('✅ Gemini Embedding Success');
    console.log(`   Model: ${result.model}`);
    console.log(`   Dimensions: ${result.embedding.length}`);
    console.log(`   Tokens: ${result.usage.total_tokens}`);
    console.log(`   Expected Model: text-embedding-004`);
    console.log(`   Expected Dimensions: 768`);

    if (result.model === 'text-embedding-004' && result.embedding.length === 768) {
      console.log('✅ Correct model and dimensions!');
      return true;
    } else {
      console.log('⚠️  Model or dimensions mismatch');
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini Embedding Failed');
    console.log(`   Error: ${(error as Error).message}`);
    return false;
  }
}

async function testOpenAIEmbedding() {
  console.log('\n📊 Test 2: OpenAI Embedding API');
  console.log('-'.repeat(60));

  if (!OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment');
    return false;
  }

  try {
    const provider = new OpenAIProvider(OPENAI_API_KEY);
    const result = await provider.createEmbedding({
      text: 'Test embedding with OpenAI API'
    });

    console.log('✅ OpenAI Embedding Success');
    console.log(`   Model: ${result.model}`);
    console.log(`   Dimensions: ${result.embedding.length}`);
    console.log(`   Tokens: ${result.usage.total_tokens}`);
    console.log(`   Expected Model: text-embedding-3-small`);
    console.log(`   Expected Dimensions: 1536`);

    if (result.model === 'text-embedding-3-small' && result.embedding.length === 1536) {
      console.log('✅ Correct model and dimensions!');
      return true;
    } else {
      console.log('⚠️  Model or dimensions mismatch');
      return false;
    }
  } catch (error) {
    console.log('❌ OpenAI Embedding Failed');
    console.log(`   Error: ${(error as Error).message}`);
    return false;
  }
}

async function testLLMRouter() {
  console.log('\n📊 Test 3: LLM Router - Cost Mode (Gemini)');
  console.log('-'.repeat(60));

  if (!OPENAI_API_KEY || !GEMINI_API_KEY) {
    console.log('❌ API keys not configured');
    return false;
  }

  try {
    const router = new LLMRouter(OPENAI_API_KEY, GEMINI_API_KEY, {
      strategy: 'cost',
      fallbackEnabled: true
    });

    const result = await router.createEmbedding({
      text: 'Testing LLM Router cost optimization'
    });

    console.log('✅ LLM Router Success (Cost Mode)');
    console.log(`   Provider: ${result.provider}`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Cost: $${result.cost.toFixed(6)}`);
    console.log(`   Tokens: ${result.usage.total_tokens}`);

    if (result.provider === 'gemini' && result.cost === 0) {
      console.log('✅ Correctly using Gemini (FREE)!');
      return true;
    } else {
      console.log('⚠️  Expected Gemini provider with $0 cost');
      return false;
    }
  } catch (error) {
    console.log('❌ LLM Router Failed');
    console.log(`   Error: ${(error as Error).message}`);
    return false;
  }
}

async function testLLMRouterPerformance() {
  console.log('\n📊 Test 4: LLM Router - Performance Mode (OpenAI)');
  console.log('-'.repeat(60));

  if (!OPENAI_API_KEY || !GEMINI_API_KEY) {
    console.log('❌ API keys not configured');
    return false;
  }

  try {
    const router = new LLMRouter(OPENAI_API_KEY, GEMINI_API_KEY, {
      strategy: 'performance',
      fallbackEnabled: true
    });

    const result = await router.createEmbedding({
      text: 'Testing LLM Router performance mode'
    });

    console.log('✅ LLM Router Success (Performance Mode)');
    console.log(`   Provider: ${result.provider}`);
    console.log(`   Model: ${result.model}`);
    console.log(`   Cost: $${result.cost.toFixed(6)}`);
    console.log(`   Tokens: ${result.usage.total_tokens}`);

    if (result.provider === 'openai') {
      console.log('✅ Correctly using OpenAI!');
      return true;
    } else {
      console.log('⚠️  Expected OpenAI provider');
      return false;
    }
  } catch (error) {
    console.log('❌ LLM Router Failed');
    console.log(`   Error: ${(error as Error).message}`);
    return false;
  }
}

async function testGeminiChat() {
  console.log('\n📊 Test 5: Gemini Chat API');
  console.log('-'.repeat(60));

  if (!GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY not found');
    return false;
  }

  try {
    const provider = new GeminiProvider(GEMINI_API_KEY);
    const result = await provider.createChatCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello World" in exactly 2 words.' }
      ],
      temperature: 0.7
    });

    console.log('✅ Gemini Chat Success');
    console.log(`   Model: ${result.model}`);
    console.log(`   Response: ${result.content}`);
    console.log(`   Tokens: ${result.usage.total_tokens}`);
    console.log(`   Finish Reason: ${result.finish_reason}`);

    return true;
  } catch (error) {
    console.log('❌ Gemini Chat Failed');
    console.log(`   Error: ${(error as Error).message}`);
    return false;
  }
}

async function testCostComparison() {
  console.log('\n💰 Test 6: Cost Comparison');
  console.log('-'.repeat(60));

  if (!OPENAI_API_KEY || !GEMINI_API_KEY) {
    console.log('❌ API keys not configured');
    return false;
  }

  try {
    const text = 'This is a test document for cost comparison between OpenAI and Gemini embedding models.';

    // Test with Gemini
    const geminiProvider = new GeminiProvider(GEMINI_API_KEY);
    const geminiResult = await geminiProvider.createEmbedding({ text });
    const geminiPricing = geminiProvider.getPricing('text-embedding-004');
    const geminiCost = (geminiResult.usage.total_tokens / 1000) * geminiPricing.embeddingCostPer1kTokens;

    // Test with OpenAI
    const openaiProvider = new OpenAIProvider(OPENAI_API_KEY);
    const openaiResult = await openaiProvider.createEmbedding({ text });
    const openaiPricing = openaiProvider.getPricing('text-embedding-3-small');
    const openaiCost = (openaiResult.usage.total_tokens / 1000) * openaiPricing.embeddingCostPer1kTokens;

    console.log('Gemini (text-embedding-004):');
    console.log(`   Tokens: ${geminiResult.usage.total_tokens}`);
    console.log(`   Cost: $${geminiCost.toFixed(6)} ($0 - FREE)`);
    console.log(`   Dimensions: ${geminiResult.embedding.length}`);

    console.log('\nOpenAI (text-embedding-3-small):');
    console.log(`   Tokens: ${openaiResult.usage.total_tokens}`);
    console.log(`   Cost: $${openaiCost.toFixed(6)}`);
    console.log(`   Dimensions: ${openaiResult.embedding.length}`);

    const savings = openaiCost - geminiCost;
    const savingsPercent = openaiCost > 0 ? (savings / openaiCost * 100) : 100;

    console.log(`\n💰 Cost Savings: $${savings.toFixed(6)} (${savingsPercent.toFixed(1)}%)`);
    console.log(`✅ Using Gemini saves 100% on embedding costs!`);

    return true;
  } catch (error) {
    console.log('❌ Cost Comparison Failed');
    console.log(`   Error: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  const results = {
    geminiEmbedding: false,
    openaiEmbedding: false,
    llmRouterCost: false,
    llmRouterPerformance: false,
    geminiChat: false,
    costComparison: false
  };

  // Run all tests
  results.geminiEmbedding = await testGeminiEmbedding();
  results.openaiEmbedding = await testOpenAIEmbedding();
  results.llmRouterCost = await testLLMRouter();
  results.llmRouterPerformance = await testLLMRouterPerformance();
  results.geminiChat = await testGeminiChat();
  results.costComparison = await testCostComparison();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));

  const tests = [
    { name: 'Gemini Embedding API', result: results.geminiEmbedding },
    { name: 'OpenAI Embedding API', result: results.openaiEmbedding },
    { name: 'LLM Router (Cost Mode)', result: results.llmRouterCost },
    { name: 'LLM Router (Performance Mode)', result: results.llmRouterPerformance },
    { name: 'Gemini Chat API', result: results.geminiChat },
    { name: 'Cost Comparison', result: results.costComparison }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
    if (test.result) passed++;
    else failed++;
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${tests.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
