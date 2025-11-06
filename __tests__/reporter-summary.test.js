const Reporter = require('../src/reporter');
const ConfigManager = require('../src/config');
const path = require('path');

describe('Reporter - createSummaryFromResults (TDD)', () => {
  let reporter;
  let mockConfig;

  beforeAll(async () => {
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    mockConfig = await ConfigManager.load(configPath);
    reporter = new Reporter(mockConfig);
  });

  describe('executionResultsフィールドのsuccessフラグを正しく認識する', () => {
    test('success=trueの結果は成功としてカウントされる', () => {
      const results = {
        executionResults: [
          { test_case_id: 'TC001', success: true, aspect_no: 1 },
          { test_case_id: 'TC002', success: true, aspect_no: 2 },
          { test_case_id: 'TC003', success: true, aspect_no: 3 }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.tests_passed).toBe(3);
      expect(summary.tests_failed).toBe(0);
      expect(summary.total_tests).toBe(3);
      expect(summary.success_rate).toBe(100);
    });

    test('success=falseの結果は失敗としてカウントされる', () => {
      const results = {
        executionResults: [
          { test_case_id: 'TC001', success: false, aspect_no: 1, error: { message: 'Error' } },
          { test_case_id: 'TC002', success: false, aspect_no: 2, error: { message: 'Error' } }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.tests_passed).toBe(0);
      expect(summary.tests_failed).toBe(2);
      expect(summary.total_tests).toBe(2);
      expect(summary.success_rate).toBe(0);
    });

    test('成功と失敗が混在する場合、正しく集計される', () => {
      const results = {
        executionResults: [
          { test_case_id: 'TC001', success: true, aspect_no: 1 },
          { test_case_id: 'TC002', success: false, aspect_no: 2, error: { message: 'Error' } },
          { test_case_id: 'TC003', success: true, aspect_no: 3 }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.tests_passed).toBe(2);
      expect(summary.tests_failed).toBe(1);
      expect(summary.total_tests).toBe(3);
      expect(summary.success_rate).toBeCloseTo(66.67, 1);
    });

    test('successフィールドがない場合は失敗として扱う', () => {
      const results = {
        executionResults: [
          { test_case_id: 'TC001', aspect_no: 1 }, // successフィールドなし
          { test_case_id: 'TC002', success: true, aspect_no: 2 }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.tests_passed).toBe(1);
      expect(summary.tests_failed).toBe(1);
      expect(summary.total_tests).toBe(2);
    });
  });

  describe('カバレッジ計算', () => {
    test('カバー済み観点を正しく集計する', () => {
      const results = {
        coverage: {
          percentage: 30,
          covered: 3,
          total: 10,
          covered_aspects: [1, 2, 5]
        },
        executionResults: [
          { test_case_id: 'TC001', success: true, aspect_no: 1 },
          { test_case_id: 'TC002', success: true, aspect_no: 2 },
          { test_case_id: 'TC003', success: false, aspect_no: 5 }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.coverage_percentage).toBe(30);
      expect(summary.covered_aspects).toEqual([1, 2, 5]);
    });

    test('coverageフィールドがない場合はデフォルト値を使用', () => {
      const results = {
        executionResults: [
          { test_case_id: 'TC001', success: true, aspect_no: 1 }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.coverage_percentage).toBe(0);
      expect(summary.covered_aspects).toEqual([]);
    });
  });

  describe('テスト内容（testCases）の保存', () => {
    test('testCasesフィールドがある場合、HTMLに含める', () => {
      const results = {
        executionResults: [
          { 
            test_case_id: 'TC001', 
            success: true, 
            aspect_no: 1,
            test_case: {
              test_case_id: 'TC001',
              aspect_no: 1,
              test_type: 'functional',
              description: 'ログイン機能のテスト',
              steps: [
                { step: 1, action: 'URLを開く', target: 'https://example.com' },
                { step: 2, action: 'ユーザー名を入力', target: 'input[name="username"]', value: 'testuser' }
              ],
              expected_results: ['ログインに成功する', 'ホーム画面が表示される']
            }
          }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.executionResults[0]).toHaveProperty('test_case');
      expect(summary.executionResults[0].test_case.description).toBe('ログイン機能のテスト');
      expect(summary.executionResults[0].test_case.steps).toHaveLength(2);
    });

    test('testCasesがない場合もエラーにならない', () => {
      const results = {
        executionResults: [
          { test_case_id: 'TC001', success: true, aspect_no: 1 }
        ]
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.executionResults[0]).not.toHaveProperty('test_case');
    });
  });

  describe('空・不正なデータのハンドリング', () => {
    test('executionResultsが空配列の場合', () => {
      const results = {
        executionResults: []
      };

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.tests_passed).toBe(0);
      expect(summary.tests_failed).toBe(0);
      expect(summary.total_tests).toBe(0);
      expect(summary.success_rate).toBe(0);
    });

    test('executionResultsフィールドがない場合', () => {
      const results = {};

      const summary = reporter.createSummaryFromResults(results);

      expect(summary.tests_passed).toBe(0);
      expect(summary.tests_failed).toBe(0);
      expect(summary.total_tests).toBe(0);
    });

    test('nullやundefinedが渡された場合', () => {
      expect(() => reporter.createSummaryFromResults(null)).not.toThrow();
      expect(() => reporter.createSummaryFromResults(undefined)).not.toThrow();
    });
  });

  describe('HTMLレポート生成でテスト詳細を表示', () => {
    test('テスト内容がHTMLに含まれる', async () => {
      const data = {
        sessionId: 'test-session',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: 5000,
        iterations: 1,
        coverage: {
          percentage: 10,
          covered: 1,
          total: 10,
          tests_passed: 1,
          tests_failed: 2,
          total_tests: 3
        },
        executionResults: [
          {
            test_case_id: 'TC001',
            aspect_no: 1,
            success: false,
            duration_ms: 211,
            error: { message: 'Element not found' },
            test_case: {
              test_case_id: 'TC001',
              aspect_no: 1,
              test_type: 'functional',
              description: '日付入力フィールドのバリデーションテスト',
              steps: [
                { step: 1, action: 'ページを開く', target: 'https://example.com' },
                { step: 2, action: '日付を入力', target: 'input[name="date"]', value: '2025/12/01' }
              ],
              expected_results: ['入力が受け付けられる', 'エラーが表示されない']
            }
          },
          {
            test_case_id: 'TC002',
            aspect_no: 2,
            success: true,
            duration_ms: 1236,
            test_case: {
              test_case_id: 'TC002',
              aspect_no: 2,
              test_type: 'navigation',
              description: 'ナビゲーションリンクの動作確認',
              steps: [
                { step: 1, action: 'リンクをクリック', target: 'link[href="/about"]' }
              ],
              expected_results: ['ページ遷移が成功する']
            }
          }
        ]
      };

      const html = await reporter.generateHTML(data);

      // テスト内容が含まれているか確認
      expect(html).toContain('TC001');
      expect(html).toContain('日付入力フィールドのバリデーションテスト');
      expect(html).toContain('ページを開く');
      expect(html).toContain('TC002');
      expect(html).toContain('ナビゲーションリンクの動作確認');
    });
  });
});
