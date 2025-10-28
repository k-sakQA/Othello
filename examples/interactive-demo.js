#!/usr/bin/env node

/**
 * Othello インタラクティブデモ
 * 
 * Phase 8の新機能を対話的に試せます
 */

const Othello = require('../src/playwright-agent');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

let othello;

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  🎭 Othello インタラクティブデモ          ║');
  console.log('║  Phase 8: エラーリカバリー機能            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 設定をユーザーに選択させる
  console.log('エラーリカバリー設定を選択してください:\n');
  console.log('1. デフォルト（リトライなし）');
  console.log('2. 基本設定（3回リトライ）');
  console.log('3. フル機能（リトライ + スナップショット + ログ）');
  
  const choice = await question('\n選択 (1-3): ');

  let options = { mockMode: true };

  switch (choice.trim()) {
    case '2':
      options = {
        mockMode: true,
        maxRetries: 3,
        retryDelay: 1000,
        autoReconnect: true
      };
      console.log('\n✅ 基本設定を適用しました');
      break;
    case '3':
      options = {
        mockMode: true,
        maxRetries: 3,
        retryDelay: 1000,
        autoReconnect: true,
        saveSnapshotOnFailure: true,
        snapshotDir: './error-snapshots',
        debugMode: true,
        logFile: './logs/interactive-demo.log'
      };
      console.log('\n✅ フル機能設定を適用しました');
      break;
    default:
      console.log('\n✅ デフォルト設定を適用しました');
  }

  console.log('\n🔧 Othelloインスタンスを作成中...');
  othello = new Othello(config, options);
  
  console.log(`✅ 作成完了！ (セッションID: ${othello.sessionId})\n`);

  // メインループ
  while (true) {
    console.log('─────────────────────────────────────────');
    console.log('何をしますか？\n');
    console.log('1. テスト指示を実行');
    console.log('2. 実行履歴を表示');
    console.log('3. 履歴をファイルに保存');
    console.log('4. エラーリカバリーのデモ');
    console.log('5. 設定情報を表示');
    console.log('0. 終了\n');

    const action = await question('選択 (0-5): ');

    switch (action.trim()) {
      case '1':
        await executeInstruction();
        break;
      case '2':
        showHistory();
        break;
      case '3':
        await saveHistory();
        break;
      case '4':
        await demoRetry();
        break;
      case '5':
        showSettings();
        break;
      case '0':
        console.log('\n👋 終了します。ありがとうございました！\n');
        rl.close();
        return;
      default:
        console.log('\n⚠️  無効な選択です\n');
    }
  }
}

async function executeInstruction() {
  console.log('\n実行する指示タイプを選択:\n');
  console.log('1. navigate (ページ移動)');
  console.log('2. click (クリック)');
  console.log('3. fill (入力)');
  console.log('4. screenshot (スクリーンショット)\n');

  const type = await question('選択 (1-4): ');

  let instruction = {};

  switch (type.trim()) {
    case '1':
      const url = await question('URL: ');
      instruction = {
        type: 'navigate',
        url: url,
        description: `${url}に移動`
      };
      break;
    case '2':
      const selector = await question('セレクター: ');
      instruction = {
        type: 'click',
        selector: selector,
        description: `${selector}をクリック`
      };
      break;
    case '3':
      const fillSelector = await question('セレクター: ');
      const value = await question('値: ');
      instruction = {
        type: 'fill',
        selector: fillSelector,
        value: value,
        description: `${fillSelector}に${value}を入力`
      };
      break;
    case '4':
      const path = await question('保存先パス: ');
      instruction = {
        type: 'screenshot',
        path: path,
        description: 'スクリーンショット取得'
      };
      break;
    default:
      console.log('\n⚠️  無効な選択です\n');
      return;
  }

  console.log('\n⏳ 実行中...');
  try {
    const result = await othello.executeInstruction(instruction);
    console.log(`\n${result.success ? '✅ 成功' : '❌ 失敗'}: ${result.instruction}`);
    if (!result.success && result.error) {
      console.log(`エラー: ${result.error}`);
    }
  } catch (error) {
    console.log(`\n❌ エラー: ${error.message}`);
  }
  console.log('');
}

function showHistory() {
  console.log('\n📊 実行履歴:\n');
  const history = othello.getExecutionHistory();
  
  if (history.length === 0) {
    console.log('   (まだ履歴がありません)\n');
    return;
  }

  console.log(`   総エントリ数: ${history.length}`);
  
  const byLevel = history.reduce((acc, entry) => {
    acc[entry.level] = (acc[entry.level] || 0) + 1;
    return acc;
  }, {});

  console.log('   レベル別:');
  Object.entries(byLevel).forEach(([level, count]) => {
    const icon = level === 'info' ? '✅' : level === 'warn' ? '⚠️' : '❌';
    console.log(`     ${icon} ${level}: ${count}`);
  });

  console.log('\n   最近の5件:');
  history.slice(-5).forEach((entry, i) => {
    const icon = entry.level === 'info' ? '✅' : entry.level === 'warn' ? '⚠️' : '❌';
    console.log(`     ${icon} [${entry.action}] ${JSON.stringify(entry.data).substring(0, 50)}...`);
  });
  console.log('');
}

async function saveHistory() {
  const path = await question('\n保存先パス (例: ./logs/history.json): ');
  
  try {
    await othello.saveExecutionHistory(path);
    console.log(`\n✅ 保存完了: ${path}\n`);
  } catch (error) {
    console.log(`\n❌ エラー: ${error.message}\n`);
  }
}

async function demoRetry() {
  console.log('\n🔄 エラーリカバリーのデモ\n');
  console.log('存在しない要素にアクセスして、自動再試行を確認します...\n');

  try {
    await othello.executeWithRetry(
      async () => {
        return await othello.executeInstruction({
          type: 'click',
          selector: '#nonexistent-element',
          description: '存在しない要素'
        });
      },
      'demoRetry'
    );
  } catch (error) {
    console.log('✅ 期待通り、全ての再試行が失敗しました\n');
  }

  const retryLogs = othello.getExecutionHistory().filter(
    e => e.action === 'executeWithRetry'
  );
  
  console.log(`リトライログ数: ${retryLogs.length}`);
  console.log('');
}

function showSettings() {
  console.log('\n⚙️  現在の設定:\n');
  console.log(`   セッションID: ${othello.sessionId}`);
  console.log(`   モックモード: ${othello.mockMode ? 'ON' : 'OFF'}`);
  console.log(`   最大リトライ: ${othello.maxRetries}回`);
  console.log(`   リトライ遅延: ${othello.retryDelay}ms`);
  console.log(`   バックオフ倍率: ${othello.backoffMultiplier}x`);
  console.log(`   自動再接続: ${othello.autoReconnect ? 'ON' : 'OFF'}`);
  console.log(`   スナップショット保存: ${othello.saveSnapshotOnFailure ? 'ON' : 'OFF'}`);
  console.log(`   デバッグモード: ${othello.debugMode ? 'ON' : 'OFF'}`);
  console.log(`   ログファイル: ${othello.logFile || 'なし'}\n`);
}

// 実行
main().catch(error => {
  console.error('💥 致命的なエラー:', error);
  rl.close();
  process.exit(1);
});
