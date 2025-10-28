/**
 * Othello-Reporter デモスクリプト
 * 各種形式のレポート生成を実演
 */

const OthelloReporter = require('../src/agents/othello-reporter');
const path = require('path');

console.log('📄 Othello-Reporter デモ\n');
console.log('='.repeat(60));
console.log('');

// レポーター初期化
const reporter = new OthelloReporter({
  outputDir: path.join(__dirname, '../demo-reports'),
  includeTimestamp: true
});

// デモ用のテスト実行データ
const testData = {
  sessionId: 'demo-session-20251029-001',
  startTime: new Date('2025-10-29T10:00:00'),
  endTime: new Date('2025-10-29T10:18:30'),
  totalDuration: 1110000, // 18分30秒
  iterations: 4,
  coverage: {
    aspectCoverage: {
      total: 23,
      tested: 18,
      percentage: 78.26,
      tested_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      untested_aspects: [19, 20, 21, 22, 23]
    },
    testCaseCoverage: {
      total: 25,
      passed: 22,
      failed: 3,
      pass_rate: 88
    }
  },
  executionResults: [
    // イテレーション1
    { test_case_id: 'TC001', aspect_no: 1, success: true, duration_ms: 1200 },
    { test_case_id: 'TC002', aspect_no: 2, success: true, duration_ms: 980 },
    { test_case_id: 'TC003', aspect_no: 3, success: false, duration_ms: 1500, error: 'Element not found: #submit-button' },
    
    // イテレーション2
    { test_case_id: 'TC004', aspect_no: 4, success: true, duration_ms: 1350 },
    { test_case_id: 'TC005', aspect_no: 5, success: true, duration_ms: 890 },
    { test_case_id: 'TC006', aspect_no: 6, success: true, duration_ms: 1100 },
    { test_case_id: 'TC007', aspect_no: 7, success: true, duration_ms: 1250 },
    { test_case_id: 'TC008', aspect_no: 8, success: false, duration_ms: 2100, error: 'Timeout waiting for navigation' },
    
    // イテレーション3
    { test_case_id: 'TC009', aspect_no: 9, success: true, duration_ms: 980 },
    { test_case_id: 'TC010', aspect_no: 10, success: true, duration_ms: 1050 },
    { test_case_id: 'TC011', aspect_no: 11, success: true, duration_ms: 1200 },
    { test_case_id: 'TC012', aspect_no: 12, success: true, duration_ms: 890 },
    { test_case_id: 'TC013', aspect_no: 13, success: true, duration_ms: 1150 },
    { test_case_id: 'TC014', aspect_no: 14, success: true, duration_ms: 1000 },
    { test_case_id: 'TC015', aspect_no: 15, success: true, duration_ms: 1300 },
    
    // イテレーション4
    { test_case_id: 'TC016', aspect_no: 16, success: true, duration_ms: 950 },
    { test_case_id: 'TC017', aspect_no: 17, success: true, duration_ms: 1080 },
    { test_case_id: 'TC018', aspect_no: 18, success: true, duration_ms: 1200 },
    { test_case_id: 'TC019', aspect_no: 1, success: true, duration_ms: 880 },  // 再テスト
    { test_case_id: 'TC020', aspect_no: 2, success: true, duration_ms: 920 },  // 再テスト
    { test_case_id: 'TC021', aspect_no: 19, success: true, duration_ms: 1100 },
    { test_case_id: 'TC022', aspect_no: 20, success: false, duration_ms: 1800, error: 'Assertion failed: Expected text not found' },
    { test_case_id: 'TC023', aspect_no: 21, success: true, duration_ms: 990 },
    { test_case_id: 'TC024', aspect_no: 22, success: true, duration_ms: 1050 },
    { test_case_id: 'TC025', aspect_no: 23, success: true, duration_ms: 1100 }
  ]
};

async function runDemo() {
  console.log('📊 シナリオ: 完全なテスト実行レポート生成\n');
  console.log('テスト実行サマリー:');
  console.log(`  - セッションID: ${testData.sessionId}`);
  console.log(`  - イテレーション数: ${testData.iterations}`);
  console.log(`  - 総実行時間: ${reporter.formatDuration(testData.totalDuration)}`);
  console.log(`  - カバレッジ: ${testData.coverage.aspectCoverage.percentage}%`);
  console.log(`  - 成功率: ${testData.coverage.testCaseCoverage.pass_rate}%`);
  console.log('');
  console.log('-'.repeat(60));
  console.log('');

  // JSON形式
  console.log('📝 1. JSON形式のレポート生成中...');
  const jsonReport = reporter.generateJSON(testData);
  const jsonSizeKB = (Buffer.byteLength(jsonReport, 'utf8') / 1024).toFixed(2);
  console.log(`   ✅ 生成完了 (${jsonSizeKB} KB)`);
  console.log(`   プレビュー (最初の200文字):`);
  console.log(`   ${jsonReport.substring(0, 200)}...`);
  console.log('');

  // Markdown形式
  console.log('📝 2. Markdown形式のレポート生成中...');
  const markdownReport = reporter.generateMarkdown(testData);
  const markdownSizeKB = (Buffer.byteLength(markdownReport, 'utf8') / 1024).toFixed(2);
  const markdownLines = markdownReport.split('\n').length;
  console.log(`   ✅ 生成完了 (${markdownSizeKB} KB, ${markdownLines}行)`);
  console.log(`   プレビュー (最初の10行):`);
  console.log(markdownReport.split('\n').slice(0, 10).map(line => `   ${line}`).join('\n'));
  console.log(`   ...`);
  console.log('');

  // HTML形式
  console.log('📝 3. HTML形式のレポート生成中...');
  const htmlReport = reporter.generateHTML(testData);
  const htmlSizeKB = (Buffer.byteLength(htmlReport, 'utf8') / 1024).toFixed(2);
  const hasStyles = htmlReport.includes('<style>');
  const hasProgress = htmlReport.includes('progress-bar');
  console.log(`   ✅ 生成完了 (${htmlSizeKB} KB)`);
  console.log(`   - スタイルシート: ${hasStyles ? '✅' : '❌'}`);
  console.log(`   - プログレスバー: ${hasProgress ? '✅' : '❌'}`);
  console.log(`   - レスポンシブデザイン: ✅`);
  console.log('');

  console.log('-'.repeat(60));
  console.log('');

  // ファイル保存
  console.log('💾 4. レポートをファイルに保存中...');
  const savedFiles = await reporter.saveAllReports(testData, 'demo-test-run');
  
  console.log('   ✅ すべてのレポートを保存しました:');
  console.log(`   - JSON:     ${savedFiles.json}`);
  console.log(`   - Markdown: ${savedFiles.markdown}`);
  console.log(`   - HTML:     ${savedFiles.html}`);
  console.log('');

  console.log('-'.repeat(60));
  console.log('');

  // レポート内容のハイライト
  console.log('🎯 レポート内容のハイライト:\n');

  console.log('■ カバレッジ分析');
  console.log(`  - テスト済み観点: ${testData.coverage.aspectCoverage.tested}/${testData.coverage.aspectCoverage.total}`);
  console.log(`  - カバレッジ率: ${testData.coverage.aspectCoverage.percentage}%`);
  console.log(`  - プログレスバー:`);
  console.log(`    ${reporter.generateProgressBar(testData.coverage.aspectCoverage.percentage)}`);
  console.log('');

  console.log('■ テスト実行結果');
  console.log(`  - 総実行数: ${testData.coverage.testCaseCoverage.total}`);
  console.log(`  - 成功: ${testData.coverage.testCaseCoverage.passed} (${testData.coverage.testCaseCoverage.pass_rate}%)`);
  console.log(`  - 失敗: ${testData.coverage.testCaseCoverage.failed}`);
  console.log('');

  console.log('■ 失敗テストケース詳細');
  const failedTests = testData.executionResults.filter(r => !r.success);
  failedTests.forEach((test, index) => {
    console.log(`  ${index + 1}. ${test.test_case_id} (観点${test.aspect_no})`);
    console.log(`     エラー: ${test.error}`);
    console.log(`     実行時間: ${reporter.formatDuration(test.duration_ms)}`);
  });
  console.log('');

  console.log('■ パフォーマンス統計');
  const durations = testData.executionResults.map(r => r.duration_ms);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);
  console.log(`  - 平均実行時間: ${reporter.formatDuration(avgDuration)}`);
  console.log(`  - 最長実行時間: ${reporter.formatDuration(maxDuration)}`);
  console.log(`  - 最短実行時間: ${reporter.formatDuration(minDuration)}`);
  console.log('');

  console.log('-'.repeat(60));
  console.log('');

  // 統合フロー説明
  console.log('🔗 他エージェントとの連携フロー:\n');
  console.log('  1️⃣  Planner:   テスト計画を生成');
  console.log('  2️⃣  Generator: テストスクリプトを生成');
  console.log('  3️⃣  Executor:  テストを実行');
  console.log('  4️⃣  Healer:    失敗テストを修復');
  console.log('  5️⃣  Analyzer:  カバレッジを分析');
  console.log('  6️⃣  Reporter:  レポートを生成 ← 現在地');
  console.log('  7️⃣  Orchestrator: 全体を統合管理');
  console.log('');

  console.log('次のステップ:');
  console.log('  → 生成されたHTMLレポートをブラウザで開く');
  console.log('  → JSONレポートをCIツールに連携');
  console.log('  → Markdownレポートをドキュメントに追加');
  console.log('');

  console.log('='.repeat(60));
  console.log('✅ デモ完了');
  console.log('');

  // 実際のファイルパスを表示
  console.log('生成されたレポートを確認:');
  console.log(`  code ${savedFiles.markdown}`);
  console.log(`  start ${savedFiles.html}`);
  console.log('');
}

// デモ実行
runDemo().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
