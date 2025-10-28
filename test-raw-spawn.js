/**
 * 生のchild_process.spawnでPlaywright MCPを起動してstdout/stderrを確認
 */

const { spawn } = require('child_process');
const path = require('path');

const playwrightMcpCli = path.join(__dirname, 'node_modules/@playwright/mcp/cli.js');

console.log('=== 生のspawnでPlaywright MCP起動 ===\n');
console.log('Command: node', playwrightMcpCli);
console.log();

const child = spawn('node', [playwrightMcpCli], {
  stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
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

// 3秒後に終了
setTimeout(() => {
  console.log('\n⏱️ Timeout - killing process...');
  child.kill();
}, 3000);
