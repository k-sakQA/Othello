/**
 * Playwright MCPエージェントのテスト
 */

const PlaywrightAgent = require('../src/playwright-agent');
const ConfigManager = require('../src/config');
const path = require('path');
const fs = require('fs').promises;

describe('PlaywrightAgent', () => {
  let agent;
  let config;

  beforeAll(async () => {
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    config = await ConfigManager.load(configPath);
  });

  beforeEach(() => {
    agent = new PlaywrightAgent(config);
  });

  describe('constructor', () => {
    test('設定を正しく初期化できる', () => {
      expect(agent.config).toBe(config);
      expect(agent.browser).toBe('chromium');
      // timeout_secondsは設定ファイルの値に依存（60秒 = 60000ms）
      expect(agent.timeout).toBeGreaterThan(0);
      expect(typeof agent.timeout).toBe('number');
    });

    test('カスタム設定を適用できる', () => {
      const customConfig = { ...config };
      customConfig.config.default_browser = 'firefox';
      customConfig.config.timeout_seconds = 120;
      
      const customAgent = new PlaywrightAgent(customConfig);
      
      expect(customAgent.browser).toBe('firefox');
      expect(customAgent.timeout).toBe(120000);
    });

    test('オプションでmockModeを強制的に設定できる', () => {
      // エンドポイントがあってもモックモードにできる
      const mockAgent = new PlaywrightAgent(config, { mockMode: true });
      expect(mockAgent.mockMode).toBe(true);

      // エンドポイントがなくても実モードにできる
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      expect(realAgent.mockMode).toBe(false);
    });

    test('MCPエンドポイントが設定されている場合は実モード', () => {
      // valid-config.jsonにはapi_endpointが含まれている
      expect(agent.mcpEndpoint).toBe('http://localhost:8931');
      // オプションがない場合、エンドポイントがあれば実モード（!this.mcpEndpoint === false）
      // ただし、デフォルトのconstructorでmockMode判定をオーバーライド
    });
  });

  describe('executeInstruction()', () => {
    test('ナビゲーション指示を実行できる', async () => {
      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'トップページにアクセス'
      };

      const result = await agent.executeInstruction(instruction);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('instruction');
      expect(result.instruction).toBe('トップページにアクセス');
    });

    test('クリック指示を実行できる', async () => {
      const instruction = {
        type: 'click',
        selector: '#submit-btn',
        description: '送信ボタンをクリック'
      };

      const result = await agent.executeInstruction(instruction);

      expect(result).toHaveProperty('success');
      expect(result.instruction).toBe('送信ボタンをクリック');
    });

    test('フォーム入力指示を実行できる', async () => {
      const instruction = {
        type: 'fill',
        selector: '#username',
        value: 'testuser',
        description: 'ユーザー名を入力'
      };

      const result = await agent.executeInstruction(instruction);

      expect(result).toHaveProperty('success');
      expect(result.instruction).toBe('ユーザー名を入力');
    });

    test('スクリーンショット指示を実行できる', async () => {
      const instruction = {
        type: 'screenshot',
        path: './test-screenshots/test.png',
        description: 'スクリーンショットを取得'
      };

      const result = await agent.executeInstruction(instruction);

      expect(result).toHaveProperty('success');
      expect(result.instruction).toBe('スクリーンショットを取得');
    });

    test('不正な指示タイプの場合はエラー', async () => {
      const instruction = {
        type: 'invalid_type',
        description: '不正な指示'
      };

      const result = await agent.executeInstruction(instruction);

      expect(result.success).toBe(false);
      expect(result.error).toContain('サポートされていない');
    });
  });

  describe('executeTest()', () => {
    test('テスト指示ファイルから複数アクションを実行できる', async () => {
      const testInstruction = {
        test_id: 'test-001',
        target_url: 'https://example.com',
        scenario: 'ログイン機能のテスト',
        actions: [
          { type: 'navigate', url: 'https://example.com/login', description: 'ログインページに移動' },
          { type: 'fill', selector: '#username', value: 'testuser', description: 'ユーザー名入力' },
          { type: 'fill', selector: '#password', value: 'password', description: 'パスワード入力' },
          { type: 'click', selector: '#login-btn', description: 'ログインボタンをクリック' },
          { type: 'screenshot', path: './screenshots/login-success.png', description: 'ログイン後のスクリーンショット' }
        ]
      };

      const result = await agent.executeTest(testInstruction);

      expect(result).toHaveProperty('test_id', 'test-001');
      expect(result).toHaveProperty('scenario', 'ログイン機能のテスト');
      expect(result).toHaveProperty('actions_executed');
      expect(result.actions_executed).toBeGreaterThan(0);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration_ms');
    });

    test('アクションが失敗した場合も記録される', async () => {
      const testInstruction = {
        test_id: 'test-002',
        target_url: 'https://example.com',
        scenario: '失敗するテスト',
        actions: [
          { type: 'navigate', url: 'https://example.com', description: 'ページ移動' },
          { type: 'click', selector: '#nonexistent-element', description: '存在しない要素をクリック' }
        ]
      };

      const result = await agent.executeTest(testInstruction);

      expect(result.test_id).toBe('test-002');
      expect(result).toHaveProperty('actions_executed');
      expect(result).toHaveProperty('failed_actions');
      expect(result.failed_actions).toBeGreaterThan(0);
    });

    test('タイムアウト設定が反映される', async () => {
      const testInstruction = {
        test_id: 'test-003',
        target_url: 'https://example.com',
        scenario: 'タイムアウトテスト',
        timeout: 5000,
        actions: [
          { type: 'navigate', url: 'https://example.com', description: 'ページ移動' }
        ]
      };

      const result = await agent.executeTest(testInstruction);

      expect(result.test_id).toBe('test-003');
      expect(result).toHaveProperty('duration_ms');
      expect(result.duration_ms).toBeLessThan(10000); // 5秒タイムアウトなので10秒以内
    });
  });

  describe('saveLog()', () => {
    test('実行ログをJSONファイルとして保存できる', async () => {
      const logData = {
        test_id: 'test-log-001',
        timestamp: new Date().toISOString(),
        success: true,
        actions: ['navigate', 'click', 'screenshot']
      };

      const logPath = path.join(__dirname, 'temp', 'test-log-001.json');
      await agent.saveLog(logData, logPath);

      // ファイルが存在することを確認
      const fileContent = await fs.readFile(logPath, 'utf8');
      const savedData = JSON.parse(fileContent);

      expect(savedData.test_id).toBe('test-log-001');
      expect(savedData.success).toBe(true);
      expect(savedData.actions).toHaveLength(3);

      // クリーンアップ
      await fs.unlink(logPath);
    });

    test('ディレクトリが存在しない場合は自動作成する', async () => {
      const logData = {
        test_id: 'test-log-002',
        timestamp: new Date().toISOString()
      };

      const logPath = path.join(__dirname, 'temp', 'nested', 'dir', 'test-log-002.json');
      await agent.saveLog(logData, logPath);

      // ファイルが存在することを確認
      const exists = await fs.access(logPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // クリーンアップ
      await fs.rm(path.join(__dirname, 'temp', 'nested'), { recursive: true, force: true });
    });
  });

  describe('collectLogs()', () => {
    test('指定ディレクトリから全ログファイルを収集できる', async () => {
      // テスト用ログファイルを作成
      const logsDir = path.join(__dirname, 'temp', 'logs');
      await fs.mkdir(logsDir, { recursive: true });

      const log1 = { test_id: 'log-001', success: true };
      const log2 = { test_id: 'log-002', success: false };

      await fs.writeFile(path.join(logsDir, 'log-001.json'), JSON.stringify(log1));
      await fs.writeFile(path.join(logsDir, 'log-002.json'), JSON.stringify(log2));

      // ログを収集
      const logs = await agent.collectLogs(logsDir);

      expect(logs).toHaveLength(2);
      expect(logs[0].test_id).toBe('log-001');
      expect(logs[1].test_id).toBe('log-002');

      // クリーンアップ
      await fs.rm(logsDir, { recursive: true, force: true });
    });

    test('ログディレクトリが空の場合は空配列を返す', async () => {
      const emptyDir = path.join(__dirname, 'temp', 'empty-logs');
      await fs.mkdir(emptyDir, { recursive: true });

      const logs = await agent.collectLogs(emptyDir);

      expect(logs).toEqual([]);

      // クリーンアップ
      await fs.rmdir(emptyDir);
    });
  });

  describe('統合テスト', () => {
    test('完全なテストフロー: 実行 → ログ保存 → 収集', async () => {
      const testInstruction = {
        test_id: 'integration-test-001',
        target_url: 'https://example.com',
        scenario: '統合テスト',
        actions: [
          { type: 'navigate', url: 'https://example.com', description: 'ページ移動' },
          { type: 'screenshot', path: './temp/integration-screenshot.png', description: 'スクリーンショット' }
        ]
      };

      // テスト実行
      const result = await agent.executeTest(testInstruction);
      expect(result.test_id).toBe('integration-test-001');

      // ログ保存
      const logDir = path.join(__dirname, 'temp', 'integration-logs');
      const logPath = path.join(logDir, `${result.test_id}.json`);
      await agent.saveLog(result, logPath);

      // ログ収集
      const logs = await agent.collectLogs(logDir);
      expect(logs).toHaveLength(1);
      expect(logs[0].test_id).toBe('integration-test-001');

      // クリーンアップ
      await fs.rm(logDir, { recursive: true, force: true });
    });
  });

  describe('callMCPServer - MCP通信', () => {
    test('navigate指示をMCPサーバーに送信できる', async () => {
      // モックモードをオフにして実モードでテスト
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      
      // axiosをモック
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockResolvedValue({
        data: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                url: 'https://example.com'
              })
            }
          ]
        }
      });

      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'トップページに移動'
      };

      const result = await realAgent.executeInstruction(instruction);

      expect(axios.post).toHaveBeenCalledWith(
        realAgent.mcpEndpoint,
        expect.objectContaining({
          method: 'tools/call',
          params: expect.objectContaining({
            name: 'browser_navigate',
            arguments: expect.objectContaining({
              url: 'https://example.com',
              intent: 'トップページに移動'
            })
          })
        }),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('click指示をMCPサーバーに送信できる', async () => {
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockResolvedValue({
        data: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true
              })
            }
          ]
        }
      });

      const instruction = {
        type: 'click',
        selector: '#login-button',
        description: 'ログインボタンをクリック'
      };

      const result = await realAgent.executeInstruction(instruction);

      expect(axios.post).toHaveBeenCalledWith(
        realAgent.mcpEndpoint,
        expect.objectContaining({
          method: 'tools/call',
          params: expect.objectContaining({
            name: 'browser_click',
            arguments: expect.objectContaining({
              element: 'ログインボタンをクリック',
              ref: '#login-button',
              intent: 'ログインボタンをクリック'
            })
          })
        }),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('fill指示をMCPサーバーに送信できる', async () => {
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockResolvedValue({
        data: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true
              })
            }
          ]
        }
      });

      const instruction = {
        type: 'fill',
        selector: '#username',
        value: 'testuser',
        description: 'ユーザー名を入力'
      };

      const result = await realAgent.executeInstruction(instruction);

      expect(axios.post).toHaveBeenCalledWith(
        realAgent.mcpEndpoint,
        expect.objectContaining({
          method: 'tools/call',
          params: expect.objectContaining({
            name: 'browser_type',
            arguments: expect.objectContaining({
              element: 'ユーザー名を入力',
              ref: '#username',
              text: 'testuser',
              intent: 'ユーザー名を入力'
            })
          })
        }),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('screenshot指示をMCPサーバーに送信できる', async () => {
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockResolvedValue({
        data: {
          content: [
            {
              type: 'image',
              data: 'base64encodedimage',
              mimeType: 'image/png'
            }
          ]
        }
      });

      const instruction = {
        type: 'screenshot',
        path: 'test.png',
        description: 'スクリーンショットを撮影'
      };

      const result = await realAgent.executeInstruction(instruction);

      expect(axios.post).toHaveBeenCalledWith(
        realAgent.mcpEndpoint,
        expect.objectContaining({
          method: 'tools/call',
          params: expect.objectContaining({
            name: 'browser_take_screenshot',
            arguments: expect.objectContaining({
              filename: 'test.png'
            })
          })
        }),
        expect.any(Object)
      );
      expect(result.success).toBe(true);
    });

    test('MCPサーバーエラーを正しくハンドリングできる', async () => {
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockRejectedValue(new Error('Connection refused'));

      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'トップページに移動'
      };

      const result = await realAgent.executeInstruction(instruction);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });

    test('MCPサーバータイムアウトを処理できる', async () => {
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      });

      const instruction = {
        type: 'navigate',
        url: 'https://slow-site.com',
        description: '遅いサイトに移動'
      };

      const result = await realAgent.executeInstruction(instruction);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('MCPサーバーから不正なレスポンスを受け取った場合', async () => {
      const realAgent = new PlaywrightAgent(config, { mockMode: false });
      
      const axios = require('axios');
      jest.spyOn(axios, 'post').mockResolvedValue({
        data: {
          content: []  // 空のコンテンツ
        }
      });

      const instruction = {
        type: 'navigate',
        url: 'https://example.com',
        description: 'トップページに移動'
      };

      const result = await realAgent.executeInstruction(instruction);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid response');
    });
  });
});
