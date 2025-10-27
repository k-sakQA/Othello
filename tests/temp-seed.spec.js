const { test } = require('@playwright/test');

test('navigate to reserve page', async ({ page }) => {
  await page.goto('https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');
  await page.waitForLoadState('networkidle');
});
