/**
 * Othello-Healer デモスクリプト
 * 失敗したテストケースの分析と自動修復
 */

const OthelloHealer = require('../src/agents/othello-healer');
const { LLMFactory } = require('../src/llm/llm-factory');
require('dotenv').config();

async function main() {
  console.log('🎯 Othello-Healer デモ開始\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // LLMクライアントを初期化
  const llm = LLMFactory.create('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2000
  });

  // Healer インスタンスを作成
  const healer = new OthelloHealer({ llm });

  // シナリオ1: セレクタの問題（テストスクリプトのミス）
  console.log('📋 シナリオ1: セレクタの問題\n');
  
  const scenario1 = {
    test_case_id: 'TC001',
    instructions: [
      {
        type: 'navigate',
        url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0',
        description: '予約ページを開く'
      },
      {
        type: 'click',
        selector: 'button#submit-button',
        description: '予約ボタンをクリック'
      }
    ],
    error: {
      message: 'Error: Element not found: button#submit-button',
      stack: 'TimeoutError: waiting for selector "button#submit-button" failed: timeout 30000ms exceeded'
    },
    snapshot: {
      role: 'WebArea',
      name: 'Hotel Reservation Page',
      children: [
        {
          role: 'button',
          name: '予約内容を確認する',
          ref: 'e50'
        },
        {
          role: 'textbox',
          name: '氏名 必須',
          ref: 'e10'
        }
      ]
    }
  };

  try {
    console.log('🔍 分析中...\n');
    const startTime = Date.now();
    
    const result1 = await healer.heal(scenario1);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ 分析完了！\n');
    console.log(`⏱️  処理時間: ${elapsed} 秒\n`);
    
    if (result1.is_bug) {
      console.log('🐛 **判定: バグ**\n');
      console.log(`タイプ: ${result1.bug_report?.severity || 'N/A'}`);
      console.log(`タイトル: ${result1.bug_report?.title || 'N/A'}`);
    } else {
      console.log('🔧 **判定: テストスクリプトの問題**\n');
      console.log(`根本原因: ${result1.root_cause}\n`);
      console.log(`信頼度: ${(result1.confidence * 100).toFixed(0)}%\n`);
      
      if (result1.changes && result1.changes.length > 0) {
        console.log('📝 適用された変更:\n');
        result1.changes.forEach((change, idx) => {
          console.log(`  ${idx + 1}. ${change.type}`);
          if (change.old_value) {
            console.log(`     変更前: ${change.old_value}`);
          }
          if (change.new_value) {
            console.log(`     変更後: ${change.new_value}`);
          }
        });
        console.log();
      }
      
      if (result1.fixed_instructions) {
        console.log('🔨 修正された命令:\n');
        result1.fixed_instructions.forEach((inst, idx) => {
          console.log(`  ${idx + 1}. [${inst.type}] ${inst.description}`);
          if (inst.selector) {
            console.log(`     selector: ${inst.selector}`);
          }
          if (inst.ref) {
            console.log(`     ref: ${inst.ref}`);
          }
        });
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // シナリオ2: 実際のバグ
    console.log('📋 シナリオ2: アプリケーションのバグ\n');
    
    const scenario2 = {
      test_case_id: 'TC002',
      instructions: [
        {
          type: 'navigate',
          url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html',
          description: '予約ページを開く'
        },
        {
          type: 'fill',
          selector: 'input[name="email"]',
          ref: 'e12',
          value: 'test@example.com',
          description: 'メールアドレスを入力'
        },
        {
          type: 'click',
          selector: 'button[type="submit"]',
          ref: 'e50',
          description: '送信ボタンをクリック'
        },
        {
          type: 'verify_text_visible',
          text: '予約が完了しました',
          description: '成功メッセージを確認'
        }
      ],
      error: {
        message: 'Assertion failed: Expected "予約が完了しました" but got "エラー: メールアドレスの形式が正しくありません"',
        screenshot: 'base64encodedimage...'
      },
      snapshot: {
        role: 'WebArea',
        children: [
          {
            role: 'textbox',
            name: 'メールアドレス',
            ref: 'e12'
          },
          {
            role: 'text',
            name: 'エラー: メールアドレスの形式が正しくありません'
          }
        ]
      }
    };
    
    console.log('🔍 分析中...\n');
    const startTime2 = Date.now();
    
    const result2 = await healer.heal(scenario2);
    
    const elapsed2 = ((Date.now() - startTime2) / 1000).toFixed(2);
    
    console.log('✅ 分析完了！\n');
    console.log(`⏱️  処理時間: ${elapsed2} 秒\n`);
    
    if (result2.is_bug) {
      console.log('🐛 **判定: バグ**\n');
      console.log(`根本原因: ${result2.root_cause}\n`);
      
      if (result2.bug_report) {
        console.log('📋 バグレポート:\n');
        console.log(`  タイトル: ${result2.bug_report.title}`);
        console.log(`  深刻度: ${result2.bug_report.severity}`);
        
        if (result2.bug_report.steps_to_reproduce) {
          console.log('\n  再現手順:');
          result2.bug_report.steps_to_reproduce.forEach((step, idx) => {
            console.log(`    ${idx + 1}. ${step}`);
          });
        }
        
        if (result2.bug_report.expected) {
          console.log(`\n  期待値: ${result2.bug_report.expected}`);
        }
        if (result2.bug_report.actual) {
          console.log(`  実際: ${result2.bug_report.actual}`);
        }
      }
    } else {
      console.log('🔧 **判定: テストスクリプトの問題**\n');
      console.log(`根本原因: ${result2.root_cause}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // サマリー
    console.log('📊 デモサマリー\n');
    console.log(`  シナリオ1: ${result1.is_bug ? 'バグ' : 'テストスクリプトの問題'}`);
    console.log(`  シナリオ2: ${result2.is_bug ? 'バグ' : 'テストスクリプトの問題'}`);
    console.log();
    
    console.log('🎉 Othello-Healer デモ完了！\n');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
