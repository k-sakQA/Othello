/**
 * ホテル予約サイト - E2Eテスト
 * テスト計画: docs/hotel-site-test-plan.md
 */

const { test, expect } = require('@playwright/test');

test.describe('ホテル予約サイト - プラン一覧', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/plans.html');
  });

  test('プラン一覧ページが表示される', async ({ page }) => {
    // タイトル確認
    await expect(page).toHaveTitle(/プラン一覧/);
    
    // プランカードが表示されているか確認
    const planCards = page.locator('[data-testid="plan-card"], .plan-card, article');
    await expect(planCards.first()).toBeVisible();
  });

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForLoadState('networkidle');
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    
    // レイアウト崩れがないことを確認（スクリーンショット比較）
    await expect(page).toHaveScreenshot('mobile-plans.png', { 
      maxDiffPixels: 100 
    });
  });
});

test.describe('ホテル予約フォーム - 入力テスト', () => {
  test.beforeEach(async ({ page }) => {
    // プラン一覧からプラン0を選択
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');
  });

  test('正常値で予約フォームを送信できる', async ({ page }) => {
    // 明日の日付を計算
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    // フォーム入力
    await page.fill('input[name="reserve_date"], #reserve_date', dateString);
    await page.fill('input[name="reserve_term"], #reserve_term', '2');
    await page.fill('input[name="head_count"], #head_count', '2');
    await page.fill('input[name="username"], #username', '山田太郎');
    await page.selectOption('select[name="contact"], #contact', 'email');

    // 送信ボタンをクリック
    await page.click('button[type="submit"], input[type="submit"]');

    // 確認画面に遷移することを確認
    await expect(page).toHaveURL(/confirm/);
  });

  test('必須項目未入力時にエラーが表示される', async ({ page }) => {
    // 何も入力せずに送信
    await page.click('button[type="submit"], input[type="submit"]');

    // エラーメッセージが表示されることを確認
    const errorMessages = page.locator('.error, [role="alert"], .invalid-feedback');
    await expect(errorMessages.first()).toBeVisible();
    
    // エラーメッセージの内容確認
    const errorText = await errorMessages.first().textContent();
    expect(errorText).toMatch(/入力|必須|required/i);
  });

  test('氏名フィールドに様々な文字種を入力できる', async ({ page }) => {
    const testCases = [
      { value: 'やまだたろう', label: 'ひらがな' },
      { value: 'ヤマダタロウ', label: 'カタカナ' },
      { value: '山田太郎', label: '漢字' },
      { value: 'Yamada Taro', label: '半角英字' },
      { value: '山田・太郎', label: '記号混在' }
    ];

    for (const testCase of testCases) {
      await page.fill('input[name="username"], #username', '');
      await page.fill('input[name="username"], #username', testCase.value);
      
      const inputValue = await page.inputValue('input[name="username"], #username');
      expect(inputValue).toBe(testCase.value);
      
      console.log(`✅ ${testCase.label}: ${testCase.value}`);
    }
  });

  test('宿泊数に異常値を入力するとエラーが表示される', async ({ page }) => {
    // 0を入力
    await page.fill('input[name="reserve_term"], #reserve_term', '0');
    await page.click('button[type="submit"], input[type="submit"]');
    
    // エラーメッセージを確認
    const errorMessages = page.locator('.error, [role="alert"]');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('フォーム入力内容が確認画面に反映される', async ({ page }) => {
    const testData = {
      date: '2025-10-25',
      term: '3',
      count: '4',
      name: '山田太郎',
      contact: 'email'
    };

    // フォーム入力
    await page.fill('input[name="reserve_date"], #reserve_date', testData.date);
    await page.fill('input[name="reserve_term"], #reserve_term', testData.term);
    await page.fill('input[name="head_count"], #head_count', testData.count);
    await page.fill('input[name="username"], #username', testData.name);
    await page.selectOption('select[name="contact"], #contact', testData.contact);

    // 送信
    await page.click('button[type="submit"], input[type="submit"]');

    // 確認画面で入力内容を確認
    await expect(page.locator('text=' + testData.name)).toBeVisible();
  });
});

test.describe('ホテル予約フォーム - 状態遷移テスト', () => {
  test('確認画面から戻るボタンでフォームに戻り、入力内容が保持される', async ({ page }) => {
    await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];

    // フォーム入力
    await page.fill('input[name="reserve_date"], #reserve_date', dateString);
    await page.fill('input[name="username"], #username', '山田太郎');

    // 送信
    await page.click('button[type="submit"], input[type="submit"]');

    // 確認画面から戻る
    await page.click('button:has-text("戻る"), a:has-text("戻る")');

    // 入力内容が保持されているか確認
    const nameValue = await page.inputValue('input[name="username"], #username');
    expect(nameValue).toBe('山田太郎');
  });
});
