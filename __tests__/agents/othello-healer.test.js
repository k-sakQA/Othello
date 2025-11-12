/**
 * Othello-Healer テストスイート
 * 失敗したテストの分析と自動修復機能をテスト
 */

const OthelloHealer = require('../../src/agents/othello-healer');

describe('Othello-Healer', () => {
  let healer;
  let mockLLM;

  beforeEach(() => {
    mockLLM = {
      chat: jest.fn()
    };
    healer = new OthelloHealer({ llm: mockLLM });
  });

  describe('constructor', () => {
    test('LLMクライアントを受け取って初期化できる', () => {
      expect(healer.llm).toBe(mockLLM);
      expect(healer.config).toEqual({});
    });

    test('設定オブジェクトを保持する', () => {
      const config = { maxRetries: 3 };
      const healerWithConfig = new OthelloHealer({ llm: mockLLM, config });
      expect(healerWithConfig.config).toEqual(config);
    });
  });

  describe('analyze', () => {
    test('失敗したテストケースを分析できる', async () => {
      const failureData = {
        test_case_id: 'TC001',
        instructions: [
          { type: 'navigate', url: 'https://example.com' },
          { type: 'click', selector: 'button#submit' }
        ],
        error: {
          message: 'Element not found: button#submit',
          stack: 'Error: Element not found...',
          screenshot: 'base64...'
        },
        snapshot: {
          role: 'WebArea',
          children: [
            { role: 'button', name: 'Submit', ref: 'e1' }
          ]
        }
      };

      mockLLM.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          is_bug: false,
          bug_type: null,
          root_cause: 'セレクタが間違っている。実際の要素にはIDがない。',
          suggested_fix: {
            type: 'update_selector',
            old_selector: 'button#submit',
            new_selector: 'button:has-text("Submit")',
            ref: 'e1'
          },
          confidence: 0.95
        })
      });

      const result = await healer.analyze(failureData);

      expect(result.is_bug).toBe(false);
      expect(result.root_cause).toContain('セレクタが間違っている');
      expect(result.suggested_fix.new_selector).toBe('button:has-text("Submit")');
      expect(mockLLM.chat).toHaveBeenCalledTimes(1);
    });

    test('実際のバグを検出できる', async () => {
      const failureData = {
        test_case_id: 'TC002',
        instructions: [
          { type: 'fill', selector: 'input[name="email"]', value: 'test@example.com' },
          { type: 'click', selector: 'button[type="submit"]' }
        ],
        error: {
          message: 'Expected "Success" but got "Error: Invalid email"',
          screenshot: 'base64...'
        },
        snapshot: {
          role: 'WebArea',
          children: [
            { role: 'textbox', name: 'Email', ref: 'e1' }
          ]
        }
      };

      mockLLM.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          is_bug: true,
          bug_type: 'validation_error',
          root_cause: 'アプリケーションが有効なメールアドレスを拒否している',
          suggested_fix: null,
          confidence: 0.98,
          bug_report: {
            title: 'Valid email address rejected',
            severity: 'high',
            steps_to_reproduce: [
              'Enter valid email: test@example.com',
              'Click submit',
              'Error message appears'
            ],
            expected: 'Email should be accepted',
            actual: 'Error: Invalid email'
          }
        })
      });

      const result = await healer.analyze(failureData);

      expect(result.is_bug).toBe(true);
      expect(result.bug_type).toBe('validation_error');
      expect(result.bug_report).toBeDefined();
      expect(result.bug_report.title).toBe('Valid email address rejected');
    });

    test('必須パラメータがない場合はエラーを投げる', async () => {
      await expect(healer.analyze({})).rejects.toThrow('test_case_id is required');
      await expect(healer.analyze({ test_case_id: 'TC001' })).rejects.toThrow('instructions is required');
      await expect(healer.analyze({ 
        test_case_id: 'TC001',
        instructions: []
      })).rejects.toThrow('error is required');
    });
  });

  describe('heal', () => {
    test('テストスクリプトを修正できる（セレクタ更新）', async () => {
      const failureData = {
        test_case_id: 'TC001',
        instructions: [
          { type: 'click', selector: 'button#submit', description: 'Submit button' }
        ],
        error: { message: 'Element not found' },
        snapshot: { role: 'WebArea', children: [] }
      };

      mockLLM.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          is_bug: false,
          suggested_fix: {
            type: 'update_selector',
            instruction_index: 0,
            old_selector: 'button#submit',
            new_selector: 'button[type="submit"]'
          }
        })
      });

      const healed = await healer.heal(failureData);

      expect(healed.success).toBe(true);
      expect(healed.fixed_instructions[0].selector).toBe('button[type="submit"]');
      expect(healed.changes).toHaveLength(1);
      expect(healed.changes[0].type).toBe('update_selector');
    });

    test('バグの場合は修正せずにバグレポートを返す', async () => {
      const failureData = {
        test_case_id: 'TC002',
        instructions: [{ type: 'click', selector: 'button' }],
        error: { message: 'Application error' },
        snapshot: { role: 'WebArea' }
      };

      mockLLM.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          is_bug: true,
          bug_report: {
            title: 'Button click causes application error',
            severity: 'critical'
          }
        })
      });

      const healed = await healer.heal(failureData);

      expect(healed.success).toBe(false);
      expect(healed.is_bug).toBe(true);
      expect(healed.bug_report).toBeDefined();
      expect(healed.fixed_instructions).toBeUndefined();
    });

    test('複数の命令を修正できる', async () => {
      const failureData = {
        test_case_id: 'TC003',
        instructions: [
          { type: 'fill', selector: 'input#name', value: 'Test' },
          { type: 'click', selector: 'button#submit' }
        ],
        error: { message: 'Multiple elements not found' },
        snapshot: { role: 'WebArea' }
      };

      mockLLM.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          is_bug: false,
          suggested_fix: {
            type: 'update_multiple',
            changes: [
              {
                instruction_index: 0,
                old_selector: 'input#name',
                new_selector: 'input[name="name"]'
              },
              {
                instruction_index: 1,
                old_selector: 'button#submit',
                new_selector: 'button[type="submit"]'
              }
            ]
          }
        })
      });

      const healed = await healer.heal(failureData);

      expect(healed.success).toBe(true);
      expect(healed.fixed_instructions[0].selector).toBe('input[name="name"]');
      expect(healed.fixed_instructions[1].selector).toBe('button[type="submit"]');
      expect(healed.changes).toHaveLength(2);
    });

    test('selectタグにfillを使うケースをヒューリスティックで修復できる', async () => {
      const failureData = {
        test_case_id: 'TC_SELECT',
        instructions: [
          { type: 'navigate', url: 'https://example.com', description: 'ページを開く' },
          {
            type: 'fill',
            selector: 'aria-ref=e52',
            value: 'メール',
            description: '確認のご連絡を入力'
          }
        ],
        error: {
          message: 'Error: locator.fill: Error: Element is not an <input>, <textarea> or [contenteditable] element. locator resolved to <select ...>',
          instruction_index: 1,
          instruction_type: 'fill'
        },
        snapshot: {}
      };

      const healed = await healer.heal(failureData);

      expect(healed.success).toBe(true);
      expect(healed.fixed_instructions[1].type).toBe('select_option');
      expect(healed.fixed_instructions[1].values).toEqual(['メール']);
      expect(healed.heuristic_rule).toBe('select_fill_to_select_option');
      expect(mockLLM.chat).not.toHaveBeenCalled();
    });

    test('HTMLエスケープされた<select>情報でもヒューリスティックが発動する', async () => {
      const failureData = {
        test_case_id: 'TC_SELECT_HTML',
        instructions: [
          { type: 'navigate', url: 'https://example.com', description: 'ページを開く' },
          {
            type: 'fill',
            selector: 'aria-ref=e52',
            value: 'メール',
            description: '確認のご連絡を入力'
          }
        ],
        error: {
          message: 'Error: locator.fill: Error: Element is not an <input>, <textarea> or [contenteditable] element. locator resolved to &lt;select ...>',
          instruction_index: 1,
          instruction_type: 'fill'
        },
        snapshot: {}
      };

      const healed = await healer.heal(failureData);

      expect(healed.success).toBe(true);
      expect(healed.fixed_instructions[1].type).toBe('select_option');
      expect(healed.heuristic_rule).toBe('select_fill_to_select_option');
      expect(mockLLM.chat).not.toHaveBeenCalled();
    });

    test('ヒューリスティック条件を満たさない場合はLLMにフォールバックする', async () => {
      const failureData = {
        test_case_id: 'TC_NO_SELECT',
        instructions: [
          {
            type: 'fill',
            selector: 'input#contact',
            value: 'メール',
            description: '確認のご連絡を入力'
          }
        ],
        error: {
          message: 'Error: locator.fill: Element is not an <input>',
          instruction_index: 0,
          instruction_type: 'fill'
        },
        snapshot: {}
      };

      mockLLM.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          is_bug: false,
          root_cause: 'セレクタを更新する必要があります',
          suggested_fix: {
            type: 'update_selector',
            instruction_index: 0,
            new_selector: 'select#contact'
          }
        })
      });

      const healed = await healer.heal(failureData);

      expect(mockLLM.chat).toHaveBeenCalledTimes(1);
      expect(healed.success).toBe(true);
      expect(healed.fixed_instructions[0].selector).toBe('select#contact');
    });
  });

  describe('buildAnalysisPrompt', () => {
    test('失敗分析用のプロンプトを構築できる', () => {
      const failureData = {
        test_case_id: 'TC001',
        instructions: [
          { type: 'click', selector: 'button#submit' }
        ],
        error: {
          message: 'Element not found: button#submit'
        },
        snapshot: {
          role: 'WebArea',
          children: [
            { role: 'button', name: 'Submit', ref: 'e1' }
          ]
        }
      };

      const prompt = healer.buildAnalysisPrompt(failureData);

      expect(prompt).toContain('TC001');
      expect(prompt).toContain('button#submit');
      expect(prompt).toContain('Element not found');
      expect(prompt).toContain('is_bug');
      expect(prompt).toContain('suggested_fix');
    });
  });

  describe('parseAnalysisResponse', () => {
    test('JSON形式のレスポンスをパースできる', () => {
      const response = JSON.stringify({
        is_bug: false,
        root_cause: 'Selector issue',
        suggested_fix: { type: 'update_selector' }
      });

      const parsed = healer.parseAnalysisResponse(response);

      expect(parsed.is_bug).toBe(false);
      expect(parsed.root_cause).toBe('Selector issue');
    });

    test('Markdownコードブロック内のJSONをパースできる', () => {
      const response = '```json\n{"is_bug": true, "bug_type": "crash"}\n```';

      const parsed = healer.parseAnalysisResponse(response);

      expect(parsed.is_bug).toBe(true);
      expect(parsed.bug_type).toBe('crash');
    });

    test('パースエラー時は例外を投げる', () => {
      expect(() => healer.parseAnalysisResponse('invalid json')).toThrow();
    });
  });

  describe('applyFix', () => {
    test('セレクタ更新を適用できる', () => {
      const instructions = [
        { type: 'click', selector: 'button#old', description: 'Click' }
      ];
      const fix = {
        type: 'update_selector',
        instruction_index: 0,
        new_selector: 'button#new'
      };

      const updated = healer.applyFix(instructions, fix);

      expect(updated[0].selector).toBe('button#new');
    });

    test('複数の修正を適用できる', () => {
      const instructions = [
        { type: 'fill', selector: 'input#a', value: 'A' },
        { type: 'click', selector: 'button#b' }
      ];
      const fix = {
        type: 'update_multiple',
        changes: [
          { instruction_index: 0, new_selector: 'input[name="a"]' },
          { instruction_index: 1, new_selector: 'button[name="b"]' }
        ]
      };

      const updated = healer.applyFix(instructions, fix);

      expect(updated[0].selector).toBe('input[name="a"]');
      expect(updated[1].selector).toBe('button[name="b"]');
    });

    test('ref を追加できる', () => {
      const instructions = [
        { type: 'click', selector: 'button', description: 'Click' }
      ];
      const fix = {
        type: 'add_ref',
        instruction_index: 0,
        ref: 'e1'
      };

      const updated = healer.applyFix(instructions, fix);

      expect(updated[0].ref).toBe('e1');
    });

    test('命令を削除できる', () => {
      const instructions = [
        { type: 'click', selector: 'button1' },
        { type: 'click', selector: 'button2' }
      ];
      const fix = {
        type: 'remove_instruction',
        instruction_index: 0
      };

      const updated = healer.applyFix(instructions, fix);

      expect(updated).toHaveLength(1);
      expect(updated[0].selector).toBe('button2');
    });

    test('命令を挿入できる', () => {
      const instructions = [
        { type: 'click', selector: 'button1' }
      ];
      const fix = {
        type: 'insert_instruction',
        instruction_index: 0,
        new_instruction: { type: 'wait_for', time: 1, description: 'Wait' }
      };

      const updated = healer.applyFix(instructions, fix);

      expect(updated).toHaveLength(2);
      expect(updated[0].type).toBe('wait_for');
      expect(updated[1].type).toBe('click');
    });
  });

  describe('エラーハンドリング', () => {
    test('LLM API エラー時は例外を投げる', async () => {
      mockLLM.chat.mockRejectedValueOnce(new Error('API Error'));

      const failureData = {
        test_case_id: 'TC001',
        instructions: [],
        error: { message: 'Test' },
        snapshot: {}
      };

      await expect(healer.analyze(failureData)).rejects.toThrow('API Error');
    });

    test('不正な修正タイプの場合はエラーを投げる', () => {
      const instructions = [{ type: 'click', selector: 'button' }];
      const fix = { type: 'unknown_type' };

      expect(() => healer.applyFix(instructions, fix)).toThrow('Unknown fix type');
    });
  });
});
