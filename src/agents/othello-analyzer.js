/**
 * Othello-Analyzer
 * テスト実行結果を分析してカバレッジを算出するエージェント
 * 
 * 主な機能:
 * 1. 実行結果から23観点のカバレッジを計算
 * 2. テストケースの成功/失敗率を集計
 * 3. イテレーション履歴から累積カバレッジを算出
 * 4. 目標カバレッジ達成判定
 */

class OthelloAnalyzer {
  /**
   * コンストラクタ
   */
  constructor() {
    this.totalAspects = 23; // 23観点
  }

  /**
   * 実行結果を分析してカバレッジを算出
   * @param {Array} executionResults - 実行結果の配列
   * @returns {Object} カバレッジ情報
   */
  analyze(executionResults) {
    // テスト済み観点を抽出
    const testedAspects = this.extractTestedAspects(executionResults);

    // 観点カバレッジを計算
    const aspectCoverage = this.calculateAspectCoverage(testedAspects);

    // テストケースカバレッジを計算
    const testCaseCoverage = this.calculateTestCaseCoverage(executionResults);

    return {
      aspectCoverage,
      testCaseCoverage
    };
  }

  /**
   * 観点カバレッジを計算
   * @param {Array<number>} testedAspects - テスト済み観点番号の配列
   * @returns {Object} 観点カバレッジ情報
   */
  calculateAspectCoverage(testedAspects) {
    const tested = testedAspects.length;
    const percentage = this.totalAspects > 0 
      ? (tested / this.totalAspects) * 100 
      : 0;
    const untestedAspects = this.getUntestedAspects(testedAspects);

    return {
      total: this.totalAspects,
      tested,
      percentage: Math.round(percentage * 100) / 100, // 小数点2桁
      tested_aspects: [...testedAspects].sort((a, b) => a - b),
      untested_aspects: untestedAspects
    };
  }

  /**
   * テストケースカバレッジを計算
   * @param {Array} executionResults - 実行結果の配列
   * @returns {Object} テストケースカバレッジ情報
   */
  calculateTestCaseCoverage(executionResults) {
    const total = executionResults.length;
    const passed = executionResults.filter(r => r.success).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total,
      passed,
      failed,
      pass_rate: Math.round(passRate * 100) / 100
    };
  }

  /**
   * 実行結果から観点番号を抽出
   * @param {Array} executionResults - 実行結果の配列
   * @returns {Array<number>} 重複なしでソートされた観点番号の配列
   */
  extractTestedAspects(executionResults) {
    // aspect_noを持つ結果のみ抽出
    const aspectNos = executionResults
      .filter(result => result.aspect_no !== undefined)
      .map(result => result.aspect_no);

    // 重複を除去してソート
    const uniqueAspects = [...new Set(aspectNos)];
    return uniqueAspects.sort((a, b) => a - b);
  }

  /**
   * 未テスト観点を取得
   * @param {Array<number>} testedAspects - テスト済み観点番号の配列
   * @returns {Array<number>} 未テスト観点番号の配列
   */
  getUntestedAspects(testedAspects) {
    const allAspects = Array.from({ length: this.totalAspects }, (_, i) => i + 1);
    const testedSet = new Set(testedAspects);
    return allAspects.filter(aspect => !testedSet.has(aspect));
  }

  /**
   * 複数イテレーションの履歴から累積カバレッジを計算
   * @param {Array} history - イテレーション履歴の配列
   * @returns {Object} 累積分析結果
   */
  analyzeWithHistory(history) {
    if (history.length === 0) {
      return {
        totalIterations: 0,
        cumulativeCoverage: this.analyze([]),
        iterationCoverages: []
      };
    }

    // 各イテレーションのカバレッジを計算
    const iterationCoverages = history.map(iteration => 
      this.analyze(iteration.results)
    );

    // 全イテレーションの結果を統合
    const allResults = history.flatMap(iteration => iteration.results);
    const cumulativeCoverage = this.analyze(allResults);

    return {
      totalIterations: history.length,
      cumulativeCoverage,
      iterationCoverages
    };
  }

  /**
   * テスト継続が必要かどうかを判定
   * @param {Object} coverage - カバレッジ情報
   * @param {number} targetPercentage - 目標カバレッジ（%）
   * @returns {boolean} 継続が必要な場合true
   */
  shouldContinueTesting(coverage, targetPercentage = 80) {
    return coverage.aspectCoverage.percentage < targetPercentage;
  }

  /**
   * カバレッジサマリーをフォーマット
   * @param {Object} coverage - カバレッジ情報
   * @returns {string} フォーマットされたサマリー
   */
  formatSummary(coverage) {
    const { aspectCoverage, testCaseCoverage } = coverage;

    const lines = [
      '【カバレッジサマリー】',
      '',
      '■ 観点カバレッジ',
      `  - テスト済み: ${aspectCoverage.tested}/${aspectCoverage.total}`,
      `  - カバレッジ率: ${aspectCoverage.percentage}%`,
      `  - 未テスト観点数: ${aspectCoverage.untested_aspects.length}`,
      '',
      '■ テストケース実行結果',
      `  - 実行数: ${testCaseCoverage.total}`,
      `  - 成功: ${testCaseCoverage.passed}/${testCaseCoverage.total}`,
      `  - 失敗: ${testCaseCoverage.failed}/${testCaseCoverage.total}`,
      `  - 成功率: ${testCaseCoverage.pass_rate}%`,
      ''
    ];

    return lines.join('\n');
  }

  /**
   * カバレッジ進捗を可視化
   * @param {Array} history - イテレーション履歴
   * @returns {string} 進捗チャート
   */
  visualizeProgress(history) {
    if (history.length === 0) {
      return 'イテレーション履歴がありません';
    }

    const analysis = this.analyzeWithHistory(history);
    const lines = ['【カバレッジ進捗】', ''];

    analysis.iterationCoverages.forEach((coverage, index) => {
      const iteration = index + 1;
      const percentage = coverage.aspectCoverage.percentage;
      const tested = coverage.aspectCoverage.tested;
      const barLength = Math.round(percentage / 5); // 20文字で100%
      const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
      
      lines.push(
        `イテレーション ${iteration}: [${bar}] ${percentage}% (${tested}観点)`
      );
    });

    lines.push('');
    lines.push(
      `累積カバレッジ: ${analysis.cumulativeCoverage.aspectCoverage.percentage}% ` +
      `(${analysis.cumulativeCoverage.aspectCoverage.tested}/${this.totalAspects}観点)`
    );

    return lines.join('\n');
  }

  /**
   * 次のイテレーションで優先すべき観点を推薦
   * @param {Object} coverage - 現在のカバレッジ
   * @param {number} count - 推薦する観点数
   * @returns {Array<number>} 推薦観点番号の配列
   */
  recommendNextAspects(coverage, count = 5) {
    const untested = coverage.aspectCoverage.untested_aspects;
    
    // 未テスト観点から指定数をランダムに選択
    // （実際の実装では優先度に基づいて選択するが、ここではシンプルに）
    const shuffled = [...untested].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  /**
   * デバッグ情報を出力
   * @param {Object} coverage - カバレッジ情報
   */
  debugCoverage(coverage) {
    console.log('\n=== Analyzer Debug Info ===');
    console.log('観点カバレッジ:', coverage.aspectCoverage);
    console.log('テストケースカバレッジ:', coverage.testCaseCoverage);
    console.log('テスト済み観点:', coverage.aspectCoverage.tested_aspects);
    console.log('未テスト観点（最初の10件）:', 
      coverage.aspectCoverage.untested_aspects.slice(0, 10)
    );
    console.log('===========================\n');
  }
}

module.exports = OthelloAnalyzer;
