/**
 * Othello-Generator デモスクリプト
 * テストケースをPlaywright MCP命令に変換
 */

const OthelloGenerator = require('../src/agents/othello-generator');
const { LLMFactory } = require('../src/llm/llm-factory');
require('dotenv').config();

async function main() {
  console.log('🎯 Othello-Generator デモ開始\n');

  // LLMクライアントを初期化
  const llm = LLMFactory.create('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 3000
  });

  // Generator インスタンスを作成
  const generator = new OthelloGenerator({ llm });

  // サンプルテストケース（Plannerの出力を想定）
  const testCases = [
    {
      case_id: 'TC001',
      title: '予約フォームの入力テスト',
      steps: [
        '予約ページを開く',
        '氏名フィールドに「山田太郎」を入力',
        '電話番号フィールドに「090-1234-5678」を入力',
        'メールアドレスフィールドに「yamada@example.com」を入力',
        '予約ボタンをクリック'
      ],
      expected_results: [
        '確認ページに遷移する',
        '入力した情報が表示される'
      ],
      aspect_no: 4,
      test_type: '入力',
      priority: 'P0'
    },
    {
      case_id: 'TC002',
      title: '必須項目未入力時のエラー表示',
      steps: [
        '予約ページを開く',
        '氏名フィールドを空のままにする',
        '予約ボタンをクリック'
      ],
      expected_results: [
        'エラーメッセージ「氏名を入力してください」が表示される',
        '予約ボタンが非活性になる'
      ],
      aspect_no: 9,
      test_type: '入力 - 未入力',
      priority: 'P1'
    }
  ];

  // サンプルSnapshot（実際のページ構造を模擬）
  const snapshot = {
    role: 'WebArea',
    name: 'Hotel Reservation Page',
    children: [
      {
        role: 'group',
        name: 'Reservation Form',
        children: [
          {
            role: 'textbox',
            name: '氏名',
            ref: 'e10'
          },
          {
            role: 'textbox',
            name: '電話番号',
            ref: 'e11'
          },
          {
            role: 'textbox',
            name: 'メールアドレス',
            ref: 'e12'
          },
          {
            role: 'button',
            name: '予約する',
            ref: 'e20'
          }
        ]
      },
      {
        role: 'group',
        name: 'Error Messages',
        children: [
          {
            role: 'text',
            name: 'エラーメッセージ領域',
            ref: 'e30'
          }
        ]
      }
    ]
  };

  const url = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';

  try {
    console.log('📋 テストケース数:', testCases.length);
    console.log('🔍 Snapshot要素数:', countElements(snapshot));
    console.log('');

    const startTime = Date.now();

    // MCP命令を生成
    console.log('⚙️  MCP命令を生成中...\n');
    const instructions = await generator.generate({
      testCases,
      snapshot,
      url
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('✅ 生成完了！\n');
    console.log('⏱️  実行時間:', duration, '秒');
    console.log('📝 生成された命令セット数:', instructions.length);
    console.log('');

    // 結果を表示
    for (const instructionSet of instructions) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📌 ${instructionSet.test_case_id} (観点No.${instructionSet.aspect_no})`);
      console.log(`${'='.repeat(60)}`);
      console.log(`命令数: ${instructionSet.instructions.length}`);
      console.log('');

      instructionSet.instructions.forEach((instruction, index) => {
        console.log(`  ${index + 1}. [${instruction.type}] ${instruction.description}`);
        if (instruction.ref) {
          console.log(`     - ref: ${instruction.ref}`);
        }
        if (instruction.selector) {
          console.log(`     - selector: ${instruction.selector}`);
        }
        if (instruction.value) {
          console.log(`     - value: ${instruction.value}`);
        }
        if (instruction.url) {
          console.log(`     - url: ${instruction.url}`);
        }
        console.log('');
      });
    }

    // JSON出力
    const fs = require('fs');
    const outputPath = './output/mcp-instructions-demo.json';
    fs.writeFileSync(
      outputPath,
      JSON.stringify(instructions, null, 2),
      'utf-8'
    );
    console.log(`\n💾 JSON出力: ${outputPath}`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function countElements(snapshot, count = 0) {
  if (snapshot.role) count++;
  if (snapshot.children) {
    for (const child of snapshot.children) {
      count = countElements(child, count);
    }
  }
  return count;
}

main();
