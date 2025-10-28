/**
 * Othello-Planner（テスト計画生成エージェント）のテスト
 * Phase 9: テスト観点リスト活用版
 */

const OthelloPlanner = require('../../src/agents/othello-planner');
const { LLMFactory } = require('../../src/llm/llm-factory');
const path = require('path');
const fs = require('fs').promises;

describe('Othello-Planner', () => {
  let planner;
  let mockLLM;
  let testAspectsCSV;

  beforeAll(async () => {
    testAspectsCSV = path.join(__dirname, '..', '..', 'config', 'test-ViewpointList.csv');
  });

  beforeEach(() => {
    mockLLM = LLMFactory.create('mock', {});
    planner = new OthelloPlanner({
      llm: mockLLM,
      config: {
        testAspectsCSV
      }
    });
  });

  describe('constructor', () => {
    test('設定を正しく初期化できる', () => {
      expect(planner.llm).toBeDefined();
      expect(planner.config).toBeDefined();
    });

    test('LLMインスタンスを受け取れる', () => {
      const customLLM = LLMFactory.create('claude', { apiKey: 'test' });
      const customPlanner = new OthelloPlanner({
        llm: customLLM,
        config: {}
      });
      
      expect(customPlanner.llm).toBe(customLLM);
    });
  });

  describe('loadTestAspects()', () => {
    test('テスト観点リストCSVを読み込める', async () => {
      const aspects = await planner.loadTestAspects(testAspectsCSV);

      expect(Array.isArray(aspects)).toBe(true);
      expect(aspects.length).toBe(23); // 23項目
      expect(aspects[0]).toHaveProperty('aspect_no');
      expect(aspects[0]).toHaveProperty('test_type_major');
      expect(aspects[0]).toHaveProperty('test_aspect');
    });

    test('CSVファイルが見つからない場合はエラー', async () => {
      await expect(async () => {
        await planner.loadTestAspects('/nonexistent/path.csv');
      }).rejects.toThrow();
    });
  });

  describe('generateTestPlan()', () => {
    test('URLとテスト観点リストからテスト計画を生成できる', async () => {
      const options = {
        url: 'https://example.com',
        testAspectsCSV,
        iteration: 1
      };

      const result = await planner.generateTestPlan(options);

      expect(result).toHaveProperty('iteration');
      expect(result).toHaveProperty('aspects');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('testCases');
      expect(result).toHaveProperty('markdown');
      expect(Array.isArray(result.testCases)).toBe(true);
    });

    test('既存カバレッジを考慮してテスト計画を生成できる', async () => {
      const options = {
        url: 'https://example.com',
        testAspectsCSV,
        existingCoverage: {
          aspectCoverage: {
            tested: 5,
            tested_aspects: [1, 2, 3, 4, 5]
          }
        },
        iteration: 2
      };

      const result = await planner.generateTestPlan(options);

      expect(result).toHaveProperty('testCases');
      expect(Array.isArray(result.aspects)).toBe(true);
      // 未テストの観点が優先されるべき
      expect(result.aspects.length).toBeGreaterThan(0);
    });

    test('生成されたテストケースには必須フィールドが含まれる', async () => {
      const options = {
        url: 'https://example.com',
        testAspectsCSV,
        iteration: 1
      };

      const result = await planner.generateTestPlan(options);

      result.testCases.forEach(testCase => {
        expect(testCase).toHaveProperty('case_id');
        expect(testCase).toHaveProperty('aspect_no');
        expect(testCase).toHaveProperty('title');
        expect(testCase).toHaveProperty('steps');
        expect(testCase).toHaveProperty('expected_results');
        expect(Array.isArray(testCase.steps)).toBe(true);
        expect(Array.isArray(testCase.expected_results)).toBe(true);
      });
    });
  });

  describe('prioritizeAspects()', () => {
    test('未テストの観点を優先できる', async () => {
      const allAspects = await planner.loadTestAspects(testAspectsCSV);
      const existingCoverage = {
        aspectCoverage: {
          tested_aspects: [1, 2, 3]
        }
      };

      const prioritized = planner.prioritizeAspects(allAspects, existingCoverage);

      expect(Array.isArray(prioritized)).toBe(true);
      expect(prioritized.length).toBeLessThanOrEqual(10); // 一度に10観点まで
      // 最初の方は未テスト観点のはず
      const firstAspect = prioritized[0];
      expect([1, 2, 3]).not.toContain(firstAspect.aspect_no);
    });

    test('既存カバレッジがない場合は全観点を返す', async () => {
      const allAspects = await planner.loadTestAspects(testAspectsCSV);
      const existingCoverage = {};

      const prioritized = planner.prioritizeAspects(allAspects, existingCoverage);

      expect(prioritized.length).toBeGreaterThan(0);
      expect(prioritized.length).toBeLessThanOrEqual(10);
    });
  });

  describe('extractTestCases()', () => {
    test('分析結果からテストケースを抽出できる', () => {
      const analysis = [
        {
          aspect_no: 1,
          test_type: '表示（UI）',
          test_cases: [
            {
              case_id: 'TC001',
              title: 'Test 1',
              steps: ['Step 1'],
              expected_results: ['Result 1']
            }
          ]
        },
        {
          aspect_no: 2,
          test_type: '入力',
          test_cases: [
            {
              case_id: 'TC002',
              title: 'Test 2',
              steps: ['Step 1'],
              expected_results: ['Result 1']
            }
          ]
        }
      ];

      const testCases = planner.extractTestCases(analysis);

      expect(Array.isArray(testCases)).toBe(true);
      expect(testCases.length).toBe(2);
      expect(testCases[0]).toHaveProperty('aspect_no');
      expect(testCases[0]).toHaveProperty('case_id');
      expect(testCases[0].aspect_no).toBe(1);
    });

    test('テストケースがない観点はスキップされる', () => {
      const analysis = [
        {
          aspect_no: 1,
          test_type: '表示（UI）',
          test_cases: []
        }
      ];

      const testCases = planner.extractTestCases(analysis);

      expect(testCases.length).toBe(0);
    });
  });

  describe('formatAsMarkdown()', () => {
    test('分析結果をMarkdownに変換できる', () => {
      const analysis = [
        {
          aspect_no: 1,
          test_type: '表示（UI）',
          test_category: 'レイアウト/文言',
          target_function: 'ホテルプラン一覧',
          specifications: ['仕様1', '仕様2'],
          target_bugs: ['バグ1', 'バグ2'],
          test_cases: [
            {
              case_id: 'TC001',
              title: 'Test 1',
              steps: ['Step 1', 'Step 2'],
              expected_results: ['Result 1']
            }
          ]
        }
      ];

      const markdown = planner.formatAsMarkdown(analysis);

      expect(markdown).toContain('# テスト分析結果');
      expect(markdown).toContain('## No.1');
      expect(markdown).toContain('表示（UI）');
      expect(markdown).toContain('対象の機能構造');
      expect(markdown).toContain('考慮すべき仕様');
      expect(markdown).toContain('狙うバグ');
      expect(markdown).toContain('TC001');
    });

    test('空の分析結果でもエラーにならない', () => {
      const markdown = planner.formatAsMarkdown([]);

      expect(markdown).toContain('# テスト分析結果');
    });
  });

  describe('analyzeWithLLM()', () => {
    test('テスト観点リストに基づいてLLM分析を実行できる', async () => {
      const aspects = await planner.loadTestAspects(testAspectsCSV);
      const prioritized = aspects.slice(0, 3); // 最初の3観点

      const options = {
        url: 'https://example.com',
        aspects: prioritized,
        existingCoverage: {},
        iteration: 1
      };

      const analysis = await planner.analyzeWithLLM(options);

      expect(Array.isArray(analysis)).toBe(true);
      expect(analysis.length).toBeGreaterThan(0);
    });

    test('LLMレスポンスのパースエラーをハンドリングできる', async () => {
      // パースエラーをシミュレート
      const mockLLMWithError = {
        chat: async () => ({ content: 'Invalid JSON' })
      };
      
      const plannerWithError = new OthelloPlanner({
        llm: mockLLMWithError,
        config: { testAspectsCSV }
      });

      const options = {
        url: 'https://example.com',
        aspects: [],
        existingCoverage: {},
        iteration: 1
      };

      await expect(async () => {
        await plannerWithError.analyzeWithLLM(options);
      }).rejects.toThrow();
    });
  });

  describe('統合テスト', () => {
    test('完全なテスト計画生成フロー（テスト観点リスト活用）', async () => {
      const options = {
        url: 'https://hotel-example-site.takeyaqa.dev/ja/plans.html',
        testAspectsCSV,
        existingCoverage: {
          aspectCoverage: {
            tested: 3,
            tested_aspects: [1, 2, 3]
          }
        },
        iteration: 2
      };

      // 1. テスト計画生成
      const result = await planner.generateTestPlan(options);
      
      expect(result).toHaveProperty('iteration');
      expect(result).toHaveProperty('aspects');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('testCases');
      expect(result).toHaveProperty('markdown');

      // 2. テストケース検証
      expect(Array.isArray(result.testCases)).toBe(true);
      expect(result.testCases.length).toBeGreaterThan(0);
      
      result.testCases.forEach(testCase => {
        expect(testCase).toHaveProperty('case_id');
        expect(testCase).toHaveProperty('aspect_no');
        expect(testCase).toHaveProperty('title');
      });

      // 3. Markdown検証
      expect(result.markdown).toContain('# テスト分析結果');
      expect(result.markdown).toContain('## No.');

      // 4. イテレーション番号確認
      expect(result.iteration).toBe(2);
    });
  });
});
