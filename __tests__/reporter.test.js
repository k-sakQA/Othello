const Reporter = require('../src/reporter');
const ConfigManager = require('../src/config');
const fs = require('fs').promises;
const path = require('path');

describe('Reporter', () => {
  let reporter;
  let mockConfig;
  let testReportsDir;

  beforeAll(async () => {
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    mockConfig = await ConfigManager.load(configPath);

    // テスト用レポートディレクトリ
    testReportsDir = path.join(__dirname, 'fixtures', 'test-reports');
  });

  beforeEach(() => {
    reporter = new Reporter(mockConfig);
  });

  afterEach(async () => {
    // テスト用ディレクトリをクリーンアップ
    try {
      await fs.rm(testReportsDir, { recursive: true, force: true });
    } catch (error) {
      // エラーは無視
    }
  });

  describe('generateReport()', () => {
    test('テスト結果からレポートを生成できる', async () => {
      const testData = {
        summary: {
          total_iterations: 3,
          total_tests: 15,
          passed: 13,
          failed: 2,
          final_coverage: 78
        },
        iterations: [
          {
            iteration: 1,
            tests_executed: 5,
            tests_passed: 5,
            coverage: 35,
            duration_seconds: 225
          },
          {
            iteration: 2,
            tests_executed: 6,
            tests_passed: 5,
            tests_failed: 1,
            coverage: 62,
            duration_seconds: 252,
            healer_actions: 1
          },
          {
            iteration: 3,
            tests_executed: 4,
            tests_passed: 4,
            coverage: 78,
            duration_seconds: 150
          }
        ]
      };

      const report = await reporter.generateReport(testData);

      expect(report).toBeDefined();
      expect(report).toHaveProperty('html');
      expect(report.html).toContain('Othello');
      expect(report.html).toContain('サマリー');
      expect(report.html).toContain('78%');
    });

    test('空のデータでもエラーにならない', async () => {
      const emptyData = {
        summary: {
          total_iterations: 0,
          total_tests: 0,
          passed: 0,
          failed: 0,
          final_coverage: 0
        },
        iterations: []
      };

      const report = await reporter.generateReport(emptyData);

      expect(report).toBeDefined();
      expect(report.html).toContain('0');
    });
  });

  describe('saveReport()', () => {
    test('レポートをHTMLファイルとして保存できる', async () => {
      const reportData = {
        html: '<html><body><h1>Test Report</h1></body></html>',
        timestamp: new Date().toISOString()
      };

      const filePath = path.join(testReportsDir, 'test-report.html');
      await reporter.saveReport(reportData, filePath);

      // ファイルが作成されたことを確認
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // ファイル内容を確認
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe(reportData.html);
    });

    test('ディレクトリが存在しない場合は自動作成する', async () => {
      const reportData = {
        html: '<html><body><h1>Test Report</h1></body></html>'
      };

      const nestedPath = path.join(testReportsDir, 'nested', 'dir', 'report.html');
      await reporter.saveReport(reportData, nestedPath);

      const fileExists = await fs.access(nestedPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('formatSummary()', () => {
    test('サマリーデータをフォーマットできる', () => {
      const summary = {
        total_iterations: 3,
        total_tests: 15,
        passed: 13,
        failed: 2,
        final_coverage: 78
      };

      const formatted = reporter.formatSummary(summary);

      expect(formatted).toHaveProperty('totalIterations', 3);
      expect(formatted).toHaveProperty('totalTests', 15);
      expect(formatted).toHaveProperty('passedTests', 13);
      expect(formatted).toHaveProperty('failedTests', 2);
      expect(formatted).toHaveProperty('successRate');
      expect(formatted.successRate).toBeCloseTo(86.67, 1);
    });

    test('ゼロ除算を回避する', () => {
      const summary = {
        total_iterations: 0,
        total_tests: 0,
        passed: 0,
        failed: 0,
        final_coverage: 0
      };

      const formatted = reporter.formatSummary(summary);

      expect(formatted.successRate).toBe(0);
    });
  });

  describe('formatIteration()', () => {
    test('イテレーションデータをフォーマットできる', () => {
      const iteration = {
        iteration: 1,
        tests_executed: 5,
        tests_passed: 5,
        coverage: 35,
        duration_seconds: 225
      };

      const formatted = reporter.formatIteration(iteration);

      expect(formatted).toHaveProperty('iterationNumber', 1);
      expect(formatted).toHaveProperty('testsExecuted', 5);
      expect(formatted).toHaveProperty('testsPassed', 5);
      expect(formatted).toHaveProperty('coverage', 35);
      expect(formatted).toHaveProperty('durationFormatted');
      expect(formatted.durationFormatted).toContain('3分');
    });

    test('時間のフォーマットが正しい', () => {
      const iteration = {
        iteration: 1,
        tests_executed: 1,
        duration_seconds: 3665 // 1時間1分5秒
      };

      const formatted = reporter.formatIteration(iteration);

      expect(formatted.durationFormatted).toContain('1時間');
      expect(formatted.durationFormatted).toContain('1分');
    });
  });

  describe('generateHTML()', () => {
    test('HTMLレポートを生成できる', async () => {
      const data = {
        summary: {
          total_iterations: 2,
          total_tests: 10,
          passed: 9,
          failed: 1,
          final_coverage: 65
        },
        iterations: [
          {
            iteration: 1,
            tests_executed: 5,
            tests_passed: 5,
            coverage: 40,
            duration_seconds: 180
          }
        ],
        timestamp: '2025-10-16T10:30:00Z'
      };

      const html = await reporter.generateHTML(data);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('Othello');
      expect(html).toContain('65%');
    });

    test('日本語が正しくエンコードされる', async () => {
      const data = {
        summary: {
          total_iterations: 1,
          total_tests: 1,
          passed: 1,
          failed: 0,
          final_coverage: 100
        },
        iterations: [],
        timestamp: new Date().toISOString()
      };

      const html = await reporter.generateHTML(data);

      expect(html).toContain('サマリー');
      expect(html).toContain('イテレーション');
      expect(html).toContain('テスト');
    });
  });

  describe('統合テスト', () => {
    test('完全なレポート生成フローが動作する', async () => {
      const testData = {
        summary: {
          total_iterations: 2,
          total_tests: 8,
          passed: 7,
          failed: 1,
          final_coverage: 60
        },
        iterations: [
          {
            iteration: 1,
            tests_executed: 4,
            tests_passed: 4,
            coverage: 35,
            duration_seconds: 120
          },
          {
            iteration: 2,
            tests_executed: 4,
            tests_passed: 3,
            tests_failed: 1,
            coverage: 60,
            duration_seconds: 150
          }
        ],
        timestamp: new Date().toISOString()
      };

      // レポート生成
      const report = await reporter.generateReport(testData);
      expect(report).toBeDefined();
      expect(report.html).toBeDefined();

      // レポート保存
      const filePath = path.join(testReportsDir, 'integration-test-report.html');
      await reporter.saveReport(report, filePath);

      // ファイルが作成され、内容が正しいことを確認
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('Othello');
      expect(content).toContain('60%');
      expect(content).toContain('イテレーション1');
      expect(content).toContain('イテレーション2');
    });
  });
});
