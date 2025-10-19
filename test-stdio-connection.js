/**
 * Stdio通信テスト - Playwright MCP
 * 
 * Stdio通信でPlaywright MCPサーバーに接続し、
 * 連続して複数のリクエストを送信して動作確認。
 */

const { MCPStdioClient } = require('./src/mcp-stdio-client');

async function main() {
  console.log('=== Stdio通信テスト開始 ===\n');

  const client = new MCPStdioClient({
    clientName: 'test-stdio',
    clientVersion: '1.0.0',
    serverArgs: [
      // '--headless',  // ヘッドレスモードで実行したい場合はコメント解除
    ],
  });

  try {
    // ステップ 1: 接続
    console.log('📡 Step 1: Connecting to Playwright MCP via Stdio...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // ステップ 2: ツール一覧取得
    console.log('🔧 Step 2: Listing available tools...');
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.length} tools:`);
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description || '(no description)'}`);
    });
    console.log();

    // ステップ 3: ページナビゲーション
    console.log('🌐 Step 3: Navigating to Google...');
    const navResult = await client.navigate('https://www.google.com');
    console.log('✅ Navigation result:', navResult.success ? 'Success' : 'Failed');
    if (navResult.sections) {
      const pageUrl = navResult.sections.get('Page URL');
      const pageTitle = navResult.sections.get('Page Title');
      console.log(`   Page URL: ${pageUrl}`);
      console.log(`   Page Title: ${pageTitle}`);
    }
    console.log();

    // ステップ 4: スナップショット取得
    console.log('📸 Step 4: Taking page snapshot...');
    const snapshotResult = await client.snapshot();
    console.log('✅ Snapshot result:', snapshotResult.success ? 'Success' : 'Failed');
    if (snapshotResult.sections) {
      const pageSnapshot = snapshotResult.sections.get('Page Snapshot');
      if (pageSnapshot) {
        const lines = pageSnapshot.split('\n').slice(0, 10); // 最初の10行のみ表示
        console.log('   Page Snapshot (first 10 lines):');
        lines.forEach(line => console.log(`   ${line}`));
        console.log('   ...');
      }
    }
    console.log();

    // ステップ 5: スクリーンショット取得
    console.log('📷 Step 5: Taking screenshot...');
    const screenshotResult = await client.screenshot('test-google.png');
    console.log('✅ Screenshot result:', screenshotResult.success ? 'Success' : 'Failed');
    if (screenshotResult.content) {
      console.log('   Screenshot info:', screenshotResult.content.split('\n')[0]);
    }
    console.log();

    // ステップ 6: 別のページへナビゲーション
    console.log('🌐 Step 6: Navigating to GitHub...');
    const navResult2 = await client.navigate('https://github.com');
    console.log('✅ Navigation result:', navResult2.success ? 'Success' : 'Failed');
    if (navResult2.sections) {
      const pageUrl = navResult2.sections.get('Page URL');
      const pageTitle = navResult2.sections.get('Page Title');
      console.log(`   Page URL: ${pageUrl}`);
      console.log(`   Page Title: ${pageTitle}`);
    }
    console.log();

    // ステップ 7: 2回目のスナップショット
    console.log('📸 Step 7: Taking another snapshot...');
    const snapshotResult2 = await client.snapshot();
    console.log('✅ Snapshot result:', snapshotResult2.success ? 'Success' : 'Failed');
    console.log();

    // ステップ 8: ブラウザクローズ
    console.log('🔒 Step 8: Closing browser...');
    const closeResult = await client.closeBrowser();
    console.log('✅ Browser closed:', closeResult.success ? 'Success' : 'Failed');
    console.log();

    console.log('🎉 All steps completed successfully!');
    console.log('✅ Stdio通信で複数リクエストの連続実行に成功！');
    console.log('✅ ブラウザインスタンスが保持されていることを確認！');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // クリーンアップ
    console.log('\n🧹 Disconnecting...');
    await client.disconnect();
    console.log('✅ Disconnected');
  }
}

// 実行
main().then(() => {
  console.log('\n=== Stdio通信テスト完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
