// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Othello統合テスト
 * テスト指示ファイルを読み込み、結果ファイルを出力する
 */

test.describe('Othello Integration Tests', () => {
  
  test('example test with result output', async ({ page }) => {
    // テスト開始時刻
    const startTime = new Date().toISOString();
    
    // テスト対象URLにアクセス
    await page.goto('https://example.com');
    
    // タイトルを確認
    await expect(page).toHaveTitle(/Example Domain/);
    
    // ページのテキストを確認
    const heading = page.locator('h1');
    await expect(heading).toContainText('Example Domain');
    
    // テスト終了時刻
    const endTime = new Date().toISOString();
    
    // Othello用の結果データを構築
    const result = {
      iteration: 1,
      target_url: 'https://example.com',
      browser: 'chromium',
      start_time: startTime,
      end_time: endTime,
      duration_seconds: Math.floor((new Date(endTime) - new Date(startTime)) / 1000),
      status: 'success',
      tests_generated_by_planner: ['Example Domainの表示確認'],
      tests_executed: 1,
      tests_passed: 1,
      tests_failed: 0,
      healer_actions: 0,
      playwright_agent_results: {
        planner_suggestions: ['タイトル確認', '見出し確認'],
        generated_tests: [
          {
            name: 'Example Domainの表示確認',
            status: 'passed',
            inputs: [],
            visited_urls: ['https://example.com']
          }
        ],
        healer_actions: [],
        test_details: [
          {
            name: 'Example Domainの表示確認',
            status: 'passed',
            inputs: [],
            visited_urls: ['https://example.com'],
            expected_result: 'タイトルと見出しが正しく表示される'
          }
        ]
      },
      untested_elements: [] // 完了とマーク
    };
    
    // 結果ファイルを出力（Othelloが読み取る）
    const resultsDir = path.join(process.cwd(), 'playwright-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const resultPath = path.join(resultsDir, 'result_iteration-1.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
    
    console.log(`✅ 結果ファイルを出力しました: ${resultPath}`);
  });
  
  test('read instruction file (if exists)', async ({ page }) => {
    const instructionPath = path.join(process.cwd(), 'test-instructions', 'instruction_iteration-1.json');
    
    if (fs.existsSync(instructionPath)) {
      const instruction = JSON.parse(fs.readFileSync(instructionPath, 'utf8'));
      console.log('📋 テスト指示を読み込みました:', instruction);
      
      // 指示に従ってテスト実行
      await page.goto(instruction.target_url || 'https://example.com');
      await expect(page).toHaveTitle(/.+/);
      
      console.log(`✅ ${instruction.instruction || 'テスト'} を実行しました`);
    } else {
      console.log('ℹ️  テスト指示ファイルが見つかりません。スキップします。');
      test.skip();
    }
  });
});
