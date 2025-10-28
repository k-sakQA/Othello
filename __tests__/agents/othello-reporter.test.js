/**
 * Othello-Reporter テストスイート
 * 実行結果から各種形式のレポートを生成
 */

const OthelloReporter = require('../../src/agents/othello-reporter');
const fs = require('fs');
const path = require('path');

// テスト用の一時ディレクトリ
const TEST_OUTPUT_DIR = path.join(__dirname, '../../test-output');

describe('Othello-Reporter', () => {
  let reporter;

  beforeEach(() => {
    reporter = new OthelloReporter({
      outputDir: TEST_OUTPUT_DIR
    });

    // 出力ディレクトリをクリア
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    // テスト後にクリーンアップ
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  describe('constructor', () => {
    test('デフォルト設定で初期化できる', () => {
      const defaultReporter = new OthelloReporter();
      expect(defaultReporter).toBeDefined();
      expect(defaultReporter.outputDir).toBe('./reports');
    });

    test('カスタム設定で初期化できる', () => {
      const customReporter = new OthelloReporter({
        outputDir: './custom-reports',
        includeTimestamp: false
      });
      expect(customReporter.outputDir).toBe('./custom-reports');
      expect(customReporter.includeTimestamp).toBe(false);
    });
  });

  describe('generateReport', () => {
    test('全形式のレポートを生成できる', async () => {
      const testData = {
        coverage: {
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
        },
        executionResults: [
          { test_case_id: 'TC001', aspect_no: 1, success: true, duration_ms: 1200 },
          { test_case_id: 'TC002', aspect_no: 2, success: false, duration_ms: 800, error: 'Selector not found' }
        ],
        iterations: 3
      };

      const result = await reporter.generateReport(testData);

      expect(result.json).toBeDefined();
      expect(result.markdown).toBeDefined();
      expect(result.html).toBeDefined();
    });
  });

  describe('generateJSON', () => {
    test('JSON形式のレポートを生成できる', () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 }
        },
        executionResults: [
          { test_case_id: 'TC001', success: true }
        ]
      };

      const json = reporter.generateJSON(testData);

      expect(json).toContain('"total": 23');
      expect(json).toContain('"tested": 5');
      expect(json).toContain('"percentage": 21.74');
    });

    test('複雑なデータ構造を正しくJSON化できる', () => {
      const testData = {
        coverage: {
          aspectCoverage: {
            tested_aspects: [1, 2, 3],
            untested_aspects: [4, 5, 6]
          }
        },
        executionResults: [
          { test_case_id: 'TC001', error: { message: 'Error', stack: 'Stack trace' } }
        ]
      };

      const json = reporter.generateJSON(testData);
      const parsed = JSON.parse(json);

      expect(parsed.coverage.aspectCoverage.tested_aspects).toEqual([1, 2, 3]);
      expect(parsed.executionResults[0].error.message).toBe('Error');
    });
  });

  describe('generateMarkdown', () => {
    test('Markdown形式のレポートを生成できる', () => {
      const testData = {
        coverage: {
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
        },
        executionResults: [
          { test_case_id: 'TC001', aspect_no: 1, success: true, duration_ms: 1200 }
        ],
        iterations: 3
      };

      const markdown = reporter.generateMarkdown(testData);

      expect(markdown).toContain('# Othello テスト実行レポート');
      expect(markdown).toContain('43.48%');
      expect(markdown).toContain('12/15');
      expect(markdown).toContain('TC001');
    });

    test('失敗ケースを強調表示する', () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 1, percentage: 4.35 },
          testCaseCoverage: { total: 2, passed: 1, failed: 1, pass_rate: 50 }
        },
        executionResults: [
          { test_case_id: 'TC001', success: true },
          { test_case_id: 'TC002', success: false, error: 'Timeout' }
        ],
        iterations: 1
      };

      const markdown = reporter.generateMarkdown(testData);

      expect(markdown).toContain('❌');
      expect(markdown).toContain('Timeout');
    });

    test('イテレーション情報を含める', () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 },
          testCaseCoverage: { total: 5, passed: 5, failed: 0, pass_rate: 100 }
        },
        executionResults: [],
        iterations: 5
      };

      const markdown = reporter.generateMarkdown(testData);

      expect(markdown).toContain('イテレーション数**: 5'); // **付き
    });
  });

  describe('generateHTML', () => {
    test('HTML形式のレポートを生成できる', () => {
      const testData = {
        coverage: {
          aspectCoverage: {
            total: 23,
            tested: 10,
            percentage: 43.48
          },
          testCaseCoverage: {
            total: 15,
            passed: 12,
            failed: 3,
            pass_rate: 80
          }
        },
        executionResults: [
          { test_case_id: 'TC001', aspect_no: 1, success: true, duration_ms: 1200 }
        ],
        iterations: 3
      };

      const html = reporter.generateHTML(testData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('Othello テスト実行レポート');
      expect(html).toContain('43.48%');
    });

    test('CSSスタイルを含む', () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 },
          testCaseCoverage: { total: 5, passed: 5, failed: 0, pass_rate: 100 }
        },
        executionResults: [],
        iterations: 1
      };

      const html = reporter.generateHTML(testData);

      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    test('カバレッジプログレスバーを含む', () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 15, percentage: 65.22 },
          testCaseCoverage: { total: 20, passed: 18, failed: 2, pass_rate: 90 }
        },
        executionResults: [],
        iterations: 4
      };

      const html = reporter.generateHTML(testData);

      expect(html).toContain('65.22%');
      expect(html).toContain('progress');
    });
  });

  describe('saveReport', () => {
    test('JSONレポートをファイルに保存できる', async () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 }
        },
        executionResults: []
      };

      const filePath = await reporter.saveReport(testData, 'json', 'test-report.json');

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('"total": 23');
    });

    test('Markdownレポートをファイルに保存できる', async () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 },
          testCaseCoverage: { total: 5, passed: 5, failed: 0, pass_rate: 100 }
        },
        executionResults: [],
        iterations: 1
      };

      const filePath = await reporter.saveReport(testData, 'markdown', 'test-report.md');

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('# Othello テスト実行レポート');
    });

    test('HTMLレポートをファイルに保存できる', async () => {
      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 },
          testCaseCoverage: { total: 5, passed: 5, failed: 0, pass_rate: 100 }
        },
        executionResults: [],
        iterations: 1
      };

      const filePath = await reporter.saveReport(testData, 'html', 'test-report.html');

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
    });

    test('出力ディレクトリが存在しない場合は作成する', async () => {
      const newDir = path.join(TEST_OUTPUT_DIR, 'new-dir');
      reporter.outputDir = newDir;

      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 }
        },
        executionResults: []
      };

      await reporter.saveReport(testData, 'json', 'test.json');

      expect(fs.existsSync(newDir)).toBe(true);
    });
  });

  describe('saveAllReports', () => {
    test('全形式のレポートを一括保存できる', async () => {
      const testData = {
        coverage: {
          aspectCoverage: {
            total: 23,
            tested: 10,
            percentage: 43.48
          },
          testCaseCoverage: {
            total: 15,
            passed: 12,
            failed: 3,
            pass_rate: 80
          }
        },
        executionResults: [
          { test_case_id: 'TC001', success: true }
        ],
        iterations: 3
      };

      const result = await reporter.saveAllReports(testData, 'test-run');

      expect(result.json).toBeDefined();
      expect(result.markdown).toBeDefined();
      expect(result.html).toBeDefined();

      expect(fs.existsSync(result.json)).toBe(true);
      expect(fs.existsSync(result.markdown)).toBe(true);
      expect(fs.existsSync(result.html)).toBe(true);
    });

    test('タイムスタンプ付きファイル名を生成する', async () => {
      reporter.includeTimestamp = true;

      const testData = {
        coverage: {
          aspectCoverage: { total: 23, tested: 5, percentage: 21.74 },
          testCaseCoverage: { total: 5, passed: 5, failed: 0, pass_rate: 100 }
        },
        executionResults: [],
        iterations: 1
      };

      const result = await reporter.saveAllReports(testData, 'timestamped');

      expect(result.json).toMatch(/timestamped-\d{8}-\d{6}\.json/);
      expect(result.markdown).toMatch(/timestamped-\d{8}-\d{6}\.md/);
      expect(result.html).toMatch(/timestamped-\d{8}-\d{6}\.html/);
    });
  });

  describe('formatDuration', () => {
    test('ミリ秒を人間が読める形式に変換できる', () => {
      expect(reporter.formatDuration(500)).toBe('500ms');
      expect(reporter.formatDuration(1500)).toBe('1.50s');
      expect(reporter.formatDuration(65000)).toBe('1m 5s');
      expect(reporter.formatDuration(3665000)).toBe('1h 1m 5s');
    });

    test('0ミリ秒を処理できる', () => {
      expect(reporter.formatDuration(0)).toBe('0ms');
    });
  });

  describe('formatTimestamp', () => {
    test('タイムスタンプを日本語形式でフォーマットできる', () => {
      const timestamp = new Date('2025-10-29T12:34:56');
      const formatted = reporter.formatTimestamp(timestamp);

      expect(formatted).toContain('2025年10月29日');
      expect(formatted).toContain('12:34:56');
    });
  });

  describe('統合テスト', () => {
    test('完全なワークフローを実行できる', async () => {
      const testData = {
        sessionId: 'test-session-001',
        startTime: new Date('2025-10-29T10:00:00'),
        endTime: new Date('2025-10-29T10:15:30'),
        coverage: {
          aspectCoverage: {
            total: 23,
            tested: 18,
            percentage: 78.26,
            tested_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
            untested_aspects: [19, 20, 21, 22, 23]
          },
          testCaseCoverage: {
            total: 25,
            passed: 22,
            failed: 3,
            pass_rate: 88
          }
        },
        executionResults: [
          { test_case_id: 'TC001', aspect_no: 1, success: true, duration_ms: 1200 },
          { test_case_id: 'TC002', aspect_no: 2, success: true, duration_ms: 980 },
          { test_case_id: 'TC003', aspect_no: 3, success: false, duration_ms: 1500, error: 'Element not found' }
        ],
        iterations: 4,
        totalDuration: 930000 // 15分30秒
      };

      // レポート生成
      const reports = await reporter.saveAllReports(testData, 'integration-test');

      // ファイルの存在確認
      expect(fs.existsSync(reports.json)).toBe(true);
      expect(fs.existsSync(reports.markdown)).toBe(true);
      expect(fs.existsSync(reports.html)).toBe(true);

      // JSON内容検証
      const jsonContent = JSON.parse(fs.readFileSync(reports.json, 'utf-8'));
      expect(jsonContent.coverage.aspectCoverage.percentage).toBe(78.26);

      // Markdown内容検証
      const markdownContent = fs.readFileSync(reports.markdown, 'utf-8');
      expect(markdownContent).toContain('78.26%');
      expect(markdownContent).toContain('22/25');

      // HTML内容検証
      const htmlContent = fs.readFileSync(reports.html, 'utf-8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('78.26%');
    });
  });
});
