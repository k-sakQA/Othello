/**
 * @jest-environment node
 */

const PlaywrightAgent = require('../src/playwright-agent');
const ConfigManager = require('../src/config');

describe('PlaywrightAgent - MCP Session Management', () => {
  let agent;
  let config;

  beforeEach(() => {
    // モック設定オブジェクトを作成
    const mockConfig = {
      config: {
        default_browser: 'chromium',
        timeout_seconds: 30,
        playwright_agent: {
          api_endpoint: 'http://localhost:8931/mcp'
        }
      }
    };
    agent = new PlaywrightAgent(mockConfig);
  });

  describe('initializeSession', () => {
    test('MCP初期化ハンドシェイクを送信できる', async () => {
      // Mock axios
      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValue({
        data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
      });
      
      // 初期化リクエストを送信
      await agent.initializeSession();
      
      // セッション状態が初期化されているか確認
      expect(agent.sessionId).toBeDefined();
      expect(agent.isSessionInitialized).toBe(true);
    });

    test('初期化失敗時にエラーをスローする', async () => {
      // Mock axios to throw error
      const axios = require('axios');
      axios.post = jest.fn().mockRejectedValue(new Error('Connection failed'));
      
      await expect(agent.initializeSession()).rejects.toThrow('MCP session initialization failed');
    });

    test('すでに初期化済みの場合はスキップする', async () => {
      // Mock axios
      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValue({
        data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
      });
      
      // 初回初期化
      await agent.initializeSession();
      const firstSessionId = agent.sessionId;
      
      // 2回目の初期化
      await agent.initializeSession();
      
      // セッションIDが変わらないことを確認
      expect(agent.sessionId).toBe(firstSessionId);
    });
  });

  describe('parseSSEResponse', () => {
    test('SSE形式のレスポンスをパースできる', () => {
      const sseData = 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"success":true}}\n\n';
      
      const result = agent.parseSSEResponse(sseData);
      
      expect(result).toEqual({
        jsonrpc: '2.0',
        id: 1,
        result: { success: true }
      });
    });

    test('複数のSSEイベントをパースできる', () => {
      const sseData = 'event: message\ndata: {"id":1}\n\nevent: message\ndata: {"id":2}\n\n';
      
      const result = agent.parseSSEResponse(sseData);
      
      // 最後のメッセージが返される
      expect(result.id).toBe(2);
    });

    test('不正な形式の場合はnullを返す', () => {
      const invalidData = 'invalid sse format';
      
      const result = agent.parseSSEResponse(invalidData);
      
      expect(result).toBeNull();
    });

    test('空のレスポンスはnullを返す', () => {
      const result = agent.parseSSEResponse('');
      
      expect(result).toBeNull();
    });
  });

  describe('callMCPServer with session', () => {
    test('初期化前のcallMCPServerは自動的に初期化を実行する', async () => {
      const axios = require('axios');
      axios.post = jest.fn()
        .mockResolvedValueOnce({
          // 初期化レスポンス
          data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
        })
        .mockResolvedValueOnce({
          // ツール呼び出しレスポンス
          data: 'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\\"success\\":true}"}]}}\n\n'
        });
      
      const instruction = {
        type: 'navigate',
        url: 'https://example.com'
      };
      
      // initializeSessionがまだ呼ばれていない状態
      expect(agent.isSessionInitialized).toBe(false);
      
      // callMCPServerを実行すると自動的に初期化される
      await agent.callMCPServer(instruction, Date.now());
      
      expect(agent.isSessionInitialized).toBe(true);
    });

    test('JSON-RPC 2.0形式でリクエストを送信する', async () => {
      const axios = require('axios');
      const mockPost = jest.fn()
        .mockResolvedValueOnce({
          // 初期化レスポンス
          data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
        })
        .mockResolvedValueOnce({
          // ツール呼び出しレスポンス
          data: 'event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\\"success\\":true}"}]}}\n\n'
        });
      axios.post = mockPost;
      
      await agent.initializeSession();
      
      const instruction = {
        type: 'navigate',
        url: 'https://example.com'
      };
      
      await agent.callMCPServer(instruction, Date.now());
      
      // JSON-RPC 2.0形式のリクエストが送信されたか確認
      const sentRequest = mockPost.mock.calls[mockPost.mock.calls.length - 1][1];
      expect(sentRequest).toHaveProperty('jsonrpc', '2.0');
      expect(sentRequest).toHaveProperty('id');
      expect(sentRequest).toHaveProperty('method', 'tools/call');
    });
  });

  describe('Browser Lifecycle', () => {
    test('セッション初期化時にブラウザを起動する', async () => {
      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValue({
        data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
      });
      
      await agent.initializeSession();
      
      // ブラウザが起動されているか確認
      expect(agent.browserLaunched).toBe(true);
    });

    test('セッション終了時にブラウザをクローズする', async () => {
      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValue({
        data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
      });
      
      await agent.initializeSession();
      await agent.closeSession();
      
      // ブラウザがクローズされているか確認
      expect(agent.browserLaunched).toBe(false);
      expect(agent.isSessionInitialized).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('MCP通信エラー時に詳細なエラー情報を返す', async () => {
      const axios = require('axios');
      axios.post = jest.fn()
        .mockResolvedValueOnce({
          // 初期化は成功
          data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
        })
        .mockRejectedValueOnce(new Error('Connection refused'));
      
      await agent.initializeSession();
      
      const instruction = {
        type: 'navigate',
        url: 'https://example.com'
      };
      
      const result = await agent.callMCPServer(instruction, Date.now());
      
      expect(result.status).toBe('error');
      expect(result.error).toContain('Connection refused');
    });

    test('SSEパースエラー時にエラー情報を返す', async () => {
      const axios = require('axios');
      axios.post = jest.fn()
        .mockResolvedValueOnce({
          // 初期化は成功
          data: 'event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{}}}\n\n'
        })
        .mockResolvedValueOnce({
          // 不正なSSE形式
          data: 'invalid sse format'
        });
      
      await agent.initializeSession();
      
      const instruction = {
        type: 'navigate',
        url: 'https://example.com'
      };
      
      const result = await agent.callMCPServer(instruction, Date.now());
      
      expect(result.status).toBe('error');
    });
  });
});
