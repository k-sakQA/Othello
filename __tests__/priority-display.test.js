/**
 * 優先度表示のテスト
 */

const Analyzer = require('../src/analyzer');
const ConfigManager = require('../src/config');

describe('Analyzer - 優先度表示', () => {
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

  test('未カバー観点の優先度が正しく表示される（High, Medium, Low）', async () => {
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

    // 最大5件の推奨が返される
    expect(recommendations.length).toBe(5);

    // 最初の2つはHigh
    expect(recommendations[0].priority).toBe('High');
    expect(recommendations[0].title).toBe('観点1のテスト');
    expect(recommendations[1].priority).toBe('High');
    expect(recommendations[1].title).toBe('観点2のテスト');

    // 次の2つはMedium
    expect(recommendations[2].priority).toBe('Medium');
    expect(recommendations[2].title).toBe('観点3のテスト');
    expect(recommendations[3].priority).toBe('Medium');
    expect(recommendations[3].title).toBe('観点4のテスト');

    // 残りはLow
    expect(recommendations[4].priority).toBe('Low');
    expect(recommendations[4].title).toBe('観点5のテスト');
  });

  test('失敗したテストと未カバー観点が混在する場合の優先度', async () => {
    const executionResults = [
      {
        test_case_id: 'TC001',
        aspect_no: 1,
        success: false,
        error: { message: 'Element not found' }
      }
    ];

    const coverageData = {
      percentage: 0,
      covered: 0,
      total: 10,
      covered_aspects: [],
      uncovered_aspects: [2, 3, 4, 5, 6, 7, 8, 9, 10]
    };

    const recommendations = await analyzer.generateRecommendations(
      executionResults,
      coverageData
    );

    // 最大5件の推奨
    expect(recommendations.length).toBe(5);

    // 最初は失敗したテスト（常にHigh）
    expect(recommendations[0].type).toBe('failed');
    expect(recommendations[0].priority).toBe('High');
    expect(recommendations[0].title).toContain('失敗したテスト');

    // 残り4件は未カバー観点
    // 最初の2つ（観点2, 3）はHigh
    expect(recommendations[1].type).toBe('uncovered');
    expect(recommendations[1].priority).toBe('High');
    expect(recommendations[1].title).toBe('観点2のテスト');

    expect(recommendations[2].type).toBe('uncovered');
    expect(recommendations[2].priority).toBe('High');
    expect(recommendations[2].title).toBe('観点3のテスト');

    // 次の2つ（観点4, 5）はMedium
    expect(recommendations[3].type).toBe('uncovered');
    expect(recommendations[3].priority).toBe('Medium');
    expect(recommendations[3].title).toBe('観点4のテスト');

    expect(recommendations[4].type).toBe('uncovered');
    expect(recommendations[4].priority).toBe('Medium');
    expect(recommendations[4].title).toBe('観点5のテスト');
  });

  test('未カバー観点が2つだけの場合は両方High', async () => {
    const executionResults = [];
    const coverageData = {
      percentage: 80,
      covered: 8,
      total: 10,
      covered_aspects: [1, 2, 3, 4, 5, 6, 7, 8],
      uncovered_aspects: [9, 10]
    };

    const recommendations = await analyzer.generateRecommendations(
      executionResults,
      coverageData
    );

    expect(recommendations.length).toBe(2);

    // 両方High（最初の2つなので）
    expect(recommendations[0].priority).toBe('High');
    expect(recommendations[0].title).toBe('観点9のテスト');

    expect(recommendations[1].priority).toBe('High');
    expect(recommendations[1].title).toBe('観点10のテスト');
  });
});
