/**
 * 手動でJSON-RPCメッセージを送信してPlaywright MCPと通信
 */

const { spawn } = require('child_process');
const path = require('path');

const playwrightMcpCli = path.join(__dirname, 'node_modules/@playwright/mcp/cli.js');

console.log('=== 手動JSON-RPC通信テスト ===\n');
console.log('Command: node', playwrightMcpCli);
console.log();

const child = spawn('node', [playwrightMcpCli], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let stdoutData = '';
let stderrData = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutData += text;
  console.log('[STDOUT]:', text);
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  stderrData += text;
  console.error('[STDERR]:', text);
});

child.on('error', (error) => {
  console.error('[SPAWN ERROR]:', error);
});

child.on('close', (code) => {
  console.log(`\n[PROCESS CLOSED] Exit code: ${code}`);
  console.log('\n📋 All stdout:');
  console.log(stdoutData || '(empty)');
  console.log('\n📋 All stderr:');
  console.log(stderrData || '(empty)');
  
  process.exit(code);
});

// initializeメッセージを送信（JSON-RPC 2.0形式）
console.log('Sending initialize request...');
const initializeRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'manual-test',
      version: '1.0.0'
    }
  }
};

const message = JSON.stringify(initializeRequest) + '\n';
console.log('Message:', message);
child.stdin.write(message);

// 3秒後に終了
setTimeout(() => {
  console.log('\n⏱️ Timeout - killing process...');
  child.kill();
}, 3000);
