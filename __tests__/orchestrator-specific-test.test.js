/**
 * Orchestrator - 特定テスト実行機能のテスト (TDD)
 */

const Orchestrator = require('../src/orchestrator');

describe('Orchestrator - 特定テスト実行', () => {
  let orchestrator;
  let mockPlanner;
  let mockGenerator;
  let mockExecutor;
  let mockHealer;
  let mockAnalyzer;
  let mockReporter;
  let mockPlaywrightMCP;

  beforeEach(() => {
    // モックエージェントの作成
    mockPlanner = {
      generateTestPlan: jest.fn()
    };
    
    mockGenerator = {
      generate: jest.fn()
    };
    
    mockExecutor = {
      execute: jest.fn()
    };
    
    mockHealer = {
      heal: jest.fn()
    };
    
    mockAnalyzer = {
      analyze: jest.fn(),
      generateRecommendations: jest.fn()
    };
    
    mockReporter = {
      saveAllReports: jest.fn()
    };
    
    mockPlaywrightMCP = {
      setupPage: jest.fn(),
      snapshot: jest.fn(),
      closePage: jest.fn()
    };

    orchestrator = new Orchestrator({
      url: 'https://example.com',
      maxIterations: 5,
      coverageTarget: 80,
      interactive: true
    });

    // モックをインジェクト
    orchestrator.planner = mockPlanner;
    orchestrator.generator = mockGenerator;
    orchestrator.executor = mockExecutor;
    orchestrator.healer = mockHealer;
    orchestrator.analyzer = mockAnalyzer;
    orchestrator.reporter = mockReporter;
    orchestrator.playwrightMCP = mockPlaywrightMCP;
  });

  describe('executeSpecificTest', () => {
    test('選択された推奨テストを全エージェント経由で実行できる', async () => {
      const recommendation = {
        priority: 'High',
        title: '観点3のテスト',
        reason: '未カバー観点: 観点3',
        aspectId: 3
      };

      // Plannerのモック設定
      mockPlanner.generateTestPlan.mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC001',
            aspect_no: 3,
            description: '観点3のテスト'
          }
        ]
      });

      // Generatorのモック設定
      mockGenerator.generate.mockResolvedValue([
        {
          test_case_id: 'TC001',
          aspect_no: 3,
          instructions: [
            { type: 'navigate', url: 'https://example.com' }
          ]
        }
      ]);

      // Executorのモック設定
      mockExecutor.execute.mockResolvedValue({
        success: true,
        duration_ms: 1000
      });

      // Analyzerのモック設定
      mockAnalyzer.analyze.mockResolvedValue({
        percentage: 30,
        covered: 3,
        total: 10
      });

      // PlaywrightMCPのモック設定
      mockPlaywrightMCP.snapshot.mockResolvedValue({
        text: 'Page snapshot'
      });

      // executeSpecificTestメソッドが存在することを確認
      expect(typeof orchestrator.executeSpecificTest).toBe('function');

      // 実行
      const result = await orchestrator.executeSpecificTest(recommendation);

      // 検証: Plannerが呼ばれた（特定のaspectIdで）
      expect(mockPlanner.generateTestPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          targetAspectId: 3
        })
      );

      // 検証: Generatorが呼ばれた
      expect(mockGenerator.generate).toHaveBeenCalled();

      // 検証: Executorが呼ばれた
      expect(mockExecutor.execute).toHaveBeenCalled();

      // 検証: Analyzerが呼ばれた
      expect(mockAnalyzer.analyze).toHaveBeenCalled();

      // 検証: 結果が返される
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.testCases).toBeDefined();
      expect(result.executionResults).toBeDefined();
    });

    test('実行失敗時にHealerが呼ばれる', async () => {
      const recommendation = {
        priority: 'High',
        title: '観点3のテスト',
        reason: '未カバー観点: 観点3',
        aspectId: 3
      };

      mockPlanner.generateTestPlan.mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC001',
            aspect_no: 3,
            description: '観点3のテスト'
          }
        ]
      });

      mockGenerator.generate.mockResolvedValue([
        {
          test_case_id: 'TC001',
          aspect_no: 3,
          instructions: [
            { type: 'click', selector: '#button' }
          ]
        }
      ]);

      // Executorが失敗を返す（1回目: 初回実行）
      mockExecutor.execute.mockResolvedValueOnce({
        success: false,
        error: {
          message: 'Element not found',
          instruction_index: 0
        }
      });

      // 2回目: Quick fix も失敗
      mockExecutor.execute.mockResolvedValueOnce({
        success: false,
        error: {
          message: 'Element not found',
          instruction_index: 0
        }
      });

      // 3回目: Healer修復後の実行は成功
      mockExecutor.execute.mockResolvedValueOnce({
        success: true,
        duration_ms: 1200
      });

      mockHealer.heal.mockResolvedValue({
        success: true,
        fixed_instructions: [
          { type: 'wait', duration: 500 },
          { type: 'click', selector: '#button' }
        ],
        root_cause: 'Element not ready'
      });

      mockAnalyzer.analyze.mockResolvedValue({
        percentage: 30,
        covered: 3,
        total: 10
      });

      mockPlaywrightMCP.snapshot.mockResolvedValue({
        text: 'Page snapshot'
      });

      // autoHealを有効化
      orchestrator.config.autoHeal = true;

      const result = await orchestrator.executeSpecificTest(recommendation);

      // Healerが呼ばれたことを確認
      expect(mockHealer.heal).toHaveBeenCalled();

      // 最終的に成功
      expect(result.success).toBe(true);
    });

    test('履歴に実行結果が追加される', async () => {
      const recommendation = {
        priority: 'High',
        title: '観点3のテスト',
        reason: '未カバー観点: 観点3',
        aspectId: 3
      };

      mockPlanner.generateTestPlan.mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC001',
            aspect_no: 3,
            description: '観点3のテスト'
          }
        ]
      });

      mockGenerator.generate.mockResolvedValue([
        {
          test_case_id: 'TC001',
          aspect_no: 3,
          instructions: []
        }
      ]);

      mockExecutor.execute.mockResolvedValue({
        success: true,
        duration_ms: 1000
      });

      mockAnalyzer.analyze.mockResolvedValue({
        percentage: 30,
        covered: 3,
        total: 10
      });

      mockPlaywrightMCP.snapshot.mockResolvedValue({
        text: 'Page snapshot'
      });

      const initialHistoryLength = orchestrator.history.length;

      await orchestrator.executeSpecificTest(recommendation);

      // 履歴が1件増えていることを確認
      expect(orchestrator.history.length).toBe(initialHistoryLength + 1);

      // 最新の履歴エントリを確認
      const latestHistory = orchestrator.history[orchestrator.history.length - 1];
      expect(latestHistory.testCases).toBeDefined();
      expect(latestHistory.executionResults).toBeDefined();
      expect(latestHistory.coverage).toBeDefined();
    });
  });
});
