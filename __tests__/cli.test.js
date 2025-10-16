/**
 * CLI機能のテスト
 */

const { setupCLI, initializeConfig, initializeModules } = require('../bin/othello');
const ConfigManager = require('../src/config');
const path = require('path');

// commander.jsのテストのため、process.argvをモック
const originalArgv = process.argv;

describe('CLI Tests', () => {
  afterEach(() => {
    // 各テスト後にprocess.argvを復元
    process.argv = originalArgv;
    jest.clearAllMocks();
  });

  describe('setupCLI', () => {
    test('デフォルトオプションでパースできる', () => {
      process.argv = ['node', 'othello.js', '--url', 'https://example.com'];
      
      const options = setupCLI();
      
      expect(options.url).toBe('https://example.com');
      expect(options.maxIterations).toBe('10');
      expect(options.browser).toBe('chromium');
      expect(options.output).toBe('./reports');
      expect(options.config).toBe('./config/default.json');
      expect(options.autoApprove).toBe(false);
    });

    test('全てのオプションをカスタマイズできる', () => {
      process.argv = [
        'node', 'othello.js',
        '--url', 'https://test.com',
        '--max-iterations', '5',
        '--browser', 'firefox',
        '--output', './custom-reports',
        '--config', './custom-config.json',
        '--auto-approve'
      ];
      
      const options = setupCLI();
      
      expect(options.url).toBe('https://test.com');
      expect(options.maxIterations).toBe('5');
      expect(options.browser).toBe('firefox');
      expect(options.output).toBe('./custom-reports');
      expect(options.config).toBe('./custom-config.json');
      expect(options.autoApprove).toBe(true);
    });

    test('短縮オプションが使用できる', () => {
      process.argv = [
        'node', 'othello.js',
        '-u', 'https://short.com',
        '-m', '3',
        '-b', 'webkit',
        '-o', './out',
        '-c', './conf.json',
        '-a'
      ];
      
      const options = setupCLI();
      
      expect(options.url).toBe('https://short.com');
      expect(options.maxIterations).toBe('3');
      expect(options.browser).toBe('webkit');
      expect(options.output).toBe('./out');
      expect(options.config).toBe('./conf.json');
      expect(options.autoApprove).toBe(true);
    });
  });

  describe('initializeConfig', () => {
    test('設定ファイルを正常に読み込める', async () => {
      // 成功ケースではprocess.exitは呼ばれないので、モックなしで実行
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const options = {
        config: path.join(__dirname, 'fixtures', 'config', 'valid-config.json'),
        maxIterations: '15',
        browser: 'firefox',
        output: './test-output'
      };

      const configManager = await initializeConfig(options);

      expect(configManager).toBeInstanceOf(ConfigManager);
      expect(configManager.config.max_iterations).toBe(15);
      expect(configManager.config.default_browser).toBe('firefox');
      expect(configManager.config.paths.reports).toBe('./test-output');
      
      mockConsoleLog.mockRestore();
      mockConsoleWarn.mockRestore();
    });

    test('設定ファイルが見つからない場合はプロセスを終了する', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const options = {
        config: './non-existent-config.json'
      };

      await expect(async () => {
        await initializeConfig(options);
      }).rejects.toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('設定ファイルが見つかりません')
      );
      
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
      mockConsoleLog.mockRestore();
    });
  });

  describe('initializeModules', () => {
    test('全てのモジュールを正常に初期化できる', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
      const configManager = await ConfigManager.load(configPath);

      const { orchestrator, reporter } = initializeModules(configManager);

      expect(orchestrator).toBeDefined();
      expect(reporter).toBeDefined();
      expect(orchestrator.config).toBe(configManager);
      expect(reporter.config).toBe(configManager);
      
      mockConsoleLog.mockRestore();
      mockConsoleWarn.mockRestore();
    });

    test('初期化されたモジュールが必要な依存関係を持つ', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
      const configManager = await ConfigManager.load(configPath);

      const { orchestrator } = initializeModules(configManager);

      expect(orchestrator.instructionGenerator).toBeDefined();
      expect(orchestrator.analyzer).toBeDefined();
      expect(orchestrator.resultCollector).toBeDefined();
      
      mockConsoleLog.mockRestore();
      mockConsoleWarn.mockRestore();
    });
  });

  describe('統合テスト', () => {
    test('CLIからモジュール初期化までの完全なフロー', async () => {
      // 成功ケースではprocess.exitは呼ばれないので、console.logのみモック
      const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      process.argv = [
        'node', 'othello.js',
        '--url', 'https://integration-test.com',
        '--max-iterations', '5',
        '--config', path.join(__dirname, 'fixtures', 'config', 'valid-config.json')
      ];

      const options = setupCLI();
      const configManager = await initializeConfig(options);
      const { orchestrator, reporter } = initializeModules(configManager);

      expect(configManager.config.max_iterations).toBe(5);
      expect(orchestrator).toBeDefined();
      expect(reporter).toBeDefined();
      
      mockConsoleLog.mockRestore();
      mockConsoleWarn.mockRestore();
    });
  });
});
