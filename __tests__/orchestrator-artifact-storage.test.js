/**
 * Orchestratorと成果物保存の統合テスト
 */

const Orchestrator = require('../src/orchestrator');
const fs = require('fs');
const path = require('path');

describe('Orchestrator - ArtifactStorage統合', () => {
  let orchestrator;
  let testOutputDir;

  beforeEach(() => {
    testOutputDir = path.join(__dirname, 'fixtures', 'orchestrator-artifacts-test');
    
    orchestrator = new Orchestrator({
      url: 'https://example.com',
      maxIterations: 1,
      outputDir: testOutputDir,
      llmProvider: {
        model: 'gpt-4',
        apiKey: 'test-key'
      }
    });

    // プライベートメソッドをモック
    orchestrator.planner = {
      generateTestPlan: jest.fn().mockResolvedValue({
        testCases: [
          { test_case_id: 'TC001', aspect_no: 1, description: 'テスト1' }
        ]
      })
    };

    orchestrator.generator = {
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

    orchestrator.executor = {
      config: {},
      execute: jest.fn().mockResolvedValue({
        success: true,
        duration_ms: 100
      })
    };

    orchestrator.analyzer = {
      analyze: jest.fn().mockReturnValue({
        percentage: 4.35,
        covered: 1,
        total: 23,
        covered_aspects: [1],
        uncovered_aspects: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
      })
    };

    orchestrator.reporter = {
      saveAllReports: jest.fn().mockResolvedValue({
        json: path.join(testOutputDir, 'report.json'),
        html: path.join(testOutputDir, 'report.html'),
        markdown: path.join(testOutputDir, 'report.md')
      })
    };
  });

  afterEach(() => {
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  test('artifactStorageが初期化される', () => {
    expect(orchestrator.artifactStorage).toBeDefined();
    expect(orchestrator.artifactStorage.sessionId).toBe(orchestrator.sessionId);
  });

  test('runIteration実行時にPlanner生成物が保存される', async () => {
    orchestrator.iteration = 1; // runイテレーション前にインクリメント済みを想定
    await orchestrator.runIteration();

    const summary = orchestrator.artifactStorage.getSummary();
    expect(summary.plannerOutputs).toHaveLength(1);
    
    const plannerFile = summary.plannerOutputs[0];
    expect(fs.existsSync(plannerFile)).toBe(true);
    
    const content = JSON.parse(fs.readFileSync(plannerFile, 'utf-8'));
    expect(content.iteration).toBe(1);
    expect(content.testCases).toHaveLength(1);
    expect(content.testCases[0].test_case_id).toBe('TC001');
  });

  test('runIteration実行時にGenerator生成物が保存される', async () => {
    orchestrator.iteration = 1;
    await orchestrator.runIteration();

    const summary = orchestrator.artifactStorage.getSummary();
    expect(summary.generatorOutputs).toHaveLength(1);
    
    const generatorFile = summary.generatorOutputs[0];
    expect(fs.existsSync(generatorFile)).toBe(true);
    
    const content = JSON.parse(fs.readFileSync(generatorFile, 'utf-8'));
    expect(content.testCaseId).toBe('TC001');
    expect(content.generatedTests[0].instructions).toHaveLength(1);
  });

  test('複数イテレーションで全成果物が保存される', async () => {
    orchestrator.config.maxIterations = 2;

    // Iteration 1
    orchestrator.iteration = 1;
    await orchestrator.runIteration();

    // Iteration 2 - 異なるテストケース
    orchestrator.iteration = 2;
    orchestrator.planner.generateTestPlan.mockResolvedValueOnce({
      testCases: [
        { test_case_id: 'TC002', aspect_no: 2, description: 'テスト2' }
      ]
    });
    orchestrator.generator.generate.mockResolvedValueOnce([
      {
        test_case_id: 'TC002',
        aspect_no: 2,
        instructions: [{ type: 'click', selector: '#button' }]
      }
    ]);
    
    await orchestrator.runIteration();

    const summary = orchestrator.artifactStorage.getSummary();
    expect(summary.plannerOutputs).toHaveLength(2);
    expect(summary.generatorOutputs).toHaveLength(2);

    // Iteration 1のファイル
    const planner1 = summary.plannerOutputs[0];
    const content1 = JSON.parse(fs.readFileSync(planner1, 'utf-8'));
    expect(content1.iteration).toBe(1);

    // Iteration 2のファイル
    const planner2 = summary.plannerOutputs[1];
    const content2 = JSON.parse(fs.readFileSync(planner2, 'utf-8'));
    expect(content2.iteration).toBe(2);
  });
});
