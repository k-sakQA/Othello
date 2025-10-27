#!/usr/bin/env node

/**
 * Othello クイックスタート例
 * 
 * このスクリプトを実行してOthelloの基本機能を試してみましょう！
 */

const Othello = require('../src/playwright-agent');
const path = require('path');

async function main() {
  console.log('🎭 Othello クイックスタート\n');

  // 1. シンプルな設定（モックモードで動作確認）
  const config = {
    default_browser: 'chromium',
    timeout_seconds: 30,
    max_iterations: 5,
    mcp_server: {
      command: 'node',
      args: ['mcp-server.js'],
      timeout_seconds: 60,
      connection_type: 'stdio'
    },
    paths: {
      logs: './logs',
      results: './results',
      reports: './reports',
      test_instructions: './tests',
      screenshots: './screenshots'
    }
  };

  // 2. エラーリカバリー機能を有効にしてOthelloインスタンス作成
  console.log('✨ Othelloインスタンスを作成中...');
  const othello = new Othello(config, {
    mockMode: true,  // モックモードで動作確認
    maxRetries: 3,
    retryDelay: 1000,
    autoReconnect: true,
    saveSnapshotOnFailure: true,
    snapshotDir: './error-snapshots',
    debugMode: true,
    logFile: './logs/quick-start.log'
  });

  console.log('✅ インスタンス作成完了\n');

  // 3. セッションIDを確認
  console.log(`📋 セッションID: ${othello.sessionId}`);
  console.log(`🔧 デバッグモード: ${othello.debugMode ? 'ON' : 'OFF'}`);
  console.log(`🔄 最大再試行回数: ${othello.maxRetries}`);
  console.log(`💾 ログファイル: ${othello.logFile || 'なし'}\n`);

  // 4. テスト指示を実行（モックモード）
  console.log('🎯 テスト指示を実行中...\n');

  try {
    // ナビゲーション
    console.log('📍 1. ページに移動');
    const nav = await othello.executeInstruction({
      type: 'navigate',
      url: 'https://example.com',
      description: 'Example.comに移動'
    });
    console.log(`   結果: ${nav.success ? '✅ 成功' : '❌ 失敗'}\n`);

    // クリック
    console.log('🖱️  2. ボタンをクリック');
    const click = await othello.executeInstruction({
      type: 'click',
      selector: '#submit-button',
      description: '送信ボタンをクリック'
    });
    console.log(`   結果: ${click.success ? '✅ 成功' : '❌ 失敗'}\n`);

    // フォーム入力
    console.log('⌨️  3. フォームに入力');
    const fill = await othello.executeInstruction({
      type: 'fill',
      selector: '#username',
      value: 'testuser',
      description: 'ユーザー名を入力'
    });
    console.log(`   結果: ${fill.success ? '✅ 成功' : '❌ 失敗'}\n`);

    // スクリーンショット
    console.log('📸 4. スクリーンショット取得');
    const screenshot = await othello.executeInstruction({
      type: 'screenshot',
      path: './screenshots/example.png',
      description: 'ページのスクリーンショット'
    });
    console.log(`   結果: ${screenshot.success ? '✅ 成功' : '❌ 失敗'}\n`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  }

  // 5. 実行履歴を確認
  console.log('📊 実行履歴を確認...\n');
  const history = othello.getExecutionHistory();
  console.log(`   総エントリ数: ${history.length}`);
  console.log(`   成功: ${history.filter(h => h.level === 'info').length}`);
  console.log(`   警告: ${history.filter(h => h.level === 'warn').length}`);
  console.log(`   エラー: ${history.filter(h => h.level === 'error').length}\n`);

  // 6. executeWithRetryのデモ（意図的に失敗させる）
  console.log('🔄 自動再試行機能をデモ...');
  console.log('   (存在しない要素をクリックして再試行を確認)\n');

  try {
    await othello.executeWithRetry(
      async () => {
        return await othello.executeInstruction({
          type: 'click',
          selector: '#nonexistent-element',
          description: '存在しない要素をクリック'
        });
      },
      'nonexistentClick'
    );
  } catch (error) {
    console.log('   ⚠️  全ての再試行が失敗しました（期待通り）\n');
  }

  // 7. 実行履歴を保存
  console.log('💾 実行履歴を保存中...');
  const historyPath = './logs/quick-start-history.json';
  await othello.saveExecutionHistory(historyPath);
  console.log(`   ✅ 保存完了: ${historyPath}\n`);

  // 8. 統計情報を表示
  console.log('📈 セッション統計:');
  const finalHistory = othello.getExecutionHistory();
  const groupedByAction = finalHistory.reduce((acc, entry) => {
    acc[entry.action] = (acc[entry.action] || 0) + 1;
    return acc;
  }, {});

  Object.entries(groupedByAction).forEach(([action, count]) => {
    console.log(`   ${action}: ${count}回`);
  });

  console.log('\n✨ クイックスタート完了！\n');
  console.log('📚 次のステップ:');
  console.log('   - ログファイルを確認: ./logs/quick-start.log');
  console.log('   - 履歴を確認: ./logs/quick-start-history.json');
  console.log('   - エラースナップショット: ./error-snapshots/\n');
  console.log('💡 実際のMCPサーバーに接続するには:');
  console.log('   mockMode: false に設定して実行してください\n');
}

// 実行
main().catch(error => {
  console.error('💥 致命的なエラー:', error);
  process.exit(1);
});
