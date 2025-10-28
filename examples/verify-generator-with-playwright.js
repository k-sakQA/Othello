/**
 * Othello-Generator 動作確認スクリプト
 * 
 * 生成されたMCP命令を実際にPlaywrightで実行し、
 * Generator が正しく動作しているか検証します。
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * MCP命令を実際のPlaywright操作に変換して実行
 */
class PlaywrightMCPExecutor {
  constructor(page) {
    this.page = page;
  }

  /**
   * 単一の命令を実行
   */
  async executeInstruction(instruction) {
    console.log(`  ▶ ${instruction.type}: ${instruction.description}`);
    
    try {
      switch (instruction.type) {
        case 'navigate':
          await this.page.goto(instruction.url, { waitUntil: 'networkidle' });
          console.log(`    ✓ ページ遷移完了`);
          break;

        case 'fill':
          const fillSelector = instruction.selector || `[data-ref="${instruction.ref}"]`;
          await this.page.fill(fillSelector, instruction.value);
          console.log(`    ✓ 入力完了: "${instruction.value}"`);
          break;

        case 'click':
          const clickSelector = instruction.selector || `[data-ref="${instruction.ref}"]`;
          await this.page.click(clickSelector);
          console.log(`    ✓ クリック完了`);
          break;

        case 'select_option':
          const selectSelector = instruction.selector || `[data-ref="${instruction.ref}"]`;
          await this.page.selectOption(selectSelector, instruction.value);
          console.log(`    ✓ オプション選択完了: "${instruction.value}"`);
          break;

        case 'verify_text_visible':
          const textSelector = instruction.selector || instruction.text;
          const textVisible = await this.page.locator(textSelector).isVisible();
          if (!textVisible) {
            throw new Error(`Text not visible: ${textSelector}`);
          }
          console.log(`    ✓ テキスト表示確認: "${textSelector}"`);
          break;

        case 'verify_element_visible':
          const elemSelector = instruction.selector || `[data-ref="${instruction.ref}"]`;
          const elemVisible = await this.page.locator(elemSelector).isVisible();
          if (!elemVisible) {
            throw new Error(`Element not visible: ${elemSelector}`);
          }
          console.log(`    ✓ 要素表示確認`);
          break;

        case 'wait_for':
          if (instruction.text) {
            await this.page.waitForSelector(`text=${instruction.text}`, { timeout: 5000 });
            console.log(`    ✓ 待機完了: text=${instruction.text}`);
          } else if (instruction.selector) {
            await this.page.waitForSelector(instruction.selector, { timeout: 5000 });
            console.log(`    ✓ 待機完了: ${instruction.selector}`);
          } else if (instruction.time) {
            await this.page.waitForTimeout(instruction.time * 1000);
            console.log(`    ✓ 待機完了: ${instruction.time}秒`);
          } else {
            // デフォルトで1秒待機
            await this.page.waitForTimeout(1000);
            console.log(`    ✓ 待機完了: 1秒`);
          }
          break;

        default:
          console.warn(`    ⚠ 未対応の命令タイプ: ${instruction.type}`);
      }
    } catch (error) {
      console.error(`    ✗ エラー: ${error.message}`);
      throw error;
    }
  }

  /**
   * テストケースの全命令を実行
   */
  async executeTestCase(testCase) {
    console.log(`\n📋 テストケース実行: ${testCase.test_case_id} (観点No.${testCase.aspect_no})`);
    console.log(`   命令数: ${testCase.instructions.length}`);
    
    for (let i = 0; i < testCase.instructions.length; i++) {
      const instruction = testCase.instructions[i];
      console.log(`\n  [${i + 1}/${testCase.instructions.length}]`);
      await this.executeInstruction(instruction);
    }
    
    console.log(`\n  ✅ テストケース ${testCase.test_case_id} 完了\n`);
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('🎯 Othello-Generator 動作検証開始\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 生成された命令を読み込み
  const instructionsPath = path.join(__dirname, '../output/mcp-instructions-demo.json');
  const instructionsData = await fs.readFile(instructionsPath, 'utf-8');
  const instructionSets = JSON.parse(instructionsData);

  console.log(`📂 読み込み完了: ${instructionsPath}`);
  console.log(`📊 テストケース数: ${instructionSets.length}\n`);

  // Playwrightブラウザを起動
  console.log('🌐 ブラウザ起動中...\n');
  const browser = await chromium.launch({ 
    headless: false,  // 動作を確認するため表示モード
    slowMo: 500       // 操作を見やすくするため0.5秒遅延
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  const executor = new PlaywrightMCPExecutor(page);

  const results = {
    total: instructionSets.length,
    passed: 0,
    failed: 0,
    errors: []
  };

  // 各テストケースを実行
  for (const testCase of instructionSets) {
    try {
      await executor.executeTestCase(testCase);
      results.passed++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        test_case_id: testCase.test_case_id,
        error: error.message
      });
      console.error(`\n❌ テストケース ${testCase.test_case_id} 失敗:`);
      console.error(`   ${error.message}\n`);
    }
  }

  // ブラウザを閉じる
  await browser.close();

  // 結果サマリー
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 実行結果サマリー\n');
  console.log(`   総テストケース数: ${results.total}`);
  console.log(`   ✅ 成功: ${results.passed}`);
  console.log(`   ❌ 失敗: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n   失敗したテストケース:');
    results.errors.forEach(err => {
      console.log(`   - ${err.test_case_id}: ${err.error}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (results.failed === 0) {
    console.log('\n🎉 全テストケース成功！Generatorは完璧に動作しています！\n');
  } else {
    console.log('\n⚠️  一部テストケースが失敗しました。\n');
    process.exit(1);
  }
}

// エラーハンドリング
main().catch(error => {
  console.error('\n💥 致命的エラー:', error);
  process.exit(1);
});
