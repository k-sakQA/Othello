// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Othello用 Playwright設定
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  
  /* Othelloが生成したテストのタイムアウト設定 */
  timeout: 60 * 1000,
  expect: {
    timeout: 5000
  },
  
  /* 並列実行の無効化（Othelloがシーケンシャルに実行） */
  fullyParallel: false,
  workers: 1,
  
  /* 失敗したテストのリトライ */
  retries: process.env.CI ? 2 : 0,
  
  /* レポート設定 */
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  
  /* 共通設定 */
  use: {
    /* ベースURL（Othelloの--urlで上書き） */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* スクリーンショット設定 */
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    
    /* ブラウザコンテキスト設定 */
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  /* ブラウザプロジェクト設定 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // 必要に応じて追加のブラウザを有効化
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* ローカル開発サーバーの起動（オプション） */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
