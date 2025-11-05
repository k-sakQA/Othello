/**
 * Reporter - Exit Handling Tests
 * [0]で終了した時のレポート生成が正しく動作することを確認
 */

const Reporter = require('../src/reporter');
const fs = require('fs').promises;
const path = require('path');

describe('Reporter - Exit Handling', () => {
  let reporter;
  let config;
  let outputDir;

  beforeEach(() => {
    outputDir = path.join(__dirname, 'test-output-reporter-exit');
    config = {
      getConfig: () => ({
        outputDir: outputDir,
        paths: {
          reports: outputDir
        }
      })
    };
    reporter = new Reporter(config);
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (err) {
      // ディレクトリが存在しない場合は無視
    }
  });

  describe('createSummaryFromResults', () => {
    test('空の結果配列からサマリーを生成できる', () => {
      const summary = reporter.createSummaryFromResults([], 0);
      
      expect(summary).toEqual({
        total_iterations: 0,
        total_tests: 0,
        passed: 0,
        failed: 0
      });
    });

    test('成功したテスト結果からサマリーを生成できる', () => {
      const results = [
        { status: 'passed', testCaseId: 'TC001' },
        { status: 'success', testCaseId: 'TC002' },
        { status: 'passed', testCaseId: 'TC003' }
      ];
      
      const summary = reporter.createSummaryFromResults(results, 2);
      
      expect(summary).toEqual({
        total_iterations: 2,
        total_tests: 3,
        passed: 3,
        failed: 0
      });
    });

    test('失敗したテスト結果からサマリーを生成できる', () => {
      const results = [
        { status: 'passed', testCaseId: 'TC001' },
        { status: 'failed', testCaseId: 'TC002' },
        { status: 'error', testCaseId: 'TC003' }
      ];
      
      const summary = reporter.createSummaryFromResults(results, 1);
      
      expect(summary).toEqual({
        total_iterations: 1,
        total_tests: 3,
        passed: 1,
        failed: 2
      });
    });

    test('混在したステータスからサマリーを生成できる', () => {
      const results = [
        { status: 'passed', testCaseId: 'TC001' },
        { status: 'success', testCaseId: 'TC002' },
        { status: 'failed', testCaseId: 'TC003' },
        { status: 'error', testCaseId: 'TC004' },
        { status: 'passed', testCaseId: 'TC005' }
      ];
      
      const summary = reporter.createSummaryFromResults(results, 3);
      
      expect(summary).toEqual({
        total_iterations: 3,
        total_tests: 5,
        passed: 3,
        failed: 2
      });
    });
  });

  describe('saveAllReports with incomplete data', () => {
    test('reportDataがundefinedでもエラーにならない', async () => {
      const result = await reporter.saveAllReports(undefined, 'test-session');
      
      expect(result).toBeDefined();
      expect(result.json).toBeDefined();
      expect(result.markdown).toBeDefined();
      expect(result.html).toBeDefined();
    });

    test('reportDataが空オブジェクトでもレポートを生成できる', async () => {
      const result = await reporter.saveAllReports({}, 'test-session');
      
      expect(result).toBeDefined();
      expect(result.json).toContain('test-session');
      expect(result.markdown).toContain('test-session');
      expect(result.html).toContain('test-session');
    });

    test('最小限のreportDataでレポートを生成できる', async () => {
      const reportData = {
        sessionId: 'test-123',
        startTime: new Date('2025-01-01T00:00:00Z'),
        endTime: new Date('2025-01-01T00:05:00Z'),
        totalDuration: 300000,
        iterations: 1,
        coverage: { percentage: 25.5, covered: 5, total: 20 },
        executionResults: [
          { 
            testCaseId: 'TC001', 
            aspectNo: 1, 
            status: 'passed', 
            durationMs: 1000,
            success: true
          }
        ]
      };
      
      const result = await reporter.saveAllReports(reportData, 'test-123');
      
      // ファイルが生成されたことを確認
      const jsonContent = await fs.readFile(result.json, 'utf8');
      const mdContent = await fs.readFile(result.markdown, 'utf8');
      const htmlContent = await fs.readFile(result.html, 'utf8');
      
      expect(JSON.parse(jsonContent)).toMatchObject({
        sessionId: 'test-123',
        iterations: 1
      });
      
      expect(mdContent).toContain('test-123');
      expect(mdContent).toContain('**Iterations:** 1');
      expect(mdContent).toContain('TC001');
      
      // HTMLはサマリー情報を含む（sessionIdは表示されない）
      expect(htmlContent).toContain('総テスト実行数');
      expect(htmlContent).toContain('1'); // 1つのテストが実行された
    });

    test('executionResultsのみでもレポートを生成できる', async () => {
      const reportData = {
        sessionId: 'test-456',
        executionResults: [
          { testCaseId: 'TC001', status: 'passed', success: true },
          { testCaseId: 'TC002', status: 'failed', success: false }
        ]
      };
      
      const result = await reporter.saveAllReports(reportData, 'test-456');
      
      const mdContent = await fs.readFile(result.markdown, 'utf8');
      
      expect(mdContent).toContain('**Tests Passed:** 1');
      expect(mdContent).toContain('**Tests Failed:** 1');
    });
  });

  describe('generateMarkdown with various data formats', () => {
    test('新しいフォーマット（camelCase）のデータを処理できる', () => {
      const reportData = {
        sessionId: 'test-789',
        startTime: Date.now(),
        endTime: Date.now(),
        totalDuration: 5000,
        iterations: 2,
        coverage: { percentage: 50, covered: 10, total: 20 },
        executionResults: [
          {
            testCaseId: 'TC001',
            aspectNo: 1,
            status: 'passed',
            durationMs: 1000,
            success: true,
            autoHealed: true,
            healMethod: 'retry'
          }
        ]
      };
      
      const markdown = reporter.generateMarkdown(reportData);
      
      expect(markdown).toContain('test-789');
      expect(markdown).toContain('**Iterations:** 2');
      expect(markdown).toContain('**Coverage:** 50.00%');
      expect(markdown).toContain('TC001');
      expect(markdown).toContain('**Auto-Healed:** Yes (retry)');
    });

    test('古いフォーマット（snake_case）のデータを処理できる', () => {
      const reportData = {
        sessionId: 'test-legacy',
        executionResults: [
          {
            test_case_id: 'TC-OLD-001',
            aspect_no: 2,
            status: 'passed',
            duration_ms: 2000,
            success: true,
            healed: true,
            heal_method: 'alternative-selector'
          }
        ]
      };
      
      const markdown = reporter.generateMarkdown(reportData);
      
      expect(markdown).toContain('TC-OLD-001');
      expect(markdown).toContain('**Aspect:** 2');
      expect(markdown).toContain('**Duration:** 2000ms');
      expect(markdown).toContain('**Auto-Healed:** Yes (alternative-selector)');
    });

    test('未定義フィールドがあってもクラッシュしない', () => {
      const reportData = {
        executionResults: [
          { status: 'passed' }, // testCaseId, aspectNo等が無い
          { testCaseId: 'TC002' } // statusが無い
        ]
      };
      
      const markdown = reporter.generateMarkdown(reportData);
      
      expect(markdown).toContain('Test-1'); // デフォルトID
      expect(markdown).toContain('TC002'); // 2つ目はtestCaseIdがある
      expect(markdown).toContain('**Aspect:** N/A');
    });
  });

  describe('formatSummary with edge cases', () => {
    test('total_testsが0でも成功率を計算できる', () => {
      const summary = { total_tests: 0, passed: 0, failed: 0 };
      const formatted = reporter.formatSummary(summary);
      
      expect(formatted.successRate).toBe(0);
      expect(formatted.totalTests).toBe(0);
    });

    test('summaryフィールドが無くてもデフォルト値を使う', () => {
      const summary = {};
      const formatted = reporter.formatSummary(summary);
      
      expect(formatted).toEqual({
        totalIterations: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        successRate: 0,
        finalCoverage: 0
      });
    });

    test('部分的なsummaryでも処理できる', () => {
      const summary = { total_tests: 10, passed: 7 };
      const formatted = reporter.formatSummary(summary);
      
      expect(formatted.totalTests).toBe(10);
      expect(formatted.passedTests).toBe(7);
      expect(formatted.failedTests).toBe(0);
      expect(formatted.successRate).toBe(70);
    });
  });

  describe('generateHTML with incomplete data', () => {
    test('summaryがなくてもexecutionResultsからHTMLを生成できる', async () => {
      const data = {
        timestamp: new Date().toISOString(),
        executionResults: [
          { testCaseId: 'TC001', status: 'passed', success: true },
          { testCaseId: 'TC002', status: 'failed', success: false }
        ],
        iterations: 1
      };
      
      const html = await reporter.generateHTML(data);
      
      // HTMLはサマリー情報のみを含み、詳細なテストケースIDは含まれない
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('総テスト実行数');
      expect(html).toContain('2'); // 2つのテストが実行された
    });

    test('空のexecutionResultsでもHTMLを生成できる', async () => {
      const data = {
        timestamp: new Date().toISOString(),
        executionResults: [],
        iterations: 0
      };
      
      const html = await reporter.generateHTML(data);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('総テスト実行数');
    });
  });
});
