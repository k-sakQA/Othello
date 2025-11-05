/**
 * Orchestrator - より深いテスト実行のテスト (TDD)
 */

const Orchestrator = require('../src/orchestrator');

describe('Orchestrator - より深いテスト実行', () => {
  let orchestrator;
  let mockPlanner;
  let mockGenerator;
  let mockExecutor;
  let mockAnalyzer;
  let mockPlaywrightMCP;

  beforeEach(() => {
    mockPlanner = {
      generateTestPlan: jest.fn(),
      generateDeeperTests: jest.fn()
    };
    
    mockGenerator = {
      generate: jest.fn()
    };
    
    mockExecutor = {
      execute: jest.fn()
    };
    
    mockAnalyzer = {
      analyze: jest.fn(),
      generateRecommendations: jest.fn()
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

    orchestrator.planner = mockPlanner;
    orchestrator.generator = mockGenerator;
    orchestrator.executor = mockExecutor;
    orchestrator.analyzer = mockAnalyzer;
    orchestrator.playwrightMCP = mockPlaywrightMCP;
  });

  describe('executeDeeperTests', () => {
    test('より深いテストを実行できる', async () => {
      const recommendation = {
        type: 'deeper',
        priority: 'Medium',
        title: 'より深いテスト（エッジケース、組み合わせテスト）を生成',
        reason: '全観点がカバー済み。さらなるテスト品質向上のため',
        requiresAI: true
      };

      // 現在の履歴を設定
      orchestrator.history = [
        {
          iteration: 1,
          testCases: [
            { test_case_id: 'TC001', aspect_no: 1 }
          ],
          executionResults: [
            { test_case_id: 'TC001', aspect_no: 1, success: true }
          ]
        }
      ];

      // Plannerのモック設定（AI生成）
      mockPlanner.generateDeeperTests.mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC_DEEPER_001',
            description: 'エッジケーステスト: 境界値'
          },
          {
            test_case_id: 'TC_DEEPER_002',
            description: '組み合わせテスト: 複数入力'
          }
        ]
      });

      mockGenerator.generate.mockResolvedValue([
        {
          test_case_id: 'TC_DEEPER_001',
          instructions: []
        },
        {
          test_case_id: 'TC_DEEPER_002',
          instructions: []
        }
      ]);

      mockExecutor.execute.mockResolvedValue({
        success: true,
        duration_ms: 1000
      });

      mockAnalyzer.analyze.mockResolvedValue({
        percentage: 100,
        covered: 10,
        total: 10
      });

      mockPlaywrightMCP.snapshot.mockResolvedValue({
        text: 'Page snapshot'
      });

      // executeDeeperTestsメソッドが存在することを確認
      expect(typeof orchestrator.executeDeeperTests).toBe('function');

      // 実行
      const result = await orchestrator.executeDeeperTests(recommendation);

      // Plannerのより深いテスト生成メソッドが呼ばれた
      expect(mockPlanner.generateDeeperTests).toHaveBeenCalled();

      // 実行履歴が渡された
      expect(mockPlanner.generateDeeperTests).toHaveBeenCalledWith(
        expect.objectContaining({
          history: expect.any(Array),
          url: 'https://example.com'
        })
      );

      // Generatorが呼ばれた
      expect(mockGenerator.generate).toHaveBeenCalled();

      // Executorが呼ばれた
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);

      // 結果が返される
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('履歴にdeeperTestフラグが追加される', async () => {
      const recommendation = {
        type: 'deeper',
        priority: 'Medium',
        title: 'より深いテスト',
        requiresAI: true
      };

      orchestrator.history = [];

      mockPlanner.generateDeeperTests.mockResolvedValue({
        testCases: [
          { test_case_id: 'TC_DEEPER_001' }
        ]
      });

      mockGenerator.generate.mockResolvedValue([
        { test_case_id: 'TC_DEEPER_001', instructions: [] }
      ]);

      mockExecutor.execute.mockResolvedValue({
        success: true,
        duration_ms: 1000
      });

      mockAnalyzer.analyze.mockResolvedValue({
        percentage: 100,
        covered: 10,
        total: 10
      });

      mockPlaywrightMCP.snapshot.mockResolvedValue({
        text: 'snapshot'
      });

      await orchestrator.executeDeeperTests(recommendation);

      // 履歴にdeeperTestフラグがある
      expect(orchestrator.history.length).toBe(1);
      expect(orchestrator.history[0].deeperTest).toBe(true);
    });
  });

  describe('handleCompleteOption', () => {
    test('完了オプションを処理できる', async () => {
      const recommendation = {
        type: 'complete',
        priority: 'Low',
        title: 'テスト完了（終了）'
      };

      expect(typeof orchestrator.handleCompleteOption).toBe('function');

      const result = await orchestrator.handleCompleteOption(recommendation);

      expect(result).toEqual({ shouldExit: true });
    });
  });
});
