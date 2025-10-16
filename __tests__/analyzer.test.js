const Analyzer = require('../src/analyzer');
const ConfigManager = require('../src/config');
const fs = require('fs').promises;
const path = require('path');

describe('Analyzer', () => {
  let analyzer;
  let mockConfig;
  let testLogsDir;

  beforeAll(async () => {
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    mockConfig = await ConfigManager.load(configPath);
    testLogsDir = path.join(__dirname, 'fixtures', 'logs');
  });

  beforeEach(() => {
    analyzer = new Analyzer(mockConfig);
  });

  afterEach(async () => {
    // テスト用ログディレクトリをクリーンアップ
    try {
      await fs.rm(testLogsDir, { recursive: true, force: true });
    } catch (error) {
      // エラーは無視
    }
  });

  describe('analyze()', () => {
    test('ログファイルからカバレッジデータを生成できる', async () => {
      // テスト用ログファイルを作成
      await createTestLogs(testLogsDir, [
        {
          iteration: 1,
          tests_executed: 3,
          tests_passed: 3,
          playwright_agent_results: {
            test_details: [
              { 
                name: 'ログインテスト',
                visited_urls: ['https://example.com/login']
              },
              {
                name: 'ダッシュボードテスト',
                visited_urls: ['https://example.com/dashboard']
              }
            ]
          }
        }
      ]);

      // ConfigのgetPathをモック
      mockConfig.getPath = jest.fn(() => testLogsDir);

      const result = await analyzer.analyze();

      expect(result).toHaveProperty('analysis_date');
      expect(result).toHaveProperty('total_scenarios_executed', 1);
      expect(result).toHaveProperty('coverage_summary');
      expect(result.coverage_summary).toHaveProperty('percentage');
      expect(result.coverage_summary).toHaveProperty('visited_pages');
      expect(result).toHaveProperty('uncovered');
    });

    test('ログファイルが存在しない場合は空のカバレッジを返す', async () => {
      // 存在しないディレクトリを指定
      mockConfig.getPath = jest.fn(() => path.join(__dirname, 'nonexistent'));

      const result = await analyzer.analyze();

      expect(result.total_scenarios_executed).toBe(0);
      expect(result.coverage_summary.percentage).toBe(0);
    });

    test('複数イテレーションのログを統合して分析できる', async () => {
      await createTestLogs(testLogsDir, [
        {
          iteration: 1,
          playwright_agent_results: {
            test_details: [
              { visited_urls: ['https://example.com/page1'] }
            ]
          }
        },
        {
          iteration: 2,
          playwright_agent_results: {
            test_details: [
              { visited_urls: ['https://example.com/page2'] }
            ]
          }
        }
      ]);

      mockConfig.getPath = jest.fn(() => testLogsDir);

      const result = await analyzer.analyze();

      expect(result.total_scenarios_executed).toBe(2);
      expect(result.coverage_summary.visited_pages).toBeGreaterThanOrEqual(2);
    });
  });

  describe('loadAllLogs()', () => {
    test('ログディレクトリから全JSONファイルを読み込める', async () => {
      await createTestLogs(testLogsDir, [
        { iteration: 1, status: 'success' },
        { iteration: 2, status: 'success' }
      ]);

      mockConfig.getPath = jest.fn(() => testLogsDir);

      const logs = await analyzer.loadAllLogs();

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(2);
      expect(logs[0]).toHaveProperty('iteration', 1);
    });

    test('ログディレクトリが空の場合は空配列を返す', async () => {
      await fs.mkdir(testLogsDir, { recursive: true });
      mockConfig.getPath = jest.fn(() => testLogsDir);

      const logs = await analyzer.loadAllLogs();

      expect(logs).toEqual([]);
    });

    test('不正なJSONファイルはスキップする', async () => {
      await fs.mkdir(testLogsDir, { recursive: true });
      
      // 正しいJSON
      await fs.writeFile(
        path.join(testLogsDir, 'valid.json'),
        JSON.stringify({ iteration: 1 }),
        'utf8'
      );
      
      // 不正なJSON
      await fs.writeFile(
        path.join(testLogsDir, 'invalid.json'),
        'this is not json',
        'utf8'
      );

      mockConfig.getPath = jest.fn(() => testLogsDir);

      const logs = await analyzer.loadAllLogs();

      expect(logs.length).toBe(1);
      expect(logs[0].iteration).toBe(1);
    });
  });

  describe('extractVisitedPages()', () => {
    test('ログから訪問済みページを抽出できる', () => {
      const logs = [
        {
          playwright_agent_results: {
            test_details: [
              { visited_urls: ['https://example.com/page1', 'https://example.com/page2'] }
            ]
          }
        },
        {
          playwright_agent_results: {
            test_details: [
              { visited_urls: ['https://example.com/page2', 'https://example.com/page3'] }
            ]
          }
        }
      ];

      const pages = analyzer.extractVisitedPages(logs);

      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThanOrEqual(3);
      expect(pages).toContain('https://example.com/page1');
    });

    test('重複したURLは除外される', () => {
      const logs = [
        {
          playwright_agent_results: {
            test_details: [
              { visited_urls: ['https://example.com/page1'] }
            ]
          }
        },
        {
          playwright_agent_results: {
            test_details: [
              { visited_urls: ['https://example.com/page1'] }
            ]
          }
        }
      ];

      const pages = analyzer.extractVisitedPages(logs);

      expect(pages.length).toBe(1);
    });
  });

  describe('extractTestedFeatures()', () => {
    test('ログからテスト済み機能を抽出できる', () => {
      const logs = [
        {
          playwright_agent_results: {
            test_details: [
              { 
                name: 'ログイン機能テスト',
                feature: 'ログイン'
              },
              {
                name: 'ダッシュボード表示テスト',
                feature: 'ダッシュボード'
              }
            ]
          }
        }
      ];

      const features = analyzer.extractTestedFeatures(logs);

      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    test('featureフィールドがない場合はテスト名から推測する', () => {
      const logs = [
        {
          playwright_agent_results: {
            test_details: [
              { name: 'ログイン機能のテスト' }
            ]
          }
        }
      ];

      const features = analyzer.extractTestedFeatures(logs);

      expect(features.length).toBeGreaterThan(0);
    });
  });

  describe('calculateCoverage()', () => {
    test('カバレッジパーセンテージを計算できる', () => {
      const coverage = analyzer.calculateCoverage(5, 10, 8, 15);

      expect(typeof coverage).toBe('number');
      expect(coverage).toBeGreaterThanOrEqual(0);
      expect(coverage).toBeLessThanOrEqual(100);
    });

    test('全体が0の場合は0%を返す', () => {
      const coverage = analyzer.calculateCoverage(0, 0, 0, 0);

      expect(coverage).toBe(0);
    });

    test('100%カバレッジの場合は100を返す', () => {
      const coverage = analyzer.calculateCoverage(10, 10, 15, 15);

      expect(coverage).toBe(100);
    });
  });

  describe('findUncoveredPages()', () => {
    test('未カバーページを検出できる', () => {
      const visitedPages = ['https://example.com/page1', 'https://example.com/page2'];
      const estimatedTotal = 5;

      const uncovered = analyzer.findUncoveredPages(visitedPages, estimatedTotal);

      expect(Array.isArray(uncovered)).toBe(true);
      expect(uncovered.length).toBe(3); // 5 - 2 = 3
    });

    test('すべてカバー済みの場合は空配列を返す', () => {
      const visitedPages = ['https://example.com/page1', 'https://example.com/page2'];
      const estimatedTotal = 2;

      const uncovered = analyzer.findUncoveredPages(visitedPages, estimatedTotal);

      expect(uncovered).toEqual([]);
    });
  });

  describe('findUncoveredFeatures()', () => {
    test('未カバー機能を検出できる', () => {
      const testedFeatures = ['ログイン', 'ダッシュボード'];
      const estimatedTotal = 5;

      const uncovered = analyzer.findUncoveredFeatures(testedFeatures, estimatedTotal);

      expect(Array.isArray(uncovered)).toBe(true);
      expect(uncovered.length).toBe(3); // 5 - 2 = 3
    });
  });

  describe('estimateTotalPages()', () => {
    test('推定総ページ数を計算できる', () => {
      const logs = [
        {
          playwright_agent_results: {
            test_details: [
              { visited_urls: ['https://example.com/page1'] },
              { visited_urls: ['https://example.com/page2'] }
            ]
          }
        }
      ];

      const total = analyzer.estimateTotalPages(logs);

      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(2); // 少なくとも訪問済みページ数以上
    });
  });

  describe('estimateTotalFeatures()', () => {
    test('推定総機能数を計算できる', () => {
      const logs = [
        {
          playwright_agent_results: {
            test_details: [
              { name: 'テスト1', feature: '機能1' },
              { name: 'テスト2', feature: '機能2' }
            ]
          }
        }
      ];

      const total = analyzer.estimateTotalFeatures(logs);

      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getEmptyCoverage()', () => {
    test('空のカバレッジデータを生成できる', () => {
      const empty = analyzer.getEmptyCoverage();

      expect(empty).toHaveProperty('analysis_date');
      expect(empty).toHaveProperty('total_scenarios_executed', 0);
      expect(empty).toHaveProperty('coverage_summary');
      expect(empty.coverage_summary.percentage).toBe(0);
      expect(empty).toHaveProperty('uncovered');
      expect(empty.uncovered.pages).toEqual([]);
      expect(empty.uncovered.elements).toEqual([]);
    });
  });
});

// ヘルパー関数: テスト用ログファイルを作成
async function createTestLogs(logsDir, logDataArray) {
  await fs.mkdir(logsDir, { recursive: true });

  for (let i = 0; i < logDataArray.length; i++) {
    const logData = {
      execution_id: `test-${i + 1}`,
      iteration: i + 1,
      target_url: 'https://example.com',
      browser: 'chromium',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_seconds: 60,
      status: 'success',
      tests_executed: 1,
      tests_passed: 1,
      tests_failed: 0,
      healer_actions: 0,
      playwright_agent_results: {
        planner_suggestions: [],
        generated_tests: [],
        healer_actions: [],
        test_details: []
      },
      ...logDataArray[i]
    };

    await fs.writeFile(
      path.join(logsDir, `log_${i + 1}.json`),
      JSON.stringify(logData, null, 2),
      'utf8'
    );
  }
}
