/**
 * @file 統合テスト: より深いテスト生成機能
 * @description Orchestrator.run()での deeper/complete オプションの統合テスト
 */

const Orchestrator = require('../src/orchestrator');

describe('統合テスト - より深いテスト生成', () => {
  let orchestrator;
  let mockPlanner, mockGenerator, mockExecutor, mockAnalyzer;

  beforeEach(() => {
    // Orchestrator直接初期化
    orchestrator = new Orchestrator({
      url: 'https://example.com',
      interactive: true,
      maxIterations: 5,
      coverageTarget: 80,
      autoHeal: false,
      testAspectsCSV: './config/test-ViewpointList-simple.csv'
    });

    // モックエージェント
    mockPlanner = {
      loadTestAspects: jest.fn().mockResolvedValue([
        { aspect_no: 1, test_type: 'Test Type 1' },
        { aspect_no: 2, test_type: 'Test Type 2' }
      ]),
      generateTestPlan: jest.fn().mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC001',
            aspect_no: 1,
            title: 'Test 1',
            steps: ['Step 1'],
            expected_results: ['Result 1']
          }
        ]
      }),
      generateDeeperTests: jest.fn().mockResolvedValue({
        testCases: [
          {
            test_case_id: 'DEEPER-001',
            aspect_no: 9001,
            title: 'Edge Case Test',
            test_type: 'エッジケース',
            steps: ['Edge step 1'],
            expected_results: ['Edge result 1']
          }
        ],
        metadata: {
          type: 'deeper_tests',
          generated_at: new Date().toISOString()
        }
      })
    };

    mockGenerator = {
      generate: jest.fn().mockResolvedValue([
        {
          test_case_id: 'TC001',
          aspect_no: 1,
          instructions: [
            { type: 'navigate', url: 'https://example.com' }
          ]
        }
      ])
    };

    mockExecutor = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        duration_ms: 100
      })
    };

    mockAnalyzer = {
      analyze: jest.fn().mockResolvedValue({
        percentage: 100,
        covered: 2,
        total: 2,
        covered_aspects: [1, 2],
        uncovered_aspects: []
      }),
      generateRecommendations: jest.fn()
    };

    const mockReporter = {
      saveAllReports: jest.fn().mockResolvedValue({
        json: 'report.json',
        markdown: 'report.md',
        html: 'report.html'
      })
    };

    orchestrator.planner = mockPlanner;
    orchestrator.generator = mockGenerator;
    orchestrator.executor = mockExecutor;
    orchestrator.analyzer = mockAnalyzer;
    orchestrator.reporter = mockReporter;
  });

  describe('deeper オプションの統合', () => {
    it('100%カバー時に deeper オプションが表示され、選択すると AI テストが実行される', async () => {
      // カバレッジを70%に設定（目標80%未満にして対話モードに進む）
      mockAnalyzer.analyze.mockResolvedValue({
        percentage: 70,
        covered: 1,
        total: 2,
        covered_aspects: [1],
        uncovered_aspects: [2]
      });

      // 最初のイテレーション後に100%達成と見せかける推奨を返す
      let callCount = 0;
      mockAnalyzer.generateRecommendations.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // 最初の呼び出し: deeperとcompleteオプションを返す
          return [
            {
              type: 'deeper',
              priority: 'Medium',
              title: 'より深いテスト（エッジケース、組み合わせテスト）を生成',
              reason: '全観点がカバー済み。さらなるテスト品質向上のため',
              requiresAI: true
            },
            {
              type: 'complete',
              priority: 'Low',
              title: 'テスト完了（終了）',
              reason: '全観点がカバー済み。テストを完了します'
            }
          ];
        }
        return [];
      });

      // ユーザー入力をモック: 最初に deeper (1) を選択、次にExit (0)
      let promptCount = 0;
      orchestrator.promptUser = jest.fn().mockImplementation(async () => {
        promptCount++;
        if (promptCount === 1) return '1'; // deeper選択
        return '0'; // 終了
      });

      // Orchestrator実行
      await orchestrator.run();

      // generateDeeperTestsが呼ばれたことを確認
      expect(mockPlanner.generateDeeperTests).toHaveBeenCalledWith({
        history: expect.any(Array),
        url: 'https://example.com'
      });

      // 履歴にdeeperTestフラグがあることを確認
      const deeperIteration = orchestrator.history.find(h => h.deeperTest === true);
      expect(deeperIteration).toBeDefined();
      expect(deeperIteration.deeperTest).toBe(true);
    });

    it('complete オプション選択でテストが終了する', async () => {
      mockAnalyzer.generateRecommendations.mockResolvedValue([
        {
          type: 'deeper',
          priority: 'Medium',
          title: 'より深いテスト（エッジケース、組み合わせテスト）を生成',
          requiresAI: true
        },
        {
          type: 'complete',
          priority: 'Low',
          title: 'テスト完了（終了）'
        }
      ]);

      // ユーザー入力: complete (2) を選択
      orchestrator.promptUser = jest.fn().mockResolvedValue('2');

      await orchestrator.run();

      // complete選択後、ループが終了することを確認
      expect(orchestrator.history.length).toBeGreaterThanOrEqual(1);
      
      // generateDeeperTestsは呼ばれない
      expect(mockPlanner.generateDeeperTests).not.toHaveBeenCalled();
    });
  });

  describe('handleUserSelection の deeper/complete 対応', () => {
    it('deeper 推奨を選択すると type="deeper" を返す', async () => {
      const recommendations = [
        {
          type: 'deeper',
          title: 'より深いテストを生成',
          requiresAI: true
        }
      ];

      const result = await orchestrator.handleUserSelection('1', recommendations);

      expect(result.type).toBe('deeper');
      expect(result.recommendation.type).toBe('deeper');
      expect(result.recommendation.requiresAI).toBe(true);
    });

    it('complete 推奨を選択すると type="complete" を返す', async () => {
      const recommendations = [
        {
          type: 'deeper',
          title: 'より深いテストを生成'
        },
        {
          type: 'complete',
          title: 'テスト完了'
        }
      ];

      const result = await orchestrator.handleUserSelection('2', recommendations);

      expect(result.type).toBe('complete');
      expect(result.recommendation.type).toBe('complete');
    });

    it('通常の推奨テストは type="specific" を返す', async () => {
      const recommendations = [
        {
          type: 'uncovered',
          aspectId: 3,
          title: '観点3のテスト'
        }
      ];

      const result = await orchestrator.handleUserSelection('1', recommendations);

      expect(result.type).toBe('specific');
      expect(result.recommendation.type).toBe('uncovered');
    });
  });
});
