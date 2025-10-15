const InstructionGenerator = require('../src/instruction-generator');
const ConfigManager = require('../src/config');
const path = require('path');

describe('InstructionGenerator', () => {
  let generator;
  let mockConfig;

  beforeAll(async () => {
    // テスト用のConfig Managerをモック
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    mockConfig = await ConfigManager.load(configPath);
    generator = new InstructionGenerator(mockConfig);
  });

  describe('generate()', () => {
    test('カバレッジデータからテスト指示を生成できる', async () => {
      const coverageData = {
        analysis_date: '2025-10-15T10:00:00Z',
        total_scenarios_executed: 1,
        coverage_summary: {
          percentage: 40,
          visited_pages: 2,
          unvisited_pages: 3,
          tested_elements: 5,
          untested_elements: 8
        },
        uncovered: {
          pages: [
            { url: '/settings', description: '設定ページ' },
            { url: '/profile', description: 'プロフィールページ' },
            { url: '/help', description: 'ヘルプページ' }
          ],
          elements: [
            { page: 'ダッシュボード', element: 'エクスポートボタン', selector: '#export-btn' },
            { page: 'ダッシュボード', element: '検索ボックス', selector: '#search' }
          ]
        }
      };

      const instructions = await generator.generate(coverageData, 2);

      expect(instructions).toHaveProperty('iteration', 2);
      expect(instructions).toHaveProperty('generated_at');
      expect(instructions).toHaveProperty('test_instructions');
      expect(Array.isArray(instructions.test_instructions)).toBe(true);
      expect(instructions.test_instructions.length).toBeGreaterThan(0);
    });

    test('未カバーページが空の場合でもエラーにならない', async () => {
      const coverageData = {
        analysis_date: '2025-10-15T10:00:00Z',
        total_scenarios_executed: 1,
        coverage_summary: {
          percentage: 100,
          visited_pages: 5,
          unvisited_pages: 0,
          tested_elements: 10,
          untested_elements: 0
        },
        uncovered: {
          pages: [],
          elements: []
        }
      };

      const instructions = await generator.generate(coverageData, 2);

      expect(instructions).toHaveProperty('test_instructions');
      expect(instructions.test_instructions.length).toBe(0);
    });
  });

  describe('generatePageInstructions()', () => {
    test('未カバーページからテスト指示を生成できる', () => {
      const uncoveredPages = [
        { url: '/settings', description: '設定ページ' },
        { url: '/profile', description: 'プロフィールページ' }
      ];

      const instructions = generator.generatePageInstructions(uncoveredPages);

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBe(2);
      expect(instructions[0]).toHaveProperty('priority');
      expect(instructions[0]).toHaveProperty('target');
      expect(instructions[0]).toHaveProperty('instruction');
      expect(instructions[0]).toHaveProperty('focus_areas');
    });

    test('最大5ページまで生成する', () => {
      const uncoveredPages = Array.from({ length: 10 }, (_, i) => ({
        url: `/page${i}`,
        description: `ページ${i}`
      }));

      const instructions = generator.generatePageInstructions(uncoveredPages);

      expect(instructions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('generateFeatureInstructions()', () => {
    test('未カバー機能からテスト指示を生成できる', () => {
      const uncoveredFeatures = [
        { page: 'ダッシュボード', element: 'エクスポートボタン', selector: '#export-btn' },
        { page: 'ダッシュボード', element: '検索ボックス', selector: '#search' }
      ];

      const instructions = generator.generateFeatureInstructions(uncoveredFeatures);

      expect(Array.isArray(instructions)).toBe(true);
      expect(instructions.length).toBe(2);
      expect(instructions[0]).toHaveProperty('priority');
      expect(instructions[0]).toHaveProperty('target');
      expect(instructions[0]).toHaveProperty('instruction');
    });

    test('最大5機能まで生成する', () => {
      const uncoveredFeatures = Array.from({ length: 10 }, (_, i) => ({
        page: 'テストページ',
        element: `要素${i}`,
        selector: `#element${i}`
      }));

      const instructions = generator.generateFeatureInstructions(uncoveredFeatures);

      expect(instructions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('priority sorting', () => {
    test('優先度でソートされる（high→medium→low）', async () => {
      const coverageData = {
        analysis_date: '2025-10-15T10:00:00Z',
        total_scenarios_executed: 1,
        coverage_summary: {
          percentage: 40,
          visited_pages: 2,
          unvisited_pages: 3,
          tested_elements: 5,
          untested_elements: 3
        },
        uncovered: {
          pages: [
            { url: '/settings', description: '設定ページ' },
            { url: '/profile', description: 'プロフィールページ' },
            { url: '/help', description: 'ヘルプページ' }
          ],
          elements: [
            { page: 'ダッシュボード', element: 'エクスポートボタン', selector: '#export-btn' }
          ]
        }
      };

      const instructions = await generator.generate(coverageData, 2);

      // 優先度の順序を確認
      const priorities = instructions.test_instructions.map(i => i.priority);
      const priorityValues = { high: 1, medium: 2, low: 3 };
      const sortedPriorities = [...priorities].sort((a, b) => 
        priorityValues[a] - priorityValues[b]
      );

      expect(priorities).toEqual(sortedPriorities);
    });
  });

  describe('Claude API integration (future)', () => {
    test('optimizeWithClaude()は現在はスキップされる', async () => {
      const mockInstructions = {
        iteration: 2,
        generated_at: new Date().toISOString(),
        test_instructions: [
          {
            priority: 'high',
            target: 'テスト',
            instruction: 'テストしてください',
            focus_areas: ['テスト領域']
          }
        ]
      };

      // Claude APIは将来実装予定なので、現在はそのまま返る
      const optimized = await generator.optimizeWithClaude(mockInstructions);

      expect(optimized).toEqual(mockInstructions);
    });
  });

  describe('instruction format', () => {
    test('生成される指示が正しい形式である', async () => {
      const coverageData = {
        analysis_date: '2025-10-15T10:00:00Z',
        total_scenarios_executed: 1,
        coverage_summary: {
          percentage: 40,
          visited_pages: 2,
          unvisited_pages: 1,
          tested_elements: 5,
          untested_elements: 1
        },
        uncovered: {
          pages: [{ url: '/settings', description: '設定ページ' }],
          elements: [{ page: 'ダッシュボード', element: 'ボタン', selector: '#btn' }]
        }
      };

      const instructions = await generator.generate(coverageData, 2);

      // 各指示項目が正しい形式か確認
      instructions.test_instructions.forEach(inst => {
        expect(inst).toHaveProperty('priority');
        expect(['high', 'medium', 'low']).toContain(inst.priority);
        expect(inst).toHaveProperty('target');
        expect(typeof inst.target).toBe('string');
        expect(inst).toHaveProperty('instruction');
        expect(typeof inst.instruction).toBe('string');
        expect(inst).toHaveProperty('focus_areas');
        expect(Array.isArray(inst.focus_areas)).toBe(true);
      });
    });
  });
});
