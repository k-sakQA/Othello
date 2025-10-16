const Orchestrator = require('../src/orchestrator');
const ConfigManager = require('../src/config');
const InstructionGenerator = require('../src/instruction-generator');
const Analyzer = require('../src/analyzer');
const ResultCollector = require('../src/result-collector');

const fs = require('fs').promises;
const path = require('path');

describe('Orchestrator', () => {
  let orchestrator;
  let mockConfig;
  let testWorkspaceDir;

  beforeAll(async () => {
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    mockConfig = await ConfigManager.load(configPath);
    
    // テスト用ワークスペースディレクトリを作成
    testWorkspaceDir = path.join(__dirname, 'fixtures', 'workspace');
    await fs.mkdir(testWorkspaceDir, { recursive: true });
  });

  beforeEach(() => {
    // モックの依存関係を注入
    const mockDependencies = {
      configManager: mockConfig,
      instructionGenerator: {
        generate: jest.fn().mockResolvedValue([
          { type: 'page', target: 'https://example.com/page1', priority: 'high' }
        ])
      },
      analyzer: {
        analyze: jest.fn()
          .mockResolvedValueOnce({
            coverage_summary: { percentage: 30, visited_pages: 2, tested_features: 5 },
            uncovered: { pages: ['https://example.com/uncovered1'], elements: ['未テスト機能1'] }
          })
          .mockResolvedValueOnce({
            coverage_summary: { percentage: 50, visited_pages: 4, tested_features: 8 },
            uncovered: { pages: ['https://example.com/uncovered2'], elements: ['未テスト機能2'] }
          })
          .mockResolvedValueOnce({
            coverage_summary: { percentage: 70, visited_pages: 6, tested_features: 12 },
            uncovered: { pages: ['https://example.com/uncovered3'], elements: ['未テスト機能3'] }
          })
          .mockResolvedValue({
            coverage_summary: { percentage: 90, visited_pages: 8, tested_features: 15 },
            uncovered: { pages: [], elements: [] }
          })
      },
      resultCollector: {
        collect: jest.fn().mockResolvedValue({ iteration: 1, status: 'success' }),
        saveJSON: jest.fn().mockResolvedValue(true),
        saveCSV: jest.fn().mockResolvedValue(true)
      }
    };

    orchestrator = new Orchestrator(mockDependencies);
  });

  afterEach(async () => {
    // テスト用ディレクトリをクリーンアップ
    try {
      await fs.rm(testWorkspaceDir, { recursive: true, force: true });
    } catch (error) {
      // エラーは無視
    }
  });

  describe('execute()', () => {
    test('反復テストを正常に実行できる', async () => {
      // テスト設定をモック
      mockConfig.max_iterations = 5;

      const result = await orchestrator.execute();

      expect(result).toBeDefined();
      // モックは4回のanalyze呼び出しを設定しているが、4回目で90%に達して閾値超過で停止
      expect(result.total_iterations).toBeGreaterThanOrEqual(3);
      expect(result).toHaveProperty('coverage_reports');
      expect(result.coverage_reports.length).toBeGreaterThanOrEqual(3);
    });

    test('最大反復回数を超えない', async () => {
      // テスト設定をモック
      mockConfig.max_iterations = 5;

      const result = await orchestrator.execute();

      expect(result.total_iterations).toBeLessThanOrEqual(5);
    });

    test('反復間でカバレッジが向上しない場合は終了', async () => {
      // 低カバレッジの模擬カバレッジデータを作成
      const mockAnalyzer = {
        analyze: jest.fn()
          .mockResolvedValueOnce({ 
            coverage_summary: { percentage: 10 },
            uncovered: { pages: ['https://example.com/page1'], elements: [] }
          })
          .mockResolvedValueOnce({ 
            coverage_summary: { percentage: 15 },
            uncovered: { pages: ['https://example.com/page1'], elements: [] }
          })
          .mockResolvedValueOnce({ 
            coverage_summary: { percentage: 15 },
            uncovered: { pages: ['https://example.com/page1'], elements: [] }
          })
      };

      const mockDependencies = {
        configManager: mockConfig,
        instructionGenerator: orchestrator.instructionGenerator,
        analyzer: mockAnalyzer,
        resultCollector: orchestrator.resultCollector
      };

      const customOrchestrator = new Orchestrator(mockDependencies);

      const result = await customOrchestrator.execute();

      // カバレッジが向上しない場合は2回目の反復で終了
      expect(result.total_iterations).toBe(2);
      expect(result.exit_reason).toBe('coverage_threshold_reached');
    });
  });

  describe('generateInstructions()', () => {
    test('カバレッジデータから新しいテスト指示を生成できる', async () => {
      // 低カバレッジの模擬カバレッジデータを作成
      const mockCoverageData = {
        uncovered: {
          pages: ['https://example.com/uncovered-page'],
          elements: ['未テスト機能']
        }
      };

      // モックの指示生成を設定
      orchestrator.instructionGenerator.generate.mockResolvedValueOnce([
        { type: 'page', target: 'https://example.com/uncovered-page', priority: 'high' }
      ]);

      const instructions = await orchestrator.generateInstructions(mockCoverageData);

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBeGreaterThan(0);
      expect(instructions[0]).toHaveProperty('target');
      expect(instructions[0]).toHaveProperty('type');
    });

    test('未カバー領域がない場合は空の指示を返す', async () => {
      const mockCoverageData = {
        uncovered: {
          pages: [],
          elements: []
        }
      };

      const instructions = await orchestrator.generateInstructions(mockCoverageData);

      expect(instructions).toEqual([]);
    });
  });

  describe('recordIteration()', () => {
    test('反復結果を正しく記録できる', async () => {
      const mockIterationResult = {
        iteration: 1,
        playwright_agent_results: {},
        status: 'success'
      };

      await orchestrator.recordIteration(mockIterationResult);

      // ログファイルの存在を確認
      const logPath = path.join(mockConfig.getPath('logs'), `iteration_1.json`);
      const logFile = await fs.readFile(logPath, 'utf8');
      const savedLog = JSON.parse(logFile);

      expect(savedLog).toEqual(mockIterationResult);
    });

    test('結果収集モジュールを呼び出す', async () => {
      const mockResultCollector = {
        collect: jest.fn().mockResolvedValue({ iteration: 1, status: 'success' }),
        saveJSON: jest.fn().mockResolvedValue(true),
        saveCSV: jest.fn().mockResolvedValue(true)
      };

      const mockDependencies = {
        configManager: mockConfig,
        instructionGenerator: orchestrator.instructionGenerator,
        analyzer: orchestrator.analyzer,
        resultCollector: mockResultCollector
      };

      const customOrchestrator = new Orchestrator(mockDependencies);

      const mockIterationResult = {
        iteration: 1,
        playwright_agent_results: {},
        status: 'success'
      };

      await customOrchestrator.recordIteration(mockIterationResult);

      expect(mockResultCollector.collect).toHaveBeenCalledWith(mockIterationResult);
      expect(mockResultCollector.saveJSON).toHaveBeenCalled();
      expect(mockResultCollector.saveCSV).toHaveBeenCalled();
    });
  });

  describe('shouldContinue()', () => {
    test('カバレッジが改善していれば継続', () => {
      const coverageHistory = [
        { percentage: 10 },
        { percentage: 20 },
        { percentage: 30 }
      ];

      const result = orchestrator.shouldContinue(coverageHistory);

      expect(result).toBe(true);
    });

    test('カバレッジ改善が一定期間ない場合は停止', () => {
      const coverageHistory = [
        { percentage: 10 },
        { percentage: 10 },
        { percentage: 10 }
      ];

      const result = orchestrator.shouldContinue(coverageHistory);

      expect(result).toBe(false);
    });

    test('カバレッジ閾値を超えた場合は停止', () => {
      // 新しいOrchestratorインスタンスを作成して閾値を設定
      const customConfig = {
        ...mockConfig,
        coverage_threshold: {
          target_percentage: 50,
          stop_if_no_improvement: true
        }
      };

      const customOrchestrator = new Orchestrator({
        configManager: customConfig,
        instructionGenerator: orchestrator.instructionGenerator,
        analyzer: orchestrator.analyzer,
        resultCollector: orchestrator.resultCollector
      });

      const coverageHistory = [
        { percentage: 10 },
        { percentage: 30 },
        { percentage: 60 }
      ];

      const result = customOrchestrator.shouldContinue(coverageHistory);

      expect(result).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    test('Playwrightエージェントの呼び出しに失敗した場合はエラーを記録', async () => {
      const mockPlaywrightAgent = {
        generateTests: jest.fn().mockRejectedValue(new Error('Agent connection failed'))
      };

      const mockDependencies = {
        configManager: mockConfig,
        instructionGenerator: orchestrator.instructionGenerator,
        analyzer: orchestrator.analyzer,
        resultCollector: orchestrator.resultCollector,
        playwrightAgent: mockPlaywrightAgent
      };

      const customOrchestrator = new Orchestrator(mockDependencies);

      const result = await customOrchestrator.execute();

      expect(result.status).toBe('error');
      expect(result.error_details).toBeDefined();
    });
  });

  describe('統合フロー', () => {
    test('カバレッジ向上のための完全な反復サイクル', async () => {
      const result = await orchestrator.execute();

      expect(result).toHaveProperty('total_iterations');
      expect(result).toHaveProperty('coverage_reports');
      expect(result).toHaveProperty('final_coverage');
      expect(result.final_coverage.percentage).toBeGreaterThan(0);
    });
  });
});

// ヘルパー関数: PlaywrightエージェントやClaude AIのモックを作成
function createMockPlaywrightAgent() {
  return {
    generateTests: jest.fn().mockResolvedValue([
      {
        name: 'テスト1',
        target: 'https://example.com/page1',
        type: 'page_coverage'
      }
    ])
  };
}

function createMockClaudeAPI() {
  return {
    optimize: jest.fn().mockResolvedValue({
      optimized_instructions: [
        {
          name: '改善されたテスト',
          target: 'https://example.com/page2',
          type: 'feature_coverage'
        }
      ]
    })
  };
}