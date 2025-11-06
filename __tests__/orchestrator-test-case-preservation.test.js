const Orchestrator = require('../src/orchestrator');
const ConfigManager = require('../src/config');
const path = require('path');

describe('Orchestrator - test_case preservation (TDD)', () => {
  let orchestrator;
  let mockConfig;
  let mockPlanner;
  let mockGenerator;
  let mockExecutor;
  let mockHealer;
  let mockAnalyzer;
  let mockReporter;
  let mockPlaywrightMCP;

  beforeAll(async () => {
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    mockConfig = await ConfigManager.load(configPath);
  });

  beforeEach(() => {
    // Mock Planner: テスト計画を返す
    mockPlanner = {
      generateTestPlan: jest.fn().mockResolvedValue({
        testCases: [
          {
            test_case_id: 'TC001',
            aspect_no: 1,
            test_type: 'functional',
            description: 'ログイン機能のテスト',
            steps: [
              { step: 1, action: 'ページを開く', target: 'https://example.com' },
              { step: 2, action: 'ユーザー名を入力', target: 'input[name="username"]', value: 'testuser' }
            ],
            expected_results: ['ログインに成功する', 'ホーム画面が表示される']
          },
          {
            test_case_id: 'TC002',
            aspect_no: 2,
            test_type: 'navigation',
            description: 'ナビゲーションリンクの動作確認',
            steps: [
              { step: 1, action: 'リンクをクリック', target: 'link[href="/about"]' }
            ],
            expected_results: ['ページ遷移が成功する']
          }
        ]
      })
    };

    // Mock Generator: MCP命令の配列を返す
    mockGenerator = {
      generate: jest.fn().mockImplementation(({ testCases }) => {
        // testCases配列を受け取り、MCP命令付きの配列を返す
        return Promise.resolve(testCases.map(tc => ({
          test_case_id: tc.test_case_id,
          aspect_no: tc.aspect_no,
          instructions: [
            { type: 'navigate', url: 'https://example.com' },
            { type: 'click', target: 'button' }
          ]
        })));
      })
    };

    // Mock Executor: 実行結果を返す
    mockExecutor = {
      execute: jest.fn().mockImplementation((testCase) => {
        return Promise.resolve({
          success: true,
          test_case_id: testCase.test_case_id,
          aspect_no: testCase.aspect_no,
          executed_instructions: 2,
          failed_instructions: 0,
          duration_ms: 500
        });
      })
    };

    // Mock Healer
    mockHealer = {
      analyze: jest.fn().mockResolvedValue({
        root_cause: 'Element not found',
        is_bug: false,
        fix_type: 'LOCATOR_FIX'
      }),
      heal: jest.fn().mockResolvedValue({
        success: true,
        fixed_instructions: [
          { type: 'navigate', url: 'https://example.com' },
          { type: 'wait', duration: 500 },
          { type: 'click', target: 'button' }
        ]
      })
    };

    // Mock Analyzer
    mockAnalyzer = {
      analyze: jest.fn().mockResolvedValue({
        aspectCoverage: { percentage: 50, tested: 2, total: 4 },
        testCaseCoverage: { total: 2, passed: 2, failed: 0 }
      })
    };

    // Mock Reporter
    mockReporter = {
      saveAllReports: jest.fn().mockResolvedValue({
        json: 'report.json',
        markdown: 'report.md',
        html: 'report.html'
      })
    };

    // Mock Playwright MCP
    mockPlaywrightMCP = {
      setupPage: jest.fn().mockResolvedValue({ success: true }),
      snapshot: jest.fn().mockResolvedValue({ url: 'https://example.com', elements: [] })
    };

    orchestrator = new Orchestrator({
      url: 'https://example.com',
      maxIterations: 1,
      coverageTarget: 80,
      testAspectsCSV: path.join(__dirname, 'fixtures', 'test-aspects.csv')
    });
    
    // エージェントを手動で設定
    orchestrator.planner = mockPlanner;
    orchestrator.generator = mockGenerator;
    orchestrator.executor = mockExecutor;
    orchestrator.healer = mockHealer;
    orchestrator.analyzer = mockAnalyzer;
    orchestrator.reporter = mockReporter;
    orchestrator.playwrightMCP = mockPlaywrightMCP;
  });

  describe('runIteration でtest_caseを保持する', () => {
    test('executionResults に test_case フィールドが含まれる', async () => {
      const iterationResult = await orchestrator.runIteration();

      expect(iterationResult.executionResults).toBeDefined();
      expect(iterationResult.executionResults.length).toBeGreaterThan(0);
      
      // 各実行結果にtest_caseが含まれることを確認
      iterationResult.executionResults.forEach(result => {
        expect(result).toHaveProperty('test_case');
        expect(result.test_case).toHaveProperty('test_case_id');
        expect(result.test_case).toHaveProperty('description');
        expect(result.test_case).toHaveProperty('steps');
        expect(result.test_case).toHaveProperty('expected_results');
      });
    });

    test('test_caseの内容が元のPlannerの出力と一致する', async () => {
      const iterationResult = await orchestrator.runIteration();

      const firstResult = iterationResult.executionResults[0];
      expect(firstResult.test_case.test_case_id).toBe('TC001');
      expect(firstResult.test_case.description).toBe('ログイン機能のテスト');
      expect(firstResult.test_case.steps).toHaveLength(2);
      expect(firstResult.test_case.steps[0].action).toBe('ページを開く');
      expect(firstResult.test_case.expected_results).toEqual(['ログインに成功する', 'ホーム画面が表示される']);
    });

    test('失敗したテストでもtest_caseが保持される', async () => {
      // Executorが失敗を返すようにモック
      mockExecutor.execute = jest.fn().mockResolvedValue({
        success: false,
        test_case_id: 'TC001',
        aspect_no: 1,
        error: { message: 'Element not found' },
        executed_instructions: 1,
        failed_instructions: 1,
        duration_ms: 200
      });

      const iterationResult = await orchestrator.runIteration();

      const failedResult = iterationResult.executionResults[0];
      expect(failedResult.success).toBe(false);
      expect(failedResult).toHaveProperty('test_case');
      expect(failedResult.test_case.description).toBe('ログイン機能のテスト');
    });
  });

  describe('最終レポートにtest_caseが含まれる', () => {
    test('generateFinalReport が test_case 付きのデータを渡す', async () => {
      // 1イテレーション実行
      await orchestrator.runIteration();
      
      // 最終レポート生成
      await orchestrator.generateFinalReport();

      // Reporterに渡されたデータを確認
      expect(mockReporter.saveAllReports).toHaveBeenCalled();
      const reportData = mockReporter.saveAllReports.mock.calls[0][0];
      
      expect(reportData.executionResults).toBeDefined();
      expect(reportData.executionResults[0]).toHaveProperty('test_case');
    });
  });
});
