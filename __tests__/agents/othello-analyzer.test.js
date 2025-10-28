/**
 * Othello-Analyzer テストスイート
 * 実行結果を分析してカバレッジを算出
 */

const OthelloAnalyzer = require('../../src/agents/othello-analyzer');

describe('Othello-Analyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new OthelloAnalyzer();
  });

  describe('constructor', () => {
    test('初期化できる', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer.totalAspects).toBe(23); // 23観点
    });
  });

  describe('analyze', () => {
    test('実行結果からカバレッジを計算できる', () => {
      const executionResults = [
        {
          test_case_id: 'TC001',
          aspect_no: 1,
          success: true
        },
        {
          test_case_id: 'TC002',
          aspect_no: 2,
          success: true
        },
        {
          test_case_id: 'TC003',
          aspect_no: 3,
          success: false
        }
      ];

      const coverage = analyzer.analyze(executionResults);

      expect(coverage.aspectCoverage.total).toBe(23);
      expect(coverage.aspectCoverage.tested).toBe(3);
      expect(coverage.aspectCoverage.percentage).toBeCloseTo(13.04, 1); // 3/23 * 100
      expect(coverage.aspectCoverage.tested_aspects).toEqual([1, 2, 3]);
      expect(coverage.aspectCoverage.untested_aspects).toHaveLength(20);
    });

    test('重複する観点は1つとしてカウントする', () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 1, success: true }, // 重複
        { test_case_id: 'TC003', aspect_no: 2, success: true }
      ];

      const coverage = analyzer.analyze(executionResults);

      expect(coverage.aspectCoverage.tested).toBe(2); // 1と2のみ
      expect(coverage.aspectCoverage.tested_aspects).toEqual([1, 2]);
    });

    test('失敗したテストもカバレッジに含める', () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 2, success: false }
      ];

      const coverage = analyzer.analyze(executionResults);

      expect(coverage.aspectCoverage.tested).toBe(2);
      expect(coverage.aspectCoverage.tested_aspects).toEqual([1, 2]);
    });

    test('空の実行結果の場合は0%', () => {
      const coverage = analyzer.analyze([]);

      expect(coverage.aspectCoverage.tested).toBe(0);
      expect(coverage.aspectCoverage.percentage).toBe(0);
      expect(coverage.aspectCoverage.tested_aspects).toEqual([]);
      expect(coverage.aspectCoverage.untested_aspects).toHaveLength(23);
    });
  });

  describe('calculateAspectCoverage', () => {
    test('観点カバレッジを正しく計算する', () => {
      const testedAspects = [1, 3, 5, 7, 9];

      const coverage = analyzer.calculateAspectCoverage(testedAspects);

      expect(coverage.total).toBe(23);
      expect(coverage.tested).toBe(5);
      expect(coverage.percentage).toBeCloseTo(21.74, 1); // 5/23 * 100
      expect(coverage.tested_aspects).toEqual([1, 3, 5, 7, 9]);
      expect(coverage.untested_aspects).toHaveLength(18);
      expect(coverage.untested_aspects).not.toContain(1);
      expect(coverage.untested_aspects).not.toContain(3);
    });

    test('全観点がテスト済みの場合は100%', () => {
      const allAspects = Array.from({ length: 23 }, (_, i) => i + 1);

      const coverage = analyzer.calculateAspectCoverage(allAspects);

      expect(coverage.tested).toBe(23);
      expect(coverage.percentage).toBe(100);
      expect(coverage.untested_aspects).toHaveLength(0);
    });

    test('観点がない場合は0%', () => {
      const coverage = analyzer.calculateAspectCoverage([]);

      expect(coverage.tested).toBe(0);
      expect(coverage.percentage).toBe(0);
      expect(coverage.untested_aspects).toHaveLength(23);
    });
  });

  describe('calculateTestCaseCoverage', () => {
    test('テストケースの成功/失敗を集計できる', () => {
      const executionResults = [
        { test_case_id: 'TC001', success: true },
        { test_case_id: 'TC002', success: true },
        { test_case_id: 'TC003', success: false },
        { test_case_id: 'TC004', success: false }
      ];

      const coverage = analyzer.calculateTestCaseCoverage(executionResults);

      expect(coverage.total).toBe(4);
      expect(coverage.passed).toBe(2);
      expect(coverage.failed).toBe(2);
      expect(coverage.pass_rate).toBe(50);
    });

    test('全て成功の場合', () => {
      const executionResults = [
        { test_case_id: 'TC001', success: true },
        { test_case_id: 'TC002', success: true }
      ];

      const coverage = analyzer.calculateTestCaseCoverage(executionResults);

      expect(coverage.total).toBe(2);
      expect(coverage.passed).toBe(2);
      expect(coverage.failed).toBe(0);
      expect(coverage.pass_rate).toBe(100);
    });

    test('テストケースがない場合', () => {
      const coverage = analyzer.calculateTestCaseCoverage([]);

      expect(coverage.total).toBe(0);
      expect(coverage.passed).toBe(0);
      expect(coverage.failed).toBe(0);
      expect(coverage.pass_rate).toBe(0);
    });
  });

  describe('extractTestedAspects', () => {
    test('実行結果から観点番号を抽出できる', () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 2, success: true },
        { test_case_id: 'TC003', aspect_no: 3, success: false }
      ];

      const aspects = analyzer.extractTestedAspects(executionResults);

      expect(aspects).toEqual([1, 2, 3]);
    });

    test('重複を除去する', () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 1, success: true },
        { test_case_id: 'TC003', aspect_no: 2, success: true }
      ];

      const aspects = analyzer.extractTestedAspects(executionResults);

      expect(aspects).toEqual([1, 2]);
    });

    test('aspect_noがない結果は無視する', () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', success: true }, // aspect_noなし
        { test_case_id: 'TC003', aspect_no: 3, success: true }
      ];

      const aspects = analyzer.extractTestedAspects(executionResults);

      expect(aspects).toEqual([1, 3]);
    });

    test('ソートされた結果を返す', () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 5, success: true },
        { test_case_id: 'TC002', aspect_no: 1, success: true },
        { test_case_id: 'TC003', aspect_no: 3, success: true }
      ];

      const aspects = analyzer.extractTestedAspects(executionResults);

      expect(aspects).toEqual([1, 3, 5]);
    });
  });

  describe('getUntestedAspects', () => {
    test('未テスト観点を取得できる', () => {
      const testedAspects = [1, 2, 3];

      const untested = analyzer.getUntestedAspects(testedAspects);

      expect(untested).toHaveLength(20);
      expect(untested).not.toContain(1);
      expect(untested).not.toContain(2);
      expect(untested).not.toContain(3);
      expect(untested).toContain(4);
      expect(untested).toContain(23);
    });

    test('全てテスト済みの場合は空配列', () => {
      const allAspects = Array.from({ length: 23 }, (_, i) => i + 1);

      const untested = analyzer.getUntestedAspects(allAspects);

      expect(untested).toEqual([]);
    });

    test('何もテストしていない場合は全観点', () => {
      const untested = analyzer.getUntestedAspects([]);

      expect(untested).toHaveLength(23);
      expect(untested).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
    });
  });

  describe('analyzeWithHistory', () => {
    test('複数イテレーションの履歴から累積カバレッジを計算できる', () => {
      const history = [
        {
          iteration: 1,
          results: [
            { test_case_id: 'TC001', aspect_no: 1, success: true },
            { test_case_id: 'TC002', aspect_no: 2, success: true }
          ]
        },
        {
          iteration: 2,
          results: [
            { test_case_id: 'TC003', aspect_no: 3, success: true },
            { test_case_id: 'TC004', aspect_no: 4, success: false }
          ]
        }
      ];

      const analysis = analyzer.analyzeWithHistory(history);

      expect(analysis.totalIterations).toBe(2);
      expect(analysis.cumulativeCoverage.aspectCoverage.tested).toBe(4);
      expect(analysis.cumulativeCoverage.aspectCoverage.tested_aspects).toEqual([1, 2, 3, 4]);
      expect(analysis.iterationCoverages).toHaveLength(2);
      expect(analysis.iterationCoverages[0].aspectCoverage.tested).toBe(2);
      expect(analysis.iterationCoverages[1].aspectCoverage.tested).toBe(2);
    });

    test('空の履歴の場合', () => {
      const analysis = analyzer.analyzeWithHistory([]);

      expect(analysis.totalIterations).toBe(0);
      expect(analysis.cumulativeCoverage.aspectCoverage.tested).toBe(0);
      expect(analysis.iterationCoverages).toEqual([]);
    });
  });

  describe('shouldContinueTesting', () => {
    test('目標カバレッジ未達成の場合はtrue', () => {
      const coverage = {
        aspectCoverage: { percentage: 70 }
      };

      const shouldContinue = analyzer.shouldContinueTesting(coverage, 80);

      expect(shouldContinue).toBe(true);
    });

    test('目標カバレッジ達成の場合はfalse', () => {
      const coverage = {
        aspectCoverage: { percentage: 85 }
      };

      const shouldContinue = analyzer.shouldContinueTesting(coverage, 80);

      expect(shouldContinue).toBe(false);
    });

    test('目標カバレッジちょうどの場合はfalse', () => {
      const coverage = {
        aspectCoverage: { percentage: 80 }
      };

      const shouldContinue = analyzer.shouldContinueTesting(coverage, 80);

      expect(shouldContinue).toBe(false);
    });
  });

  describe('formatSummary', () => {
    test('カバレッジサマリーをフォーマットできる', () => {
      const coverage = {
        aspectCoverage: {
          total: 23,
          tested: 10,
          percentage: 43.48,
          tested_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          untested_aspects: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
        },
        testCaseCoverage: {
          total: 15,
          passed: 12,
          failed: 3,
          pass_rate: 80
        }
      };

      const summary = analyzer.formatSummary(coverage);

      expect(summary).toContain('43.48%');
      expect(summary).toContain('10/23');
      expect(summary).toContain('12/15');
      expect(summary).toContain('80%'); // 小数点なし
    });
  });

  describe('統合テスト', () => {
    test('完全なワークフローを実行できる', () => {
      // イテレーション1
      const iter1Results = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 2, success: true },
        { test_case_id: 'TC003', aspect_no: 3, success: false }
      ];

      const coverage1 = analyzer.analyze(iter1Results);
      expect(coverage1.aspectCoverage.percentage).toBeCloseTo(13.04, 1);

      // イテレーション2
      const iter2Results = [
        { test_case_id: 'TC004', aspect_no: 4, success: true },
        { test_case_id: 'TC005', aspect_no: 5, success: true }
      ];

      const coverage2 = analyzer.analyze(iter2Results);

      // 累積分析
      const history = [
        { iteration: 1, results: iter1Results },
        { iteration: 2, results: iter2Results }
      ];

      const analysis = analyzer.analyzeWithHistory(history);
      expect(analysis.cumulativeCoverage.aspectCoverage.tested).toBe(5);
      expect(analysis.cumulativeCoverage.aspectCoverage.percentage).toBeCloseTo(21.74, 1);

      // 継続判定（目標80%）
      const shouldContinue = analyzer.shouldContinueTesting(
        analysis.cumulativeCoverage,
        80
      );
      expect(shouldContinue).toBe(true); // まだ21.74%なので継続
    });
  });
});
