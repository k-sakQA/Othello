/**
 * Othelloを使ったホテル予約サイトのテスト
 * Phase 8の機能（MCP + エラーリカバリー）を活用
 */

const Othello = require('../src/playwright-agent');
const ConfigManager = require('../src/config');
const path = require('path');

async function runHotelTest() {
  console.log('🏨 Othelloでホテル予約サイトをテスト\n');

  // 設定読み込み
  const configPath = path.join(__dirname, '..', 'config', 'default.json');
  const config = await ConfigManager.load(configPath);

  // Othello初期化（実モード）
  const othello = new Othello(config, { mockMode: false });

  try {
    // セッション初期化
    console.log('📡 セッション初期化中...');
    await othello.initializeSession();
    console.log('✅ セッション確立\n');

    // テスト1: プラン一覧ページにアクセス
    console.log('🔍 テスト1: プラン一覧ページ');
    const navResult = await othello.executeInstruction({
      type: 'navigate',
      url: 'https://hotel-example-site.takeyaqa.dev/ja/plans.html',
      description: 'Navigate to hotel plans page'
    });

    if (navResult.success) {
      console.log('✅ プラン一覧ページにアクセス成功\n');
    } else {
      console.error('❌ ナビゲーション失敗:', navResult.error);
      return;
    }

    // スナップショット取得
    console.log('📸 ページ構造を取得中...');
    const snapshot = await othello.mcpClient.snapshot();
    console.log('✅ Snapshot取得完了\n');

    // テスト2: 予約フォームにアクセス
    console.log('🔍 テスト2: 予約フォーム');
    const formResult = await othello.executeInstruction({
      type: 'navigate',
      url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0',
      description: 'Navigate to reservation form'
    });

    if (formResult.success) {
      console.log('✅ 予約フォームにアクセス成功\n');
    }

    // 待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    // スナップショット取得（フォーム構造確認）
    console.log('📸 フォーム構造を取得中...');
    const formSnapshot = await othello.mcpClient.snapshot();
    console.log('✅ フォームSnapshot取得完了');
    console.log('フォーム要素（抜粋）:');
    console.log(formSnapshot.content.substring(0, 500));
    console.log('...\n');

    // テスト3: 氏名フィールドに入力（エラーリカバリー機能を活用）
    console.log('🔍 テスト3: 氏名フィールド入力（エラーリカバリー付き）');
    
    const fillResult = await othello.executeWithRetry(async () => {
      return await othello.executeInstruction({
        type: 'fill',
        selector: 'input[name="username"]',
        value: '山田太郎',
        description: 'Fill username field with test data'
      });
    }, 'fill-username');

    if (fillResult.success) {
      console.log('✅ 氏名フィールドに入力成功（リトライ機能付き）\n');
    } else {
      console.log('⚠️  入力に失敗（エラーリカバリー後）:', fillResult.error);
    }

    // スクリーンショット保存
    console.log('📸 スクリーンショット保存中...');
    await othello.mcpClient.screenshot('logs/hotel-form-filled.png');
    console.log('✅ スクリーンショット保存完了\n');

    // 実行履歴を取得
    const history = othello.getExecutionHistory();
    console.log(`📊 実行履歴: ${history.length}件の操作を記録`);

    // 実行履歴を保存
    const historyPath = path.join(__dirname, '..', 'logs', 'hotel-test-history.json');
    await othello.saveExecutionHistory(historyPath);
    console.log(`✅ 実行履歴を保存: ${historyPath}\n`);

    // セッションクローズ
    console.log('🔚 セッションクローズ中...');
    await othello.closeSession();
    console.log('✅ セッションクローズ完了\n');

    console.log('🎉 テスト完了！');
    console.log('\n📁 生成されたファイル:');
    console.log('  - logs/hotel-form-filled.png');
    console.log('  - logs/hotel-test-history.json');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    
    // エラー時のスナップショット保存
    try {
      await othello.saveFailureSnapshot(
        { description: 'Hotel test error' },
        error
      );
      console.log('📸 エラー時のスナップショットを保存しました');
    } catch (snapErr) {
      console.error('スナップショット保存に失敗:', snapErr.message);
    }
  }
}

// 実行
runHotelTest()
  .then(() => {
    console.log('\n✨ すべて完了');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 致命的エラー:', error);
    process.exit(1);
  });
