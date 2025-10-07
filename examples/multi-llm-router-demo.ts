/**
 * Multi-LLM Router Demo
 * Demonstrates the intelligent LLM routing system with OpenAI, Gemini, and Claude
 */

import { LLMRouter } from '../src/main/js/llm/router';
import type { ChatRequest } from '../src/main/js/llm/providers/base-provider';

// Configuration
const config = {
  openaiKey: process.env.OPENAI_API_KEY || '',
  geminiKey: process.env.GOOGLE_API_KEY || '',
  claudeKey: process.env.ANTHROPIC_API_KEY || '',
};

/**
 * Demo 1: Automatic Provider Selection (Balanced Strategy)
 */
async function demo1_BalancedRouting() {
  console.log('\n========================================');
  console.log('Demo 1: 智能路由（Balanced 策略）');
  console.log('========================================\n');

  const router = new LLMRouter(
    config.openaiKey,
    config.geminiKey,
    config.claudeKey,
    { strategy: 'balanced', fallbackEnabled: true, maxRetries: 2 }
  );

  // Test cases with different complexity levels
  const testCases = [
    {
      name: '簡單查詢',
      messages: [{ role: 'user' as const, content: '什麼是 TypeScript?' }],
      expectedProvider: 'Gemini (便宜/免費)',
    },
    {
      name: '複雜查詢',
      messages: [
        {
          role: 'user' as const,
          content: `設計一個分散式系統的架構，需要考慮：
            1. 微服務架構
            2. 數據庫分片策略
            3. 負載均衡
            4. 容錯機制
            5. 性能優化
            請提供詳細的設計方案和實現步驟。`,
        },
      ],
      expectedProvider: 'OpenAI (複雜查詢) 或 Claude (高複雜度)',
    },
    {
      name: '安全任務',
      messages: [
        {
          role: 'user' as const,
          content: '如何實現 JWT authentication 和 Row Level Security (RLS)?',
        },
      ],
      expectedProvider: 'Claude (安全任務)',
    },
    {
      name: 'UI 任務',
      messages: [
        {
          role: 'user' as const,
          content: '創建一個 React 組件來顯示用戶列表，需要支援搜索和分頁功能',
        },
      ],
      expectedProvider: 'OpenAI (UI 任務)',
    },
  ];

  for (const testCase of testCases) {
    console.log(`📋 任務: ${testCase.name}`);
    console.log(`   預期選擇: ${testCase.expectedProvider}`);

    try {
      const request: ChatRequest = {
        messages: testCase.messages,
        temperature: 0.7,
      };

      const response = await router.createChatCompletion(request);

      console.log(`   ✅ 實際選擇: ${response.provider}`);
      console.log(`   模型: ${response.model}`);
      console.log(`   Token: ${response.usage.total_tokens}`);
      console.log(`   成本: $${response.cost.toFixed(6)}`);
      console.log(`   回應摘要: ${response.message.content.substring(0, 80)}...`);
      console.log();
    } catch (error: any) {
      console.error(`   ❌ 錯誤: ${error.message}\n`);
    }
  }
}

/**
 * Demo 2: Cost Optimization Strategy
 */
async function demo2_CostStrategy() {
  console.log('\n========================================');
  console.log('Demo 2: 成本優化策略');
  console.log('========================================\n');

  const router = new LLMRouter(
    config.openaiKey,
    config.geminiKey,
    config.claudeKey,
    { strategy: 'cost', fallbackEnabled: true, maxRetries: 2 }
  );

  const tasks = [
    '寫一個排序函數',
    '解釋什麼是遞歸',
    '創建一個 TODO List 應用',
  ];

  let totalCost = 0;

  for (const task of tasks) {
    console.log(`📋 任務: ${task}`);

    try {
      const response = await router.createChatCompletion({
        messages: [{ role: 'user', content: task }],
      });

      console.log(`   Provider: ${response.provider}`);
      console.log(`   成本: $${response.cost.toFixed(6)}`);
      console.log(`   Token: ${response.usage.total_tokens}`);
      console.log();

      totalCost += response.cost;
    } catch (error: any) {
      console.error(`   ❌ 錯誤: ${error.message}\n`);
    }
  }

  console.log(`💰 總成本: $${totalCost.toFixed(6)}`);
  console.log(`💡 成本策略: 優先使用 Gemini (免費/便宜)`);
}

/**
 * Demo 3: Performance Strategy
 */
async function demo3_PerformanceStrategy() {
  console.log('\n========================================');
  console.log('Demo 3: 性能優先策略');
  console.log('========================================\n');

  const router = new LLMRouter(
    config.openaiKey,
    config.geminiKey,
    config.claudeKey,
    { strategy: 'performance', fallbackEnabled: true, maxRetries: 2 }
  );

  console.log('📋 任務: 複雜的代碼生成');

  try {
    const startTime = Date.now();

    const response = await router.createChatCompletion({
      messages: [
        {
          role: 'user',
          content: '創建一個完整的 REST API，包含用戶認證、CRUD 操作和錯誤處理',
        },
      ],
      temperature: 0.3,
    });

    const duration = Date.now() - startTime;

    console.log(`   ✅ Provider: ${response.provider} (性能優先)`);
    console.log(`   模型: ${response.model}`);
    console.log(`   執行時間: ${duration}ms`);
    console.log(`   Token: ${response.usage.total_tokens}`);
    console.log(`   成本: $${response.cost.toFixed(6)}`);
    console.log(`   代碼長度: ${response.message.content.length} 字元`);
  } catch (error: any) {
    console.error(`   ❌ 錯誤: ${error.message}`);
  }
}

/**
 * Demo 4: Automatic Fallback
 */
async function demo4_AutomaticFallback() {
  console.log('\n========================================');
  console.log('Demo 4: 自動 Fallback 機制');
  console.log('========================================\n');

  // 使用無效的 OpenAI key 來觸發 fallback
  const router = new LLMRouter(
    'invalid-key', // 故意使用無效 key
    config.geminiKey,
    config.claudeKey,
    {
      strategy: 'performance', // 性能策略會優先選 OpenAI
      fallbackEnabled: true,
      maxRetries: 1, // 減少重試次數以加快 demo
    }
  );

  console.log('📋 任務: 簡單問答');
  console.log('   Primary: OpenAI (使用無效 key)');
  console.log('   Fallback: Gemini or Claude\n');

  try {
    const response = await router.createChatCompletion({
      messages: [{ role: 'user', content: 'Hello!' }],
    });

    console.log(`   ✅ Fallback 成功！`);
    console.log(`   實際使用: ${response.provider}`);
    console.log(`   模型: ${response.model}`);
    console.log(`   回應: ${response.message.content.substring(0, 50)}...`);
  } catch (error: any) {
    console.error(`   ❌ Fallback 也失敗: ${error.message}`);
  }
}

/**
 * Demo 5: Health Check and Statistics
 */
async function demo5_HealthAndStats() {
  console.log('\n========================================');
  console.log('Demo 5: 健康檢查與統計');
  console.log('========================================\n');

  const router = new LLMRouter(
    config.openaiKey,
    config.geminiKey,
    config.claudeKey,
    { strategy: 'balanced', fallbackEnabled: true, maxRetries: 2 }
  );

  // Execute some requests first
  console.log('執行幾個請求以累積統計...\n');

  const tasks = ['Hello', 'TypeScript 是什麼？', '設計一個系統架構'];

  for (const task of tasks) {
    try {
      await router.createChatCompletion({
        messages: [{ role: 'user', content: task }],
      });
    } catch (error) {
      // Ignore errors
    }
  }

  // Get health status
  console.log('📊 健康檢查:');
  const healthStatus = await router.getHealthStatus();

  for (const [provider, health] of Object.entries(healthStatus)) {
    console.log(`   ${provider}:`);
    console.log(`      狀態: ${health.healthy ? '✅ 健康' : '❌ 不健康'}`);
    console.log(`      延遲: ${health.latency}ms`);
  }

  // Get usage stats
  console.log('\n📈 使用統計:');
  const stats = router.getUsageStats();

  for (const [provider, stat] of Object.entries(stats)) {
    console.log(`   ${provider}:`);
    console.log(`      請求數: ${stat.requests}`);
    console.log(`      健康: ${stat.healthy ? '✅' : '❌'}`);
  }
}

/**
 * Demo 6: Embedding with Cost Optimization
 */
async function demo6_EmbeddingOptimization() {
  console.log('\n========================================');
  console.log('Demo 6: Embedding 成本優化');
  console.log('========================================\n');

  const router = new LLMRouter(
    config.openaiKey,
    config.geminiKey,
    config.claudeKey,
    { strategy: 'cost', fallbackEnabled: true, maxRetries: 2 }
  );

  const texts = [
    'TypeScript is a typed superset of JavaScript',
    'React is a JavaScript library for building user interfaces',
    'Next.js is a React framework for production',
  ];

  console.log('📋 生成 Embeddings (Cost 策略)\n');

  let totalCost = 0;

  for (const text of texts) {
    try {
      const response = await router.createEmbedding({
        input: text,
      });

      console.log(`   ✅ Provider: ${response.provider}`);
      console.log(`   模型: ${response.model}`);
      console.log(`   維度: ${response.embedding.length}`);
      console.log(`   Token: ${response.usage.total_tokens}`);
      console.log(`   成本: $${response.cost.toFixed(6)}`);
      console.log();

      totalCost += response.cost;
    } catch (error: any) {
      console.error(`   ❌ 錯誤: ${error.message}\n`);
    }
  }

  console.log(`💰 總成本: $${totalCost.toFixed(6)}`);
  console.log(`💡 Gemini embeddings 免費！`);
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Multi-LLM Router Demo                 ║');
  console.log('║  OpenAI + Gemini + Claude 智能路由    ║');
  console.log('╚════════════════════════════════════════╝');

  // Check API keys
  if (!config.openaiKey) {
    console.error('\n❌ 錯誤: OPENAI_API_KEY 未設置');
    console.log('提示: export OPENAI_API_KEY=sk-...');
  }
  if (!config.geminiKey) {
    console.error('\n❌ 錯誤: GOOGLE_API_KEY 未設置');
    console.log('提示: export GOOGLE_API_KEY=AIza...');
  }
  if (!config.claudeKey) {
    console.warn('\n⚠️  警告: ANTHROPIC_API_KEY 未設置（可選）');
  }

  if (!config.openaiKey || !config.geminiKey) {
    console.log('\n請設置必要的 API keys 後重試。');
    return;
  }

  try {
    // Run all demos
    await demo1_BalancedRouting();
    // await demo2_CostStrategy();
    // await demo3_PerformanceStrategy();
    // await demo4_AutomaticFallback();
    // await demo5_HealthAndStats();
    // await demo6_EmbeddingOptimization();

    console.log('\n\n✅ 所有示範完成！');
    console.log('\n💡 提示:');
    console.log('   - 取消註解其他 demo 函數來測試更多功能');
    console.log('   - 修改 strategy 參數來測試不同路由策略');
    console.log('   - 查看 router.ts 了解智能路由邏輯');
  } catch (error: any) {
    console.error('\n❌ 錯誤:', error.message);
    console.error(error.stack);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export {
  demo1_BalancedRouting,
  demo2_CostStrategy,
  demo3_PerformanceStrategy,
  demo4_AutomaticFallback,
  demo5_HealthAndStats,
  demo6_EmbeddingOptimization,
};
