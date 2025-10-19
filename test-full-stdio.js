/**
 * 完全なStdio通信テスト - initialize → tools/list → navigate
 */

const { spawn } = require('child_process');
const path = require('path');

const playwrightMcpCli = path.join(__dirname, 'node_modules/@playwright/mcp/cli.js');

console.log('=== 完全Stdio通信テスト ===\n');

const child = spawn('node', [playwrightMcpCli], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let messageId = 0;
let responseBuffer = '';

child.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // 改行で区切って各メッセージを処理
  const messages = responseBuffer.split('\n');
  responseBuffer = messages.pop() || ''; // 最後の不完全なメッセージを保持
  
  messages.forEach(msg => {
    if (msg.trim()) {
      console.log('[RESPONSE]:', msg);
      try {
        const response = JSON.parse(msg);
        handleResponse(response);
      } catch (e) {
        console.error('[PARSE ERROR]:', e.message);
      }
    }
  });
});

child.stderr.on('data', (data) => {
  console.error('[STDERR]:', data.toString());
});

child.on('error', (error) => {
  console.error('[SPAWN ERROR]:', error);
});

child.on('close', (code) => {
  console.log(`\n[PROCESS CLOSED] Exit code: ${code}`);
  process.exit(code);
});

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: ++messageId,
    method,
    params
  };
  const message = JSON.stringify(request) + '\n';
  console.log(`\n[REQUEST #${messageId}] ${method}`);
  child.stdin.write(message);
  return messageId;
}

let step = 0;

function handleResponse(response) {
  if (response.error) {
    console.error('❌ Error:', response.error);
    child.kill();
    return;
  }
  
  if (step === 0 && response.id === 1) {
    // initialize成功
    console.log('✅ Initialize successful!');
    console.log('   Server:', response.result.serverInfo.name, response.result.serverInfo.version);
    step = 1;
    
    // notifications/initializedを送信
    const notif = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };
    console.log('\n[NOTIFICATION] initialized');
    child.stdin.write(JSON.stringify(notif) + '\n');
    
    // tools/listを送信
    setTimeout(() => sendRequest('tools/list'), 100);
  }
  else if (step === 1 && response.id === 2) {
    // tools/list成功
    console.log('✅ Tools/list successful!');
    if (response.result && response.result.tools) {
      console.log(`   Found ${response.result.tools.length} tools`);
      response.result.tools.slice(0, 5).forEach(tool => {
        console.log(`   - ${tool.name}`);
      });
    }
    step = 2;
    
    // browser_navigateを送信
    setTimeout(() => {
      sendRequest('tools/call', {
        name: 'browser_navigate',
        arguments: { url: 'https://www.google.com' }
      });
    }, 100);
  }
  else if (step === 2 && response.id === 3) {
    // browser_navigate成功
    console.log('✅ Browser navigate successful!');
    if (response.result && response.result.content) {
      const content = response.result.content[0];
      if (content && content.text) {
        const lines = content.text.split('\n').slice(0, 10);
        console.log('   Response (first 10 lines):');
        lines.forEach(line => console.log('   ' + line));
      }
    }
    step = 3;
    
    // 成功！クローズ
    setTimeout(() => {
      console.log('\n🎉 All steps completed successfully!');
      child.kill();
    }, 1000);
  }
}

// ステップ0: initialize送信
console.log('Step 0: Initialize');
sendRequest('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: {
    name: 'full-test',
    version: '1.0.0'
  }
});

// タイムアウト
setTimeout(() => {
  console.log('\n⏱️ Timeout');
  child.kill();
}, 10000);
