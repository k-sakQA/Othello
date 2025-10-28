/**
 * @file Othello-Planner カスタムデモ
 * @description 指定されたURLとテスト観点リストでテスト計画を生成
 */

require('dotenv').config();
const path = require('path');
const OthelloPlanner = require('../src/agents/othello-planner');
const { LLMFactory } = require('../src/llm/llm-factory');

async function demoCustomPlanner() {
  console.log('🎯 Othello-Planner カスタムデモ開始\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. 設定確認
  const provider = process.env.LLM_PROVIDER || 'openai';
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log(`📡 LLMプロバイダ: ${provider.toUpperCase()}`);
  
  if (provider === 'openai' && (!apiKey || apiKey === 'your_openai_api_key_here')) {
    console.log('\n⚠️  OpenAI API Keyが設定されていません！');
    console.log('📝 .env ファイルに以下を設定してください：');
    console.log('   OPENAI_API_KEY=sk-proj-...');
    console.log('\n💡 Mockプロバイダで実行する場合は：');
    console.log('   $env:LLM_PROVIDER="mock"; node examples/demo-planner-custom.js');
    console.log('\nMockモードで実行します...\n');
    return runWithMock();
  }

  // 2. LLMクライアント作成
  const llmConfig = {
    apiKey,
    model: 'gpt-4o', // GPT-4o (2024-11-20) / gpt-4o-mini
    temperature: 0.7,
    maxTokens: 4000
  };

  console.log(`🤖 モデル: ${llmConfig.model}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const llm = LLMFactory.create(provider, llmConfig);
  const planner = new OthelloPlanner({ llm, config: {} });

  // 3. テスト観点リストCSV（新しい簡易版を使用）
  const testAspectsCSV = path.resolve(__dirname, '../config/test-ViewpointList-simple.csv');
  console.log(`📄 テスト観点リスト: test-ViewpointList-simple.csv`);

  // 4. テスト対象URL
  const targetUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';
  console.log(`🌐 対象URL: ${targetUrl}\n`);

  // 5. テスト計画生成オプション
  const options = {
    url: targetUrl,
    testAspectsCSV,
    existingCoverage: null, // 初回実行のため既存カバレッジなし
    iteration: 1
  };

  console.log('⏳ テスト計画生成中... (LLM APIを呼び出しています)\n');

  try {
    const startTime = Date.now();
    const result = await planner.generateTestPlan(options);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ テスト計画生成完了！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`⏱️  実行時間: ${elapsed}秒`);
    console.log(`🔄 イテレーション: ${result.iteration}`);
    console.log(`📊 優先テスト観点数: ${result.aspects.length}`);
    console.log(`📝 生成されたテストケース数: ${result.testCases.length}`);
    
    // CSVパース結果の確認
    console.log(`\n🔍 CSV読み込み確認:`);
    const validAspects = result.aspects.filter(a => a.test_type_major || a.test_aspect);
    console.log(`   有効な観点数: ${validAspects.length}/${result.aspects.length}`);
    if (validAspects.length > 0) {
      console.log(`   サンプル: No.${validAspects[0].aspect_no} - ${validAspects[0].test_type_major}`);
    }

    console.log('\n【生成されたテストケース（上位5件）】');
    result.testCases.slice(0, 5).forEach((tc, index) => {
      console.log(`\n  ${index + 1}. ${tc.case_id}: ${tc.title}`);
      console.log(`     観点No: ${tc.aspect_no}, 優先度: ${tc.priority}`);
      console.log(`     手順: ${tc.steps.length}ステップ, 期待結果: ${tc.expected_results.length}項目`);
      if (tc.steps.length > 0) {
        console.log(`     - ${tc.steps[0]}`);
      }
    });

    if (result.testCases.length > 5) {
      console.log(`\n  ... 他 ${result.testCases.length - 5} 件のテストケース`);
    }

    // 6. Markdownファイルに保存
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputPath = path.resolve(__dirname, `../output/test-plan-${timestamp}.md`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result.markdown, 'utf-8');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 レポート保存');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`💾 ${outputPath}\n`);

    console.log('✅ デモ完了！生成されたMarkdownファイルを確認してください。\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   HTTPステータス: ${error.response.status}`);
      console.error(`   レスポンス: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    console.error('\n📋 スタックトレース:');
    console.error(error.stack);
    process.exit(1);
  }
}

async function runWithMock() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 Mockモードで実行');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const llm = LLMFactory.create('mock');
  const planner = new OthelloPlanner({ llm, config: {} });

  const testAspectsCSV = path.resolve(__dirname, '../config/test-ViewpointList-simple.csv');
  const targetUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  console.log(`📄 テスト観点リスト: test-ViewpointList-simple.csv`);
  console.log(`🌐 対象URL: ${targetUrl}\n`);

  const options = {
    url: targetUrl,
    testAspectsCSV,
    existingCoverage: null,
    iteration: 1
  };

  const result = await planner.generateTestPlan(options);

  console.log('✅ Mock実行完了');
  console.log(`📊 優先テスト観点数: ${result.aspects.length}`);
  console.log(`📝 生成されたテストケース数: ${result.testCases.length}\n`);

  console.log('💡 実際のLLM分析を行うには、.envファイルにOpenAI API Keyを設定してください。\n');
}

// 実行
if (require.main === module) {
  demoCustomPlanner().catch(console.error);
}

module.exports = demoCustomPlanner;
