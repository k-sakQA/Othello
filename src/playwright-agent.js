/**
 * Playwright MCPエージェント
 * Playwright MCPサーバーとの連携を管理
 */

const fs = require('fs').promises;
const path = require('path');

class PlaywrightAgent {
  /**
   * @param {ConfigManager} config - 設定マネージャー
   * @param {Object} options - オプション設定
   * @param {boolean} options.mockMode - モックモードを強制（デフォルト: エンドポイントの有無で自動判定）
   */
  constructor(config, options = {}) {
    this.config = config;
    this.browser = config.config.default_browser || 'chromium';
    this.timeout = (config.config.timeout_seconds || 300) * 1000; // ミリ秒に変換
    
    // Playwright MCPエンドポイント
    this.mcpEndpoint = config.config.playwright_agent?.api_endpoint || null;
    
    // モックモード（オプションで上書き可能、デフォルトはエンドポイントの有無で判定）
    this.mockMode = options.mockMode !== undefined ? options.mockMode : !this.mcpEndpoint;
  }

  /**
   * 単一のテスト指示を実行
   * @param {Object} instruction - テスト指示
   * @returns {Promise<Object>} 実行結果
   */
  async executeInstruction(instruction) {
    const startTime = Date.now();

    try {
      // 指示タイプの検証
      const validTypes = ['navigate', 'click', 'fill', 'screenshot', 'evaluate', 'wait'];
      if (!validTypes.includes(instruction.type)) {
        return {
          success: false,
          instruction: instruction.description || instruction.type,
          error: `サポートされていない指示タイプ: ${instruction.type}`,
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        };
      }

      // モックモードの場合はシミュレーション
      if (this.mockMode) {
        return this.simulateInstruction(instruction, startTime);
      }

      // 実際のMCPサーバー呼び出し（将来の実装）
      return await this.callMCPServer(instruction, startTime);

    } catch (error) {
      return {
        success: false,
        instruction: instruction.description || instruction.type,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * 指示のシミュレーション（モックモード）
   * @param {Object} instruction - テスト指示
   * @param {number} startTime - 開始時刻
   * @returns {Object} シミュレーション結果
   */
  simulateInstruction(instruction, startTime) {
    // 各アクションタイプに応じたシミュレーション
    const simulationDelay = Math.random() * 100 + 50; // 50-150ms

    // 特定の条件で失敗をシミュレート
    const shouldFail = instruction.selector === '#nonexistent-element' ||
                       instruction.url === 'https://fail.example.com';

    if (shouldFail) {
      return {
        success: false,
        instruction: instruction.description || instruction.type,
        error: 'Element not found or navigation failed',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      };
    }

    return {
      success: true,
      instruction: instruction.description || instruction.type,
      type: instruction.type,
      details: this.getInstructionDetails(instruction),
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime + simulationDelay
    };
  }

  /**
   * 指示の詳細情報を取得
   * @param {Object} instruction - テスト指示
   * @returns {Object} 詳細情報
   */
  getInstructionDetails(instruction) {
    const details = {};

    if (instruction.url) details.url = instruction.url;
    if (instruction.selector) details.selector = instruction.selector;
    if (instruction.value) details.value = instruction.value;
    if (instruction.path) details.path = instruction.path;

    return details;
  }

  /**
   * MCP サーバーを呼び出し
   * @param {Object} instruction - テスト指示
   * @param {number} startTime - 開始時刻
   * @returns {Promise<Object>} 実行結果
   */
  async callMCPServer(instruction, startTime) {
    const axios = require('axios');
    
    try {
      // アクションタイプをMCPツール名にマッピング
      const toolMapping = {
        navigate: 'browser_navigate',
        click: 'browser_click',
        fill: 'browser_type',
        screenshot: 'browser_take_screenshot',
        evaluate: 'browser_evaluate',
        wait: 'browser_wait_for'
      };

      const toolName = toolMapping[instruction.type];
      if (!toolName) {
        throw new Error(`Unsupported instruction type: ${instruction.type}`);
      }

      // MCPリクエストパラメータを構築
      const mcpRequest = {
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: this.buildMCPArguments(instruction)
        }
      };

      // MCPサーバーにリクエスト送信
      const response = await axios.post(
        this.mcpEndpoint,
        mcpRequest,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream'
          }
        }
      );

      // レスポンスを解析
      return this.parseMCPResponse(response.data, instruction, startTime);

    } catch (error) {
      // エラーハンドリング
      return {
        success: false,
        instruction: instruction.description || instruction.type,
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      };
    }
  }

  /**
   * MCPリクエストの引数を構築
   * @param {Object} instruction - テスト指示
   * @returns {Object} MCP引数
   */
  buildMCPArguments(instruction) {
    const intent = instruction.description || instruction.type;

    switch (instruction.type) {
      case 'navigate':
        return {
          url: instruction.url,
          intent: intent
        };

      case 'click':
        return {
          element: intent,
          ref: instruction.selector,
          intent: intent
        };

      case 'fill':
        return {
          element: intent,
          ref: instruction.selector,
          text: instruction.value,
          intent: intent
        };

      case 'screenshot':
        return {
          filename: instruction.path
        };

      case 'evaluate':
        return {
          function: instruction.script,
          intent: intent
        };

      case 'wait':
        return {
          time: instruction.duration / 1000, // ミリ秒→秒
          intent: intent
        };

      default:
        return { intent: intent };
    }
  }

  /**
   * MCPレスポンスを解析
   * @param {Object} data - MCPレスポンスデータ
   * @param {Object} instruction - テスト指示
   * @param {number} startTime - 開始時刻
   * @returns {Object} 実行結果
   */
  parseMCPResponse(data, instruction, startTime) {
    // レスポンス検証
    if (!data || !data.content || data.content.length === 0) {
      return {
        success: false,
        instruction: instruction.description || instruction.type,
        error: 'Invalid response from MCP server: empty content',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      };
    }

    // コンテンツから結果を抽出
    const content = data.content[0];
    let result;

    if (content.type === 'text') {
      try {
        result = JSON.parse(content.text);
      } catch (e) {
        result = { success: true, data: content.text };
      }
    } else if (content.type === 'image') {
      result = {
        success: true,
        image: content.data,
        mimeType: content.mimeType
      };
    } else {
      result = { success: true, data: content };
    }

    // 統一形式に変換
    return {
      success: result.success !== false,
      instruction: instruction.description || instruction.type,
      details: result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime
    };
  }

  /**
   * 完全なテストを実行
   * @param {Object} testInstruction - テスト指示全体
   * @returns {Promise<Object>} テスト結果
   */
  async executeTest(testInstruction) {
    const startTime = Date.now();
    const results = {
      test_id: testInstruction.test_id,
      scenario: testInstruction.scenario,
      target_url: testInstruction.target_url,
      timestamp: new Date().toISOString(),
      actions: [],
      actions_executed: 0,
      failed_actions: 0,
      success: true
    };

    try {
      // タイムアウト設定
      const testTimeout = testInstruction.timeout || this.timeout;

      // 各アクションを順次実行
      for (const action of testInstruction.actions) {
        const actionResult = await this.executeInstruction(action);
        results.actions.push(actionResult);
        results.actions_executed++;

        if (!actionResult.success) {
          results.failed_actions++;
          results.success = false;
        }

        // タイムアウトチェック
        if (Date.now() - startTime > testTimeout) {
          results.success = false;
          results.timeout = true;
          results.error = 'Test execution timeout';
          break;
        }
      }

      results.duration_ms = Date.now() - startTime;

      return results;

    } catch (error) {
      results.success = false;
      results.error = error.message;
      results.duration_ms = Date.now() - startTime;
      return results;
    }
  }

  /**
   * ログをファイルに保存
   * @param {Object} logData - ログデータ
   * @param {string} logPath - 保存先パス
   * @returns {Promise<void>}
   */
  async saveLog(logData, logPath) {
    try {
      // ディレクトリを作成
      const logDir = path.dirname(logPath);
      await fs.mkdir(logDir, { recursive: true });

      // JSONとして保存
      await fs.writeFile(
        logPath,
        JSON.stringify(logData, null, 2),
        'utf8'
      );

    } catch (error) {
      throw new Error(`Failed to save log: ${error.message}`);
    }
  }

  /**
   * ログディレクトリから全ログを収集
   * @param {string} logsDir - ログディレクトリパス
   * @returns {Promise<Array>} ログデータの配列
   */
  async collectLogs(logsDir) {
    try {
      // ディレクトリ内のファイル一覧を取得
      const files = await fs.readdir(logsDir);
      
      // JSONファイルのみをフィルタ
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      // 全ファイルを読み込み
      const logs = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(logsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          return JSON.parse(content);
        })
      );

      return logs;

    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // ディレクトリが存在しない場合は空配列
      }
      throw error;
    }
  }

  /**
   * ブラウザを起動（将来の実装）
   * @returns {Promise<void>}
   */
  async launch() {
    if (this.mockMode) {
      console.log('🎭 Mock mode: Browser launch simulated');
      return;
    }

    // TODO: 実際のブラウザ起動処理
    throw new Error('Browser launch not yet implemented');
  }

  /**
   * ブラウザを終了（将来の実装）
   * @returns {Promise<void>}
   */
  async close() {
    if (this.mockMode) {
      console.log('🎭 Mock mode: Browser close simulated');
      return;
    }

    // TODO: 実際のブラウザ終了処理
    throw new Error('Browser close not yet implemented');
  }
}

module.exports = PlaywrightAgent;
