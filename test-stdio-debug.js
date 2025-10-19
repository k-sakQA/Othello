/**
 * Stdio通信デバッグ - Playwright MCP
 * 
 * StdioClientTransportの動作を詳細にデバッグ
 */

const path = require('path');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');

async function main() {
  console.log('=== Stdio通信デバッグ開始 ===\n');

  const playwrightMcpCli = path.join(__dirname, 'node_modules/@playwright/mcp/cli.js');
  console.log('Playwright MCP CLI:', playwrightMcpCli);
  console.log('Args: node', playwrightMcpCli);
  console.log();

  // StdioClientTransport作成
  console.log('Creating StdioClientTransport...');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [playwrightMcpCli],
    stderr: 'pipe',
  });

  // stderrとstdoutを監視
  console.log('Setting up stderr/stdout monitoring...');
  
  let stderrBuffer = '';
  let stdoutBuffer = '';
  
  if (transport.stderr) {
    transport.stderr.on('data', (data) => {
      const text = data.toString();
      stderrBuffer += text;
      console.error('[STDERR]:', text);
    });
  }

  if (transport.stdout) {
    transport.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutBuffer += text;
      console.log('[STDOUT]:', text);
    });
  }

  // エラーイベントも監視
  transport.onerror = (error) => {
    console.error('[TRANSPORT ERROR]:', error);
  };

  transport.onclose = () => {
    console.log('[TRANSPORT CLOSED]');
  };

  // Client作成
  console.log('Creating MCP Client...');
  const client = new Client(
    { name: 'debug-test', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    // 接続
    console.log('Connecting to Playwright MCP...');
    await client.connect(transport);
    console.log('✅ Connected!');

    // Ping
    console.log('Sending ping...');
    await client.ping();
    console.log('✅ Ping successful!');

    // ツール一覧取得
    console.log('Listing tools...');
    const result = await client.listTools();
    console.log('✅ Tools:', result.tools.map(t => t.name).join(', '));

    // クローズ
    console.log('Closing client...');
    await client.close();
    console.log('✅ Closed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\n📋 Captured stderr:');
    console.error(stderrBuffer || '(empty)');
    console.error('\n📋 Captured stdout:');
    console.error(stdoutBuffer || '(empty)');
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n=== デバッグ完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
