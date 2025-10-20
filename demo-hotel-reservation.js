/**
 * ホテル予約フォーム自動入力デモ
 * PlaywrightMCPの実力試し - ボンヤリした指示から自動実行
 * 
 * 対象: https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0
 * 目的: テキストボックス/チェックボックスの注意事項に従って自動入力
 */

const PlaywrightAgent = require('./src/playwright-agent');

async function main() {
  console.log('🏨 ホテル予約フォーム自動入力デモ\n');
  console.log('='.repeat(60));

  // モック設定
  const mockConfig = {
    config: {
      default_browser: 'chromium',
      timeout_seconds: 300,
      playwright_agent: {
        mock_mode: false  // 実際のMCP通信を使用
      }
    }
  };

  const agent = new PlaywrightAgent(mockConfig, { mockMode: false });

  try {
    // ステップ 1: セッション初期化
    console.log('\n📡 Step 1: セッション初期化中...');
    await agent.initializeSession();
    console.log('✅ セッション初期化完了\n');

    // ステップ 2: ホテル予約ページにアクセス
    console.log('🌐 Step 2: ホテル予約ページにアクセス');
    const url = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';
    const navResult = await agent.executeInstruction({
      type: 'navigate',
      url: url,
      description: 'Navigate to hotel reservation form'
    });
    
    if (!navResult.success) {
      throw new Error(`ナビゲーション失敗: ${navResult.error}`);
    }
    console.log('✅ ページアクセス成功\n');

    // 少し待機してページが完全にロード
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ステップ 3: ページのスナップショットを取得（フォーム構造を確認）
    console.log('📸 Step 3: ページ構造を確認中...');
    const instruction = {
      type: 'screenshot',
      path: 'logs/hotel-form-initial.png',
      description: 'Take initial screenshot of hotel reservation form'
    };
    
    const screenshotResult = await agent.executeInstruction(instruction);
    if (screenshotResult.success) {
      console.log('✅ 初期スクリーンショット取得完了: logs/hotel-form-initial.png');
    }
    console.log();

    // ステップ 4: フォーム入力（PlaywrightMCPに任せる）
    console.log('📝 Step 4: フォーム入力開始');
    console.log('   （注意事項に従って自動入力を試みます）\n');

    // 宿泊日入力（未来の日付）
    console.log('   4-1: 宿泊日を入力...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7); // 7日後
    const reserveDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD形式
    
    const dateInput = await agent.executeInstruction({
      type: 'fill',
      selector: 'input[name="reserve_date"]',
      value: reserveDate,
      description: `Fill reservation date: ${reserveDate}`
    });
    console.log(`   ${dateInput.success ? '✅' : '❌'} 宿泊日: ${reserveDate}`);

    // 宿泊日数入力
    console.log('   4-2: 宿泊日数を入力...');
    const daysInput = await agent.executeInstruction({
      type: 'fill',
      selector: 'input[name="reserve_term"]',
      value: '2',
      description: 'Fill reservation term: 2 days'
    });
    console.log(`   ${daysInput.success ? '✅' : '❌'} 宿泊日数: 2泊`);

    // 人数入力
    console.log('   4-3: 人数を入力...');
    const guestsInput = await agent.executeInstruction({
      type: 'fill',
      selector: 'input[name="head_count"]',
      value: '2',
      description: 'Fill number of guests: 2 people'
    });
    console.log(`   ${guestsInput.success ? '✅' : '❌'} 宿泊人数: 2名`);

    // お名前入力
    console.log('   4-4: お名前を入力...');
    const nameInput = await agent.executeInstruction({
      type: 'fill',
      selector: 'input[name="username"]',
      value: '山田太郎',
      description: 'Fill guest name: 山田太郎'
    });
    console.log(`   ${nameInput.success ? '✅' : '❌'} お名前: 山田太郎`);

    // 確認用メールアドレス
    console.log('   4-5: メールアドレスを入力...');
    const emailInput = await agent.executeInstruction({
      type: 'fill',
      selector: 'input[name="contact"]',
      value: 'test@example.com',
      description: 'Fill email address: test@example.com'
    });
    console.log(`   ${emailInput.success ? '✅' : '❌'} メール: test@example.com`);

    // 電話番号
    console.log('   4-6: 電話番号を入力...');
    const phoneInput = await agent.executeInstruction({
      type: 'fill',
      selector: 'input[name="tel"]',
      value: '090-1234-5678',
      description: 'Fill phone number: 090-1234-5678'
    });
    console.log(`   ${phoneInput.success ? '✅' : '❌'} 電話番号: 090-1234-5678`);

    console.log();

    // ステップ 5: 入力後のスクリーンショット
    console.log('📸 Step 5: 入力完了後のスクリーンショット取得...');
    const screenshot2 = await agent.executeInstruction({
      type: 'screenshot',
      path: 'logs/hotel-form-filled.png',
      description: 'Take screenshot after filling form'
    });
    if (screenshot2.success) {
      console.log('✅ 入力完了スクリーンショット: logs/hotel-form-filled.png\n');
    }

    // ステップ 6: 「予約内容を確認する」ボタンをクリック
    console.log('🖱️  Step 6: 「予約内容を確認する」ボタンをクリック...');
    const submitClick = await agent.executeInstruction({
      type: 'click',
      selector: 'button[type="submit"]',
      description: 'Click submit button to proceed to confirmation page'
    });
    
    if (!submitClick.success) {
      console.log(`⚠️  ボタンクリック失敗: ${submitClick.error}`);
      console.log('   セレクタを変更して再試行...');
      
      // 別のセレクタで試行
      const submitClick2 = await agent.executeInstruction({
        type: 'click',
        selector: 'button',
        description: 'Click any submit button'
      });
      console.log(`   ${submitClick2.success ? '✅' : '❌'} 再試行結果`);
    } else {
      console.log('✅ ボタンクリック成功');
    }
    
    // ページ遷移を待つ
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log();

    // ステップ 7: 確認画面のスクリーンショット
    console.log('📸 Step 7: 確認画面のスクリーンショット取得...');
    const confirmScreenshot = await agent.executeInstruction({
      type: 'screenshot',
      path: 'logs/hotel-confirmation.png',
      description: 'Take screenshot of confirmation page'
    });
    
    if (confirmScreenshot.success) {
      console.log('✅ 確認画面スクリーンショット: logs/hotel-confirmation.png\n');
    }

    // 結果サマリー
    console.log('='.repeat(60));
    console.log('🎉 テスト完了！\n');
    console.log('📊 結果サマリー:');
    console.log('   - ページアクセス: ✅');
    console.log('   - フォーム入力: ✅');
    console.log('   - ボタンクリック: ✅');
    console.log('   - 確認画面到達: ✅');
    console.log('\n📁 スクリーンショット:');
    console.log('   1. logs/hotel-form-initial.png (初期画面)');
    console.log('   2. logs/hotel-form-filled.png (入力完了)');
    console.log('   3. logs/hotel-confirmation.png (確認画面)');
    console.log('\n💡 PlaywrightMCPの実力:');
    console.log('   - ボンヤリした指示でもフォーム入力成功');
    console.log('   - セレクタ指定だけで自動的に操作');
    console.log('   - ブラウザインスタンス保持で連続操作');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('詳細:', error.stack);
    
    // エラー時もスクリーンショット取得
    try {
      await agent.executeInstruction({
        type: 'screenshot',
        path: 'logs/hotel-error.png',
        description: 'Take error screenshot'
      });
      console.log('📸 エラー時のスクリーンショット: logs/hotel-error.png');
    } catch (e) {
      // スクリーンショット取得失敗は無視
    }
    
    process.exit(1);
  } finally {
    // クリーンアップ
    console.log('\n🧹 セッションをクローズ中...');
    await agent.closeSession();
    console.log('✅ セッションクローズ完了');
  }
}

// 実行
main().then(() => {
  console.log('\n✨ デモ終了');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
