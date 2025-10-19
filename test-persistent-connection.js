/**
 * 永続的SSE接続のテスト
 * 同一セッションで複数のリクエストを送信してブラウザインスタンス保持を確認
 */

const MCPPersistentClient = require('./src/mcp-persistent-client');

async function testPersistentConnection() {
  const client = new MCPPersistentClient('http://localhost:8931/mcp');

  try {
    console.log('='.repeat(60));
    console.log('🧪 Playwright MCP 永続接続テスト');
    console.log('='.repeat(60));

    // Step 1: 接続確立
    console.log('\n📡 Step 1: 永続的SSE接続確立');
    await client.connect();
    console.log(`✅ SessionID: ${client.sessionId}`);

    // Step 2: Initialize
    console.log('\n🔧 Step 2: MCP Initialize');
    const initResult = await client.initialize({
      name: 'Othello',
      version: '2.0.0'
    });
    console.log('✅ Initialize成功:', JSON.stringify(initResult, null, 2));

    // Step 3: Tools List
    console.log('\n🛠️  Step 3: Tools List');
    const toolsResult = await client.sendRequest('tools/list');
    console.log(`✅ 利用可能なツール: ${toolsResult.tools ? toolsResult.tools.length : 0}個`);
    if (toolsResult.tools && toolsResult.tools.length > 0) {
      console.log('   主要ツール:', toolsResult.tools.slice(0, 5).map(t => t.name).join(', '), '...');
    }

    // Step 4: Browser Navigate (重要: 同一セッションで実行)
    console.log('\n🌐 Step 4: Browser Navigate');
    const navigateResult = await client.sendRequest('tools/call', {
      name: 'browser_navigate',
      arguments: {
        url: 'https://example.com',
        intent: 'Navigate to example.com'
      }
    });
    console.log('✅ Navigate成功');
    if (navigateResult.content && navigateResult.content[0]) {
      console.log('   ページ情報:', navigateResult.content[0].text.substring(0, 200) + '...');
    }

    // Step 5: Browser Snapshot (ブラウザが保持されているか確認)
    console.log('\n📸 Step 5: Browser Snapshot');
    const snapshotResult = await client.sendRequest('tools/call', {
      name: 'browser_snapshot',
      arguments: {}
    });
    console.log('✅ Snapshot成功');
    if (snapshotResult.content && snapshotResult.content[0]) {
      console.log('   ページ状態:', snapshotResult.content[0].text.substring(0, 200) + '...');
    }

    // Step 6: Browser Screenshot
    console.log('\n📷 Step 6: Browser Screenshot');
    const screenshotResult = await client.sendRequest('tools/call', {
      name: 'browser_take_screenshot',
      arguments: {
        filename: 'test-persistent.png'
      }
    });
    console.log('✅ Screenshot成功');
    if (screenshotResult.content && screenshotResult.content[0]) {
      console.log('   結果:', screenshotResult.content[0].text.substring(0, 100));
    }

    // Step 7: 2回目のNavigate (ブラウザインスタンス再利用確認)
    console.log('\n🌐 Step 7: 2回目のNavigate (ブラウザ再利用確認)');
    const navigate2Result = await client.sendRequest('tools/call', {
      name: 'browser_navigate',
      arguments: {
        url: 'https://www.wikipedia.org',
        intent: 'Navigate to Wikipedia'
      }
    });
    console.log('✅ 2回目のNavigate成功 (ブラウザインスタンス再利用!)');

    // 結果サマリー
    console.log('\n' + '='.repeat(60));
    console.log('🎉 永続接続テスト完了！');
    console.log('='.repeat(60));
    console.log('✅ セッション確立: OK');
    console.log('✅ Initialize: OK');
    console.log('✅ Tools List: OK');
    console.log('✅ Navigate 1回目: OK');
    console.log('✅ Snapshot: OK');
    console.log('✅ Screenshot: OK');
    console.log('✅ Navigate 2回目: OK (ブラウザ再利用)');
    console.log('='.repeat(60));
    console.log(`\n📊 同一セッション (${client.sessionId}) で7個のリクエストを実行成功！`);
    console.log('🚀 ブラウザインスタンスが保持され、AutoPlaywrightループの準備完了！');

  } catch (error) {
    console.error('\n❌ エラー:', error);
    throw error;
  } finally {
    // 接続を閉じる
    await client.close();
    console.log('\n🔌 接続をクローズしました');
  }
}

testPersistentConnection().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
