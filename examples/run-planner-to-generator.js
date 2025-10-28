/**
 * Othello-Planner → Generator 統合デモ
 * 
 * Plannerが生成したテスト計画から、Generatorを使ってMCP命令を生成します。
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const OthelloGenerator = require('../src/agents/othello-generator');
const { LLMFactory } = require('../src/llm/llm-factory');
require('dotenv').config();

/**
 * Plannerの出力（Markdown）をパースしてテストケースを抽出
 */
function parseTestPlanMarkdown(markdown) {
  const testCases = [];
  
  // 各テスト観点（No.X）ごとに分割
  const aspectSections = markdown.split(/^## No\.\d+:/m).slice(1);
  
  aspectSections.forEach((section, index) => {
    const aspectNo = index + 1;
    
    // テストケースセクションを抽出（### TC で始まる部分）
    const tcMatches = section.matchAll(/### (TC\d+): (.+?)\n\n\*\*手順\*\*:\n([\s\S]*?)\n\n\*\*期待結果\*\*:\n([\s\S]*?)(?=\n---|$)/g);
    
    for (const match of tcMatches) {
      const [, tcId, title, stepsText, expectedText] = match;
      
      // 手順を配列に変換
      const steps = stepsText
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      
      // 期待結果を配列に変換
      const expectedResults = expectedText
        .split('\n')
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      
      testCases.push({
        test_case_id: tcId,
        aspect_no: aspectNo,
        title: title.trim(),
        steps,
        expected_results: expectedResults
      });
    }
  });
  
  return testCases;
}

/**
 * Playwrightでページのアクセシビリティスナップショットを取得
 */
async function getPageSnapshot(page, url) {
  console.log(`📸 スナップショット取得中: ${url}`);
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // アクセシビリティスナップショットを取得
  const snapshot = await page.accessibility.snapshot();
  
  console.log(`   ✓ スナップショット取得完了\n`);
  
  return snapshot;
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🎯 Othello-Planner → Generator 統合デモ\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Plannerの出力を読み込み
  const planPath = path.join(__dirname, '../output/test-plan-2025-10-27T15-16-47.md');
  console.log(`📂 テスト計画読み込み中...`);
  const planMarkdown = await fs.readFile(planPath, 'utf-8');
  const testCases = parseTestPlanMarkdown(planMarkdown);
  
  console.log(`   ✓ テストケース ${testCases.length}件を抽出\n`);
  
  testCases.forEach(tc => {
    console.log(`   - ${tc.test_case_id} (観点No.${tc.aspect_no}): ${tc.title}`);
  });
  console.log();

  // 2. 対象URLとブラウザスナップショット取得
  const targetUrl = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';
  
  console.log('🌐 ブラウザ起動中...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  const snapshot = await getPageSnapshot(page, targetUrl);
  
  await browser.close();

  // 3. LLMクライアント作成
  console.log('🤖 LLMクライアント初期化中...\n');
  const llm = LLMFactory.create('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 3000
  });

  // 4. Generator実行
  console.log('⚙️  GeneratorでMCP命令を生成中...\n');
  const generator = new OthelloGenerator({ llm });
  
  const startTime = Date.now();
  
  const instructions = await generator.generate({
    testCases,
    snapshot,
    url: targetUrl
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  // 5. 結果を保存
  const outputPath = path.join(__dirname, '../output/mcp-instructions-from-planner.json');
  await fs.writeFile(outputPath, JSON.stringify(instructions, null, 2), 'utf-8');

  // 6. 結果サマリー
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 生成完了！\n');
  console.log(`⏱️  実行時間: ${elapsed} 秒`);
  console.log(`📝 生成された命令セット数: ${instructions.length}\n`);

  instructions.forEach(instructionSet => {
    const tc = testCases.find(t => t.test_case_id === instructionSet.test_case_id);
    console.log(`${instructionSet.test_case_id} (観点No.${instructionSet.aspect_no}): ${instructionSet.instructions.length}命令`);
    if (tc) {
      console.log(`   タイトル: ${tc.title}`);
    }
    
    // 各命令タイプの集計
    const typeCounts = {};
    instructionSet.instructions.forEach(inst => {
      typeCounts[inst.type] = (typeCounts[inst.type] || 0) + 1;
    });
    
    const typesList = Object.entries(typeCounts)
      .map(([type, count]) => `${type}(${count})`)
      .join(', ');
    console.log(`   命令内訳: ${typesList}`);
    console.log();
  });

  console.log(`💾 JSON出力: ${outputPath}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 7. サンプル命令を表示
  if (instructions.length > 0 && instructions[0].instructions.length > 0) {
    console.log('📋 生成された命令サンプル (最初の3命令):\n');
    const sampleInstructions = instructions[0].instructions.slice(0, 3);
    sampleInstructions.forEach((inst, idx) => {
      console.log(`${idx + 1}. ${inst.type}`);
      console.log(`   説明: ${inst.description}`);
      if (inst.selector) console.log(`   セレクタ: ${inst.selector}`);
      if (inst.value) console.log(`   値: ${inst.value}`);
      console.log();
    });
  }
}

// エラーハンドリング
main().catch(error => {
  console.error('\n💥 エラー:', error.message);
  console.error(error.stack);
  process.exit(1);
});
