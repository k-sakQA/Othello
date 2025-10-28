/**
 * Othello-Executor デモスクリプト
 * Generator生成のMCP命令を実行
 */

const OthelloExecutor = require('../src/agents/othello-executor');

async function main() {
  console.log('🎯 Othello-Executor デモ開始\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Playwright MCP のモック（実際にはPlaywright MCPサーバーに接続）
  const mockPlaywrightMCP = {
    navigate: async (args) => {
      console.log(`  🌐 navigate: ${args.url}`);
      await sleep(100);
      return { success: true, url: args.url };
    },
    fill: async (args) => {
      console.log(`  ✏️  fill: ${args.element} = "${args.text}"`);
      await sleep(80);
      return { success: true };
    },
    click: async (args) => {
      console.log(`  👆 click: ${args.element} (ref: ${args.ref})`);
      await sleep(100);
      return { success: true };
    },
    verify_text_visible: async (args) => {
      console.log(`  ✓  verify_text_visible: "${args.text}"`);
      await sleep(50);
      return { success: true };
    },
    wait_for: async (args) => {
      console.log(`  ⏱️  wait_for: ${args.time}秒`);
      await sleep(args.time * 1000);
      return { success: true };
    },
    snapshot: async () => {
      return {
        role: 'WebArea',
        children: [
          { role: 'textbox', name: '氏名', ref: 'e10' },
          { role: 'button', name: '予約内容を確認する', ref: 'e50' }
        ]
      };
    }
  };

  // Executor インスタンスを作成
  const executor = new OthelloExecutor({
    playwrightMCP: mockPlaywrightMCP,
    config: {
      timeout: 30000,
      headless: true
    }
  });

  console.log('✅ Executor初期化完了\n');
  console.log(`  - タイムアウト: ${executor.config.timeout}ms`);
  console.log(`  - ヘッドレス: ${executor.config.headless}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // シナリオ1: 正常な予約フロー
  console.log('📋 シナリオ1: 予約フォーム送信（成功）\n');

  const testCase1 = {
    test_case_id: 'TC001',
    instructions: [
      {
        type: 'navigate',
        url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0',
        description: '予約ページを開く'
      },
      {
        type: 'fill',
        selector: 'input#name',
        ref: 'e10',
        value: '太郎',
        description: '氏名を入力'
      },
      {
        type: 'fill',
        selector: 'input#email',
        ref: 'e11',
        value: 'taro@example.com',
        description: 'メールアドレスを入力'
      },
      {
        type: 'fill',
        selector: 'input#tel',
        ref: 'e12',
        value: '090-1234-5678',
        description: '電話番号を入力'
      },
      {
        type: 'click',
        selector: 'button#submit-btn',
        ref: 'e50',
        description: '予約内容を確認するボタンをクリック'
      },
      {
        type: 'wait_for',
        time: 1,
        description: 'ページ遷移を待つ'
      },
      {
        type: 'verify_text_visible',
        text: '予約内容の確認',
        description: '確認ページが表示される'
      }
    ]
  };

  try {
    const startTime = Date.now();
    console.log('🚀 実行開始...\n');

    const result1 = await executor.execute(testCase1);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ 実行完了！\n');
    console.log(`⏱️  処理時間: ${elapsed} 秒\n`);
    console.log('📊 実行結果:\n');
    console.log(`  - テストケースID: ${result1.test_case_id}`);
    console.log(`  - 成功: ${result1.success ? '✅ はい' : '❌ いいえ'}`);
    console.log(`  - 実行命令数: ${result1.executed_instructions}`);
    console.log(`  - 失敗命令数: ${result1.failed_instructions}`);
    console.log(`  - 実行時間: ${result1.duration_ms}ms`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // シナリオ2: 失敗シナリオ（要素が見つからない）
    console.log('📋 シナリオ2: セレクタエラー（失敗）\n');

    const testCase2 = {
      test_case_id: 'TC002',
      instructions: [
        {
          type: 'navigate',
          url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html',
          description: '予約ページを開く'
        },
        {
          type: 'click',
          selector: 'button#non-existent-button',
          ref: 'e999',
          description: '存在しないボタンをクリック'
        },
        {
          type: 'verify_text_visible',
          text: 'この命令は実行されない',
          description: '実行されない検証'
        }
      ]
    };

    // 失敗をシミュレート
    mockPlaywrightMCP.click = async (args) => {
      console.log(`  👆 click: ${args.element} (ref: ${args.ref})`);
      await sleep(100);
      throw new Error(`Element not found: ${args.ref}`);
    };

    const startTime2 = Date.now();
    console.log('🚀 実行開始...\n');

    const result2 = await executor.execute(testCase2);

    const elapsed2 = ((Date.now() - startTime2) / 1000).toFixed(2);

    console.log('\n⚠️  実行完了（エラーあり）\n');
    console.log(`⏱️  処理時間: ${elapsed2} 秒\n`);
    console.log('📊 実行結果:\n');
    console.log(`  - テストケースID: ${result2.test_case_id}`);
    console.log(`  - 成功: ${result2.success ? '✅ はい' : '❌ いいえ'}`);
    console.log(`  - 実行命令数: ${result2.executed_instructions}`);
    console.log(`  - 失敗命令数: ${result2.failed_instructions}`);
    console.log(`  - 実行時間: ${result2.duration_ms}ms`);

    if (result2.error) {
      console.log(`\n❌ エラー情報:`);
      console.log(`  - メッセージ: ${result2.error.message}`);
      console.log(`  - 命令インデックス: ${result2.error.instruction_index}`);
      console.log(`  - 命令タイプ: ${result2.error.instruction_type}`);
    }

    if (result2.snapshot) {
      console.log(`\n📸 失敗時のスナップショット:`);
      console.log(`  - Role: ${result2.snapshot.role}`);
      console.log(`  - 子要素数: ${result2.snapshot.children?.length || 0}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // サマリー
    console.log('📊 デモサマリー\n');
    console.log(`  シナリオ1: ${result1.success ? '✅ 成功' : '❌ 失敗'} (${result1.executed_instructions}命令実行)`);
    console.log(`  シナリオ2: ${result2.success ? '✅ 成功' : '❌ 失敗'} (${result2.executed_instructions}命令実行、${result2.failed_instructions}命令失敗)`);
    console.log();

    console.log('🎉 Othello-Executor デモ完了！\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
