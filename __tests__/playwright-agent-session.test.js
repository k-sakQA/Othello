/**
 * @jest-environment node
 */

const PlaywrightAgent = require('../src/playwright-agent');
const ConfigManager = require('../src/config');

// MCPStdioClientをモック
jest.mock('../src/mcp-stdio-client', () => {
  return {
    MCPStdioClient: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        callTool: jest.fn().mockResolvedValue({
          success: true,
          content: 'Mock response',
          sections: new Map([['Page URL', 'https://example.com']])
        }),
        listTools: jest.fn().mockResolvedValue([
          { name: 'browser_navigate' },
          { name: 'browser_click' }
        ]),
        isConnected: jest.fn().mockReturnValue(true)
      };
    })
  };
});

describe('PlaywrightAgent - MCP Session Management (Stdio)', () => {
  let agent;
  let config;

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // モック設定オブジェクトを作成（mockMode = false で実際のMCP通信をシミュレート）
    const mockConfig = {
      config: {
        default_browser: 'chromium',
        timeout_seconds: 30,
        playwright_agent: {
          mock_mode: false  // Stdio通信を使用
        }
      }
    };
    agent = new PlaywrightAgent(mockConfig, { mockMode: false });
  });

  describe('initializeSession (Stdio)', () => {
    test('MCPStdioClientで接続できる', async () => {
      // 初期化リクエストを送信
      await agent.initializeSession();
      
      // セッション状態が初期化されているか確認
      expect(agent.mcpClient).toBeDefined();
      expect(agent.isSessionInitialized).toBe(true);
      expect(agent.mcpClient.connect).toHaveBeenCalledTimes(1);
    });

    test('初期化失敗時にエラーをスローする', async () => {
      // MCPStdioClientのconnectをエラーにする
      agent.mcpClient = null;
      const { MCPStdioClient } = require('../src/mcp-stdio-client');
      MCPStdioClient.mockImplementationOnce(() => {
        return {
          connect: jest.fn().mockRejectedValue(new Error('Connection failed'))
        };
      });
      
      await expect(agent.initializeSession()).rejects.toThrow('MCP session initialization failed');
    });

    test('すでに初期化済みの場合はスキップする', async () => {
      // 初回初期化
      await agent.initializeSession();
      const firstClient = agent.mcpClient;
      
      // 2回目の初期化
      await agent.initializeSession();
      
      // クライアントが変わらないことを確認
      expect(agent.mcpClient).toBe(firstClient);
      // connectは1回だけ呼ばれる
      expect(agent.mcpClient.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('MCPStdioClient統合', () => {
    test('MCPStdioClientが正しく作成される', async () => {
      await agent.initializeSession();
      
      expect(agent.mcpClient).toBeDefined();
      const { MCPStdioClient } = require('../src/mcp-stdio-client');
      expect(MCPStdioClient).toHaveBeenCalledWith({
        clientName: 'Othello',
        clientVersion: '2.0.0',
        serverArgs: expect.any(Array)
      });
    });

    test('callToolがMCPStdioClientに委譲される', async () => {
      await agent.initializeSession();
      
      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'Navigate to example.com'
      };
      
      await agent.callMCPServer(instruction, Date.now());
      
      expect(agent.mcpClient.callTool).toHaveBeenCalledWith(
        'browser_navigate',
        expect.objectContaining({
          url: 'https://example.com',
          intent: 'Navigate to example.com'
        })
      );
    });

    test('disconnectがMCPStdioClientに委譲される', async () => {
      await agent.initializeSession();
      const mcpClient = agent.mcpClient;
      
      await agent.closeSession();
      
      expect(mcpClient.disconnect).toHaveBeenCalledTimes(1);
      expect(agent.mcpClient).toBeNull();
    });
  });

  describe('callMCPServer with Stdio', () => {
    test('初期化前のcallMCPServerは自動的に初期化を実行する', async () => {
      const instruction = {
        type: 'navigate',
        url: 'https://example.com'
      };
      
      // initializeSessionがまだ呼ばれていない状態
      expect(agent.isSessionInitialized).toBe(false);
      
      // callMCPServerを実行すると自動的に初期化される
      await agent.callMCPServer(instruction, Date.now());
      
      expect(agent.isSessionInitialized).toBe(true);
      expect(agent.mcpClient.connect).toHaveBeenCalled();
    });

    test('アクションタイプが正しいMCPツール名にマッピングされる', async () => {
      await agent.initializeSession();
      
      const testCases = [
        { type: 'navigate', expectedTool: 'browser_navigate' },
        { type: 'click', expectedTool: 'browser_click' },
        { type: 'fill', expectedTool: 'browser_type' },
        { type: 'screenshot', expectedTool: 'browser_take_screenshot' },
        { type: 'evaluate', expectedTool: 'browser_evaluate' },
        { type: 'wait', expectedTool: 'browser_wait_for' }
      ];
      
      for (const { type, expectedTool } of testCases) {
        jest.clearAllMocks();
        
        const instruction = {
          type,
          url: 'https://example.com',
          description: `Test ${type}`
        };
        
        await agent.callMCPServer(instruction, Date.now());
        
        expect(agent.mcpClient.callTool).toHaveBeenCalledWith(
          expectedTool,
          expect.any(Object)
        );
      }
    });

    test('MCP呼び出し成功時に正しいレスポンス形式を返す', async () => {
      await agent.initializeSession();
      
      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'Navigate to example.com'
      };
      
      const result = await agent.callMCPServer(instruction, Date.now());
      
      expect(result.success).toBe(true);
      expect(result.instruction).toBe('Navigate to example.com');
      expect(result.type).toBe('navigate');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('duration_ms');
    });
  });

  describe('Browser Lifecycle (Stdio)', () => {
    test('セッション初期化時にMCPクライアントが接続される', async () => {
      await agent.initializeSession();
      
      // MCPクライアントが接続されているか確認
      expect(agent.mcpClient).toBeDefined();
      expect(agent.mcpClient.connect).toHaveBeenCalled();
      expect(agent.isSessionInitialized).toBe(true);
    });

    test('セッション終了時にMCPクライアントが切断される', async () => {
      await agent.initializeSession();
      await agent.closeSession();
      
      // MCPクライアントが切断されているか確認
      expect(agent.browserLaunched).toBe(false);
      expect(agent.isSessionInitialized).toBe(false);
      expect(agent.mcpClient).toBeNull();
    });

    test('ブラウザはMCPサーバー側で管理される', async () => {
      await agent.initializeSession();
      
      // ブラウザはまだ起動していない（最初のツール呼び出し時に起動）
      expect(agent.browserLaunched).toBe(false);
      
      // ツールを呼び出す
      await agent.callMCPServer({
        type: 'navigate',
        url: 'https://example.com'
      }, Date.now());
      
      // ブラウザはMCPサーバー側で自動管理される
      expect(agent.mcpClient.callTool).toHaveBeenCalled();
    });
  });

  describe('Error Handling (Stdio)', () => {
    test('MCP通信エラー時に詳細なエラー情報を返す', async () => {
      await agent.initializeSession();
      
      // callToolをエラーにする
      agent.mcpClient.callTool.mockRejectedValueOnce(new Error('Connection refused'));
      
      const instruction = {
        type: 'navigate',
        url: 'https://example.com'
      };
      
      const result = await agent.callMCPServer(instruction, Date.now());
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Connection refused');
    });

    test('MCPツール呼び出し失敗時にエラー情報を返す', async () => {
      await agent.initializeSession();
      
      // callToolを失敗レスポンスにする
      agent.mcpClient.callTool.mockResolvedValueOnce({
        success: false,
        error: 'Element not found'
      });
      
      const instruction = {
        type: 'click',
        selector: '#nonexistent',
        description: 'Click nonexistent element'
      };
      
      const result = await agent.callMCPServer(instruction, Date.now());
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Element not found');
    });

    test('サポートされていない指示タイプでエラーを返す', async () => {
      await agent.initializeSession();
      
      const instruction = {
        type: 'invalid_action',
        description: 'Invalid action'
      };
      
      const result = await agent.callMCPServer(instruction, Date.now());
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported instruction type');
    });
  });
});
