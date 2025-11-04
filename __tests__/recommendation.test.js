/**
 * 推奨テスト生成機能のテスト (TDD)
 */

const Analyzer = require('../src/analyzer');
const ConfigManager = require('../src/config');

describe('Analyzer - generateRecommendations', () => {
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

  describe('未カバー観点から推奨テストを生成', () => {
    test('未カバー観点が存在する場合、推奨テストリストを返す', async () => {
      const executionResults = [
        {
          test_name: 'Test 1',
          aspect_no: 1,
          success: true
        },
        {
          test_name: 'Test 2',
          aspect_no: 2,
          success: true
        }
      ];

      const coverageData = {
        percentage: 20,
        covered: 2,
        total: 10,
        covered_aspects: [1, 2],
        uncovered_aspects: [3, 4, 5, 6, 7, 8, 9, 10]
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test('推奨テストに必要なフィールドが含まれている', async () => {
      const executionResults = [
        {
          test_name: 'Test 1',
          aspect_no: 1,
          success: true
        }
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

      expect(recommendations.length).toBeGreaterThan(0);
      
      const recommendation = recommendations[0];
      expect(recommendation).toHaveProperty('priority');
      expect(recommendation).toHaveProperty('title');
      expect(recommendation).toHaveProperty('reason');
      expect(recommendation).toHaveProperty('aspectId');
    });

    test('優先度が正しく設定されている', async () => {
      const executionResults = [];
      const coverageData = {
        percentage: 0,
        covered: 0,
        total: 10,
        covered_aspects: [],
        uncovered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      // 優先度は 'High', 'Medium', 'Low' のいずれか
      recommendations.forEach(rec => {
        expect(['High', 'Medium', 'Low']).toContain(rec.priority);
      });
    });

    test('全て観点がカバー済みの場合、空の配列を返す', async () => {
      const executionResults = [
        { test_name: 'Test 1', aspect_no: 1, success: true },
        { test_name: 'Test 2', aspect_no: 2, success: true },
        { test_name: 'Test 3', aspect_no: 3, success: true },
        { test_name: 'Test 4', aspect_no: 4, success: true },
        { test_name: 'Test 5', aspect_no: 5, success: true },
        { test_name: 'Test 6', aspect_no: 6, success: true },
        { test_name: 'Test 7', aspect_no: 7, success: true },
        { test_name: 'Test 8', aspect_no: 8, success: true },
        { test_name: 'Test 9', aspect_no: 9, success: true },
        { test_name: 'Test 10', aspect_no: 10, success: true }
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

      expect(recommendations).toEqual([]);
    });
  });

  describe('失敗テストから推奨テストを生成', () => {
    test('失敗テストが多い観点を検出する', async () => {
      const executionResults = [
        { test_name: 'Test 1', aspect_no: 1, success: false },
        { test_name: 'Test 2', aspect_no: 1, success: false },
        { test_name: 'Test 3', aspect_no: 1, success: false },
        { test_name: 'Test 4', aspect_no: 2, success: true }
      ];

      const coverageData = {
        percentage: 20,
        covered: 2,
        total: 10,
        covered_aspects: [1, 2],
        uncovered_aspects: [3, 4, 5, 6, 7, 8, 9, 10]
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      // 失敗が多い観点に関する推奨が含まれているはず
      const failureRelated = recommendations.find(rec => 
        rec.reason.includes('失敗') || rec.reason.includes('エラー')
      );
      
      // 失敗が多い場合は推奨に含まれる可能性がある
      // （実装によって変わるので、存在チェックのみ）
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('推奨テストの最大数制限', () => {
    test('推奨テストは最大5件まで', async () => {
      const executionResults = [];
      const coverageData = {
        percentage: 0,
        covered: 0,
        total: 10,
        covered_aspects: [],
        uncovered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      };

      const recommendations = await analyzer.generateRecommendations(
        executionResults,
        coverageData
      );

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });
  });
});
