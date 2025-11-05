/**
 * Orchestrator 対話モード - イテレーション制限のテスト
 * 
 * iterations=1でも対話モードで「より深いテスト」を選択可能にするテスト
 */

const Orchestrator = require('../src/orchestrator');

describe('Orchestrator - 対話モードのイテレーション制限', () => {
  let orchestrator;
  let mockPlanner, mockGenerator, mockExecutor, mockAnalyzer, mockReporter, mockPlaywrightMCP;

  beforeEach(() => {
    // モックエージェントの作成
    mockPlanner = {
      loadTestAspects: jest.fn().mockResolvedValue([
        { aspect_no: 1, test_type: '表示', test_category: 'レイアウト' },
        { aspect_no: 2, test_type: '入力', test_category: '文字種' }
      ]),
      generateTestPlan: jest.fn().mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC001',
            aspect_no: 1,
            title: 'テストケース1',
            steps: ['ステップ1']
          }
        ]
      }),
      generateDeeperTests: jest.fn().mockResolvedValue({
        testCases: [
          {
            test_case_id: 'DEEPER-001',
            aspect_no: 9001,
            title: 'より深いテスト',
            steps: ['深いステップ1']
          }
        ]
      })
    };

    mockGenerator = {
      generate: jest.fn().mockImplementation(({ testCases }) => {
        return Promise.resolve(testCases.map(tc => ({
          ...tc,
          instructions: [{ type: 'navigate', url: 'https://example.com' }]
        })));
      })
    };

    mockExecutor = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        duration_ms: 100
      })
    };

    mockAnalyzer = {
      analyze: jest.fn().mockResolvedValue({
        percentage: 50,
        covered: 1,
        total: 2,
        covered_aspects: [1],
        uncovered_aspects: [2]
      }),
      generateRecommendations: jest.fn().mockResolvedValue([
        {
          type: 'uncovered',
          priority: 'High',
          title: '観点2のテスト',
          reason: '未カバー観点',
          aspectNo: 2
        },
        {
          type: 'deeper',
          priority: 'Medium',
          title: 'より深いテスト（エッジケース、組み合わせテスト）を生成',
          reason: '全観点がカバー済み。さらなるテスト品質向上のため',
          requiresAI: true
        }
      ])
    };

    mockReporter = {
      saveAllReports: jest.fn().mockResolvedValue({
        json: './reports/report.json',
        markdown: './reports/report.md',
        html: './reports/report.html'
      })
    };

    mockPlaywrightMCP = {
      setupPage: jest.fn().mockResolvedValue(),
      closePage: jest.fn().mockResolvedValue(),
      snapshot: jest.fn().mockResolvedValue({ elements: [] })
    };

    // Orchestrator作成
    orchestrator = new Orchestrator({
      url: 'https://example.com',
      maxIterations: 1, // ★ イテレーション上限を1に設定
      coverageTarget: 80,
      interactive: true, // ★ 対話モード有効
      outputDir: './test-reports'
    });

    // モックをセット
    orchestrator.planner = mockPlanner;
    orchestrator.generator = mockGenerator;
    orchestrator.executor = mockExecutor;
    orchestrator.analyzer = mockAnalyzer;
    orchestrator.reporter = mockReporter;
    orchestrator.playwrightMCP = mockPlaywrightMCP;
  });

  test('iterations=1でも対話モードで推奨テストが表示される', async () => {
    // ユーザー入力をモック: 最初の提案で「終了」を選択
    orchestrator._mockUserInput = '0';

    await orchestrator.run();

    // 1. 通常イテレーションが1回実行される
    expect(mockPlanner.generateTestPlan).toHaveBeenCalledTimes(1);
    expect(mockGenerator.generate).toHaveBeenCalledTimes(1);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);

    // 2. 対話モードで推奨テストが生成される
    expect(mockAnalyzer.generateRecommendations).toHaveBeenCalled();
  });

  test('iterations=1でも対話モードで「より深いテスト」を実行できる', async () => {
    let callCount = 0;
    orchestrator.promptUser = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // 1回目: 「より深いテスト」を選択（インデックス2）
        return Promise.resolve('2');
      } else {
        // 2回目以降: 終了
        return Promise.resolve('0');
      }
    });

    await orchestrator.run();

    // 1. 通常イテレーションが1回実行される
    expect(mockPlanner.generateTestPlan).toHaveBeenCalledTimes(1);

    // 2. 「より深いテスト」が生成される
    expect(mockPlanner.generateDeeperTests).toHaveBeenCalled();

    // 3. より深いテストが実行される
    // generateTestPlanは通常イテレーションで1回、executeDeeperTestsでもう1回
    expect(mockGenerator.generate).toHaveBeenCalledTimes(2);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
  });

  test('iterations=1で特定の観点テストを選択して実行できる', async () => {
    let callCount = 0;
    orchestrator.promptUser = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // 1回目: 観点2のテストを選択（インデックス1）
        return Promise.resolve('1');
      } else {
        // 2回目以降: 終了
        return Promise.resolve('0');
      }
    });

    await orchestrator.run();

    // 選択された特定の観点テストが実行される
    // 通常イテレーション1回 + executeSpecificTest内で1回 = 合計2回
    expect(mockPlanner.generateTestPlan).toHaveBeenCalledTimes(2);
    expect(mockGenerator.generate).toHaveBeenCalledTimes(2);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
  });

  test('iterations=2以上でも対話モードが正常に動作', async () => {
    orchestrator.config.maxIterations = 2;
    
    let callCount = 0;
    orchestrator.promptUser = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // 1回目: Enterで継続
        return Promise.resolve('');
      } else {
        // 2回目以降: 終了
        return Promise.resolve('0');
      }
    });

    await orchestrator.run();

    // 通常イテレーションが2回実行される
    expect(mockPlanner.generateTestPlan).toHaveBeenCalledTimes(2);
    expect(mockGenerator.generate).toHaveBeenCalledTimes(2);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(2);

    // 対話モードは各イテレーション後に呼ばれる
    expect(mockAnalyzer.generateRecommendations).toHaveBeenCalled();
  });

  test('対話モードでない場合、iterations制限で正常に終了', async () => {
    orchestrator.config.interactive = false;
    orchestrator.config.maxIterations = 1;

    await orchestrator.run();

    // 通常イテレーションが1回のみ
    expect(mockPlanner.generateTestPlan).toHaveBeenCalledTimes(1);
    expect(mockGenerator.generate).toHaveBeenCalledTimes(1);
    expect(mockExecutor.execute).toHaveBeenCalledTimes(1);

    // 推奨テストは生成されない
    expect(mockAnalyzer.generateRecommendations).not.toHaveBeenCalled();
  });

  test('カバレッジ100%達成で早期終了し、対話モードは実行されない', async () => {
    // カバレッジ100%、かつ目標達成でearlyExitをシミュレート
    mockAnalyzer.analyze.mockResolvedValue({
      percentage: 100,
      covered: 2,
      total: 2,
      covered_aspects: [1, 2],
      uncovered_aspects: []
    });

    await orchestrator.run();

    // 通常イテレーションが1回実行される
    expect(mockPlanner.generateTestPlan).toHaveBeenCalledTimes(1);

    // カバレッジ目標達成でearlyExitするため、対話モードは実行されない
    expect(mockAnalyzer.generateRecommendations).not.toHaveBeenCalled();
  });
});
