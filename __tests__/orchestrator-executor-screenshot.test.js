/**
 * @file Orchestrator-Executor Screenshot Integration Tests
 * @description OrchestratorからExecutorへのartifactStorage統合テスト
 */

const path = require('path');
const Orchestrator = require('../src/orchestrator');
const OthelloExecutor = require('../src/agents/othello-executor');

describe('Orchestrator-Executor Screenshot Integration', () => {
  let orchestrator;
  let mockPlanner;
  let mockGenerator;
  let mockExecutor;
  let mockPlaywrightMCP;

  beforeEach(() => {
    // Mock PlaywrightMCP
    mockPlaywrightMCP = {
      setupPage: jest.fn().mockResolvedValue({ success: true }),
      snapshot: jest.fn().mockResolvedValue('snapshot-content'),
      screenshot: jest.fn().mockResolvedValue({ success: true }),
      closePage: jest.fn().mockResolvedValue({ success: true }),
      executeInstruction: jest.fn().mockResolvedValue({ success: true })
    };

    // Orchestrator初期化
    const config = {
      url: 'https://example.com',
      maxIterations: 1,
      outputDir: path.join(__dirname, 'test-output'),
      testAspectsCSV: null
    };

    orchestrator = new Orchestrator(config);
    orchestrator.playwrightMCP = mockPlaywrightMCP;

    // Mock agents
    mockPlanner = {
      generateTestPlan: jest.fn().mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC001',
            test_aspect: 'バリデーション',
            instructions: [
              { type: 'navigate', url: 'https://example.com', intent: 'ページを開く' }
            ]
          }
        ]
      })
    };

    mockGenerator = {
      generate: jest.fn().mockResolvedValue([
        {
          test_case_id: 'TC001',
          instructions: [
            { type: 'navigate', url: 'https://example.com', intent: 'ページを開く' },
            { type: 'click', element: 'ボタン', ref: 'button-1', intent: 'クリック' }
          ]
        }
      ]),
      generateTestInstructions: jest.fn().mockResolvedValue({
        test_case: {
          test_case_id: 'TC001',
          instructions: [
            { type: 'navigate', url: 'https://example.com', intent: 'ページを開く' },
            { type: 'click', element: 'ボタン', ref: 'button-1', intent: 'クリック' }
          ]
        }
      })
    };

    // 実際のExecutorを使用（artifactStorageを受け取れることを確認）
    mockExecutor = new OthelloExecutor({
      playwrightMCP: mockPlaywrightMCP,
      artifactStorage: orchestrator.artifactStorage,
      config: { iteration: 1 }
    });

    orchestrator.planner = mockPlanner;
    orchestrator.generator = mockGenerator;
    orchestrator.executor = mockExecutor;
    orchestrator.analyzer = {
      analyze: jest.fn().mockResolvedValue({
        coverage: 100,
        totalAspects: 1,
        testedAspects: 1
      }),
      analyzeTestAspects: jest.fn().mockResolvedValue({
        coverage: 100,
        totalAspects: 1,
        testedAspects: 1
      })
    };
    orchestrator.reporter = {
      generateReport: jest.fn().mockResolvedValue({ reportPath: 'report.html' }),
      saveAllReports: jest.fn().mockResolvedValue({ reportPath: 'report.html' }),
      printSummary: jest.fn()
    };
  });

  describe('artifactStorage integration', () => {
    test('OrchestratorのartifactStorageがExecutorに渡される', () => {
      expect(mockExecutor.artifactStorage).toBe(orchestrator.artifactStorage);
    });

    test('ExecutorがartifactStorageを持っている', () => {
      expect(mockExecutor.artifactStorage).toBeDefined();
      expect(mockExecutor.artifactStorage.getScreenshotPath).toBeDefined();
      expect(mockExecutor.artifactStorage.saveScreenshotMetadata).toBeDefined();
      expect(mockExecutor.artifactStorage.ensureScreenshotDir).toBeDefined();
    });

    test('runIteration時にiterationがExecutorに設定される', async () => {
      // Spyでexecuteメソッドをモニタリング
      const executeSpy = jest.spyOn(mockExecutor, 'execute');
      executeSpy.mockResolvedValue({
        test_case_id: 'TC001',
        success: true,
        executed_instructions: 1,
        failed_instructions: 0,
        instructions_results: [{ success: true }]
      });

      await orchestrator.run();

      expect(mockExecutor.config.iteration).toBe(1);
      expect(executeSpy).toHaveBeenCalled();
    });
  });

  describe('Screenshot capture on test failure', () => {
    test('テスト失敗時にスクリーンショットが撮影される', async () => {
      // 2番目の命令で失敗させる
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true }) // navigate成功
        .mockRejectedValueOnce(new Error('Click failed')); // click失敗

      const testCase = {
        test_case_id: 'TC001',
        instructions: [
          { type: 'navigate', url: 'https://example.com', intent: 'ページを開く' },
          { type: 'click', element: 'ボタン', ref: 'button-1', intent: 'クリック' }
        ]
      };

      const result = await mockExecutor.execute(testCase);

      expect(result.success).toBe(false);
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledTimes(1);
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('iteration-1')
      );
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('TC001')
      );
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('error-instruction-1-')
      );
    });

    test('スクリーンショットパスがiteration別に分かれる', async () => {
      // iteration 2でテスト
      mockExecutor.config.iteration = 2;

      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'));

      const testCase = {
        test_case_id: 'TC002',
        instructions: [
          { type: 'navigate', url: 'https://example.com', intent: 'ページを開く' },
          { type: 'fill', element: 'input', ref: 'input-1', text: 'test', intent: '入力' }
        ]
      };

      await mockExecutor.execute(testCase);

      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('iteration-2')
      );
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('TC002')
      );
      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('error-instruction-1-')
      );
    });

    test('異なるテストケースIDで別フォルダに保存される', async () => {
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'));

      const testCase1 = {
        test_case_id: 'TC001',
        instructions: [
          { type: 'navigate', url: 'https://example.com', intent: 'ページを開く' },
          { type: 'click', element: 'ボタン', ref: 'button-1', intent: 'クリック' }
        ]
      };

      await mockExecutor.execute(testCase1);

      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('TC001')
      );

      // 2つ目のテストケース
      mockPlaywrightMCP.screenshot.mockClear();
      mockPlaywrightMCP.executeInstruction
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'));

      const testCase2 = {
        test_case_id: 'TC002',
        instructions: [
          { type: 'navigate', url: 'https://example.com', intent: 'ページを開く' },
          { type: 'fill', element: 'input', ref: 'input-1', text: 'test', intent: '入力' }
        ]
      };

      await mockExecutor.execute(testCase2);

      expect(mockPlaywrightMCP.screenshot).toHaveBeenCalledWith(
        expect.stringContaining('TC002')
      );
    });
  });
});
