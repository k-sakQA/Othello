/**
 * @file OthelloExecutor Screenshot Capture Tests
 * @description Executorのスクリーンショット保存機能のテスト
 */

const path = require('path');
const fs = require('fs').promises;

describe('OthelloExecutor Screenshot Capture', () => {
  let executor;
  let mockPlaywrightMCP;
  let mockArtifactStorage;
  let testCase;

  beforeEach(() => {
    // Mock PlaywrightMCP
    mockPlaywrightMCP = {
      setupPage: jest.fn().mockResolvedValue({ success: true }),
      navigate: jest.fn().mockResolvedValue({ success: true }),
      snapshot: jest.fn().mockResolvedValue('snapshot-content'),
      screenshot: jest.fn().mockResolvedValue({ success: true }),
      closePage: jest.fn().mockResolvedValue({ success: true }),
      executeInstruction: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock ArtifactStorage
    mockArtifactStorage = {
      getScreenshotPath: jest.fn((iteration, testCaseId, stepName) => 
        `reports/screenshots/iteration-${iteration}/${testCaseId}/${stepName}.png`
      ),
      saveScreenshotMetadata: jest.fn().mockResolvedValue(undefined),
      ensureScreenshotDir: jest.fn().mockResolvedValue(undefined)
    };

    // Test case with instructions
    testCase = {
      test_case_id: 'TC001',
      instructions: [
        {
          type: 'navigate',
          url: 'https://example.com',
          intent: 'ページを開く'
        },
        {
          type: 'click',
          element: 'ボタン',
          ref: 'button-1',
          intent: 'ボタンをクリック'
        }
      ]
    };

    // Import after mocks
    const OthelloExecutor = require('../src/agents/othello-executor');
    executor = new OthelloExecutor({
      playwrightMCP: mockPlaywrightMCP,
      artifactStorage: mockArtifactStorage,
      config: { iteration: 1 }
    });
  });

  describe('Constructor', () => {
    test('artifactStorageを受け取り保存する', () => {
      expect(executor.artifactStorage).toBe(mockArtifactStorage);
    });

    test('iterationをconfigから取得する', () => {
      expect(executor.config.iteration).toBe(1);
    });

    test('artifactStorageなしでも動作する（後方互換性）', () => {
      const OthelloExecutor = require('../src/agents/othello-executor');
      const executorWithoutStorage = new OthelloExecutor({
        playwrightMCP: mockPlaywrightMCP
      });
      expect(executorWithoutStorage.artifactStorage).toBeNull();
    });
  });

  describe('Screenshot on Error', () => {
    test('命令失敗時にスクリーンショットを撮影して保存する', async () => {
      // 最初の命令は成功、2番目の命令（click）を失敗させる
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockRejectedValueOnce(new Error('Element not found')); // click失敗

      const result = await executor.execute(testCase);

      expect(result.success).toBe(false);
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledTimes(1);
      expect(mockArtifactStorage.ensureScreenshotDir).toHaveBeenCalledWith(1, 'TC001');
      expect(mockArtifactStorage.getScreenshotPath).toHaveBeenCalledWith(
        1, 
        'TC001', 
        expect.stringContaining('error-instruction-1-') // 2番目の命令なのでindex=1
      );
      expect(mockArtifactStorage.saveScreenshotMetadata).toHaveBeenCalledWith(
        1,
        'TC001',
        expect.objectContaining({
          type: 'error',
          instruction_index: 1, // 2番目の命令
          instruction_type: 'click',
          error_message: 'Element not found',
          screenshot_path: expect.stringContaining('.png')
        })
      );
    });

    test('スクリーンショットファイル名にタイムスタンプとインデックスを含める', async () => {
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockRejectedValueOnce(new Error('Failed')); // click失敗

      await executor.execute(testCase);

      expect(mockArtifactStorage.getScreenshotPath).toHaveBeenCalledWith(
        1,
        'TC001',
        expect.stringMatching(/error-instruction-1-\d+/) // 2番目の命令なのでindex=1
      );
    });

    test('artifactStorageがない場合でもエラーにならない', async () => {
      const OthelloExecutor = require('../src/agents/othello-executor');
      const executorWithoutStorage = new OthelloExecutor({
        playwrightMCP: mockPlaywrightMCP
      });

      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockRejectedValueOnce(new Error('Failed')); // click失敗

      const result = await executorWithoutStorage.execute(testCase);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // スクリーンショットは撮影されない（artifactStorageがないので）
    });

    test('複数の命令が失敗した場合、最初のエラーのみスクリーンショットを撮影', async () => {
      testCase.instructions.push({
        type: 'fill',
        element: 'テキストボックス',
        ref: 'input-1',
        text: 'test',
        intent: 'テキスト入力'
      });

      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockRejectedValueOnce(new Error('Click failed')); // click失敗（ここで停止）

      await executor.execute(testCase);

      // 1回のみスクリーンショット撮影（最初のエラーでbreak）
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledTimes(1);
      expect(mockArtifactStorage.saveScreenshotMetadata).toHaveBeenCalledTimes(1);
    });

    test('スクリーンショット撮影が失敗してもテスト実行結果は返す', async () => {
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockRejectedValueOnce(new Error('Click failed')); // click失敗
      mockPlaywrightMCP.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      const result = await executor.execute(testCase);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Click failed');
      // スクリーンショットのエラーは無視される
    });

    test('メタデータにスクリーンショットパスを含める', async () => {
      const expectedPath = 'reports/screenshots/iteration-1/TC001/error-instruction-1-12345.png';
      mockArtifactStorage.getScreenshotPath.mockReturnValue(expectedPath);
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockRejectedValueOnce(new Error('Failed')); // click失敗

      await executor.execute(testCase);

      expect(mockArtifactStorage.saveScreenshotMetadata).toHaveBeenCalledWith(
        1,
        'TC001',
        expect.objectContaining({
          screenshot_path: expectedPath
        })
      );
    });
  });

  describe('Success Case - No Screenshot', () => {
    test('すべての命令が成功した場合、スクリーンショットを撮影しない', async () => {
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockResolvedValueOnce({ success: true }); // click成功

      const result = await executor.execute(testCase);

      expect(result.success).toBe(true);
      expect(mockPlaywrightMCP.screenshot).not.toHaveBeenCalled();
      expect(mockArtifactStorage.getScreenshotPath).not.toHaveBeenCalled();
      expect(mockArtifactStorage.saveScreenshotMetadata).not.toHaveBeenCalled();
    });
  });
});
