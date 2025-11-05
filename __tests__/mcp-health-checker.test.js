/**
 * MCP Health Checkerのテスト
 */

const MCPHealthChecker = require('../src/mcp-health-checker');

describe('MCPHealthChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new MCPHealthChecker({
      timeout: 1000, // テスト用に短く設定
      verbose: false
    });
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultChecker = new MCPHealthChecker();
      expect(defaultChecker.timeout).toBe(5000);
      expect(defaultChecker.verbose).toBe(false);
    });

    test('should initialize with custom options', () => {
      const customChecker = new MCPHealthChecker({
        timeout: 3000,
        verbose: true
      });
      expect(customChecker.timeout).toBe(3000);
      expect(customChecker.verbose).toBe(true);
    });
  });

  describe('generateStartupScript', () => {
    test('should generate PowerShell script', () => {
      const script = checker.generateStartupScript({
        browser: 'chromium',
        shell: 'pwsh'
      });

      expect(script).toHaveProperty('inline');
      expect(script).toHaveProperty('background');
      expect(script).toHaveProperty('description');
      expect(script.inline).toContain('npx @playwright/mcp@latest');
      expect(script.inline).toContain('chromium');
    });

    test('should generate CMD script', () => {
      const script = checker.generateStartupScript({
        browser: 'firefox',
        shell: 'cmd'
      });

      expect(script.inline).toContain('npx @playwright/mcp@latest');
      expect(script.inline).toContain('firefox');
      expect(script.background).toContain('start /B');
    });

    test('should generate Bash script', () => {
      const script = checker.generateStartupScript({
        browser: 'webkit',
        shell: 'bash'
      });

      expect(script.inline).toContain('npx @playwright/mcp@latest');
      expect(script.inline).toContain('webkit');
      expect(script.background).toMatch(/&$/); // ends with &
    });

    test('should default to chromium and pwsh', () => {
      const script = checker.generateStartupScript();

      expect(script.inline).toContain('chromium');
      expect(script.description).toContain('PowerShell');
    });
  });

  describe('getStartupHelp', () => {
    test('should return help message with commands', () => {
      const help = checker.getStartupHelp({
        browser: 'chromium',
        shell: 'pwsh'
      });

      expect(help).toContain('Playwright MCP Server Not Available');
      expect(help).toContain('Setup Instructions');
      expect(help).toContain('npx @playwright/mcp@latest');
      expect(help).toContain('chromium');
    });

    test('should include both inline and background commands', () => {
      const help = checker.getStartupHelp();

      expect(help).toContain('npx @playwright/mcp@latest');
      expect(help).toContain('バックグラウンドで起動');
    });

    test('should include tips section', () => {
      const help = checker.getStartupHelp();

      expect(help).toContain('Tips');
      expect(help).toContain('MCPサーバーは別プロセスとして');
    });
  });

  describe('checkHealth', () => {
    test('should return result object with required properties', async () => {
      const result = await checker.checkHealth();

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('message');
      expect(typeof result.available).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    test('should handle connection timeout', async () => {
      checker.timeout = 100; // Very short timeout
      const result = await checker.checkHealth();

      // タイムアウトまたは接続失敗
      expect(result.available).toBe(false);
      if (result.error) {
        expect(result.error).toBeInstanceOf(Error);
      }
    }, 10000); // Jest timeout
  });

  describe('tryConnect', () => {
    test('should attempt to connect to MCP server', async () => {
      const result = await checker.tryConnect();

      expect(result).toHaveProperty('available');
      expect(typeof result.available).toBe('boolean');
    }, 10000);

    test('should timeout if server does not respond', async () => {
      checker.timeout = 100;
      const result = await checker.tryConnect();

      // 短いタイムアウトなのでほぼ確実に失敗
      if (!result.available) {
        expect(result.error).toBeDefined();
      }
    }, 10000);
  });

  describe('checkAndPrompt', () => {
    // コンソール出力をモック
    let consoleLogSpy, consoleErrorSpy;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should return true when autoCheck is false', async () => {
      const result = await checker.checkAndPrompt({
        autoCheck: false
      });

      expect(result).toBe(true);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should check health and print messages', async () => {
      const result = await checker.checkAndPrompt({
        autoCheck: true,
        showHelp: true,
        browser: 'chromium',
        shell: 'pwsh'
      });

      expect(typeof result).toBe('boolean');
      expect(consoleLogSpy).toHaveBeenCalled();
    }, 10000);

    test('should not show help when showHelp is false', async () => {
      checker.timeout = 100; // Force timeout
      
      await checker.checkAndPrompt({
        autoCheck: true,
        showHelp: false
      });

      // ヘルプメッセージの特徴的な文字列がないことを確認
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ');
      expect(allLogs).not.toContain('Setup Instructions');
    }, 10000);
  });

  describe('integration scenarios', () => {
    test('should provide appropriate guidance when MCP is not available', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      checker.timeout = 100; // Force failure
      
      const result = await checker.checkAndPrompt({
        browser: 'chromium',
        shell: 'pwsh'
      });

      // MCPが利用不可の場合はfalseが返る
      if (!result) {
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        // ヘルプメッセージが表示される
        const allLogs = consoleLogSpy.mock.calls.flat().join(' ');
        expect(allLogs).toContain('MCP');
      }

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }, 10000);
  });
});
