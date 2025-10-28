/**
 * Othello - 基本動作サンプル
 * モックモードで基本的な指示実行を試します
 */

const Othello = require('../src/playwright-agent');

(async () => {
  console.log('🎭 Othello Basic Test\n');
  
  // 最小構成でOthelloインスタンス作成
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
      test_instructions: './tests' 
    }
  }, { 
    mockMode: true,  // モックモードで実際のブラウザなしで試せる
    debugMode: true  // 詳細ログを出力
  });

  console.log('📍 Session ID:', othello.sessionId);
  console.log('');

  // 1. Navigate
  console.log('1️⃣  Navigate to example.com...');
  const nav = await othello.executeInstruction({
    type: 'navigate',
    url: 'https://example.com',
    description: 'Navigate to example website'
  });
  console.log('   ✅ Success:', nav.success);
  console.log('');

  // 2. Click
  console.log('2️⃣  Click button...');
  const click = await othello.executeInstruction({
    type: 'click',
    selector: '#test-button',
    description: 'Click test button'
  });
  console.log('   ✅ Success:', click.success);
  console.log('');

  // 3. Fill form
  console.log('3️⃣  Fill input field...');
  const fill = await othello.executeInstruction({
    type: 'fill',
    selector: '#username',
    value: 'testuser',
    description: 'Fill username'
  });
  console.log('   ✅ Success:', fill.success);
  console.log('');

  // 実行履歴を確認
  const history = othello.getExecutionHistory();
  console.log('📝 Execution History:');
  console.log(`   Total entries: ${history.length}`);
  
  const byLevel = history.reduce((acc, entry) => {
    acc[entry.level] = (acc[entry.level] || 0) + 1;
    return acc;
  }, {});
  console.log('   By level:', byLevel);
  console.log('');

  // 履歴を保存
  const historyFile = './logs/basic-sample-history.json';
  await othello.saveExecutionHistory(historyFile);
  console.log(`💾 History saved to: ${historyFile}`);
  
  console.log('\n✨ Basic test completed!');
})().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
