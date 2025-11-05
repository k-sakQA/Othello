/**
 * 推奨テスト生成（高度な機能）のテスト (TDD)
 */

const Analyzer = require('../src/analyzer');
const ConfigManager = require('../src/config');

describe('Analyzer - 高度な推奨テスト生成', () => {
  let analyzer;
  let config;

  beforeEach(() => {
    const configData = {
      default_browser: 'chromium',
      timeout_seconds: 60,
      max_iterations: 10,
      paths: {
        logs: './logs',
        results: './results',
        test_instructions: './test-instructions',
        reports: './reports'
      },
      testAspectsCSV: './config/test-ViewpointList-simple.csv'
    };
    config = new ConfigManager(configData);
    analyzer = new Analyzer(config);
  });

  describe('全観点カバー済みの場合の追加テスト提案', () => {
    test('全観点がカバー済みで失敗もない場合、より深いテストを提案', async () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 2, success: true },
        { test_case_id: 'TC003', aspect_no: 3, success: true },
        { test_case_id: 'TC004', aspect_no: 4, success: true },
        { test_case_id: 'TC005', aspect_no: 5, success: true },
        { test_case_id: 'TC006', aspect_no: 6, success: true },
        { test_case_id: 'TC007', aspect_no: 7, success: true },
        { test_case_id: 'TC008', aspect_no: 8, success: true },
        { test_case_id: 'TC009', aspect_no: 9, success: true },
        { test_case_id: 'TC010', aspect_no: 10, success: true }
      ];

      const coverageData = {
        percentage: 100,
        covered: 10,
        total: 10,
        covered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        uncovered_aspects: []
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      // 追加テストの提案が含まれる
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      
      // 特別な提案が含まれる
      const deeperTestOption = recommendations.find(r => r.type === 'deeper');
      expect(deeperTestOption).toBeDefined();
      expect(deeperTestOption.title).toContain('より深いテスト');
    });

    test('より深いテストの提案に適切な内容が含まれる', async () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 2, success: true },
        { test_case_id: 'TC003', aspect_no: 3, success: true },
        { test_case_id: 'TC004', aspect_no: 4, success: true },
        { test_case_id: 'TC005', aspect_no: 5, success: true },
        { test_case_id: 'TC006', aspect_no: 6, success: true },
        { test_case_id: 'TC007', aspect_no: 7, success: true },
        { test_case_id: 'TC008', aspect_no: 8, success: true },
        { test_case_id: 'TC009', aspect_no: 9, success: true },
        { test_case_id: 'TC010', aspect_no: 10, success: true }
      ];

      const coverageData = {
        percentage: 100,
        covered: 10,
        total: 10,
        covered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        uncovered_aspects: []
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      const deeperTestOption = recommendations.find(r => r.type === 'deeper');
      
      expect(deeperTestOption).toHaveProperty('priority');
      expect(deeperTestOption).toHaveProperty('title');
      expect(deeperTestOption).toHaveProperty('reason');
      expect(deeperTestOption.priority).toBe('Medium');
    });

    test('終了オプションも提案される', async () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 2, success: true },
        { test_case_id: 'TC003', aspect_no: 3, success: true },
        { test_case_id: 'TC004', aspect_no: 4, success: true },
        { test_case_id: 'TC005', aspect_no: 5, success: true },
        { test_case_id: 'TC006', aspect_no: 6, success: true },
        { test_case_id: 'TC007', aspect_no: 7, success: true },
        { test_case_id: 'TC008', aspect_no: 8, success: true },
        { test_case_id: 'TC009', aspect_no: 9, success: true },
        { test_case_id: 'TC010', aspect_no: 10, success: true }
      ];

      const coverageData = {
        percentage: 100,
        covered: 10,
        total: 10,
        covered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        uncovered_aspects: []
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      // 完了オプションが含まれる
      const completeOption = recommendations.find(r => r.type === 'complete');
      expect(completeOption).toBeDefined();
      expect(completeOption.title).toContain('テスト完了');
    });

    test('未カバー観点がある場合は、より深いテストは提案されない', async () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true }
      ];

      const coverageData = {
        percentage: 10,
        covered: 1,
        total: 10,
        covered_aspects: [1],
        uncovered_aspects: [2, 3, 4, 5, 6, 7, 8, 9, 10]
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      // より深いテストは提案されない
      const deeperTestOption = recommendations.find(r => r.type === 'deeper');
      expect(deeperTestOption).toBeUndefined();
    });

    test('失敗したテストがある場合は、より深いテストは提案されない', async () => {
      const executionResults = [
        { test_case_id: 'TC001', aspect_no: 1, success: true },
        { test_case_id: 'TC002', aspect_no: 2, success: true },
        { test_case_id: 'TC003', aspect_no: 3, success: true },
        { test_case_id: 'TC004', aspect_no: 4, success: true },
        { test_case_id: 'TC005', aspect_no: 5, success: true },
        { test_case_id: 'TC006', aspect_no: 6, success: true },
        { test_case_id: 'TC007', aspect_no: 7, success: true },
        { test_case_id: 'TC008', aspect_no: 8, success: true },
        { test_case_id: 'TC009', aspect_no: 9, success: true },
        { test_case_id: 'TC010', aspect_no: 10, success: false }
      ];

      const coverageData = {
        percentage: 100,
        covered: 10,
        total: 10,
        covered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        uncovered_aspects: []
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      // 失敗テストが優先されるため、より深いテストは提案されない
      const deeperTestOption = recommendations.find(r => r.type === 'deeper');
      expect(deeperTestOption).toBeUndefined();
    });
  });
});
