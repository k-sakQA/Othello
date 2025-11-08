/**
 * Orchestrator (Phase 9) Tests
 * 8ステップイテレーションループの統合テスト
 */

const Orchestrator = require('../src/orchestrator');

describe('Orchestrator', () => {
  let orchestrator;
  let mockPlanner, mockGenerator, mockExecutor, mockHealer, mockAnalyzer, mockReporter, mockPlaywrightMCP;

  beforeEach(() => {
    // モックエージェント作成
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
      analyzeWithHistory: jest.fn(),
      shouldContinueTesting: jest.fn()
    };

    mockReporter = {
      saveAllReports: jest.fn()
    };

    mockPlaywrightMCP = {
      setupPage: jest.fn(),
      closePage: jest.fn(),
      snapshot: jest.fn()
    };

    // Orchestrator初期化
    orchestrator = new Orchestrator({
      url: 'https://example.com',
      maxIterations: 5,
      coverageTarget: 80,
      autoHeal: true
    });

    // モック注入
    orchestrator.planner = mockPlanner;
    orchestrator.generator = mockGenerator;
    orchestrator.executor = mockExecutor;
    orchestrator.healer = mockHealer;
    orchestrator.analyzer = mockAnalyzer;
    orchestrator.reporter = mockReporter;
    orchestrator.playwrightMCP = mockPlaywrightMCP;
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化できる', () => {
      const orch = new Orchestrator();

      expect(orch.config.url).toBe('https://example.com');
      expect(orch.config.maxIterations).toBe(10);
      expect(orch.config.coverageTarget).toBe(80);
      expect(orch.config.autoHeal).toBe(true);
      expect(orch.iteration).toBe(0);
      expect(orch.history).toEqual([]);
    });

    it('カスタム設定で初期化できる', () => {
      const orch = new Orchestrator({
        url: 'https://custom.com',
        maxIterations: 3,
        coverageTarget: 90,
        autoHeal: false
      });

      expect(orch.config.url).toBe('https://custom.com');
      expect(orch.config.maxIterations).toBe(3);
      expect(orch.config.coverageTarget).toBe(90);
      expect(orch.config.autoHeal).toBe(false);
    });
  });

  describe('shouldContinue', () => {
    it('イテレーション数が上限未満なら続行', () => {
      orchestrator.iteration = 3;
      expect(orchestrator.shouldContinue()).toBe(true);
    });

    it('イテレーション数が上限に達したら停止', () => {
      orchestrator.iteration = 5;
      expect(orchestrator.shouldContinue()).toBe(false);
    });

    it('イテレーション数が上限を超えたら停止', () => {
      orchestrator.iteration = 6;
      expect(orchestrator.shouldContinue()).toBe(false);
    });
  });

  describe('getCurrentCoverage', () => {
    it('履歴が空の場合は初期値を返す', () => {
      const coverage = orchestrator.getCurrentCoverage();

      expect(coverage.aspectCoverage.percentage).toBe(0);
      expect(coverage.aspectCoverage.tested).toBe(0);
      expect(coverage.aspectCoverage.total).toBe(23);
      expect(coverage.testCaseCoverage.total).toBe(0);
    });

    it('履歴がある場合は累積カバレッジを返す', () => {
      orchestrator.history = [
        {
          iteration: 1,
          executionResults: [
            { aspect_no: 1, success: true },
            { aspect_no: 2, success: false }
          ]
        }
      ];

      mockAnalyzer.analyze.mockReturnValue({
        aspectCoverage: {
          total: 23,
          tested: 2,
          percentage: 8.7
        },
        testCaseCoverage: {
          total: 2,
          passed: 1,
          failed: 1,
          pass_rate: 50
        }
      });

      const coverage = orchestrator.getCurrentCoverage();

      expect(mockAnalyzer.analyze).toHaveBeenCalled();
      expect(coverage.aspectCoverage.percentage).toBe(8.7);
      expect(coverage.aspectCoverage.tested).toBe(2);
    });
  });

  describe('isStagnant', () => {
    it('履歴が3未満の場合は停滞と判定しない', () => {
      orchestrator.history = [
        { coverage: { aspectCoverage: { percentage: 10 } } }
      ];

      expect(orchestrator.isStagnant()).toBe(false);
    });

    it('3回連続で1%未満の変化の場合は停滞と判定', () => {
      orchestrator.history = [
        { coverage: { aspectCoverage: { percentage: 50.0 } } },
        { coverage: { aspectCoverage: { percentage: 50.3 } } },
        { coverage: { aspectCoverage: { percentage: 50.5 } } }
      ];

      expect(orchestrator.isStagnant()).toBe(true);
    });

    it('1%以上の変化がある場合は停滞と判定しない', () => {
      orchestrator.history = [
        { coverage: { aspectCoverage: { percentage: 50.0 } } },
        { coverage: { aspectCoverage: { percentage: 51.5 } } },
        { coverage: { aspectCoverage: { percentage: 53.0 } } }
      ];

      expect(orchestrator.isStagnant()).toBe(false);
    });

    it('ちょうど1%の変化の場合は停滞と判定', () => {
      orchestrator.history = [
        { coverage: { aspectCoverage: { percentage: 50.0 } } },
        { coverage: { aspectCoverage: { percentage: 50.5 } } },
        { coverage: { aspectCoverage: { percentage: 51.0 } } }
      ];

      expect(orchestrator.isStagnant()).toBe(true);
    });
  });

  describe('runIteration', () => {
    beforeEach(() => {
      // 各エージェントのモック設定
      mockPlanner.generateTestPlan.mockResolvedValue({
        testCases: [
          { test_case_id: 'TC-001', aspect_no: 1, instructions: [] }
        ]
      });

      mockGenerator.generate.mockResolvedValue({
        testCases: [
          { test_case_id: 'TC-001', aspect_no: 1, instructions: [] }
        ]
      });

      mockExecutor.execute.mockResolvedValue({
        success: true,
        duration_ms: 100
      });

      mockAnalyzer.analyze.mockReturnValue({
        aspectCoverage: {
          total: 23,
          tested: 1,
          percentage: 4.3
        },
        testCaseCoverage: {
          total: 1,
          passed: 1,
          failed: 0,
          pass_rate: 100
        }
      });

      mockPlaywrightMCP.snapshot.mockResolvedValue({
        elements: []
      });
    });

    it('成功した場合は履歴に追加される', async () => {
      orchestrator.iteration = 1;
      await orchestrator.runIteration();

      expect(orchestrator.history).toHaveLength(1);
      expect(orchestrator.history[0].iteration).toBe(1);
      expect(orchestrator.history[0].testCases).toHaveLength(1);
      expect(orchestrator.history[0].executionResults).toHaveLength(1);
      expect(orchestrator.history[0].coverage).toBeDefined();
    });

    it('Healerが失敗テストを修復する', async () => {
      orchestrator.iteration = 1;

      // 最初は失敗
      mockExecutor.execute
        .mockResolvedValueOnce({
          success: false,
          error: 'Element not found',
          snapshot: {}
        })
        .mockResolvedValueOnce({
          success: true,
          duration_ms: 150
        });

      mockHealer.heal.mockResolvedValue({
        healed: true,
        fix_type: 'LOCATOR_FIX',
        fixed_instructions: []
      });

      await orchestrator.runIteration();

      expect(mockHealer.heal).toHaveBeenCalled();
      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
      expect(orchestrator.history[0].executionResults[0].success).toBe(true);
      expect(orchestrator.history[0].executionResults[0].healed).toBe(true);
    });

    it('autoHealがfalseの場合はHealerを実行しない', async () => {
      orchestrator.config.autoHeal = false;
      orchestrator.iteration = 1;

      mockExecutor.execute.mockResolvedValue({
        success: false,
        error: 'Element not found'
      });

      await orchestrator.runIteration();

      expect(mockHealer.heal).not.toHaveBeenCalled();
      expect(orchestrator.history[0].executionResults[0].success).toBe(false);
    });
  });

  describe('generateFinalReport', () => {
    it('最終レポートを生成する', async () => {
      orchestrator.history = [
        {
          iteration: 1,
          executionResults: [
            { aspect_no: 1, success: true }
          ]
        }
      ];

      mockAnalyzer.analyze.mockResolvedValue({
        aspectCoverage: { percentage: 50, tested: 5, total: 10, tested_aspects: [1,2,3,4,5], untested_aspects: [6,7,8,9,10] },
        testCaseCoverage: { passed: 1, total: 1, failed: 0, pass_rate: 100 },
        percentage: 50,
        covered: 5,
        total: 10
      });

      mockReporter.saveAllReports.mockResolvedValue({
        json: 'report.json',
        markdown: 'report.md',
        html: 'report.html'
      });

      const reports = await orchestrator.generateFinalReport();

      expect(mockAnalyzer.analyze).toHaveBeenCalled();
      expect(mockReporter.saveAllReports).toHaveBeenCalled();
      
      // reportDataにhistoryが含まれていることを確認
      const reportData = mockReporter.saveAllReports.mock.calls[0][0];
      expect(reportData.history).toBeDefined();
      expect(reportData.history).toEqual(orchestrator.history);
      expect(reports.json).toBe('report.json');
      expect(reports.markdown).toBe('report.md');
      expect(reports.html).toBe('report.html');
    });
  });

  describe('formatDuration', () => {
    it('秒単位でフォーマットできる', () => {
      expect(orchestrator.formatDuration(5000)).toBe('5s');
    });

    it('分秒単位でフォーマットできる', () => {
      expect(orchestrator.formatDuration(125000)).toBe('2m 5s');
    });

    it('時分秒単位でフォーマットできる', () => {
      expect(orchestrator.formatDuration(3725000)).toBe('1h 2m 5s');
    });
  });

  describe('統合シナリオ', () => {
    it('目標カバレッジ達成まで実行できる', async () => {
      // Planner
      mockPlanner.generateTestPlan.mockResolvedValue({
        testCases: [
          { test_case_id: 'TC-001', aspect_no: 1, instructions: [] }
        ]
      });

      // Generator
      mockGenerator.generate.mockResolvedValue({
        testCases: [
          { test_case_id: 'TC-001', aspect_no: 1, instructions: [] }
        ]
      });

      // Executor - 成功
      mockExecutor.execute.mockResolvedValue({
        success: true,
        duration_ms: 100
      });

      // Analyzer - カバレッジ増加
      let callCount = 0;
      mockAnalyzer.analyze.mockImplementation(() => {
        callCount++;
        return {
          aspectCoverage: {
            total: 23,
            tested: callCount,
            percentage: (callCount / 23) * 100
          },
          testCaseCoverage: {
            total: callCount,
            passed: callCount,
            failed: 0,
            pass_rate: 100
          }
        };
      });

      mockAnalyzer.shouldContinueTesting
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false); // 3回目で目標達成

      mockAnalyzer.analyzeWithHistory.mockReturnValue({
        cumulativeCoverage: {
          aspectCoverage: { percentage: 85 }
        }
      });

      // Reporter
      mockReporter.saveAllReports.mockResolvedValue({
        json: 'report.json',
        markdown: 'report.md',
        html: 'report.html'
      });

      // Playwright MCP
      mockPlaywrightMCP.setupPage.mockResolvedValue();
      mockPlaywrightMCP.closePage.mockResolvedValue();
      mockPlaywrightMCP.snapshot.mockResolvedValue({ elements: [] });

      await orchestrator.run();

      expect(orchestrator.iteration).toBe(3);
      expect(orchestrator.history).toHaveLength(3);
      expect(mockReporter.saveAllReports).toHaveBeenCalled();
      expect(mockPlaywrightMCP.closePage).toHaveBeenCalled();
    });
  });
});
