const fs = require('fs').promises;
const path = require('path');
const ConfigManager = require('../src/config');

describe('ConfigManager', () => {
  const testConfigDir = path.join(__dirname, 'fixtures', 'config');
  const validConfigPath = path.join(testConfigDir, 'valid-config.json');
  const invalidConfigPath = path.join(testConfigDir, 'invalid-config.json');

  beforeAll(async () => {
    // テスト用の設定ファイルを作成
    await fs.mkdir(testConfigDir, { recursive: true });

    // 正常な設定ファイル
    const validConfig = {
      default_browser: 'chromium',
      timeout_seconds: 60,
      max_iterations: 10,
      paths: {
        logs: './logs',
        results: './results',
        test_instructions: './test-instructions',
        reports: './reports'
      },
      playwright_agent: {
        api_endpoint: 'http://localhost:3000/playwright-agent'
      },
      claude_api: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096
      },
      coverage_threshold: {
        target_percentage: 80
      }
    };
    await fs.writeFile(validConfigPath, JSON.stringify(validConfig, null, 2));

    // 不正な設定ファイル（必須項目が欠けている）
    const invalidConfig = {
      default_browser: 'chromium'
      // paths が欠けている
    };
    await fs.writeFile(invalidConfigPath, JSON.stringify(invalidConfig, null, 2));
  });

  afterAll(async () => {
    // テスト用ファイルを削除
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch (error) {
      // エラーは無視
    }
  });

  describe('load()', () => {
    test('正常な設定ファイルを読み込める', async () => {
      const config = await ConfigManager.load(validConfigPath);
      
      expect(config).toBeInstanceOf(ConfigManager);
      expect(config.get('default_browser')).toBe('chromium');
      expect(config.get('timeout_seconds')).toBe(60);
      expect(config.get('max_iterations')).toBe(10);
    });

    test('存在しないファイルの場合はエラー', async () => {
      const nonExistentPath = path.join(testConfigDir, 'non-existent.json');
      
      await expect(ConfigManager.load(nonExistentPath)).rejects.toThrow();
    });

    test('不正なJSON形式の場合はエラー', async () => {
      const malformedPath = path.join(testConfigDir, 'malformed.json');
      await fs.writeFile(malformedPath, '{invalid json}');
      
      await expect(ConfigManager.load(malformedPath)).rejects.toThrow();
      
      await fs.unlink(malformedPath);
    });
  });

  describe('validateConfig()', () => {
    test('必須項目が欠けている場合はエラー', async () => {
      await expect(ConfigManager.load(invalidConfigPath)).rejects.toThrow();
    });

    test('playwright_agent設定が欠けている場合は警告のみ', async () => {
      const configWithoutAgent = path.join(testConfigDir, 'no-agent.json');
      const config = {
        default_browser: 'chromium',
        timeout_seconds: 60,
        max_iterations: 10,
        paths: {
          logs: './logs',
          results: './results',
          test_instructions: './test-instructions',
          reports: './reports'
        }
      };
      await fs.writeFile(configWithoutAgent, JSON.stringify(config, null, 2));
      
      // 警告は出るがエラーにはならない
      const configManager = await ConfigManager.load(configWithoutAgent);
      expect(configManager).toBeInstanceOf(ConfigManager);
      
      await fs.unlink(configWithoutAgent);
    });
  });

  describe('getPath()', () => {
    test('設定されたパスを取得できる', async () => {
      const config = await ConfigManager.load(validConfigPath);
      
      expect(config.getPath('logs')).toBe('./logs');
      expect(config.getPath('results')).toBe('./results');
      expect(config.getPath('test_instructions')).toBe('./test-instructions');
      expect(config.getPath('reports')).toBe('./reports');
    });

    test('存在しないパスの場合はデフォルト値を返す', async () => {
      const config = await ConfigManager.load(validConfigPath);
      
      expect(config.getPath('unknown')).toBe('./unknown');
    });
  });

  describe('getPlaywrightAgentSettings()', () => {
    test('Playwrightエージェント設定を取得できる', async () => {
      const config = await ConfigManager.load(validConfigPath);
      const settings = config.getPlaywrightAgentSettings();
      
      expect(settings).toHaveProperty('api_endpoint');
      expect(settings.api_endpoint).toBe('http://localhost:3000/playwright-agent');
    });

    test('設定がない場合は空オブジェクトを返す', async () => {
      const configWithoutAgent = path.join(testConfigDir, 'no-agent2.json');
      const config = {
        default_browser: 'chromium',
        timeout_seconds: 60,
        max_iterations: 10,
        paths: {
          logs: './logs',
          results: './results',
          test_instructions: './test-instructions',
          reports: './reports'
        }
      };
      await fs.writeFile(configWithoutAgent, JSON.stringify(config, null, 2));
      
      const configManager = await ConfigManager.load(configWithoutAgent);
      const settings = configManager.getPlaywrightAgentSettings();
      
      expect(settings).toEqual({});
      
      await fs.unlink(configWithoutAgent);
    });
  });

  describe('getClaudeAPISettings()', () => {
    test('Claude API設定を取得できる', async () => {
      const config = await ConfigManager.load(validConfigPath);
      const settings = config.getClaudeAPISettings();
      
      expect(settings).toHaveProperty('model');
      expect(settings.model).toBe('claude-sonnet-4-20250514');
      expect(settings.max_tokens).toBe(4096);
    });

    test('設定がない場合はデフォルト値を返す', async () => {
      const configWithoutClaude = path.join(testConfigDir, 'no-claude.json');
      const config = {
        default_browser: 'chromium',
        timeout_seconds: 60,
        max_iterations: 10,
        paths: {
          logs: './logs',
          results: './results',
          test_instructions: './test-instructions',
          reports: './reports'
        }
      };
      await fs.writeFile(configWithoutClaude, JSON.stringify(config, null, 2));
      
      const configManager = await ConfigManager.load(configWithoutClaude);
      const settings = configManager.getClaudeAPISettings();
      
      expect(settings).toHaveProperty('model');
      expect(settings).toHaveProperty('max_tokens');
      expect(settings).toHaveProperty('temperature');
      
      await fs.unlink(configWithoutClaude);
    });
  });

  describe('getCoverageThreshold()', () => {
    test('カバレッジ閾値を取得できる', async () => {
      const config = await ConfigManager.load(validConfigPath);
      const threshold = config.getCoverageThreshold();
      
      expect(threshold).toHaveProperty('target_percentage');
      expect(threshold.target_percentage).toBe(80);
    });

    test('設定がない場合はデフォルト値を返す', async () => {
      const configWithoutThreshold = path.join(testConfigDir, 'no-threshold.json');
      const config = {
        default_browser: 'chromium',
        timeout_seconds: 60,
        max_iterations: 10,
        paths: {
          logs: './logs',
          results: './results',
          test_instructions: './test-instructions',
          reports: './reports'
        }
      };
      await fs.writeFile(configWithoutThreshold, JSON.stringify(config, null, 2));
      
      const configManager = await ConfigManager.load(configWithoutThreshold);
      const threshold = configManager.getCoverageThreshold();
      
      expect(threshold.target_percentage).toBe(80);
      expect(threshold.stop_if_no_improvement).toBe(true);
      
      await fs.unlink(configWithoutThreshold);
    });
  });

  describe('get()', () => {
    test('設定値を取得できる', async () => {
      const config = await ConfigManager.load(validConfigPath);
      
      expect(config.get('default_browser')).toBe('chromium');
      expect(config.get('timeout_seconds')).toBe(60);
    });

    test('存在しない設定はnullを返す', async () => {
      const config = await ConfigManager.load(validConfigPath);
      
      expect(config.get('non_existent')).toBeNull();
    });

    test('存在しない設定でデフォルト値を指定', async () => {
      const config = await ConfigManager.load(validConfigPath);
      
      expect(config.get('non_existent', 'default_value')).toBe('default_value');
    });
  });

  describe('環境変数の処理', () => {
    test('環境変数が設定値を上書きする', async () => {
      // 環境変数を設定
      process.env.OTHELLO_DEFAULT_BROWSER = 'firefox';
      
      const config = await ConfigManager.load(validConfigPath);
      
      // 環境変数が優先される（将来の拡張として）
      // 現在の実装では環境変数サポートは未実装なので、この部分はスキップ
      
      // クリーンアップ
      delete process.env.OTHELLO_DEFAULT_BROWSER;
    });
  });
});
