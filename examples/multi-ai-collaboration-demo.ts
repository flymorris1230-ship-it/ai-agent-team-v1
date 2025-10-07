/**
 * Multi-AI Collaboration Demo
 * Demonstrates how to use ChatGPT, Gemini, and AI Agent Team together
 */

import { ChatGPTClient } from '../src/main/js/clients/chatgpt-client';
import { GeminiClient } from '../src/main/js/clients/gemini-client';

// Configuration
const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4o-mini',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
    model: 'gemini-1.5-flash',
  },
};

// Initialize clients
const chatgpt = new ChatGPTClient(config.openai);
const gemini = new GeminiClient(config.google);

/**
 * Demo 1: Parallel Execution with Voting
 * 同時調用兩個 AI，比較結果
 */
async function demo1_ParallelVoting() {
  console.log('\n========================================');
  console.log('Demo 1: 並行執行 + 投票');
  console.log('========================================\n');

  const task = '撰寫一個 TypeScript 函數來計算斐波那契數列的第 n 項';

  console.log(`📋 任務: ${task}\n`);

  // 並行調用
  console.log('🔄 同時調用 ChatGPT 和 Gemini...\n');

  const [gptResult, geminiResult] = await Promise.all([
    chatgpt.generateCode(task, 'typescript'),
    gemini.generateCode(task, 'typescript'),
  ]);

  // 顯示結果
  console.log('✅ ChatGPT 結果:');
  console.log(`   Token: ${gptResult.tokens}`);
  console.log(`   成本: $${gptResult.cost.toFixed(6)}`);
  console.log(`   代碼長度: ${gptResult.content.length} 字元\n`);
  console.log(gptResult.content.substring(0, 200) + '...\n');

  console.log('✅ Gemini 結果:');
  console.log(`   Token: ${geminiResult.tokens}`);
  console.log(`   成本: $${geminiResult.cost.toFixed(6)}`);
  console.log(`   代碼長度: ${geminiResult.content.length} 字元\n`);
  console.log(geminiResult.content.substring(0, 200) + '...\n');

  // 簡單投票 (根據代碼長度和包含註釋數量)
  const gptScore = calculateScore(gptResult.content);
  const geminiScore = calculateScore(geminiResult.content);

  console.log('🏆 投票結果:');
  console.log(`   ChatGPT 得分: ${gptScore}`);
  console.log(`   Gemini 得分: ${geminiScore}`);

  const winner = gptScore > geminiScore ? 'ChatGPT' : 'Gemini';
  const winnerResult = gptScore > geminiScore ? gptResult : geminiResult;

  console.log(`\n🎉 勝出: ${winner}\n`);
  console.log('最佳答案:');
  console.log(winnerResult.content);

  console.log('\n📊 總成本:', `$${(gptResult.cost + geminiResult.cost).toFixed(6)}`);
}

/**
 * Demo 2: Cascade Execution (階梯式執行)
 * Gemini 生成草稿 → ChatGPT 優化
 */
async function demo2_CascadeExecution() {
  console.log('\n========================================');
  console.log('Demo 2: 階梯式執行');
  console.log('========================================\n');

  const task = '創建一個 React 組件來顯示用戶列表，支援搜索和分頁';

  console.log(`📋 任務: ${task}\n`);

  // Step 1: Gemini 快速生成草稿
  console.log('1️⃣ Gemini: 生成初版代碼...');
  const draft = await gemini.generateCode(task, 'typescript');
  console.log(`   ✅ 完成 (Token: ${draft.tokens}, 成本: $${draft.cost.toFixed(6)})\n`);

  // Step 2: ChatGPT 優化
  console.log('2️⃣ ChatGPT: 優化代碼...');
  const optimizePrompt = `優化以下 React 組件代碼，改進性能和可讀性:\n\n${draft.content}`;
  const optimized = await chatgpt.complete(optimizePrompt);
  console.log(`   ✅ 完成 (Token: ${optimized.tokens}, 成本: $${optimized.cost.toFixed(6)})\n`);

  console.log('🎉 最終優化代碼:');
  console.log(optimized.content);

  console.log('\n📊 總成本:', `$${(draft.cost + optimized.cost).toFixed(6)}`);
  console.log('💡 成本節省:', `使用階梯式執行比直接使用 ChatGPT 節省約 ${((1 - (draft.cost + optimized.cost) / (optimized.cost * 2)) * 100).toFixed(0)}%`);
}

/**
 * Demo 3: Specialization (專業分工)
 * 根據任務類型選擇最合適的 AI
 */
async function demo3_Specialization() {
  console.log('\n========================================');
  console.log('Demo 3: 專業分工');
  console.log('========================================\n');

  // 定義不同類型的任務
  const tasks = [
    {
      name: '代碼生成',
      description: '創建一個 REST API 端點來處理用戶註冊',
      bestAI: 'ChatGPT',
    },
    {
      name: '文檔撰寫',
      description: '為用戶註冊 API 撰寫完整的使用文檔',
      bestAI: 'Gemini',
    },
    {
      name: '代碼審查',
      description: '審查用戶註冊 API 的安全性和性能',
      bestAI: 'ChatGPT',
    },
  ];

  let totalCost = 0;

  for (const task of tasks) {
    console.log(`\n📋 任務: ${task.name}`);
    console.log(`   描述: ${task.description}`);
    console.log(`   最佳選擇: ${task.bestAI}\n`);

    if (task.bestAI === 'ChatGPT') {
      const result = await chatgpt.complete(task.description);
      console.log(`   ✅ 完成 (Token: ${result.tokens}, 成本: $${result.cost.toFixed(6)})`);
      console.log(`   結果摘要: ${result.content.substring(0, 100)}...\n`);
      totalCost += result.cost;
    } else {
      const result = await gemini.generate(task.description);
      console.log(`   ✅ 完成 (Token: ${result.tokens}, 成本: $${result.cost.toFixed(6)})`);
      console.log(`   結果摘要: ${result.content.substring(0, 100)}...\n`);
      totalCost += result.cost;
    }
  }

  console.log('\n📊 總成本:', `$${totalCost.toFixed(6)}`);
  console.log('💡 效率:', '通過專業分工，各 AI 處理其擅長的任務，提升整體質量和速度');
}

/**
 * Demo 4: Dynamic Routing (動態路由)
 * 根據任務特性自動選擇 AI
 */
async function demo4_DynamicRouting() {
  console.log('\n========================================');
  console.log('Demo 4: 動態路由');
  console.log('========================================\n');

  const tasks = [
    {
      description: '快速生成一個簡單的排序函數',
      complexity: 'low',
      costSensitive: true,
    },
    {
      description: '設計一個分散式系統的架構',
      complexity: 'high',
      costSensitive: false,
    },
    {
      description: '撰寫產品使用手冊',
      complexity: 'medium',
      costSensitive: true,
    },
  ];

  for (const task of tasks) {
    console.log(`\n📋 任務: ${task.description}`);
    console.log(`   複雜度: ${task.complexity}`);
    console.log(`   成本敏感: ${task.costSensitive ? '是' : '否'}`);

    // 路由邏輯
    let selectedAI: string;
    let result: any;

    if (task.costSensitive && task.complexity === 'low') {
      selectedAI = 'Gemini (成本優化)';
      result = await gemini.generate(task.description);
    } else if (task.complexity === 'high') {
      selectedAI = 'ChatGPT (高質量)';
      result = await chatgpt.complete(task.description);
    } else {
      selectedAI = 'ChatGPT (平衡)';
      result = await chatgpt.complete(task.description);
    }

    console.log(`   ➡️ 選擇: ${selectedAI}`);
    console.log(`   ✅ 完成 (Token: ${result.tokens}, 成本: $${result.cost.toFixed(6)})`);
    console.log(`   結果摘要: ${result.content.substring(0, 80)}...\n`);
  }

  console.log('💡 動態路由優勢: 自動選擇最合適的 AI，平衡成本和質量');
}

/**
 * Demo 5: Cost Comparison (成本對比)
 */
async function demo5_CostComparison() {
  console.log('\n========================================');
  console.log('Demo 5: 成本對比');
  console.log('========================================\n');

  const task = '創建一個 TODO List 應用的完整實現，包含前端和後端';

  console.log(`📋 任務: ${task}\n`);

  // ChatGPT
  console.log('測試 ChatGPT (gpt-4o-mini)...');
  const gptResult = await chatgpt.complete(task);
  console.log(`✅ Token: ${gptResult.tokens}, 成本: $${gptResult.cost.toFixed(6)}\n`);

  // Gemini
  console.log('測試 Gemini (gemini-1.5-flash)...');
  const geminiResult = await gemini.generate(task);
  console.log(`✅ Token: ${geminiResult.tokens}, 成本: $${geminiResult.cost.toFixed(6)}\n`);

  // 比較
  console.log('📊 成本對比:');
  console.log(`   ChatGPT: $${gptResult.cost.toFixed(6)}`);
  console.log(`   Gemini:  $${geminiResult.cost.toFixed(6)}`);

  const savings = ((1 - geminiResult.cost / gptResult.cost) * 100).toFixed(0);
  console.log(`   💰 Gemini 節省: ${savings}%`);

  console.log('\n💡 建議:');
  console.log('   - 簡單任務: 使用 Gemini (成本低)');
  console.log('   - 複雜任務: 使用 ChatGPT (質量高)');
  console.log('   - 關鍵任務: 並行執行 + 投票 (最可靠)');
}

/**
 * Helper: Calculate score for voting
 */
function calculateScore(content: string): number {
  let score = 0;

  // 長度適中 (+10)
  if (content.length > 100 && content.length < 5000) {
    score += 10;
  }

  // 包含代碼塊 (+20)
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  score += codeBlocks * 20;

  // 包含註釋 (+10)
  if (content.includes('//') || content.includes('/*')) {
    score += 10;
  }

  // 包含類型註解 (+10)
  if (content.includes(':') && content.includes('function')) {
    score += 10;
  }

  // 結構清晰 (+10)
  if (content.includes('```typescript') || content.includes('```javascript')) {
    score += 10;
  }

  return score;
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Multi-AI Collaboration Demo          ║');
  console.log('║  ChatGPT + Gemini 協作示範             ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    // 檢查 API keys
    if (!config.openai.apiKey) {
      console.error('❌ 錯誤: OPENAI_API_KEY 未設置');
      return;
    }
    if (!config.google.apiKey) {
      console.error('❌ 錯誤: GOOGLE_API_KEY 未設置');
      return;
    }

    // 運行所有 demos
    await demo1_ParallelVoting();
    // await demo2_CascadeExecution();
    // await demo3_Specialization();
    // await demo4_DynamicRouting();
    // await demo5_CostComparison();

    console.log('\n\n✅ 所有示範完成！');
  } catch (error: any) {
    console.error('\n❌ 錯誤:', error.message);
    console.error(error.stack);
  }
}

// 如果直接執行此文件
if (require.main === module) {
  main();
}

export {
  demo1_ParallelVoting,
  demo2_CascadeExecution,
  demo3_Specialization,
  demo4_DynamicRouting,
  demo5_CostComparison,
};
