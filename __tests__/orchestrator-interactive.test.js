/**
 * Orchestrator 対話機能のテスト (TDD)
 */

const Orchestrator = require('../src/orchestrator');
const OthelloAnalyzer = require('../src/agents/othello-analyzer');

describe('Orchestrator - 対話機能', () => {
  describe('Analyzer初期化（TDD）', () => {
    it('interactive=trueの場合、run()でanalyzerが初期化される', async () => {
      const orchestrator = new Orchestrator({
        url: 'https://example.com',
        interactive: true,
        maxIterations: 1,
        testAspectsCSV: './config/test-ViewpointList-simple.csv'
      });

      // 初期状態ではanalyzerはnull
      expect(orchestrator.analyzer).toBeNull();

      // runメソッドのモック（実際のテスト実行はスキップ）
      orchestrator.runIteration = jest.fn().mockResolvedValue({
        iteration: 1,
        testCases: [],
        executionResults: [],
        coverage: { percentage: 100, covered: 10, total: 10 }
      });

      orchestrator.planner = { generateTestPlan: jest.fn().mockResolvedValue({ testCases: [] }) };
      orchestrator.generator = { generate: jest.fn().mockResolvedValue([]) };
      orchestrator.executor = { execute: jest.fn().mockResolvedValue({ success: true }) };
      orchestrator.reporter = { 
        generateReport: jest.fn().mockResolvedValue({}),
        saveReport: jest.fn().mockResolvedValue({})
      };

      try {
        await orchestrator.run();
      } catch (e) {
        // run()が途中で終わっても問題なし
      }

      // run()実行後、analyzerが初期化される
      expect(orchestrator.analyzer).not.toBeNull();
      expect(orchestrator.analyzer).toBeInstanceOf(OthelloAnalyzer);
    });

    it('interactive=falseの場合、analyzerは初期化されない', async () => {
      const orchestrator = new Orchestrator({
        url: 'https://example.com',
        interactive: false,
        maxIterations: 1
      });

      orchestrator.runIteration = jest.fn().mockResolvedValue({
        iteration: 1,
        testCases: [],
        executionResults: [],
        coverage: { percentage: 100, covered: 10, total: 10 }
      });

      orchestrator.planner = { generateTestPlan: jest.fn().mockResolvedValue({ testCases: [] }) };
      orchestrator.generator = { generate: jest.fn().mockResolvedValue([]) };
      orchestrator.executor = { execute: jest.fn().mockResolvedValue({ success: true }) };
      orchestrator.reporter = { 
        generateReport: jest.fn().mockResolvedValue({}),
        saveReport: jest.fn().mockResolvedValue({})
      };

      try {
        await orchestrator.run();
      } catch (e) {
        // 初期化確認が目的
      }

      // interactive=falseの場合、analyzerはnullのまま
      expect(orchestrator.analyzer).toBeNull();
    });

    it('analyzerが初期化されると対話モード条件がtrueになる', async () => {
      const orchestrator = new Orchestrator({
        url: 'https://example.com',
        interactive: true,
        maxIterations: 1
      });

      orchestrator.runIteration = jest.fn().mockResolvedValue({
        iteration: 1,
        testCases: [],
        executionResults: [],
        coverage: { percentage: 0, covered: 0, total: 10 }
      });

      orchestrator.planner = { generateTestPlan: jest.fn().mockResolvedValue({ testCases: [] }) };
      orchestrator.generator = { generate: jest.fn().mockResolvedValue([]) };
      orchestrator.executor = { execute: jest.fn().mockResolvedValue({ success: true }) };
      orchestrator.reporter = { 
        generateReport: jest.fn().mockResolvedValue({}),
        saveReport: jest.fn().mockResolvedValue({})
      };

      try {
        await orchestrator.run();
      } catch (e) {
        // 初期化確認が目的
      }

      // 対話モード条件: this.config.interactive && this.analyzer
      const interactiveModeCondition = orchestrator.config.interactive && orchestrator.analyzer;
      expect(interactiveModeCondition).toBe(true);
    });
  });

  let orchestrator;
  
  beforeEach(() => {
    orchestrator = new Orchestrator({
      url: 'https://example.com',
      maxIterations: 5,
      coverageTarget: 80,
      interactive: true // 対話モード有効
    });
  });

  describe('showRecommendations', () => {
    test('推奨テストを表示できる', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        },
        {
          priority: 'High',
          title: '観点2のテスト',
          reason: '未カバー観点: 観点2',
          aspectId: 2
        }
      ];

      // showRecommendationsメソッドが存在することを確認
      expect(typeof orchestrator.showRecommendations).toBe('function');
      
      // 推奨テストを表示（実際には出力のみ）
      const result = await orchestrator.showRecommendations(recommendations);
      
      // 何も返さないか、voidを返す
      expect(result).toBeUndefined();
    });

    test('推奨テストが空の場合、メッセージを表示', async () => {
      const recommendations = [];
      
      const result = await orchestrator.showRecommendations(recommendations);
      expect(result).toBeUndefined();
    });
  });

  describe('promptUser', () => {
    test('ユーザー入力を受け付ける', async () => {
      // モック入力を設定
      const mockInput = '1';
      orchestrator._mockUserInput = mockInput;
      
      expect(typeof orchestrator.promptUser).toBe('function');
      
      const input = await orchestrator.promptUser('番号を選択してください: ');
      expect(input).toBe(mockInput);
    });

    test('Enterキーを受け付ける', async () => {
      orchestrator._mockUserInput = '';
      
      const input = await orchestrator.promptUser('番号を選択してください: ');
      expect(input).toBe('');
    });
  });

  describe('handleUserSelection', () => {
    test('番号選択時、該当する推奨テストを返す', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        },
        {
          priority: 'High',
          title: '観点2のテスト',
          reason: '未カバー観点: 観点2',
          aspectId: 2
        }
      ];

      expect(typeof orchestrator.handleUserSelection).toBe('function');
      
      const result = await orchestrator.handleUserSelection('1', recommendations);
      
      expect(result).toEqual({
        type: 'specific',
        recommendation: recommendations[0]
      });
    });

    test('0を選択時、終了を返す', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        }
      ];
      
      const result = await orchestrator.handleUserSelection('0', recommendations);
      
      expect(result).toEqual({ type: 'exit' });
    });

    test('Enterキー時、続行を返す', async () => {
      const recommendations = [];
      
      const result = await orchestrator.handleUserSelection('', recommendations);
      
      expect(result).toEqual({ type: 'continue' });
    });

    test('無効な番号時、nullを返す', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        }
      ];
      
      const result = await orchestrator.handleUserSelection('99', recommendations);
      
      expect(result).toBeNull();
    });
  });

  describe('waitForUserAction', () => {
    test('推奨テストを表示してユーザー入力を待つ', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        }
      ];

      // モック入力
      orchestrator._mockUserInput = '1';
      
      expect(typeof orchestrator.waitForUserAction).toBe('function');
      
      const result = await orchestrator.waitForUserAction(recommendations);
      
      expect(result).toEqual({
        type: 'specific',
        recommendation: recommendations[0]
      });
    });
  });
});
