/**
 * MCP Health Checker
 * 
 * Playwright MCPサーバーの起動状態をチェックし、
 * 必要に応じて起動方法を提示するヘルパー
 */

const { spawn } = require('child_process');
const path = require('path');

class MCPHealthChecker {
  /**
   * @param {Object} options
   * @param {number} [options.timeout=5000] - タイムアウト時間（ミリ秒）
   * @param {boolean} [options.verbose=false] - 詳細ログ出力
   */
  constructor(options = {}) {
    this.timeout = options.timeout || 5000;
    this.verbose = options.verbose || false;
  }

  /**
   * MCPサーバーの起動状態をチェック
   * 
   * @returns {Promise<Object>} チェック結果
   * @returns {boolean} result.available - MCPサーバーが利用可能か
   * @returns {string} result.message - 結果メッセージ
   * @returns {Error} [result.error] - エラーオブジェクト（失敗時）
   */
  async checkHealth() {
    try {
      const result = await this.tryConnect();
      
      if (result.available) {
        return {
          available: true,
          message: '✅ Playwright MCP Server is available'
        };
      } else {
        return {
          available: false,
          message: '⚠️  Playwright MCP Server is not responding',
          error: result.error
        };
      }
    } catch (error) {
      return {
        available: false,
        message: '❌ Failed to check Playwright MCP Server status',
        error
      };
    }
  }

  /**
   * MCPサーバーへの接続を試行
   * 
   * @returns {Promise<Object>}
   */
  async tryConnect() {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve({
          available: false,
          error: new Error('Connection timeout')
        });
      }, this.timeout);

      let stdoutData = '';
      let stderrData = '';
      
      // @playwright/mcp を直接実行してみる
      const mcpCli = path.join(__dirname, '../node_modules/@playwright/mcp/cli.js');
      
      const child = spawn('node', [mcpCli], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..'),
        env: process.env
      });

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        clearTimeout(timeoutId);
        try {
          child.kill();
        } catch (e) {
          // プロセスが既に終了している場合は無視
        }
      };

      child.stdout.on('data', (data) => {
        stdoutData += data.toString();
        if (this.verbose) {
          console.log('[MCP stdout]:', data.toString());
        }
      });

      child.stderr.on('data', (data) => {
        stderrData += data.toString();
        if (this.verbose) {
          console.log('[MCP stderr]:', data.toString());
        }
        
        // MCPサーバーが起動したことを示すメッセージを検出
        // 通常、MCPサーバーはstderrに起動メッセージを出力
        if (stderrData.includes('Playwright') || stderrData.includes('MCP')) {
          cleanup();
          resolve({
            available: true
          });
        }
      });

      child.on('error', (error) => {
        cleanup();
        resolve({
          available: false,
          error
        });
      });

      // MCPプロトコルのinitializeメッセージを送信
      try {
        const initMessage = JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'health-check',
              version: '1.0.0'
            }
          }
        });
        
        child.stdin.write(initMessage + '\n');
      } catch (e) {
        cleanup();
        resolve({
          available: false,
          error: e
        });
      }

      // stdoutからのレスポンスを監視
      child.stdout.on('data', () => {
        // 何らかのレスポンスがあれば接続成功とみなす
        cleanup();
        resolve({
          available: true
        });
      });
    });
  }

  /**
   * MCP起動スクリプトを生成
   * 
   * @param {Object} options
   * @param {string} [options.browser='chromium'] - ブラウザ種類
   * @param {string} [options.shell='pwsh'] - シェルの種類
   * @returns {Object} 起動スクリプト情報
   */
  generateStartupScript(options = {}) {
    const browser = options.browser || 'chromium';
    const shell = options.shell || 'pwsh';
    
    const scripts = {
      pwsh: {
        inline: `npx @playwright/mcp@latest --browser ${browser}`,
        background: `Start-Process -NoNewWindow npx -ArgumentList "@playwright/mcp@latest","--browser","${browser}"`,
        description: 'PowerShell/PowerShell Core用コマンド'
      },
      cmd: {
        inline: `npx @playwright/mcp@latest --browser ${browser}`,
        background: `start /B npx @playwright/mcp@latest --browser ${browser}`,
        description: 'コマンドプロンプト用コマンド'
      },
      bash: {
        inline: `npx @playwright/mcp@latest --browser ${browser}`,
        background: `npx @playwright/mcp@latest --browser ${browser} &`,
        description: 'Bash/Zsh用コマンド'
      }
    };

    return scripts[shell] || scripts.pwsh;
  }

  /**
   * ヘルプメッセージを表示
   * 
   * @param {Object} options
   * @param {string} [options.browser='chromium'] - ブラウザ種類
   * @param {string} [options.shell='pwsh'] - シェルの種類
   * @returns {string} ヘルプメッセージ
   */
  getStartupHelp(options = {}) {
    const browser = options.browser || 'chromium';
    const shell = options.shell || 'pwsh';
    
    const script = this.generateStartupScript({ browser, shell });
    
    return `
╔════════════════════════════════════════════════════════════════════════════╗
║                   Playwright MCP Server Not Available                      ║
╚════════════════════════════════════════════════════════════════════════════╝

Othello requires Playwright MCP Server to be running.

📋 Setup Instructions:

1️⃣  別のターミナルを開いて、以下のコマンドを実行してください：

   ${script.inline}

   または、バックグラウンドで起動：

   ${script.background}

2️⃣  MCPサーバーが起動したら、再度Othelloを実行してください：

   node bin/othello.js --url <URL> [options]

💡 Tips:
   - MCPサーバーは別プロセスとして常時起動しておく必要があります
   - Ctrl+Cで停止できます（バックグラウンド起動の場合は手動でプロセスを終了）
   - 初回起動時は@playwright/mcpのインストールに時間がかかる場合があります

📚 詳細: https://github.com/microsoft/playwright-mcp

╔════════════════════════════════════════════════════════════════════════════╗
`;
  }

  /**
   * MCPサーバーが必要かどうかをチェックし、必要に応じてヘルプを表示
   * 
   * @param {Object} options
   * @param {boolean} [options.autoCheck=true] - 自動チェックを実行
   * @param {boolean} [options.showHelp=true] - ヘルプを表示
   * @param {string} [options.browser='chromium'] - ブラウザ種類
   * @param {string} [options.shell='pwsh'] - シェルの種類
   * @returns {Promise<boolean>} MCPサーバーが利用可能ならtrue
   */
  async checkAndPrompt(options = {}) {
    const autoCheck = options.autoCheck !== false;
    const showHelp = options.showHelp !== false;
    const browser = options.browser || 'chromium';
    const shell = options.shell || 'pwsh';

    if (!autoCheck) {
      return true; // チェックスキップ
    }

    console.log('🔍 Checking Playwright MCP Server availability...\n');

    const result = await this.checkHealth();

    if (result.available) {
      console.log(result.message);
      console.log('');
      return true;
    }

    // MCPサーバーが利用不可
    console.error(result.message);
    if (result.error && this.verbose) {
      console.error('Error details:', result.error.message);
    }
    console.log('');

    if (showHelp) {
      console.log(this.getStartupHelp({ browser, shell }));
    }

    return false;
  }
}

module.exports = MCPHealthChecker;
