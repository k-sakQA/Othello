/**
 * Othello - エラーリカバリーサンプル
 * 自動再試行とスナップショット保存を試します
 */

const Othello = require('../src/playwright-agent');

(async () => {
  console.log('🔄 Othello Error Recovery Test\n');
  
  // エラーリカバリー機能を有効化
  const othello = new Othello({
    default_browser: 'chromium',
    timeout_seconds: 30,
    max_iterations: 5,
    mcp_server: { 
      connection_type: 'stdio',
      command: 'node',
      args: [],
      timeout_seconds: 60
    },
    paths: { 
      logs: './logs', 
      results: './results', 
      reports: './reports', 
      test_instructions: './tests',
      screenshots: './screenshots'  // スナップショット保存先
    },
    // エラーリカバリー設定
    maxRetries: 3,                    // 最大3回まで再試行
    retryDelay: 1000,                 // 初回は1秒待機
    backoffMultiplier: 2,             // 次回は2倍の時間待機
    maxRetryDelay: 10000,             // 最大10秒まで
    autoReconnect: true,              // セッション切断時は自動再接続
    saveSnapshotOnFailure: true       // 失敗時にスナップショット保存
  }, { 
    mockMode: true,   // モックモードで動作
    debugMode: true   // デバッグログ有効
  });

  console.log('📍 Session ID:', othello.sessionId);
  console.log('🔧 Retry configuration:');
  console.log(`   - Max retries: ${othello.maxRetries}`);
  console.log(`   - Initial delay: ${othello.retryDelay}ms`);
  console.log(`   - Backoff multiplier: ${othello.backoffMultiplier}x`);
  console.log(`   - Max delay: ${othello.maxRetryDelay}ms`);
  console.log('');

  // 1. 正常な実行（再試行なし）
  console.log('1️⃣  Normal operation...');
  const nav = await othello.executeInstruction({
    type: 'navigate',
    url: 'https://example.com',
    description: 'Navigate to website'
  });
  console.log('   ✅ Success:', nav.success);
  console.log('');

  // 2. 失敗をシミュレート（存在しない要素）
  console.log('2️⃣  Simulate failure (nonexistent element)...');
  try {
    const click = await othello.executeInstruction({
      type: 'click',
      selector: '#nonexistent-element',  // 存在しない要素
      description: 'Click nonexistent element'
    });
    console.log('   ⚠️  Result:', click.success ? 'Success' : 'Failed');
    if (!click.success) {
      console.log('   💾 Snapshot should be saved to:', othello.config.paths.screenshots);
    }
  } catch (error) {
    console.log('   ❌ Error caught:', error.message);
  }
  console.log('');

  // 3. タイムアウトをシミュレート
  console.log('3️⃣  Simulate timeout...');
  try {
    const wait = await othello.executeInstruction({
      type: 'waitForSelector',
      selector: '#slow-loading-element',
      timeout: 100,  // 短いタイムアウトで失敗させる
      description: 'Wait for slow element'
    });
    console.log('   ⚠️  Result:', wait.success ? 'Success' : 'Failed (as expected)');
  } catch (error) {
    console.log('   ❌ Error caught:', error.message);
  }
  console.log('');

  // 実行履歴を分析
  const history = othello.getExecutionHistory();
  console.log('📊 Execution History Analysis:');
  console.log(`   Total entries: ${history.length}`);
  
  const byLevel = history.reduce((acc, entry) => {
    acc[entry.level] = (acc[entry.level] || 0) + 1;
    return acc;
  }, {});
  console.log('   By level:', byLevel);
  
  const retryEntries = history.filter(e => 
    e.method === 'executeWithRetry' || 
    e.message?.includes('retry') || 
    e.message?.includes('attempt')
  );
  console.log(`   Retry operations: ${retryEntries.length}`);
  
  if (retryEntries.length > 0) {
    console.log('\n   Recent retry operations:');
    retryEntries.slice(-3).forEach(entry => {
      console.log(`   - [${entry.level.toUpperCase()}] ${entry.message}`);
    });
  }
  console.log('');

  // 履歴を保存
  const historyFile = './logs/retry-sample-history.json';
  await othello.saveExecutionHistory(historyFile);
  console.log(`💾 Full history saved to: ${historyFile}`);
  
  console.log('\n✨ Error recovery test completed!');
  console.log('💡 Tips:');
  console.log('   - Check screenshots folder for failure snapshots');
  console.log('   - Review logs folder for detailed execution logs');
  console.log('   - Increase maxRetries for flaky operations');
})().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
