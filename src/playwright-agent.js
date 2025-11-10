/**
 * Othello - セッション管理・中継レイヤー
 * 
 * Playwright AgentsとPlaywright MCPの間を取り持つ中核クラス。
 * セッション管理、命令構造化、コンテキスト保持を担当します。
 * 
 * アーキテクチャ:
 * 💭 自然言語層 → 🎭 Playwright Agents → ♟️ Othello（このクラス）
 * → 🧩 MCP層 → 🌐 Playwright層
 */

const fs = require('fs').promises;
const path = require('path');
const { MCPStdioClient } = require('./mcp-stdio-client');

class Othello {
  /**
   * @param {ConfigManager} config - 設定マネージャー
   * @param {Object} options - オプション設定
   * @param {boolean} options.mockMode - モックモードを強制
   * @param {string} options.logFile - ログファイルパス（任意）
   * @param {boolean} options.debugMode - デバッグモード（デフォルト: false）
   */
  constructor(config, options = {}) {
    this.config = config;
    this.browser = config.config.default_browser || 'chromium';
    this.timeout = (config.config.timeout_seconds || 300) * 1000; // ミリ秒に変換
    
    // モックモード（オプションで上書き可能、設定で判定）
    this.mockMode = options.mockMode !== undefined ? options.mockMode : 
                    (config.config.playwright_agent?.mock_mode !== false);
    
    // Stdio通信用のMCPクライアント
    this.mcpClient = null;
    this.isSessionInitialized = false;
    this.browserLaunched = false;
    
    // ログ機能設定
    this.logFile = options.logFile || null;
    this.debugMode = options.debugMode || false;
    this.executionHistory = [];
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // エラーリカバリー設定
    this.maxRetries = options.maxRetries || 0;
    this.retryDelay = options.retryDelay || 1000; // 初期遅延: 1秒
    this.backoffMultiplier = options.backoffMultiplier || 2; // 2倍ずつ増加
    this.maxRetryDelay = options.maxRetryDelay || 30000; // 最大30秒
    this.autoReconnect = options.autoReconnect !== undefined ? options.autoReconnect : true;
    this.saveSnapshotOnFailure = options.saveSnapshotOnFailure || false;
    this.snapshotDir = options.snapshotDir || './error-snapshots';
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
      const validTypes = [
        'navigate',
        'click',
        'fill',
        'select_option',
        'screenshot',
        'evaluate',
        'wait',
        'wait_for',
        'press_key',
        'verify_element_visible',
        'verify_text_visible'
      ];
      if (!validTypes.includes(instruction.type)) {
        const result = {
          success: false,
          instruction: instruction.description || instruction.type,
          error: `サポートされていない指示タイプ: ${instruction.type}`,
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        };
        
        await this.logExecution('warn', 'executeInstruction', {
          instruction: instruction.type,
          result
        });
        
        return result;
      }

      // モックモードの場合はシミュレーション
      if (this.mockMode) {
        const result = this.simulateInstruction(instruction, startTime);
        
        // モックモードでも失敗時はスナップショットを保存
        if (!result.success) {
          await this.saveFailureSnapshot(instruction, new Error(result.error));
        }
        
        await this.logExecution('info', 'executeInstruction', {
          mode: 'mock',
          instruction: instruction.type,
          result
        });
        
        return result;
      }

      // 実際のMCPサーバー呼び出し
      const result = await this.callMCPServer(instruction, startTime);
      
      await this.logExecution(
        result.success ? 'info' : 'error',
        'executeInstruction',
        {
          mode: 'real',
          instruction: instruction.type,
          result
        }
      );
      
      return result;

    } catch (error) {
      // 失敗時のスナップショットを保存
      await this.saveFailureSnapshot(instruction, error);
      
      const result = {
        success: false,
        instruction: instruction.description || instruction.type,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      };
      
      await this.logExecution('error', 'executeInstruction', {
        instruction: instruction.type,
        error: error.message,
        stack: error.stack
      });
      
      // セッション切断エラーの場合、自動再接続を試みる
      if (this.autoReconnect && this.isSessionDisconnected(error)) {
        await this.logExecution('warn', 'executeInstruction', {
          message: 'Session disconnected, attempting to reconnect...'
        });
        
        try {
          await this.initializeSession();
          await this.logExecution('info', 'executeInstruction', {
            message: 'Session reconnected successfully'
          });
        } catch (reconnectError) {
          await this.logExecution('error', 'executeInstruction', {
            message: 'Failed to reconnect session',
            error: reconnectError.message
          });
        }
      }
      
      return result;
    }
  }

  /**
   * セッション切断エラーかどうかを判定
   * @param {Error} error - エラーオブジェクト
   * @returns {boolean}
   */
  isSessionDisconnected(error) {
    const disconnectPatterns = [
      /session.*closed/i,
      /session.*disconnected/i,
      /connection.*closed/i,
      /websocket.*closed/i,
      /mcp.*disconnected/i
    ];
    
    return disconnectPatterns.some(pattern => pattern.test(error.message));
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
   * 実行ログを記録
   * @param {string} level - ログレベル（info, warn, error）
   * @param {string} action - アクション名
   * @param {Object} data - ログデータ
   * @returns {Promise<void>}
   */
  async logExecution(level, action, data) {
    const logEntry = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      level,
      action,
      data,
      // デバッグモード時はスタックトレースを含める
      ...(this.debugMode && level === 'error' && { stackTrace: new Error().stack })
    };

    // メモリ内履歴に追加
    this.executionHistory.push(logEntry);

    // ログファイルが指定されている場合はファイルに追記
    if (this.logFile) {
      try {
        // ディレクトリが存在しない場合は作成
        const path = require('path');
        const logDir = path.dirname(this.logFile);
        await fs.mkdir(logDir, { recursive: true });
        
        await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n', 'utf-8');
      } catch (error) {
        console.error(`Failed to write log to file: ${error.message}`);
      }
    }

    // デバッグモード時はコンソールにも出力（base64データはサニタイズ）
    if (this.debugMode) {
      const prefix = `[${level.toUpperCase()}] [${action}]`;
      const sanitizedData = this.sanitizeMcpResult(data);
      console.log(`${prefix}:`, JSON.stringify(sanitizedData, null, 2));
    }
  }

  /**
   * MCPレスポンスからbase64データをサニタイズ
   * @param {*} payload - サニタイズ対象のデータ
   * @returns {*} サニタイズ後のデータ
   */
  sanitizeMcpResult(payload) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizeMcpResult(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string' && key.toLowerCase().includes('base64')) {
        sanitized[key] = `[omitted base64: ${value.length} chars]`;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMcpResult(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * 実行履歴を取得
   * @param {Object} filter - フィルター条件（level, action等）
   * @returns {Array} フィルターされた実行履歴
   */
  getExecutionHistory(filter = {}) {
    let history = [...this.executionHistory];

    if (filter.level) {
      history = history.filter(entry => entry.level === filter.level);
    }

    if (filter.action) {
      history = history.filter(entry => entry.action === filter.action);
    }

    if (filter.since) {
      const sinceTime = new Date(filter.since).getTime();
      history = history.filter(entry => new Date(entry.timestamp).getTime() >= sinceTime);
    }

    return history;
  }

  /**
   * 実行履歴をクリア
   */
  clearExecutionHistory() {
    this.executionHistory = [];
  }

  /**
   * 実行履歴をファイルに保存
   * @param {string} filename - 保存先ファイルパス
   * @returns {Promise<void>}
   */
  async saveExecutionHistory(filename) {
    try {
      const historyData = {
        sessionId: this.sessionId,
        savedAt: new Date().toISOString(),
        totalEntries: this.executionHistory.length,
        history: this.executionHistory
      };

      await fs.writeFile(filename, JSON.stringify(historyData, null, 2), 'utf-8');
      
      if (this.debugMode) {
        console.log(`[DEBUG] Execution history saved to: ${filename}`);
        console.log(`[DEBUG] Total entries: ${this.executionHistory.length}`);
      }
      
      await this.logExecution('info', 'saveExecutionHistory', {
        filename,
        entriesCount: this.executionHistory.length
      });
    } catch (error) {
      await this.logExecution('error', 'saveExecutionHistory', {
        filename,
        error: error.message,
        ...(this.debugMode && { stackTrace: error.stack })
      });
      throw error;
    }
  }

  /**
   * ファイルから実行履歴を読み込み
   * @param {string} filename - 読み込み元ファイルパス
   * @param {boolean} append - 既存の履歴に追加するか（デフォルト: false）
   * @returns {Promise<Object>} 読み込んだ履歴データ
   */
  async loadExecutionHistory(filename, append = false) {
    try {
      const fileContent = await fs.readFile(filename, 'utf-8');
      const historyData = JSON.parse(fileContent);

      if (!append) {
        this.executionHistory = historyData.history;
      } else {
        this.executionHistory.push(...historyData.history);
      }

      if (this.debugMode) {
        console.log(`[DEBUG] Execution history loaded from: ${filename}`);
        console.log(`[DEBUG] Loaded entries: ${historyData.totalEntries}`);
        console.log(`[DEBUG] Original session ID: ${historyData.sessionId}`);
        console.log(`[DEBUG] Saved at: ${historyData.savedAt}`);
      }

      await this.logExecution('info', 'loadExecutionHistory', {
        filename,
        entriesLoaded: historyData.totalEntries,
        originalSessionId: historyData.sessionId,
        append
      });

      return historyData;
    } catch (error) {
      await this.logExecution('error', 'loadExecutionHistory', {
        filename,
        error: error.message,
        ...(this.debugMode && { stackTrace: error.stack })
      });
      throw error;
    }
  }

  /**
   * MCPセッションを初期化（Stdio通信）
   * @returns {Promise<void>}
   */
  async initializeSession() {
    // すでに初期化済みの場合はスキップ
    if (this.isSessionInitialized) {
      return;
    }
    
    try {
      // MCPStdioClientを作成
      this.mcpClient = new MCPStdioClient({
        clientName: 'Othello',
        clientVersion: '2.0.0',
        serverArgs: [
          // ブラウザタイプを指定（必要に応じて）
          // '--browser', this.browser
        ]
      });

      // Stdio通信で接続（initializeは自動実行される）
      await this.mcpClient.connect();
      
      // セッション初期化完了（ブラウザは最初のツール呼び出し時に自動起動される）
      this.isSessionInitialized = true;
      this.browserLaunched = false;
      
      // ログ記録
      await this.logExecution('info', 'initializeSession', {
        sessionId: this.sessionId,
        browser: this.browser,
        mockMode: this.mockMode
      });
      
    } catch (error) {
      this.mcpClient = null;
      this.isSessionInitialized = false;
      
      // エラーログ記録
      await this.logExecution('error', 'initializeSession', {
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`MCP session initialization failed: ${error.message}`);
    }
  }

  /**
   * ブラウザを起動
   * @returns {Promise<void>}
   */
  async launchBrowser() {
    // ブラウザはMCPサーバー側で自動的に管理されるため、
    // ここでは状態フラグの更新のみ
    this.browserLaunched = true;
  }

  /**
   * セッションをクローズ（Stdio通信）
   * @returns {Promise<void>}
   */
  async closeSession() {
    if (!this.isSessionInitialized) {
      return;
    }

    try {
      // MCPクライアントを切断
      if (this.mcpClient) {
        await this.mcpClient.disconnect();
        this.mcpClient = null;
      }
      
      // 状態をリセット
      this.browserLaunched = false;
      this.isSessionInitialized = false;
      
      // ログ記録
      await this.logExecution('info', 'closeSession', {
        sessionId: this.sessionId,
        totalActions: this.executionHistory.length
      });
      
    } catch (error) {
      await this.logExecution('error', 'closeSession', {
        error: error.message
      });
      console.error(`Session close error: ${error.message}`);
    }
  }



  /**
   * MCP サーバーを呼び出し（Stdio通信）
   * @param {Object} instruction - テスト指示
   * @param {number} startTime - 開始時刻
   * @returns {Promise<Object>} 実行結果
   */
  async callMCPServer(instruction, startTime) {
    try {
      // セッションが初期化されていない場合は自動初期化
      if (!this.isSessionInitialized) {
        await this.initializeSession();
      }

      // アクションタイプをMCPツール名にマッピング
      const toolMapping = {
        navigate: 'browser_navigate',
        click: 'browser_click',
        fill: 'browser_type',
        select_option: 'browser_select_option',
        screenshot: 'browser_take_screenshot',
        evaluate: 'browser_evaluate',
        wait: 'browser_wait_for',
        wait_for: 'browser_wait_for',
        press_key: 'browser_press_key',
        verify_element_visible: 'browser_verify_element_visible',
        verify_text_visible: 'browser_verify_text_visible'
      };

      const toolName = toolMapping[instruction.type];
      if (!toolName) {
        throw new Error(`Unsupported instruction type: ${instruction.type}`);
      }

      // MCP引数を構築
      const mcpArguments = this.buildMCPArguments(instruction);

      // MCPStdioClientでツールを呼び出し
      const mcpResult = await this.mcpClient.callTool(toolName, mcpArguments);

      // 成功時のレスポンス処理
      if (mcpResult.success) {
        return {
          success: true,
          instruction: instruction.description || instruction.type,
          type: instruction.type,
          details: mcpResult.sections ? Object.fromEntries(mcpResult.sections) : {},
          content: mcpResult.content,
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        };
      } else {
        // エラーレスポンス
        throw new Error(mcpResult.error || 'MCP tool call failed');
      }

    } catch (error) {
      // エラーハンドリング
      return {
        success: false,
        instruction: instruction.description || instruction.type,
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        status: 'error'
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

      case 'select_option':
        return {
          element: intent,
          ref: instruction.selector,
          values: instruction.values || (instruction.value ? [instruction.value] : []),
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
          time: instruction.duration ? instruction.duration / 1000 : instruction.time || 1,
          intent: intent
        };

      case 'wait_for':
        return {
          time: instruction.duration ? instruction.duration / 1000 : instruction.time || 1,
          intent: intent
        };

      case 'press_key':
        return {
          key: instruction.key,
          intent: intent
        };

      case 'verify_element_visible':
        return {
          role: instruction.role || 'generic',
          accessibleName: instruction.accessibleName || instruction.description || '',
          intent: intent
        };

      case 'verify_text_visible':
        return {
          text: instruction.text || instruction.value || '',
          intent: intent
        };

      default:
        return { intent: intent };
    }
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
   * スクリーンショットを撮影
   * @param {string} filename - 保存先ファイルパス
   * @param {Object} options - オプション（fullPage等）
   * @returns {Promise<Object>} 実行結果
   */
  async screenshot(filename, options = {}) {
    if (this.mockMode) {
      await this.logExecution('info', 'screenshot', {
        mode: 'mock',
        filename,
        options
      });
      return { success: true, filename };
    }

    try {
      // セッションが初期化されていない場合は自動初期化
      if (!this.isSessionInitialized) {
        await this.initializeSession();
      }

      // MCPツールを呼び出し
      console.log(`🔧 [PlaywrightAgent] Calling MCP browser_take_screenshot...`);
      console.log(`   filename: ${filename}`);
      console.log(`   fullPage: ${options.fullPage || false}`);
      
      const mcpResult = await this.mcpClient.callTool('browser_take_screenshot', {
        filename,
        fullPage: options.fullPage || false,
        type: options.type || 'png'
      });

      const sanitizedResult = this.sanitizeMcpPayload(mcpResult);
      console.log(`🔧 [PlaywrightAgent] MCP Result (sanitized):`, JSON.stringify(sanitizedResult, null, 2));

      await this.logExecution('info', 'screenshot', {
        filename,
        success: mcpResult.success,
        result: sanitizedResult
      });

      return mcpResult;

    } catch (error) {
      await this.logExecution('error', 'screenshot', {
        filename,
        error: error.message
      });
      throw error;
    }
  }
  /**
   * MCPレスポンス内の巨大なbase64データをマスクしてログ可読性を保つ
   * @param {any} payload
   * @returns {any}
   */
  sanitizeMcpPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizeMcpPayload(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string' && key.toLowerCase().includes('base64')) {
        sanitized[key] = `[omitted base64: ${value.length} chars]`;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMcpPayload(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizePotentialBase64String(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  sanitizePotentialBase64String(value) {
    if (typeof value !== 'string') {
      return value;
    }

    const base64KeyPattern = /(imageBase64\s*:\s*)([A-Za-z0-9+/=\r\n]+)/gi;
    if (base64KeyPattern.test(value)) {
      base64KeyPattern.lastIndex = 0;
      return value.replace(base64KeyPattern, (_, prefix, data) => {
        const length = data.replace(/\s+/g, '').length;
        return `${prefix}[omitted base64: ${length} chars]`;
      });
    }

    const compact = value.replace(/\s+/g, '');
    const looksLikeBase64 = compact.length > 512 && /^[A-Za-z0-9+/=]+$/.test(compact);
    if (looksLikeBase64) {
      return `[omitted base64 blob: ${compact.length} chars]`;
    }

    return value;
  }

  /**
   * ページのアクセシビリティスナップショットを取得
   * @returns {Promise<string>} スナップショット内容
   */
  async snapshot() {
    if (this.mockMode) {
      await this.logExecution('info', 'snapshot', {
        mode: 'mock'
      });
      return 'mock-snapshot-content';
    }

    try {
      // セッションが初期化されていない場合は自動初期化
      if (!this.isSessionInitialized) {
        await this.initializeSession();
      }

      // MCPツールを呼び出し
      const mcpResult = await this.mcpClient.callTool('browser_snapshot', {});

      await this.logExecution('info', 'snapshot', {
        success: mcpResult.success
      });

      // スナップショット内容を返す
      return mcpResult.content || mcpResult.snapshot || '';

    } catch (error) {
      await this.logExecution('error', 'snapshot', {
        error: error.message
      });
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

  /**
   * 指数バックオフ付き自動再試行
   * @param {Function} action - 実行する非同期関数
   * @param {string} actionName - アクション名（ログ用）
   * @returns {Promise<any>} アクションの結果
   */
  async executeWithRetry(action, actionName = 'unknown') {
    let lastError;
    let attempts = 0;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        // アクション実行
        const result = await action();

        // 成功時のログ
        await this.logExecution('info', 'executeWithRetry', {
          action: actionName,
          attempts: attempts,
          maxRetries: this.maxRetries,
          success: true,
          duration_ms: Date.now() - startTime
        });

        return result;

      } catch (error) {
        lastError = error;

        // 最後の試行の場合はリトライしない
        if (attempt === this.maxRetries) {
          break;
        }

        // 指数バックオフ計算
        const delay = Math.min(
          this.retryDelay * Math.pow(this.backoffMultiplier, attempt),
          this.maxRetryDelay
        );

        // リトライログ
        await this.logExecution('warn', 'executeWithRetry', {
          action: actionName,
          attempt: attempts,
          maxRetries: this.maxRetries,
          error: error.message,
          retryIn: delay,
          nextAttempt: attempt + 2
        });

        // 待機
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 全ての試行が失敗
    await this.logExecution('error', 'executeWithRetry', {
      action: actionName,
      attempts,
      maxRetries: this.maxRetries,
      success: false,
      error: lastError.message,
      duration_ms: Date.now() - startTime,
      ...(this.debugMode && { stackTrace: lastError.stack })
    });

    throw lastError;
  }

  /**
   * 失敗時のスナップショットを保存
   * @param {Object} instruction - 失敗した指示
   * @param {Error} error - 発生したエラー
   * @returns {Promise<void>}
   */
  async saveFailureSnapshot(instruction, error) {
    if (!this.saveSnapshotOnFailure) {
      return;
    }

    try {
      const fs = require('fs').promises;
      const path = require('path');

      // ディレクトリ作成
      await fs.mkdir(this.snapshotDir, { recursive: true });

      // スナップショットデータ
      const snapshot = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        instruction,
        error: {
          message: error.message,
          stack: error.stack
        },
        executionHistory: this.executionHistory.slice(-5) // 直近5件
      };

      // ファイル名生成
      const filename = `failure_${Date.now()}_${this.sessionId.split('_')[2]}.json`;
      const filepath = path.join(this.snapshotDir, filename);

      // 保存
      await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2), 'utf-8');

      await this.logExecution('info', 'saveFailureSnapshot', {
        filename,
        filepath
      });

    } catch (snapshotError) {
      // スナップショット保存のエラーはログのみ
      console.error(`Failed to save failure snapshot: ${snapshotError.message}`);
    }
  }
}

module.exports = Othello;
