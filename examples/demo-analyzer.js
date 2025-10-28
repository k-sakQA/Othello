/**
 * Othello-Analyzer デモスクリプト
 * カバレッジ計算の進捗を可視化
 */

const OthelloAnalyzer = require('../src/agents/othello-analyzer');

// デモ用の実行結果データ
const mockExecutionResults = {
  iteration1: [
    { test_case_id: 'TC001', aspect_no: 1, success: true },
    { test_case_id: 'TC002', aspect_no: 2, success: true },
    { test_case_id: 'TC003', aspect_no: 3, success: false }
  ],
  iteration2: [
    { test_case_id: 'TC004', aspect_no: 4, success: true },
    { test_case_id: 'TC005', aspect_no: 5, success: true },
    { test_case_id: 'TC006', aspect_no: 6, success: true },
    { test_case_id: 'TC007', aspect_no: 7, success: true },
    { test_case_id: 'TC008', aspect_no: 8, success: false }
  ],
  iteration3: [
    { test_case_id: 'TC009', aspect_no: 9, success: true },
    { test_case_id: 'TC010', aspect_no: 10, success: true },
    { test_case_id: 'TC011', aspect_no: 11, success: true },
    { test_case_id: 'TC012', aspect_no: 12, success: true },
    { test_case_id: 'TC013', aspect_no: 13, success: true },
    { test_case_id: 'TC014', aspect_no: 14, success: true },
    { test_case_id: 'TC015', aspect_no: 15, success: false }
  ],
  iteration4: [
    { test_case_id: 'TC016', aspect_no: 16, success: true },
    { test_case_id: 'TC017', aspect_no: 17, success: true },
    { test_case_id: 'TC018', aspect_no: 18, success: true },
    { test_case_id: 'TC019', aspect_no: 19, success: true },
    { test_case_id: 'TC020', aspect_no: 20, success: true }
  ]
};

console.log('🔍 Othello-Analyzer デモ\n');
console.log('=' .repeat(60));

const analyzer = new OthelloAnalyzer();
const targetCoverage = 80;

console.log(`目標カバレッジ: ${targetCoverage}%`);
console.log(`総観点数: ${analyzer.totalAspects}`);
console.log('=' .repeat(60));
console.log('');

// シナリオ1: イテレーション1 - 最初のテスト
console.log('📊 シナリオ1: イテレーション1（初回実行）\n');

const coverage1 = analyzer.analyze(mockExecutionResults.iteration1);
console.log(analyzer.formatSummary(coverage1));

const shouldContinue1 = analyzer.shouldContinueTesting(coverage1, targetCoverage);
console.log(`継続判定: ${shouldContinue1 ? '✅ 継続' : '⛔ 停止'}`);
console.log(`  → カバレッジ ${coverage1.aspectCoverage.percentage}% < ${targetCoverage}%\n`);
console.log('-'.repeat(60));
console.log('');

// シナリオ2: イテレーション2 - カバレッジ向上
console.log('📊 シナリオ2: イテレーション2（カバレッジ拡大）\n');

const history2 = [
  { iteration: 1, results: mockExecutionResults.iteration1 },
  { iteration: 2, results: mockExecutionResults.iteration2 }
];

const analysis2 = analyzer.analyzeWithHistory(history2);
console.log('【累積カバレッジ】');
console.log(analyzer.formatSummary(analysis2.cumulativeCoverage));

console.log(analyzer.visualizeProgress(history2));

const shouldContinue2 = analyzer.shouldContinueTesting(
  analysis2.cumulativeCoverage, 
  targetCoverage
);
console.log(`\n継続判定: ${shouldContinue2 ? '✅ 継続' : '⛔ 停止'}`);
console.log(`  → カバレッジ ${analysis2.cumulativeCoverage.aspectCoverage.percentage}% < ${targetCoverage}%\n`);
console.log('-'.repeat(60));
console.log('');

// シナリオ3: イテレーション3 - さらに拡大
console.log('📊 シナリオ3: イテレーション3（継続拡大）\n');

const history3 = [
  { iteration: 1, results: mockExecutionResults.iteration1 },
  { iteration: 2, results: mockExecutionResults.iteration2 },
  { iteration: 3, results: mockExecutionResults.iteration3 }
];

const analysis3 = analyzer.analyzeWithHistory(history3);
console.log('【累積カバレッジ】');
console.log(analyzer.formatSummary(analysis3.cumulativeCoverage));

console.log(analyzer.visualizeProgress(history3));

const shouldContinue3 = analyzer.shouldContinueTesting(
  analysis3.cumulativeCoverage, 
  targetCoverage
);
console.log(`\n継続判定: ${shouldContinue3 ? '✅ 継続' : '⛔ 停止'}`);
console.log(`  → カバレッジ ${analysis3.cumulativeCoverage.aspectCoverage.percentage}% < ${targetCoverage}%\n`);

// 次のイテレーションの推薦
const recommended = analyzer.recommendNextAspects(
  analysis3.cumulativeCoverage, 
  5
);
console.log(`推薦観点: ${recommended.join(', ')}\n`);
console.log('-'.repeat(60));
console.log('');

// シナリオ4: イテレーション4 - 目標達成！
console.log('📊 シナリオ4: イテレーション4（目標達成）\n');

const history4 = [
  { iteration: 1, results: mockExecutionResults.iteration1 },
  { iteration: 2, results: mockExecutionResults.iteration2 },
  { iteration: 3, results: mockExecutionResults.iteration3 },
  { iteration: 4, results: mockExecutionResults.iteration4 }
];

const analysis4 = analyzer.analyzeWithHistory(history4);
console.log('【累積カバレッジ】');
console.log(analyzer.formatSummary(analysis4.cumulativeCoverage));

console.log(analyzer.visualizeProgress(history4));

const shouldContinue4 = analyzer.shouldContinueTesting(
  analysis4.cumulativeCoverage, 
  targetCoverage
);
console.log(`\n継続判定: ${shouldContinue4 ? '✅ 継続' : '⛔ 停止'}`);
console.log(`  → カバレッジ ${analysis4.cumulativeCoverage.aspectCoverage.percentage}% >= ${targetCoverage}%`);
console.log('  🎉 目標カバレッジ達成！テスト終了\n');
console.log('-'.repeat(60));
console.log('');

// 詳細統計
console.log('📈 詳細統計\n');
console.log(`総イテレーション数: ${analysis4.totalIterations}`);
console.log(`総テストケース数: ${analysis4.cumulativeCoverage.testCaseCoverage.total}`);
console.log(`総実行時間: 約${(analysis4.totalIterations * 2.5).toFixed(1)}秒（推定）`);
console.log('');

console.log('【イテレーション別カバレッジ増加】');
analysis4.iterationCoverages.forEach((coverage, index) => {
  const iteration = index + 1;
  const percentage = coverage.aspectCoverage.percentage;
  const tested = coverage.aspectCoverage.tested;
  const arrow = index === 0 ? '  ' : '↑ ';
  const increase = index === 0 
    ? '' 
    : `(+${(percentage - analysis4.iterationCoverages[index - 1].aspectCoverage.percentage).toFixed(2)}%)`;
  
  console.log(`  ${arrow}イテレーション ${iteration}: ${percentage}% (${tested}観点) ${increase}`);
});

console.log('');
console.log('【最終カバレッジ内訳】');
console.log(`  - テスト済み観点: ${analysis4.cumulativeCoverage.aspectCoverage.tested_aspects.join(', ')}`);
console.log(`  - 未テスト観点: ${analysis4.cumulativeCoverage.aspectCoverage.untested_aspects.join(', ')}`);
console.log('');

console.log('=' .repeat(60));
console.log('✅ デモ完了');
console.log('');

// Executor/Healerとの連携例
console.log('🔗 他エージェントとの連携フロー\n');
console.log('  1️⃣  Planner: カバレッジに基づいて未テスト観点を優先');
console.log('  2️⃣  Generator: 優先観点のテストケースを生成');
console.log('  3️⃣  Executor: テストケースを実行');
console.log('  4️⃣  Healer: 失敗したテストを修正');
console.log('  5️⃣  Analyzer: カバレッジを再計算 ← 現在地');
console.log('  6️⃣  Reporter: レポートを生成');
console.log('  7️⃣  Orchestrator: ループ継続判定');
console.log('');

console.log('次のステップ:');
console.log('  → 未テスト観点: ' + analysis4.cumulativeCoverage.aspectCoverage.untested_aspects.slice(0, 3).join(', ') + '...');
console.log('  → Plannerに渡して次のイテレーションを開始');
console.log('');
