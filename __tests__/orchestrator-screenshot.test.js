/**
 * Orchestrator スクリーンショット統合テスト
 */

const Orchestrator = require('../src/orchestrator');
const fs = require('fs');
const path = require('path');

describe('Orchestrator - Screenshot Integration', () => {
  let orchestrator;
  const testOutputDir = path.join(__dirname, 'fixtures', 'screenshot-integration-output');

  beforeEach(() => {
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

  test('エラー時にスクリーンショットを撮影', async () => {
    const config = {
      url: 'https://example.com',
      maxIterations: 1,
      outputDir: testOutputDir,
      screenshot_on_error: true, // エラー時スクリーンショット有効
      browser: 'chromium',
      headless: true
    };

    orchestrator = new Orchestrator(config);
    
    // artifactStorageが初期化されていることを確認
    expect(orchestrator.artifactStorage).toBeDefined();
    expect(orchestrator.artifactStorage.getScreenshotPath).toBeDefined();
  });

  test('スクリーンショットパスが正しく生成される', () => {
    const config = {
      url: 'https://example.com',
      outputDir: testOutputDir
    };

    orchestrator = new Orchestrator(config);
    
    const screenshotPath = orchestrator.artifactStorage.getScreenshotPath(1, 'TC001', 'before-action');
    
    expect(screenshotPath).toContain('screenshots');
    expect(screenshotPath).toContain('iteration-1');
    expect(screenshotPath).toContain('TC001');
    expect(screenshotPath).toMatch(/\.png$/);
  });

  test('スクリーンショットサマリーが終了時に表示される', async () => {
    const config = {
      url: 'https://example.com',
      maxIterations: 1,
      outputDir: testOutputDir
    };

    orchestrator = new Orchestrator(config);
    orchestrator.iteration = 1;

    // スクリーンショットメタデータを保存
    await orchestrator.artifactStorage.saveScreenshotMetadata(1, 'TC001', {
      iteration: 1,
      testCaseId: 'TC001',
      stepLabel: 'step-1',
      screenshotPath: 'screenshots/iteration-1/TC001-step-1.png',
      timestamp: new Date().toISOString()
    });

    const summary = orchestrator.artifactStorage.getScreenshotSummary(1);
    
    expect(summary.iteration).toBe(1);
    expect(summary.totalScreenshots).toBeGreaterThan(0);
    expect(summary.testCases).toContain('TC001');
  });
});
