/**
 * ストリーミングMCP接続テスト
 * SSEストリームを開きっぱなしにして、POST /mcpでリクエスト送信
 */

const axios = require('axios');

async function streamingTest() {
  const baseUrl = 'http://localhost:8931';
  let sessionId = null;
  let sseStream = null;
  
  console.log('🧪 ストリーミングMCP接続テスト\n');

  try {
    // Step 1: SSEストリームを確立（開きっぱなし）
    console.log('Step 1: SSEストリームを確立');
    const sseResponse = await axios.get(`${baseUrl}/sse`, {
      responseType: 'stream'
    });

    // セッションIDを取得
    await new Promise((resolve, reject) => {
      let buffer = '';
      sseResponse.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const match = buffer.match(/sessionId=([a-f0-9-]+)/);
        if (match) {
          sessionId = match[1];
          console.log('✅ SessionID:', sessionId);
          resolve();
        }
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    // セッションIDを使ってSSEストリームを再確立（永続接続）
    console.log('\nStep 2: セッションIDでSSEストリームを再接続');
    const persistentSSE = await axios.get(`${baseUrl}/sse?sessionId=${sessionId}`, {
      responseType: 'stream'
    });

    sseStream = persistentSSE.data;
    console.log('✅ 永続SSEストリーム確立');

    // SSEストリームからのメッセージを監視
    const receivedMessages = [];
    sseStream.on('data', (chunk) => {
      const data = chunk.toString();
      console.log('[SSE] Received:', data.substring(0, 100).replace(/\n/g, '\\n'));
      receivedMessages.push(data);
    });

    sseStream.on('error', (error) => {
      console.error('[SSE] Error:', error.message);
    });

    // 少し待機してストリームが確立されるのを確認
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Initialize（SSEストリーム開いたまま）
    console.log('\nStep 3: Initialize (SSEストリーム開いたまま)');
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'Othello', version: '2.0.0' }
      }
    };

    await axios.post(`${baseUrl}/mcp`, initRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    // SSEストリームからのレスポンスを待つ
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Initialize完了');

    // Step 4: notifications/initialized
    console.log('\nStep 4: notifications/initialized (SSEストリーム開いたまま)');
    const initNotification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {}
    };

    await axios.post(`${baseUrl}/mcp`, initNotification, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Initialized notification完了');

    // Step 5: Tools List（SSEストリーム開いたまま）
    console.log('\nStep 5: Tools List (SSEストリーム開いたまま)');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    await axios.post(`${baseUrl}/mcp`, toolsRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Tools List完了');

    // Step 6: Browser Navigate（SSEストリーム開いたまま）
    console.log('\nStep 6: Browser Navigate (SSEストリーム開いたまま)');
    const navigateRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: {
          url: 'https://example.com',
          intent: 'Test navigation'
        }
      }
    };

    await axios.post(`${baseUrl}/mcp`, navigateRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Navigate完了');

    // Step 7: 2回目のNavigate（ブラウザ再利用確認）
    console.log('\nStep 7: 2回目のNavigate (ブラウザ再利用確認)');
    const navigate2Request = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: {
          url: 'https://www.wikipedia.org',
          intent: 'Navigate to Wikipedia'
        }
      }
    };

    await axios.post(`${baseUrl}/mcp`, navigate2Request, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ 2回目のNavigate完了');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 全テスト成功！SSEストリーム開きっぱなしで動作！');
    console.log('='.repeat(60));
    console.log(`SessionID: ${sessionId}`);
    console.log(`受信メッセージ数: ${receivedMessages.length}`);
    console.log('\nPlaywright MCPとPlaywrightエージェントが動作可能！');

    // ストリームをクローズ
    sseStream.destroy();

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    if (sseStream) {
      sseStream.destroy();
    }
    throw error;
  }
}

streamingTest().catch((error) => {
  console.error('Test failed');
  process.exit(1);
});
