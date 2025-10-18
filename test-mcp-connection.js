/**
 * Playwright MCPサーバーとの接続テスト
 */

const axios = require('axios');

async function testMCPConnection() {
  const endpoint = 'http://localhost:8931/mcp';

  console.log('🔌 Playwright MCP接続テスト\n');
  console.log(`Endpoint: ${endpoint}\n`);

  try {
    // Test 0: サーバー初期化
    console.log('Test 0: サーバー初期化');
    const initRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'Othello',
          version: '2.0.0'
        }
      },
      id: 0
    };

    console.log('リクエスト:', JSON.stringify(initRequest, null, 2));

    const initResponse = await axios.post(endpoint, initRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });

    console.log('\n✅ 初期化レスポンス:');
    console.log(JSON.stringify(initResponse.data, null, 2));

    // Test 1: ツールリスト取得
    console.log('\n\nTest 1: ツールリスト取得');
    const listRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1
    };

    console.log('リクエスト:', JSON.stringify(listRequest, null, 2));

    const listResponse = await axios.post(endpoint, listRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      }
    });

    console.log('\n✅ レスポンス:');
    console.log(JSON.stringify(listResponse.data, null, 2));

    // Test 2: ブラウザ操作（navigate）
    console.log('\n\nTest 2: browser_navigate テスト');
    const navigateRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: {
          url: 'https://example.com',
          intent: 'テストページに移動'
        }
      },
      id: 2
    };

    console.log('リクエスト:', JSON.stringify(navigateRequest, null, 2));

    const navigateResponse = await axios.post(endpoint, navigateRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      timeout: 30000
    });

    console.log('\n✅ レスポンス:');
    console.log(JSON.stringify(navigateResponse.data, null, 2));

  } catch (error) {
    console.error('\n❌ エラー:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

testMCPConnection().catch(console.error);
