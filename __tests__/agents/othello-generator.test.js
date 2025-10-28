/**
 * @jest-environment node
 */

const OthelloGenerator = require('../../src/agents/othello-generator');

describe('OthelloGenerator', () => {
  let generator;
  let mockLLM;
  
  beforeEach(() => {
    mockLLM = {
      chat: jest.fn()
    };
    
    generator = new OthelloGenerator({ 
      llm: mockLLM,
      config: {}
    });
  });

  describe('constructor', () => {
    test('依存性注入でLLMクライアントを受け取る', () => {
      expect(generator.llm).toBe(mockLLM);
    });

    test('configを保持する', () => {
      const config = { option: 'value' };
      const gen = new OthelloGenerator({ llm: mockLLM, config });
      expect(gen.config).toEqual(config);
    });
  });

  describe('generate', () => {
    test('テストケース配列からMCP命令を生成する', async () => {
      const testCases = [
        {
          case_id: 'TC001',
          title: 'ログインフォームテスト',
          steps: ['ログインページを開く', 'ユーザー名を入力', 'パスワードを入力', 'ログインボタンをクリック'],
          expected_results: ['ダッシュボードに遷移', 'ユーザー名が表示される'],
          aspect_no: 1,
          priority: 'P0'
        }
      ];

      const snapshot = {
        role: 'WebArea',
        name: 'Login Page',
        children: [
          { role: 'textbox', name: 'Username', ref: 'e1' },
          { role: 'textbox', name: 'Password', ref: 'e2' },
          { role: 'button', name: 'Login', ref: 'e3' }
        ]
      };

      mockLLM.chat.mockResolvedValue({
        content: JSON.stringify([
          {
            test_case_id: 'TC001',
            aspect_no: 1,
            instructions: [
              { type: 'navigate', url: 'https://example.com/login', description: 'Open login page' },
              { type: 'fill', ref: 'e1', selector: 'input[name="username"]', value: 'testuser', description: 'Enter username' },
              { type: 'fill', ref: 'e2', selector: 'input[name="password"]', value: 'password123', description: 'Enter password' },
              { type: 'click', ref: 'e3', selector: 'button[type="submit"]', description: 'Click login button' }
            ]
          }
        ])
      });

      const result = await generator.generate({
        testCases,
        snapshot,
        url: 'https://example.com/login'
      });

      expect(result).toHaveLength(1);
      expect(result[0].test_case_id).toBe('TC001');
      expect(result[0].instructions).toHaveLength(4);
      expect(result[0].instructions[0].type).toBe('navigate');
    });

    test('複数のテストケースを処理できる', async () => {
      const testCases = [
        {
          case_id: 'TC001',
          title: 'Test 1',
          steps: ['Step 1'],
          expected_results: ['Result 1'],
          aspect_no: 1
        },
        {
          case_id: 'TC002',
          title: 'Test 2',
          steps: ['Step 2'],
          expected_results: ['Result 2'],
          aspect_no: 2
        }
      ];

      // 各呼び出しで異なるレスポンスを返す
      mockLLM.chat
        .mockResolvedValueOnce({
          content: JSON.stringify([
            { test_case_id: 'TC001', aspect_no: 1, instructions: [] }
          ])
        })
        .mockResolvedValueOnce({
          content: JSON.stringify([
            { test_case_id: 'TC002', aspect_no: 2, instructions: [] }
          ])
        });

      const result = await generator.generate({
        testCases,
        snapshot: {},
        url: 'https://example.com'
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('buildGenerationPrompt', () => {
    test('テストケースとSnapshotからプロンプトを構築する', () => {
      const testCase = {
        case_id: 'TC001',
        title: 'フォーム入力テスト',
        steps: ['名前を入力', '送信ボタンをクリック'],
        expected_results: ['確認ページに遷移'],
        aspect_no: 1
      };

      const snapshot = {
        role: 'WebArea',
        children: [
          { role: 'textbox', name: 'Name', ref: 'e1' },
          { role: 'button', name: 'Submit', ref: 'e2' }
        ]
      };

      const prompt = generator.buildGenerationPrompt({
        testCase,
        snapshot,
        url: 'https://example.com/form'
      });

      expect(prompt).toContain('TC001');
      expect(prompt).toContain('フォーム入力テスト');
      expect(prompt).toContain('名前を入力');
      expect(prompt).toContain('送信ボタンをクリック');
      expect(prompt).toContain('https://example.com/form');
    });

    test('Snapshotの要素情報を含める', () => {
      const snapshot = {
        role: 'WebArea',
        children: [
          { role: 'textbox', name: 'Email', ref: 'e10' }
        ]
      };

      const prompt = generator.buildGenerationPrompt({
        testCase: { case_id: 'TC001', steps: [], expected_results: [] },
        snapshot,
        url: 'https://example.com'
      });

      expect(prompt).toContain('textbox');
      expect(prompt).toContain('Email');
      expect(prompt).toContain('e10');
    });
  });

  describe('parseGenerationResponse', () => {
    test('JSONレスポンスをパースする', () => {
      const response = JSON.stringify([
        {
          test_case_id: 'TC001',
          aspect_no: 1,
          instructions: [
            { type: 'navigate', url: 'https://example.com' }
          ]
        }
      ]);

      const result = generator.parseGenerationResponse(response);

      expect(result).toHaveLength(1);
      expect(result[0].test_case_id).toBe('TC001');
    });

    test('Markdownコードブロック内のJSONを抽出する', () => {
      const response = '```json\n[{"test_case_id": "TC001", "instructions": []}]\n```';

      const result = generator.parseGenerationResponse(response);

      expect(result).toHaveLength(1);
      expect(result[0].test_case_id).toBe('TC001');
    });

    test('不正なJSONの場合はエラーをスローする', () => {
      const response = 'invalid json';

      expect(() => {
        generator.parseGenerationResponse(response);
      }).toThrow('Failed to parse LLM response');
    });
  });

  describe('extractSnapshotElements', () => {
    test('Snapshotから要素リストを抽出する', () => {
      const snapshot = {
        role: 'WebArea',
        name: 'Page',
        children: [
          { role: 'textbox', name: 'Username', ref: 'e1' },
          { role: 'button', name: 'Submit', ref: 'e2' },
          {
            role: 'group',
            children: [
              { role: 'link', name: 'Home', ref: 'e3' }
            ]
          }
        ]
      };

      const elements = generator.extractSnapshotElements(snapshot);

      expect(elements).toHaveLength(5); // WebArea + textbox + button + group + link
      expect(elements[0].role).toBe('WebArea');
      expect(elements[1].role).toBe('textbox');
      expect(elements[2].role).toBe('button');
      expect(elements[3].role).toBe('group');
      expect(elements[4].role).toBe('link');
    });

    test('空のSnapshotでも動作する', () => {
      const elements = generator.extractSnapshotElements({});

      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThanOrEqual(0);
    });

    test('refを持つ要素のみを抽出できる', () => {
      const snapshot = {
        role: 'WebArea',
        children: [
          { role: 'textbox', name: 'Field1', ref: 'e1' },
          { role: 'textbox', name: 'Field2' }, // refなし
          { role: 'button', name: 'Button', ref: 'e3' }
        ]
      };

      const elements = generator.extractSnapshotElements(snapshot);
      const withRef = elements.filter(el => el.ref);

      expect(withRef).toHaveLength(2);
    });
  });

  describe('validateInstructions', () => {
    test('有効な命令を検証する', () => {
      const instructions = [
        { type: 'navigate', url: 'https://example.com', description: 'Navigate' },
        { type: 'fill', ref: 'e1', value: 'text', description: 'Fill field' },
        { type: 'click', ref: 'e2', description: 'Click button' }
      ];

      const isValid = generator.validateInstructions(instructions);

      expect(isValid).toBe(true);
    });

    test('必須フィールドが欠けている場合はfalseを返す', () => {
      const instructions = [
        { type: 'navigate' } // urlとdescriptionが欠けている
      ];

      const isValid = generator.validateInstructions(instructions);

      expect(isValid).toBe(false);
    });

    test('空の配列はtrueを返す', () => {
      const isValid = generator.validateInstructions([]);

      expect(isValid).toBe(true);
    });

    test('typeが不正な場合はfalseを返す', () => {
      const instructions = [
        { type: 'invalid_type', description: 'Test' }
      ];

      const isValid = generator.validateInstructions(instructions);

      expect(isValid).toBe(false);
    });
  });

  describe('formatSnapshotForPrompt', () => {
    test('Snapshotを読みやすい形式にフォーマットする', () => {
      const snapshot = {
        role: 'WebArea',
        name: 'Login Page',
        children: [
          { role: 'textbox', name: 'Username', ref: 'e1' },
          { role: 'button', name: 'Login', ref: 'e2' }
        ]
      };

      const formatted = generator.formatSnapshotForPrompt(snapshot);

      expect(formatted).toContain('WebArea "Login Page"');
      expect(formatted).toContain('textbox "Username" [e1]');
      expect(formatted).toContain('button "Login" [e2]');
    });

    test('ネストした構造を正しくインデントする', () => {
      const snapshot = {
        role: 'WebArea',
        children: [
          {
            role: 'group',
            children: [
              { role: 'button', name: 'Click', ref: 'e1' }
            ]
          }
        ]
      };

      const formatted = generator.formatSnapshotForPrompt(snapshot);

      expect(formatted).toContain('- WebArea');
      expect(formatted).toContain('  - group');
      expect(formatted).toContain('    - button');
    });
  });

  describe('エラーハンドリング', () => {
    test('LLM APIエラー時は適切にエラーをスローする', async () => {
      mockLLM.chat.mockRejectedValue(new Error('API Error'));

      await expect(
        generator.generate({
          testCases: [{ case_id: 'TC001', steps: [], expected_results: [] }],
          snapshot: {},
          url: 'https://example.com'
        })
      ).rejects.toThrow('API Error');
    });

    test('必須パラメータが欠けている場合はエラーをスローする', async () => {
      await expect(
        generator.generate({})
      ).rejects.toThrow();
    });
  });
});
