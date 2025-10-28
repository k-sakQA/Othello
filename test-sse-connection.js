/**
 * SSE接続テスト
 */

const MCPSSEClient = require('./src/mcp-sse-client');

async function main() {
  console.log('🔌 MCP SSE接続テスト\n');

  const client = new MCPSSEClient('http://localhost:8931/mcp');

  try {
    // Step 1: SSE接続確立
    console.log('Step 1: SSE接続確立');
    await client.connect();
    console.log('✅ 接続成功\n');

    // Step 2: Initialize
    console.log('Step 2: Initialize');
    const initResult = await client.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'Othello',
        version: '1.0.0'
      }
    });
    console.log('✅ Initialize成功:', JSON.stringify(initResult, null, 2));
    console.log();

    // Step 2.5: Send initialized notification (MCP仕様で必須)
    console.log('Step 2.5: Send initialized notification');
    try {
      await client.sendNotification('notifications/initialized');
      console.log('✅ Initialized notification sent');
    } catch (error) {
      console.warn('⚠️ Initialized notification failed (may be optional):', error.message);
    }
    console.log();

    // Step 3: Tools list
    console.log('Step 3: Tools list');
    const toolsResult = await client.sendRequest('tools/list', {});
    console.log('✅ Tools list成功');
    console.log('Available tools:', toolsResult.tools.map(t => t.name).slice(0, 10));
    console.log();

    // Step 4: Browser navigate
    console.log('Step 4: Browser navigate');
    const navigateResult = await client.sendRequest('tools/call', {
      name: 'browser_navigate',
      arguments: {
        url: 'https://example.com',
        intent: 'Navigate to example.com'
      }
    });
    console.log('✅ Navigate成功:', JSON.stringify(navigateResult, null, 2));
    console.log();

    // Step 5: Take screenshot
    console.log('Step 5: Take screenshot');
    const screenshotResult = await client.sendRequest('tools/call', {
      name: 'browser_take_screenshot',
      arguments: {
        filename: 'logs/sse-test-screenshot.png'
      }
    });
    console.log('✅ Screenshot成功:', screenshotResult.content[0].text.substring(0, 100) + '...');
    console.log();

    console.log('🎉 全テスト成功！\n');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  } finally {
    client.close();
  }
}

main();
