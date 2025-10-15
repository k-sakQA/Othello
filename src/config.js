const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * Config Manager
 * 設定ファイルの読み込みとバリデーション、環境変数の管理を行う
 */
class ConfigManager {
  constructor(configData) {
    this.config = configData;
    this.validateConfig();
  }

  /**
   * 設定ファイルの読み込み
   * @param {string} configPath - 設定ファイルのパス
   * @returns {Promise<ConfigManager>} ConfigManagerインスタンス
   */
  static async load(configPath) {
    try {
      const absolutePath = path.resolve(configPath);
      const fileContent = await fs.readFile(absolutePath, 'utf8');
      const config = JSON.parse(fileContent);
      return new ConfigManager(config);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`設定ファイルが見つかりません: ${configPath}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`設定ファイルのJSON形式が不正です: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 設定のバリデーション
   * 必須項目の存在確認を行う
   */
  validateConfig() {
    const required = ['default_browser', 'timeout_seconds', 'max_iterations', 'paths'];
    
    for (const key of required) {
      if (!(key in this.config)) {
        throw new Error(`必須設定項目が不足しています: ${key}`);
      }
    }
    
    // paths の必須項目チェック
    if (!this.config.paths) {
      throw new Error('paths 設定が必要です');
    }
    
    const requiredPaths = ['logs', 'results', 'test_instructions', 'reports'];
    for (const pathKey of requiredPaths) {
      if (!(pathKey in this.config.paths)) {
        throw new Error(`paths.${pathKey} 設定が必要です`);
      }
    }
    
    // Playwrightエージェント設定の確認（警告のみ）
    if (!this.config.playwright_agent) {
      console.warn('⚠️  playwright_agent 設定がありません。デフォルト設定を使用します。');
      this.config.playwright_agent = {};
    }
  }

  /**
   * 対象システムの取得
   * @param {string} name - システム名
   * @returns {Object|undefined} システム設定
   */
  getTargetSystem(name) {
    if (!this.config.target_systems) {
      return undefined;
    }
    return this.config.target_systems.find(s => s.name === name);
  }

  /**
   * 認証情報の取得（環境変数から）
   * @param {string} systemName - システム名
   * @returns {Object} 認証情報
   */
  getCredentials(systemName) {
    const system = this.getTargetSystem(systemName);
    if (!system || !system.credentials) {
      return {};
    }

    return {
      username: process.env[system.credentials.username_env] || '',
      password: process.env[system.credentials.password_env] || ''
    };
  }

  /**
   * Playwrightエージェント設定の取得
   * @returns {Object} Playwrightエージェント設定
   */
  getPlaywrightAgentSettings() {
    return this.config.playwright_agent || {};
  }

  /**
   * Claude API設定の取得
   * @returns {Object} Claude API設定
   */
  getClaudeAPISettings() {
    return this.config.claude_api || {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.7
    };
  }

  /**
   * カバレッジ閾値の取得
   * @returns {Object} カバレッジ閾値
   */
  getCoverageThreshold() {
    return this.config.coverage_threshold || {
      target_percentage: 80,
      stop_if_no_improvement: true
    };
  }

  /**
   * パスの取得
   * @param {string} type - パスの種類
   * @returns {string} パス
   */
  getPath(type) {
    return this.config.paths[type] || `./${type}`;
  }

  /**
   * 設定値の取得（デフォルト値対応）
   * @param {string} key - 設定キー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} 設定値
   */
  get(key, defaultValue = null) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
}

module.exports = ConfigManager;
