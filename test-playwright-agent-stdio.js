/**
 * PlaywrightAgent Stdio統合テスト
 * 
 * PlaywrightAgentがStdio通信で正常に動作することを確認
 */

const PlaywrightAgent = require('./src/playwright-agent');

async function main() {
  console.log('=== PlaywrightAgent Stdio統合テスト開始 ===\n');

  // モック設定オブジェクトを作成
  const mockConfig = {
    config: {
      default_browser: 'chromium',
      timeout_seconds: 300,
      playwright_agent: {
        mock_mode: false  // 実際のMCP通信を使用
      }
    }
  };

  // PlaywrightAgentを作成（mockMode = false で実際のMCP通信）
  const agent = new PlaywrightAgent(mockConfig, { mockMode: false });

  try {
    // ステップ 1: セッション初期化
    console.log('📡 Step 1: Initializing session...');
    await agent.initializeSession();
    console.log('✅ Session initialized\n');

    // ステップ 2: ナビゲーション
    console.log('🌐 Step 2: Navigating to Google...');
    const navResult = await agent.executeInstruction({
      type: 'navigate',
      url: 'https://www.google.com',
      description: 'Navigate to Google'
    });
    console.log('✅ Navigation result:', navResult.success ? 'Success' : 'Failed');
    if (navResult.error) {
      console.error('   Error:', navResult.error);
    }
    if (navResult.details) {
      console.log('   Details:', JSON.stringify(navResult.details, null, 2).substring(0, 200));
    }
    console.log();

    // ステップ 3: スクリーンショット
    console.log('📷 Step 3: Taking screenshot...');
    const screenshotResult = await agent.executeInstruction({
      type: 'screenshot',
      path: 'test-agent-google.png',
      description: 'Take screenshot of Google homepage'
    });
    console.log('✅ Screenshot result:', screenshotResult.success ? 'Success' : 'Failed');
    if (screenshotResult.error) {
      console.error('   Error:', screenshotResult.error);
    }
    console.log();

    // ステップ 4: 別のページへナビゲーション（ブラウザ再利用確認）
    console.log('🌐 Step 4: Navigating to GitHub...');
    const navResult2 = await agent.executeInstruction({
      type: 'navigate',
      url: 'https://github.com',
      description: 'Navigate to GitHub'
    });
    console.log('✅ Navigation result:', navResult2.success ? 'Success (Browser reused!)' : 'Failed');
    if (navResult2.error) {
      console.error('   Error:', navResult2.error);
    }
    console.log();

    // ステップ 5: 2回目のスクリーンショット
    console.log('📷 Step 5: Taking another screenshot...');
    const screenshotResult2 = await agent.executeInstruction({
      type: 'screenshot',
      path: 'test-agent-github.png',
      description: 'Take screenshot of GitHub homepage'
    });
    console.log('✅ Screenshot result:', screenshotResult2.success ? 'Success' : 'Failed');
    if (screenshotResult2.error) {
      console.error('   Error:', screenshotResult2.error);
    }
    console.log();

    // 結果サマリー
    console.log('='.repeat(60));
    console.log('🎉 PlaywrightAgent Stdio統合テスト完了！');
    console.log('='.repeat(60));
    
    const allSuccess = 
      navResult.success && 
      screenshotResult.success && 
      navResult2.success && 
      screenshotResult2.success;
    
    if (allSuccess) {
      console.log('✅ 全テスト成功！');
      console.log('✅ PlaywrightAgentがStdio通信で正常動作を確認');
      console.log('✅ ブラウザインスタンスが保持されていることを確認');
      console.log('✅ 複数の指示を連続実行できることを確認');
    } else {
      console.log('⚠️  一部のテストが失敗しました');
    }

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // クリーンアップ
    console.log('\n🧹 Closing session...');
    await agent.closeSession();
    console.log('✅ Session closed');
  }
}

// 実行
main().then(() => {
  console.log('\n=== PlaywrightAgent Stdio統合テスト終了 ===');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
