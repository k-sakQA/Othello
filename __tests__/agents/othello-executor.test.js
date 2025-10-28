/**
 * Othello-Executor テストスイート
 * Generator生成のMCP命令を実行
 */

const OthelloExecutor = require('../../src/agents/othello-executor');

describe('Othello-Executor', () => {
  let executor;
  let mockPlaywrightMCP;

  beforeEach(() => {
    // Playwright MCP のモック
    mockPlaywrightMCP = {
      navigate: jest.fn(),
      click: jest.fn(),
      fill: jest.fn(),
      verify_text_visible: jest.fn(),
      verify_element_visible: jest.fn(),
      snapshot: jest.fn(),
      wait_for: jest.fn(),
      take_screenshot: jest.fn()
    };

    executor = new OthelloExecutor({ 
      playwrightMCP: mockPlaywrightMCP,
      config: {
        timeout: 30000,
        headless: true
      }
    });
  });

  describe('constructor', () => {
    test('Playwright MCPクライアントを受け取って初期化できる', () => {
      expect(executor.playwrightMCP).toBe(mockPlaywrightMCP);
      expect(executor.config).toBeDefined();
      expect(executor.config.timeout).toBe(30000);
    });

    test('デフォルト設定で初期化できる', () => {
      const executorDefault = new OthelloExecutor({ playwrightMCP: mockPlaywrightMCP });
      expect(executorDefault.config.timeout).toBe(30000);
      expect(executorDefault.config.headless).toBe(true);
    });
  });

  describe('execute', () => {
    test('単一のMCP命令を実行できる', async () => {
      const instructions = [
        {
          type: 'navigate',
          url: 'https://example.com',
          description: 'トップページを開く'
        }
      ];

      mockPlaywrightMCP.navigate.mockResolvedValueOnce({ success: true });

      const result = await executor.execute({
        test_case_id: 'TC001',
        instructions
      });

      expect(result.success).toBe(true);
      expect(result.test_case_id).toBe('TC001');
      expect(result.executed_instructions).toBe(1);
      expect(result.failed_instructions).toBe(0);
      expect(mockPlaywrightMCP.navigate).toHaveBeenCalledWith({
        url: 'https://example.com',
        intent: 'トップページを開く'
      });
    });

    test('複数のMCP命令を順次実行できる', async () => {
      const instructions = [
        { type: 'navigate', url: 'https://example.com', description: 'ページを開く' },
        { type: 'fill', selector: 'input#name', ref: 'e1', value: 'Test', description: '名前入力' },
        { type: 'click', selector: 'button#submit', ref: 'e2', description: '送信' }
      ];

      mockPlaywrightMCP.navigate.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.fill.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.click.mockResolvedValueOnce({ success: true });

      const result = await executor.execute({
        test_case_id: 'TC002',
        instructions
      });

      expect(result.success).toBe(true);
      expect(result.executed_instructions).toBe(3);
      expect(result.failed_instructions).toBe(0);
      expect(mockPlaywrightMCP.navigate).toHaveBeenCalledTimes(1);
      expect(mockPlaywrightMCP.fill).toHaveBeenCalledTimes(1);
      expect(mockPlaywrightMCP.click).toHaveBeenCalledTimes(1);
    });

    test('命令実行失敗時はエラー情報を含む', async () => {
      const instructions = [
        { type: 'click', selector: 'button#missing', description: '存在しないボタン' }
      ];

      mockPlaywrightMCP.click.mockRejectedValueOnce(
        new Error('Element not found: button#missing')
      );
      mockPlaywrightMCP.snapshot.mockResolvedValueOnce({
        role: 'WebArea',
        children: []
      });

      const result = await executor.execute({
        test_case_id: 'TC003',
        instructions
      });

      expect(result.success).toBe(false);
      expect(result.executed_instructions).toBe(1);
      expect(result.failed_instructions).toBe(1);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Element not found');
      expect(result.snapshot).toBeDefined();
    });

    test('必須パラメータがない場合はエラーを投げる', async () => {
      await expect(executor.execute({})).rejects.toThrow('test_case_id is required');
      await expect(executor.execute({ test_case_id: 'TC001' })).rejects.toThrow('instructions is required');
    });
  });

  describe('executeInstruction', () => {
    test('navigate命令を実行できる', async () => {
      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'ページを開く'
      };

      mockPlaywrightMCP.navigate.mockResolvedValueOnce({ success: true });

      const result = await executor.executeInstruction(instruction);

      expect(result.success).toBe(true);
      expect(result.instruction_type).toBe('navigate');
      expect(mockPlaywrightMCP.navigate).toHaveBeenCalledWith({
        url: 'https://example.com',
        intent: 'ページを開く'
      });
    });

    test('click命令を実行できる', async () => {
      const instruction = {
        type: 'click',
        selector: 'button#submit',
        ref: 'e1',
        description: '送信ボタンをクリック'
      };

      mockPlaywrightMCP.click.mockResolvedValueOnce({ success: true });

      const result = await executor.executeInstruction(instruction);

      expect(result.success).toBe(true);
      expect(mockPlaywrightMCP.click).toHaveBeenCalledWith({
        element: '送信ボタンをクリック',
        ref: 'e1',
        intent: '送信ボタンをクリック'
      });
    });

    test('fill命令を実行できる', async () => {
      const instruction = {
        type: 'fill',
        selector: 'input#email',
        ref: 'e2',
        value: 'test@example.com',
        description: 'メールアドレスを入力'
      };

      mockPlaywrightMCP.fill.mockResolvedValueOnce({ success: true });

      const result = await executor.executeInstruction(instruction);

      expect(result.success).toBe(true);
      expect(mockPlaywrightMCP.fill).toHaveBeenCalledWith({
        element: 'メールアドレスを入力',
        ref: 'e2',
        text: 'test@example.com',
        intent: 'メールアドレスを入力'
      });
    });

    test('verify_text_visible命令を実行できる', async () => {
      const instruction = {
        type: 'verify_text_visible',
        text: '送信完了',
        description: '成功メッセージを確認'
      };

      mockPlaywrightMCP.verify_text_visible.mockResolvedValueOnce({ success: true });

      const result = await executor.executeInstruction(instruction);

      expect(result.success).toBe(true);
      expect(mockPlaywrightMCP.verify_text_visible).toHaveBeenCalledWith({
        text: '送信完了',
        intent: '成功メッセージを確認'
      });
    });

    test('verify_element_visible命令を実行できる', async () => {
      const instruction = {
        type: 'verify_element_visible',
        role: 'button',
        accessibleName: '送信',
        description: '送信ボタンが表示されている'
      };

      mockPlaywrightMCP.verify_element_visible.mockResolvedValueOnce({ success: true });

      const result = await executor.executeInstruction(instruction);

      expect(result.success).toBe(true);
      expect(mockPlaywrightMCP.verify_element_visible).toHaveBeenCalledWith({
        role: 'button',
        accessibleName: '送信',
        intent: '送信ボタンが表示されている'
      });
    });

    test('wait_for命令を実行できる', async () => {
      const instruction = {
        type: 'wait_for',
        time: 2,
        description: 'ページ読み込みを待つ'
      };

      mockPlaywrightMCP.wait_for.mockResolvedValueOnce({ success: true });

      const result = await executor.executeInstruction(instruction);

      expect(result.success).toBe(true);
      expect(mockPlaywrightMCP.wait_for).toHaveBeenCalledWith({
        time: 2,
        intent: 'ページ読み込みを待つ'
      });
    });

    test('サポートされていない命令タイプはエラー', async () => {
      const instruction = {
        type: 'unknown_type',
        description: '不明な命令'
      };

      await expect(executor.executeInstruction(instruction)).rejects.toThrow(
        'Unsupported instruction type: unknown_type'
      );
    });
  });

  describe('captureSnapshot', () => {
    test('失敗時のスナップショットを取得できる', async () => {
      const snapshot = {
        role: 'WebArea',
        children: [
          { role: 'button', name: 'Submit', ref: 'e1' },
          { role: 'textbox', name: 'Name', ref: 'e2' }
        ]
      };

      mockPlaywrightMCP.snapshot.mockResolvedValueOnce(snapshot);

      const result = await executor.captureSnapshot();

      expect(result).toEqual(snapshot);
      expect(mockPlaywrightMCP.snapshot).toHaveBeenCalledTimes(1);
    });

    test('スナップショット取得失敗時はnullを返す', async () => {
      mockPlaywrightMCP.snapshot.mockRejectedValueOnce(new Error('Snapshot failed'));

      const result = await executor.captureSnapshot();

      expect(result).toBeNull();
    });
  });

  describe('buildMCPArguments', () => {
    test('navigate用の引数を構築できる', () => {
      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'ページを開く'
      };

      const args = executor.buildMCPArguments(instruction);

      expect(args).toEqual({
        url: 'https://example.com',
        intent: 'ページを開く'
      });
    });

    test('click用の引数を構築できる（refあり）', () => {
      const instruction = {
        type: 'click',
        selector: 'button#submit',
        ref: 'e1',
        description: '送信'
      };

      const args = executor.buildMCPArguments(instruction);

      expect(args).toEqual({
        element: '送信',
        ref: 'e1',
        intent: '送信'
      });
    });

    test('fill用の引数を構築できる', () => {
      const instruction = {
        type: 'fill',
        selector: 'input#name',
        ref: 'e2',
        value: 'Test User',
        description: '名前入力'
      };

      const args = executor.buildMCPArguments(instruction);

      expect(args).toEqual({
        element: '名前入力',
        ref: 'e2',
        text: 'Test User',
        intent: '名前入力'
      });
    });

    test('verify_text_visible用の引数を構築できる', () => {
      const instruction = {
        type: 'verify_text_visible',
        text: '成功',
        description: 'メッセージ確認'
      };

      const args = executor.buildMCPArguments(instruction);

      expect(args).toEqual({
        text: '成功',
        intent: 'メッセージ確認'
      });
    });
  });

  describe('統合シナリオ', () => {
    test('完全なフォーム送信フローを実行できる', async () => {
      const instructions = [
        { type: 'navigate', url: 'https://example.com/form', description: 'フォームページを開く' },
        { type: 'fill', selector: 'input#name', ref: 'e1', value: 'Taro', description: '名前入力' },
        { type: 'fill', selector: 'input#email', ref: 'e2', value: 'taro@example.com', description: 'メール入力' },
        { type: 'click', selector: 'button#submit', ref: 'e3', description: '送信' },
        { type: 'wait_for', time: 1, description: '処理完了を待つ' },
        { type: 'verify_text_visible', text: '送信完了', description: '成功メッセージ確認' }
      ];

      // 各MCP呼び出しをモック
      mockPlaywrightMCP.navigate.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.fill.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.fill.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.click.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.wait_for.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.verify_text_visible.mockResolvedValueOnce({ success: true });

      const result = await executor.execute({
        test_case_id: 'TC_FORM_001',
        instructions
      });

      expect(result.success).toBe(true);
      expect(result.executed_instructions).toBe(6);
      expect(result.failed_instructions).toBe(0);
      expect(result.duration_ms).toBeGreaterThan(0);
    });

    test('途中で失敗した場合は後続の命令を実行せずエラーを返す', async () => {
      const instructions = [
        { type: 'navigate', url: 'https://example.com', description: 'ページを開く' },
        { type: 'click', selector: 'button#missing', description: '存在しないボタン' },
        { type: 'verify_text_visible', text: '成功', description: 'この命令は実行されない' }
      ];

      mockPlaywrightMCP.navigate.mockResolvedValueOnce({ success: true });
      mockPlaywrightMCP.click.mockRejectedValueOnce(new Error('Element not found'));
      mockPlaywrightMCP.snapshot.mockResolvedValueOnce({ role: 'WebArea', children: [] });

      const result = await executor.execute({
        test_case_id: 'TC_FAIL_001',
        instructions
      });

      expect(result.success).toBe(false);
      expect(result.executed_instructions).toBe(2); // navigate + click(失敗)
      expect(result.failed_instructions).toBe(1);
      expect(mockPlaywrightMCP.verify_text_visible).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    test('MCP接続エラーを適切に処理する', async () => {
      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'ページを開く'
      };

      mockPlaywrightMCP.navigate.mockRejectedValueOnce(
        new Error('Connection refused: MCP server not running')
      );

      await expect(executor.executeInstruction(instruction)).rejects.toThrow(
        'Connection refused'
      );
    });

    test('タイムアウトエラーを適切に処理する', async () => {
      const instruction = {
        type: 'click',
        selector: 'button#slow',
        description: '遅いボタン'
      };

      mockPlaywrightMCP.click.mockRejectedValueOnce(
        new Error('Timeout: Element not found within 30000ms')
      );

      await expect(executor.executeInstruction(instruction)).rejects.toThrow('Timeout');
    });
  });
});
