// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * サンプルテスト: Playwright動作確認用
 * Othelloからの実行テスト
 */

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // タイトルに "Playwright" が含まれることを確認
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // "Get started"リンクをクリック
  await page.getByRole('link', { name: 'Get started' }).click();

  // 新しいページで "Installation" という見出しが表示されることを確認
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
