/**
 * 成果物保存機能のテスト
 * - Plannerの生成物（テストケース一覧）
 * - Generatorの生成物（テストスクリプト）
 * - スクリーンショット（実行時の様子）
 */

const fs = require('fs');
const path = require('path');
const ArtifactStorage = require('../src/artifact-storage');

describe('ArtifactStorage', () => {
  let storage;
  let testOutputDir;

  beforeEach(() => {
    testOutputDir = path.join(__dirname, 'fixtures', 'artifacts-test-output');
    storage = new ArtifactStorage({
      outputDir: testOutputDir,
      sessionId: 'test-session-123'
    });
  });

  afterEach(() => {
    // テスト用ディレクトリをクリーンアップ
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('初期化できる', () => {
      expect(storage).toBeDefined();
      expect(storage.sessionId).toBe('test-session-123');
    });

    test('デフォルトのoutputDirは./reports', () => {
      const defaultStorage = new ArtifactStorage({ sessionId: 'test' });
      expect(defaultStorage.outputDir).toBe('./reports');
    });
  });

  describe('savePlannerOutput', () => {
    test('Plannerの生成物を保存できる', async () => {
      const plannerOutput = {
        iteration: 1,
        testCases: [
          { test_case_id: 'TC001', aspect_no: 1, description: 'ログインテスト' },
          { test_case_id: 'TC002', aspect_no: 2, description: '検索テスト' }
        ],
        timestamp: new Date().toISOString()
      };

      const filePath = await storage.savePlannerOutput(1, plannerOutput);

      expect(filePath).toBeDefined();
      expect(filePath).toContain('planner-iteration-1');
      expect(filePath).toContain('.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(saved.testCases).toHaveLength(2);
      expect(saved.testCases[0].test_case_id).toBe('TC001');
    });

    test('複数イテレーションを保存できる', async () => {
      const output1 = { iteration: 1, testCases: [{ test_case_id: 'TC001' }] };
      const output2 = { iteration: 2, testCases: [{ test_case_id: 'TC002' }] };

      const path1 = await storage.savePlannerOutput(1, output1);
      const path2 = await storage.savePlannerOutput(2, output2);

      expect(path1).not.toBe(path2);
      expect(fs.existsSync(path1)).toBe(true);
      expect(fs.existsSync(path2)).toBe(true);
    });
  });

  describe('saveGeneratorOutput', () => {
    test('Generatorの生成物を保存できる', async () => {
      const generatorOutput = {
        iteration: 1,
        testCaseId: 'TC001',
        generatedTests: [
          {
            test_case_id: 'TC001',
            steps: [
              { action: 'navigate', url: 'https://example.com' },
              { action: 'fill', selector: '#username', value: 'testuser' }
            ]
          }
        ],
        timestamp: new Date().toISOString()
      };

      const filePath = await storage.saveGeneratorOutput(1, 'TC001', generatorOutput);

      expect(filePath).toBeDefined();
      expect(filePath).toContain('generator-iteration-1-TC001');
      expect(filePath).toContain('.json');
      expect(fs.existsSync(filePath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(saved.generatedTests[0].steps).toHaveLength(2);
    });
  });

  describe('saveScreenshot', () => {
    test('スクリーンショットのパスを生成できる', () => {
      const screenshotPath = storage.getScreenshotPath(1, 'TC001', 'step-1');

      expect(screenshotPath).toContain('screenshots');
      expect(screenshotPath).toContain('iteration-1');
      expect(screenshotPath).toContain('TC001');
      expect(screenshotPath).toContain('step-1');
      expect(screenshotPath).toContain('.png');
    });

    test('スクリーンショットディレクトリが存在しない場合は作成される', () => {
      const baseDir = storage.ensureScreenshotDir();

      expect(fs.existsSync(baseDir)).toBe(true);
      expect(baseDir).toContain('screenshots');
      expect(baseDir).toContain('test-session-123');
    });
  });

  describe('getSummary', () => {
    test('保存された成果物のサマリーを取得できる', async () => {
      // いくつか保存
      await storage.savePlannerOutput(1, { iteration: 1, testCases: [] });
      await storage.saveGeneratorOutput(1, 'TC001', { iteration: 1, generatedTests: [] });
      await storage.saveGeneratorOutput(1, 'TC002', { iteration: 1, generatedTests: [] });

      const summary = storage.getSummary();

      expect(summary).toBeDefined();
      expect(summary.sessionId).toBe('test-session-123');
      expect(summary.plannerOutputs).toHaveLength(1);
      expect(summary.generatorOutputs).toHaveLength(2);
      expect(summary.outputDir).toBe(testOutputDir);
    });

    test('何も保存されていない場合は空のサマリー', () => {
      const summary = storage.getSummary();

      expect(summary.plannerOutputs).toHaveLength(0);
      expect(summary.generatorOutputs).toHaveLength(0);
      expect(summary.screenshots).toHaveLength(0);
    });
  });

  describe('printSummary', () => {
    test('サマリーを表示できる', async () => {
      await storage.savePlannerOutput(1, { iteration: 1, testCases: [{ test_case_id: 'TC001' }] });
      await storage.saveGeneratorOutput(1, 'TC001', { iteration: 1, generatedTests: [] });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      storage.printSummary();

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(output).toContain('Planner生成物');
      expect(output).toContain('Generator生成物');
      expect(output).toContain('planner-iteration-1');

      consoleSpy.mockRestore();
    });
  });

  describe('統合テスト', () => {
    test('完全なワークフローで全成果物を保存できる', async () => {
      // Iteration 1
      const plannerOutput1 = {
        iteration: 1,
        testCases: [
          { test_case_id: 'TC001', aspect_no: 1, description: 'テスト1' },
          { test_case_id: 'TC002', aspect_no: 2, description: 'テスト2' }
        ]
      };
      await storage.savePlannerOutput(1, plannerOutput1);

      const generatorOutput1 = {
        iteration: 1,
        testCaseId: 'TC001',
        generatedTests: [{ test_case_id: 'TC001', steps: [] }]
      };
      await storage.saveGeneratorOutput(1, 'TC001', generatorOutput1);

      const generatorOutput2 = {
        iteration: 1,
        testCaseId: 'TC002',
        generatedTests: [{ test_case_id: 'TC002', steps: [] }]
      };
      await storage.saveGeneratorOutput(1, 'TC002', generatorOutput2);

      // スクリーンショットパス記録
      const screenshot1 = storage.getScreenshotPath(1, 'TC001', 'before');
      const screenshot2 = storage.getScreenshotPath(1, 'TC001', 'after');
      storage.recordScreenshot(screenshot1);
      storage.recordScreenshot(screenshot2);

      // Iteration 2
      const plannerOutput2 = {
        iteration: 2,
        testCases: [{ test_case_id: 'TC003', aspect_no: 3 }]
      };
      await storage.savePlannerOutput(2, plannerOutput2);

      const summary = storage.getSummary();

      expect(summary.plannerOutputs).toHaveLength(2);
      expect(summary.generatorOutputs).toHaveLength(2);
      expect(summary.screenshots).toHaveLength(2);

      // 全ファイルが存在することを確認
      summary.plannerOutputs.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
      summary.generatorOutputs.forEach(file => {
        expect(fs.existsSync(file)).toBe(true);
      });
    });
  });
});
