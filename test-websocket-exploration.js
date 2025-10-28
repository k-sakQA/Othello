/**
 * Playwright MCPサーバーのWebSocketエンドポイント探索
 */

const axios = require('axios');

async function exploreWebSocketEndpoints() {
  const baseUrl = 'http://localhost:8931';
  
  console.log('🔍 Playwright MCP WebSocket エンドポイント探索\n');
  console.log(`Base URL: ${baseUrl}\n`);

  // Step 1: HTTP エンドポイント確認
  console.log('Step 1: HTTP エンドポイント確認');
  const endpoints = ['/', '/mcp', '/sse', '/ws', '/websocket'];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(baseUrl + endpoint, {
        timeout: 2000,
        validateStatus: () => true // すべてのステータスコードを受け入れ
      });
      console.log(`  ${endpoint}: ${response.status} ${response.statusText}`);
      if (response.headers['upgrade']) {
        console.log(`    → Upgrade: ${response.headers['upgrade']}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`  ${endpoint}: サーバー未起動`);
      } else {
        console.log(`  ${endpoint}: ${error.message}`);
      }
    }
  }

  // Step 2: WebSocket 接続試行（スキップ - wsモジュール未インストール）
  console.log('\n\nStep 2: WebSocket 接続試行（スキップ）');

  // Step 3: SSE エンドポイントからセッション情報取得
  console.log('\n\nStep 3: SSE エンドポイントからセッション情報取得');
  try {
    const sseResponse = await axios.get(`${baseUrl}/sse`, {
      timeout: 5000,
      responseType: 'stream'
    });
    
    console.log(`  Status: ${sseResponse.status}`);
    console.log(`  Headers:`, sseResponse.headers);

    // SSE データを読み取り
    let buffer = '';
    sseResponse.data.on('data', (chunk) => {
      buffer += chunk.toString();
      console.log(`  Received: ${buffer}`);
      
      // セッションIDを探す
      if (buffer.includes('sessionId')) {
        console.log('\n  ✅ セッションID取得成功！');
        sseResponse.data.destroy();
      }
    });

    await new Promise((resolve) => {
      sseResponse.data.on('end', resolve);
      sseResponse.data.on('close', resolve);
      setTimeout(resolve, 3000);
    });
  } catch (error) {
    console.log(`  ❌ エラー: ${error.message}`);
  }
}

// WebSocket接続テストは別の方法で実装予定

exploreWebSocketEndpoints().catch(console.error);
