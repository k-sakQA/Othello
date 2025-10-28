/**
 * Othello 実行履歴永続化機能デモ
 * 
 * このデモでは以下をテストします：
 * 1. セッション1: 実行履歴を保存
 * 2. セッション2: 履歴を読み込み（置き換え）
 * 3. セッション3: 履歴を読み込み（追加）
 */

const Othello = require('./src/playwright-agent');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log('📚 Othello 実行履歴永続化機能デモ\n');
  
  const historyFile = 'logs/execution-history.json';
  const logDir = path.dirname(historyFile);
  
  // ログディレクトリを作成
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (err) {
    // ディレクトリが既に存在する場合はスキップ
  }

  // 既存の履歴ファイルを削除（クリーンスタート）
  try {
    await fs.unlink(historyFile);
    console.log('🗑️  既存の履歴ファイルを削除しました\n');
  } catch (err) {
    // ファイルが存在しない場合はスキップ
  }

  console.log('='.repeat(60));
  console.log('セッション1: 実行履歴を作成して保存');
  console.log('='.repeat(60));

  const mockConfig = {
    config: {
      default_browser: 'chromium',
      timeout_seconds: 300,
      playwright_agent: {
        mock_mode: false
      }
    },
    mcp: {
      serverCommand: 'npx',
      serverArgs: ['-y', '@playwright/mcp']
    }
  };

  // セッション1: 実行履歴を作成
  const othello1 = new Othello(mockConfig, {
    mockMode: false,
    debugMode: true
  });

  try {
    console.log('\n1️⃣  セッション初期化');
    await othello1.initializeSession();
    console.log(`   ✅ セッションID: ${othello1.sessionId}`);

    console.log('\n2️⃣  Googleにナビゲーション');
    await othello1.executeInstruction({
      type: 'navigate',
      url: 'https://www.google.com',
      description: 'Navigate to Google'
    });
    console.log('   ✅ ナビゲーション完了');

    console.log('\n3️⃣  実行履歴を確認');
    const history1 = othello1.getExecutionHistory();
    console.log(`   📊 履歴件数: ${history1.length}件`);

    console.log('\n4️⃣  実行履歴をファイルに保存');
    await othello1.saveExecutionHistory(historyFile);
    console.log(`   ✅ 保存完了: ${historyFile}`);

    console.log('\n5️⃣  セッションクローズ');
    await othello1.closeSession();
    console.log('   ✅ クローズ完了\n');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }

  // 短い待機時間
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('='.repeat(60));
  console.log('セッション2: 履歴を読み込み（置き換えモード）');
  console.log('='.repeat(60));

  // セッション2: 履歴を読み込み（置き換え）
  const othello2 = new Othello(mockConfig, {
    mockMode: false,
    debugMode: true
  });

  try {
    console.log('\n1️⃣  セッション初期化');
    await othello2.initializeSession();
    console.log(`   ✅ セッションID: ${othello2.sessionId}`);

    console.log('\n2️⃣  実行履歴を読み込み（置き換えモード）');
    const loadedData = await othello2.loadExecutionHistory(historyFile, false);
    console.log(`   ✅ 読み込み完了: ${loadedData.totalEntries}件`);
    console.log(`   📅 保存日時: ${loadedData.savedAt}`);
    console.log(`   🆔 元のセッションID: ${loadedData.sessionId}`);

    console.log('\n3️⃣  読み込んだ履歴を確認');
    const history2 = othello2.getExecutionHistory();
    console.log(`   📊 現在の履歴件数: ${history2.length}件`);

    console.log('\n   📋 履歴サマリー:');
    history2.forEach((entry, index) => {
      console.log(`      ${index + 1}. [${entry.level.toUpperCase()}] ${entry.action} (${entry.timestamp})`);
    });

    console.log('\n4️⃣  セッションクローズ');
    await othello2.closeSession();
    console.log('   ✅ クローズ完了\n');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }

  // 短い待機時間
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('='.repeat(60));
  console.log('セッション3: 履歴を読み込み（追加モード）');
  console.log('='.repeat(60));

  // セッション3: 履歴を読み込み（追加）
  const othello3 = new Othello(mockConfig, {
    mockMode: false,
    debugMode: true
  });

  try {
    console.log('\n1️⃣  セッション初期化');
    await othello3.initializeSession();
    console.log(`   ✅ セッションID: ${othello3.sessionId}`);

    console.log('\n2️⃣  新しいアクションを実行');
    await othello3.executeInstruction({
      type: 'navigate',
      url: 'https://www.github.com',
      description: 'Navigate to GitHub'
    });
    console.log('   ✅ ナビゲーション完了');

    console.log('\n3️⃣  現在の履歴を確認');
    const historyBefore = othello3.getExecutionHistory();
    console.log(`   📊 現在の履歴件数: ${historyBefore.length}件`);

    console.log('\n4️⃣  実行履歴を読み込み（追加モード）');
    const loadedData2 = await othello3.loadExecutionHistory(historyFile, true);
    console.log(`   ✅ 読み込み完了: ${loadedData2.totalEntries}件を追加`);

    console.log('\n5️⃣  結合後の履歴を確認');
    const historyAfter = othello3.getExecutionHistory();
    console.log(`   📊 結合後の履歴件数: ${historyAfter.length}件`);

    console.log('\n   📋 履歴サマリー:');
    historyAfter.forEach((entry, index) => {
      console.log(`      ${index + 1}. [${entry.level.toUpperCase()}] ${entry.action} (${entry.sessionId.substring(0, 25)}...)`);
    });

    console.log('\n6️⃣  結合した履歴を保存');
    const mergedHistoryFile = 'logs/merged-execution-history.json';
    await othello3.saveExecutionHistory(mergedHistoryFile);
    console.log(`   ✅ 保存完了: ${mergedHistoryFile}`);

    console.log('\n7️⃣  セッションクローズ');
    await othello3.closeSession();
    console.log('   ✅ クローズ完了\n');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }

  console.log('='.repeat(60));
  console.log('📄 保存された履歴ファイルの確認');
  console.log('='.repeat(60));

  try {
    console.log(`\n1. ${historyFile}`);
    const content1 = await fs.readFile(historyFile, 'utf-8');
    const data1 = JSON.parse(content1);
    console.log(`   セッションID: ${data1.sessionId}`);
    console.log(`   保存日時: ${data1.savedAt}`);
    console.log(`   履歴件数: ${data1.totalEntries}件`);

    console.log(`\n2. logs/merged-execution-history.json`);
    const content2 = await fs.readFile('logs/merged-execution-history.json', 'utf-8');
    const data2 = JSON.parse(content2);
    console.log(`   セッションID: ${data2.sessionId}`);
    console.log(`   保存日時: ${data2.savedAt}`);
    console.log(`   履歴件数: ${data2.totalEntries}件`);
    console.log(`   （元の${data1.totalEntries}件 + 新規の${data2.totalEntries - data1.totalEntries}件）`);

  } catch (error) {
    console.error('❌ ファイル読み込みエラー:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 永続化機能テスト完了！');
  console.log('='.repeat(60));
  console.log('\n✨ デモ終了');
}

main().catch(error => {
  console.error('\n❌ デモ実行エラー:', error);
  process.exit(1);
});
