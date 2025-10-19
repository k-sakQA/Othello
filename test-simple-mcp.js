/**
 * シンプルなMCP接続テスト
 * Phase 7の問題を特定するための最小限テスト
 */

const axios = require('axios');

async function simpleTest() {
  const baseUrl = 'http://localhost:8931';
  let sessionId = null;
  
  console.log('🧪 シンプルなMCP接続テスト\n');

  try {
    // Step 1: セッションID取得
    console.log('Step 1: セッションID取得');
    const sseResponse = await axios.get(`${baseUrl}/sse`, {
      responseType: 'stream'
    });

    await new Promise((resolve, reject) => {
      let buffer = '';
      sseResponse.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const match = buffer.match(/sessionId=([a-f0-9-]+)/);
        if (match) {
          sessionId = match[1];
          console.log('✅ SessionID:', sessionId);
          sseResponse.data.destroy();
          resolve();
        }
      });
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });

    // Step 2: Initialize
    console.log('\nStep 2: Initialize');
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

    const initResponse = await axios.post(`${baseUrl}/mcp`, initRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    console.log('✅ Initialize成功');
    console.log('Response type:', typeof initResponse.data);
    
    // SSE形式をパース
    if (typeof initResponse.data === 'string') {
      const match = initResponse.data.match(/data: ({.*})/);
      if (match) {
        const result = JSON.parse(match[1]);
        console.log('Server Info:', result.result?.serverInfo);
      }
    }

    // Step 2.5: notifications/initialized を送信（MCP仕様）
    console.log('\nStep 2.5: Send initialized notification');
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

    console.log('✅ Initialized notification送信成功');

    // Step 3: 同じセッションIDでTools List
    console.log('\nStep 3: Tools List (同じセッションID)');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    const toolsResponse = await axios.post(`${baseUrl}/mcp`, toolsRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    console.log('✅ Tools List成功');
    console.log('Response status:', toolsResponse.status);
    
    if (typeof toolsResponse.data === 'string') {
      const match = toolsResponse.data.match(/data: ({.*})/);
      if (match) {
        const result = JSON.parse(match[1]);
        console.log('Tools count:', result.result?.tools?.length);
      }
    }

    // Step 4: Navigate
    console.log('\nStep 4: Browser Navigate (同じセッションID)');
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

    const navResponse = await axios.post(`${baseUrl}/mcp`, navigateRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': sessionId
      }
    });

    console.log('✅ Navigate成功');
    console.log('Response status:', navResponse.status);

    console.log('\n🎉 全テスト成功！同一セッションで3個のリクエストを実行！');
    console.log(`SessionID: ${sessionId}`);

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    throw error;
  }
}

simpleTest().catch((error) => {
  console.error('Test failed');
  process.exit(1);
});
