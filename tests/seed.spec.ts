import { test, expect } from '@playwright/test';

test('seed', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');
});
