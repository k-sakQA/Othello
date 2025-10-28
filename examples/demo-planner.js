/**
 * @file Othello-Planner デモ
 * @description 実際にOthello-Plannerを使ってテスト計画を生成するデモ
 */

const path = require('path');
const OthelloPlanner = require('../src/agents/othello-planner');
const LLMFactory = require('../src/llm/llm-factory');

async function demoPlanner() {
  console.log('🎯 Othello-Planner デモ開始\n');

  // 1. LLMプロバイダの選択（Mock/Claude/OpenAI）
  const provider = process.env.LLM_PROVIDER || 'mock'; // 'claude', 'openai', 'mock'
  console.log(`📡 LLMプロバイダ: ${provider}`);

  const llm = LLMFactory.create(provider, {
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
    model: provider === 'claude' ? 'claude-3-5-sonnet-20241022' : 'gpt-4',
    temperature: 0.7,
    maxTokens: 4000
  });

  // 2. Othello-Plannerインスタンス作成
  const planner = new OthelloPlanner({ llm, config: {} });
  console.log('✅ Othello-Planner初期化完了\n');

  // 3. テスト観点リストCSVのパス
  const testAspectsCSV = path.resolve(__dirname, '../config/test-ViewpointList.csv');
  console.log(`📄 テスト観点リストCSV: ${testAspectsCSV}\n`);

  // 4. テスト対象URLとオプション
  const options = {
    url: 'https://hotel.testplanisphere.dev/ja/plans.html',
    testAspectsCSV,
    existingCoverage: {
      aspectCoverage: {
        tested_aspects: [1, 5, 10] // 例: 観点1,5,10は既にテスト済み
      }
    },
    iteration: 1
  };

  console.log('🌐 対象URL:', options.url);
  console.log('🔄 イテレーション:', options.iteration);
  console.log('✅ 既存カバレッジ: 観点1,5,10はテスト済み\n');

  console.log('⏳ テスト計画生成中...\n');

  try {
    // 5. テスト計画生成実行
    const result = await planner.generateTestPlan(options);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 テスト計画生成結果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`✅ イテレーション: ${result.iteration}`);
    console.log(`📊 優先テスト観点数: ${result.aspects.length}`);
    console.log(`📝 生成されたテストケース数: ${result.testCases.length}\n`);

    console.log('【優先テスト観点リスト】');
    result.aspects.forEach((aspect, index) => {
      console.log(`  ${index + 1}. No.${aspect.aspect_no}: ${aspect.test_type_major} - ${aspect.test_type_minor}`);
      console.log(`     観点: ${aspect.test_aspect}`);
    });

    console.log('\n【生成されたテストケース】');
    result.testCases.forEach((tc, index) => {
      console.log(`  ${index + 1}. ${tc.case_id}: ${tc.title}`);
      console.log(`     観点No: ${tc.aspect_no}, 優先度: ${tc.priority}`);
      console.log(`     手順数: ${tc.steps.length}, 期待結果数: ${tc.expected_results.length}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 Markdownレポート（抜粋）');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Markdownの最初の500文字を表示
    const markdownPreview = result.markdown.substring(0, 500);
    console.log(markdownPreview);
    console.log('\n... (続きは result.markdown を参照)\n');

    // 6. Markdownファイルに保存
    const fs = require('fs').promises;
    const outputPath = path.resolve(__dirname, '../output/test-plan-demo.md');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, result.markdown, 'utf-8');
    console.log(`💾 Markdownレポート保存完了: ${outputPath}\n`);

    console.log('✅ デモ完了！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  demoPlanner().catch(console.error);
}

module.exports = demoPlanner;
