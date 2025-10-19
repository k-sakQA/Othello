/**
 * MCP Stdio Client for Playwright MCP
 * 
 * Stdio (Standard Input/Output) 通信を使用してPlaywright MCPサーバーと通信するクライアント。
 * 公式テストコードと同じ方法で実装。
 * 
 * @see https://github.com/microsoft/playwright-mcp (公式実装)
 * @see tests/fixtures.ts (公式テストのStdioClientTransport使用例)
 */

const path = require('path');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

class MCPStdioClient {
  /**
   * @param {Object} options
   * @param {string} [options.clientName='othello-playwright'] - クライアント名
   * @param {string} [options.clientVersion='1.0.0'] - クライアントバージョン
   * @param {string[]} [options.serverArgs=[]] - Playwright MCPサーバーの追加引数
   */
  constructor(options = {}) {
    this.clientName = options.clientName || 'othello-playwright';
    this.clientVersion = options.clientVersion || '1.0.0';
    this.serverArgs = options.serverArgs || [];
    
    this.client = null;
    this.transport = null;
    this.connected = false;
  }

  /**
   * Playwright MCPサーバーに接続
   * 
   * @param {string[]} [additionalArgs=[]] - 追加のサーバー引数
   * @returns {Promise<void>}
   */
  async connect(additionalArgs = []) {
    if (this.connected) {
      throw new Error('Already connected to Playwright MCP server');
    }

    // StdioClientTransportでPlaywright MCPサーバーを起動
    // 公式テストと同じ方法（tests/fixtures.ts参照）
    
    // ローカルインストールされたPlaywright MCPのcli.jsを使用
    const playwrightMcpCli = path.join(__dirname, '../node_modules/@playwright/mcp/cli.js');
    
    const args = [
      playwrightMcpCli,
      ...this.serverArgs,
      ...additionalArgs,
    ];

    // 公式と同じ形式でStdioClientTransportを作成
    this.transport = new StdioClientTransport({
      command: 'node',
      args,
      cwd: path.join(__dirname, '..'), // プロジェクトルート
      stderr: 'pipe', // stderrをパイプして取得可能にする
      env: {
        ...process.env,
        // 必要に応じて環境変数を追加
      },
    });

    console.log('[MCPStdioClient] Creating MCP Client...');
    
    // MCPクライアント作成（公式テストと同じ形式）
    this.client = new Client(
      {
        name: this.clientName,
        version: this.clientVersion,
      },
      // 第2引数はundefinedまたは省略（デフォルトcapabilitiesを使用）
    );

    console.log('[MCPStdioClient] Client created');

    // stderr出力を監視（デバッグ用）
    try {
      if (this.transport.stderr) {
        this.transport.stderr.on('data', (data) => {
          // 常に表示（デバッグのため）
          console.error('[Playwright MCP stderr]:', data.toString());
        });
        console.log('[MCPStdioClient] stderr monitoring enabled');
      }
    } catch (e) {
      console.error('[MCPStdioClient] Warning: Could not set up stderr monitoring:', e.message);
    }

    try {
      console.log('[MCPStdioClient] Connecting to transport...');
      // 接続（initializeメッセージを送信）
      await this.client.connect(this.transport);
      console.log('[MCPStdioClient] Connected');
    } catch (error) {
      console.error('[MCPStdioClient] Connection failed:', error.message);
      throw error;
    }
    
    try {
      console.log('[MCPStdioClient] Sending ping...');
      // Ping確認（接続確認）
      await this.client.ping();
      console.log('[MCPStdioClient] Ping successful');
    } catch (error) {
      console.error('[MCPStdioClient] Ping failed:', error.message);
      throw error;
    }
    
    this.connected = true;
    console.log('[MCPStdioClient] Connected to Playwright MCP server');
  }

  /**
   * ツール一覧を取得
   * 
   * @returns {Promise<Array>} ツール一覧
   */
  async listTools() {
    this._ensureConnected();
    const result = await this.client.listTools();
    return result.tools;
  }

  /**
   * ツールを実行
   * 
   * @param {string} toolName - ツール名
   * @param {Object} toolArgs - ツール引数
   * @returns {Promise<Object>} ツール実行結果
   */
  async callTool(toolName, toolArgs = {}) {
    this._ensureConnected();
    
    const response = await this.client.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    return this._parseToolResponse(response);
  }

  /**
   * リソース一覧を取得
   * 
   * @returns {Promise<Array>} リソース一覧
   */
  async listResources() {
    this._ensureConnected();
    const result = await this.client.listResources();
    return result.resources;
  }

  /**
   * プロンプト一覧を取得
   * 
   * @returns {Promise<Array>} プロンプト一覧
   */
  async listPrompts() {
    this._ensureConnected();
    const result = await this.client.listPrompts();
    return result.prompts;
  }

  /**
   * 接続を閉じる
   * 
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
      console.log('[MCPStdioClient] Disconnected from Playwright MCP server');
    } catch (error) {
      console.error('[MCPStdioClient] Error during disconnect:', error.message);
    } finally {
      this.client = null;
      this.transport = null;
      this.connected = false;
    }
  }

  /**
   * 接続状態を確認
   * 
   * @returns {boolean} 接続中かどうか
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 接続確認（内部用）
   * 
   * @private
   * @throws {Error} 接続していない場合
   */
  _ensureConnected() {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to Playwright MCP server. Call connect() first.');
    }
  }

  /**
   * ツールレスポンスをパース
   * 
   * @private
   * @param {Object} response - ツールレスポンス
   * @returns {Object} パース済みレスポンス
   */
  _parseToolResponse(response) {
    // response.content は配列形式
    // [{ type: 'text', text: '...' }] のような形式
    if (!response.content || !Array.isArray(response.content)) {
      return {
        success: false,
        error: 'Invalid response format',
        rawResponse: response,
      };
    }

    // エラーレスポンスの場合
    if (response.isError) {
      const errorText = response.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      
      return {
        success: false,
        error: errorText || 'Unknown error',
        rawResponse: response,
      };
    }

    // 成功レスポンスの場合
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    // セクション別にパース（公式テストのparseSections相当）
    const sections = this._parseSections(textContent);

    return {
      success: true,
      content: textContent,
      sections,
      rawResponse: response,
    };
  }

  /**
   * レスポンステキストをセクション別にパース
   * 
   * @private
   * @param {string} text - レスポンステキスト
   * @returns {Map<string, string>} セクションマップ
   */
  _parseSections(text) {
    const sections = new Map();
    const lines = text.split('\n');
    
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      // セクションヘッダー: "- Section Name:"
      const match = line.match(/^- (.+?):\s*$/);
      if (match) {
        // 前のセクションを保存
        if (currentSection) {
          sections.set(currentSection, currentContent.join('\n').trim());
        }
        // 新しいセクション開始
        currentSection = match[1];
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // 最後のセクションを保存
    if (currentSection) {
      sections.set(currentSection, currentContent.join('\n').trim());
    }

    return sections;
  }

  /**
   * ブラウザナビゲーション（よく使う操作のヘルパー）
   * 
   * @param {string} url - ナビゲート先URL
   * @returns {Promise<Object>} ツール実行結果
   */
  async navigate(url) {
    return this.callTool('browser_navigate', { url });
  }

  /**
   * ページスナップショット取得（よく使う操作のヘルパー）
   * 
   * @returns {Promise<Object>} ツール実行結果
   */
  async snapshot() {
    return this.callTool('browser_snapshot', {});
  }

  /**
   * 要素クリック（よく使う操作のヘルパー）
   * 
   * @param {string} element - 人間が読める要素説明
   * @param {string} ref - スナップショットからの要素参照
   * @param {string} intent - 操作の意図
   * @returns {Promise<Object>} ツール実行結果
   */
  async click(element, ref, intent) {
    return this.callTool('browser_click', { element, ref, intent });
  }

  /**
   * テキスト入力（よく使う操作のヘルパー）
   * 
   * @param {string} element - 人間が読める要素説明
   * @param {string} ref - スナップショットからの要素参照
   * @param {string} text - 入力テキスト
   * @param {string} intent - 操作の意図
   * @returns {Promise<Object>} ツール実行結果
   */
  async type(element, ref, text, intent) {
    return this.callTool('browser_type', { element, ref, text, intent });
  }

  /**
   * スクリーンショット取得（よく使う操作のヘルパー）
   * 
   * @param {string} [filename] - ファイル名（オプション）
   * @returns {Promise<Object>} ツール実行結果
   */
  async screenshot(filename) {
    const args = filename ? { filename } : {};
    return this.callTool('browser_take_screenshot', args);
  }

  /**
   * ブラウザクローズ（よく使う操作のヘルパー）
   * 
   * @returns {Promise<Object>} ツール実行結果
   */
  async closeBrowser() {
    return this.callTool('browser_close', {});
  }
}

module.exports = { MCPStdioClient };
