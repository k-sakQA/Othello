/**
 * スクリーンショット撮影機能のテスト
 */

const fs = require('fs');
const path = require('path');
const ArtifactStorage = require('../src/artifact-storage');

describe('Screenshot Capture', () => {
  let storage;
  const testOutputDir = path.join(__dirname, 'fixtures', 'screenshots-test-output');

  beforeEach(() => {
    storage = new ArtifactStorage({ outputDir: testOutputDir });
    // テスト出力ディレクトリをクリーンアップ
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // クリーンアップ
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('getScreenshotPath', () => {
    test('イテレーションとテストケースIDからパスを生成', () => {
      const screenshotPath = storage.getScreenshotPath(1, 'TC001', 'before-click');

      expect(screenshotPath).toContain('screenshots');
      expect(screenshotPath).toContain('iteration-1');
      expect(screenshotPath).toContain('TC001');
      expect(screenshotPath).toContain('before-click');
      expect(screenshotPath).toMatch(/\.png$/);
    });

    test('ステップ番号からパスを生成', () => {
      const screenshotPath = storage.getScreenshotPath(2, 'TC005', 3);

      expect(screenshotPath).toContain('iteration-2');
      expect(screenshotPath).toContain('TC005');
      expect(screenshotPath).toContain('step-3');
      expect(screenshotPath).toMatch(/\.png$/);
    });

    test('特殊文字を含むラベルをサニタイズ', () => {
      const screenshotPath = storage.getScreenshotPath(1, 'TC001', 'エラー確認/検証');

      expect(screenshotPath).not.toContain('/');
      expect(screenshotPath).toContain('iteration-1');
      expect(screenshotPath).toMatch(/\.png$/);
    });
  });

  describe('saveScreenshotMetadata', () => {
    test('スクリーンショットのメタデータを保存', async () => {
      const metadata = {
        iteration: 1,
        testCaseId: 'TC001',
        stepLabel: 'before-click',
        screenshotPath: 'screenshots/iteration-1/TC001-before-click.png',
        timestamp: new Date().toISOString(),
        description: 'クリック前の画面'
      };

      const savedPath = await storage.saveScreenshotMetadata(1, 'TC001', metadata);

      expect(savedPath).toContain('screenshot-metadata');
      expect(savedPath).toContain('TC001');
      expect(fs.existsSync(savedPath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(savedPath, 'utf-8'));
      expect(content.screenshotPath).toBe(metadata.screenshotPath);
      expect(content.description).toBe(metadata.description);
    });

    test('複数のスクリーンショットメタデータを保存', async () => {
      const metadata1 = {
        iteration: 1,
        testCaseId: 'TC001',
        stepLabel: 'step-1',
        screenshotPath: 'screenshots/iteration-1/TC001-step-1.png',
        timestamp: new Date().toISOString()
      };

      const metadata2 = {
        iteration: 1,
        testCaseId: 'TC001',
        stepLabel: 'step-2',
        screenshotPath: 'screenshots/iteration-1/TC001-step-2.png',
        timestamp: new Date().toISOString()
      };

      const path1 = await storage.saveScreenshotMetadata(1, 'TC001', metadata1);
      const path2 = await storage.saveScreenshotMetadata(1, 'TC001', metadata2);

      expect(fs.existsSync(path1)).toBe(true);
      expect(fs.existsSync(path2)).toBe(true);
      expect(path1).not.toBe(path2);
    });
  });

  describe('ensureScreenshotDir', () => {
    test('スクリーンショットディレクトリを作成', () => {
      const screenshotDir = storage.ensureScreenshotDir(1, 'TC001');

      expect(fs.existsSync(screenshotDir)).toBe(true);
      expect(screenshotDir).toContain('screenshots');
      expect(screenshotDir).toContain('iteration-1');
    });

    test('既存ディレクトリの場合もエラーなし', () => {
      const dir1 = storage.ensureScreenshotDir(1, 'TC001');
      const dir2 = storage.ensureScreenshotDir(1, 'TC001');

      expect(dir1).toBe(dir2);
      expect(fs.existsSync(dir1)).toBe(true);
    });
  });

  describe('getScreenshotSummary', () => {
    test('イテレーションのスクリーンショットサマリーを取得', async () => {
      // メタデータを保存
      await storage.saveScreenshotMetadata(1, 'TC001', {
        iteration: 1,
        testCaseId: 'TC001',
        stepLabel: 'step-1',
        screenshotPath: 'screenshots/iteration-1/TC001-step-1.png',
        timestamp: new Date().toISOString()
      });

      await storage.saveScreenshotMetadata(1, 'TC002', {
        iteration: 1,
        testCaseId: 'TC002',
        stepLabel: 'step-1',
        screenshotPath: 'screenshots/iteration-1/TC002-step-1.png',
        timestamp: new Date().toISOString()
      });

      const summary = storage.getScreenshotSummary(1);

      expect(summary).toBeDefined();
      expect(summary.iteration).toBe(1);
      expect(summary.totalScreenshots).toBeGreaterThanOrEqual(2);
      expect(summary.testCases).toContain('TC001');
      expect(summary.testCases).toContain('TC002');
    });

    test('スクリーンショットがない場合は空のサマリー', () => {
      const summary = storage.getScreenshotSummary(99);

      expect(summary.iteration).toBe(99);
      expect(summary.totalScreenshots).toBe(0);
      expect(summary.testCases).toEqual([]);
    });
  });
});
