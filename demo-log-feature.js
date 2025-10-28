/**
 * ログ機能デモ
 * 
 * 新しく追加されたログ機能の動作を確認
 */

const Othello = require('./src/playwright-agent');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log('📝 Othelloログ機能デモ\n');
  console.log('='.repeat(60));
  
  // ログファイルパス
  const logFile = path.join(__dirname, 'logs', `othello-${Date.now()}.log`);
  
  console.log(`ログファイル: ${logFile}\n`);
  
  const mockConfig = {
    config: {
      default_browser: 'chromium',
      timeout_seconds: 300,
      playwright_agent: { mock_mode: false }
    }
  };

  // Othelloインスタンス作成（ログ機能有効）
  const othello = new Othello(mockConfig, {
    mockMode: false,
    logFile: logFile,
    debugMode: true  // デバッグモード有効
  });

  try {
    console.log('1️⃣  セッション初期化（ログ記録開始）');
    await othello.initializeSession();
    console.log('   ✅ 初期化完了\n');

    console.log('2️⃣  Googleにナビゲーション');
    await othello.executeInstruction({
      type: 'navigate',
      url: 'https://www.google.com',
      description: 'Navigate to Google'
    });
    console.log('   ✅ ナビゲーション完了\n');

    console.log('3️⃣  スクリーンショット取得');
    await othello.mcpClient.callTool('browser_take_screenshot', {
      filename: 'logs/google-demo.png'
    });
    console.log('   ✅ スクリーンショット完了\n');

    console.log('4️⃣  実行履歴を取得');
    const history = othello.getExecutionHistory();
    console.log(`   📊 実行履歴件数: ${history.length}件`);
    
    console.log('\n   📋 履歴サマリー:');
    history.forEach((entry, index) => {
      console.log(`      ${index + 1}. [${entry.level.toUpperCase()}] ${entry.action} (${entry.timestamp})`);
    });
    
    console.log('\n5️⃣  エラーログのみフィルター');
    const errors = othello.getExecutionHistory({ level: 'error' });
    console.log(`   ❌ エラー件数: ${errors.length}件\n`);

    console.log('6️⃣  セッションクローズ');
    await othello.closeSession();
    console.log('   ✅ クローズ完了\n');

    // ログファイルを確認
    console.log('='.repeat(60));
    console.log('📄 ログファイル内容:');
    console.log('='.repeat(60));
    
    const logContent = await fs.readFile(logFile, 'utf-8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    
    console.log(`\nログ行数: ${logLines.length}行\n`);
    
    logLines.forEach((line, index) => {
      try {
        const entry = JSON.parse(line);
        console.log(`${index + 1}. [${entry.level.toUpperCase()}] ${entry.action}`);
        console.log(`   時刻: ${entry.timestamp}`);
        console.log(`   セッションID: ${entry.sessionId}`);
        if (entry.data) {
          console.log(`   データ: ${JSON.stringify(entry.data).substring(0, 80)}...`);
        }
        console.log();
      } catch (e) {
        console.log(`${index + 1}. (パースエラー)`);
      }
    });

    console.log('='.repeat(60));
    console.log('✅ ログ機能テスト完了！');
    console.log(`📁 ログファイル: ${logFile}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main().then(() => {
  console.log('\n✨ デモ終了');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
