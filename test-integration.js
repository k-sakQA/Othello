/**
 * Phase 7 統合テスト
 * 実際のMCPサーバーと接続してブラウザ操作を確認
 */

const PlaywrightAgent = require('./src/playwright-agent');
const ConfigManager = require('./src/config');

// ANSI カラーコード
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}======================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}Phase 7 統合テスト${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================${colors.reset}\n`);

  try {
    // 設定読み込み
    console.log(`${colors.blue}📋 設定読み込み中...${colors.reset}`);
    const config = await ConfigManager.load('config/default.json');
    const mcpEndpoint = config.config.playwright_agent?.api_endpoint;
    console.log(`${colors.green}✅ MCPエンドポイント: ${mcpEndpoint}${colors.reset}\n`);

    // PlaywrightAgent初期化
    console.log(`${colors.blue}🎭 PlaywrightAgent 初期化中...${colors.reset}`);
    const agent = new PlaywrightAgent(config);
    console.log(`${colors.green}✅ PlaywrightAgent 初期化完了${colors.reset}\n`);

    // Test 1: MCP初期化
    console.log(`${colors.bold}${colors.yellow}Test 1: MCP初期化ハンドシェイク${colors.reset}`);
    console.log(`${colors.blue}🔄 セッション初期化中...${colors.reset}`);
    await agent.initializeSession();
    console.log(`${colors.green}✅ セッションID: ${agent.sessionId}${colors.reset}`);
    console.log(`${colors.green}✅ セッション初期化完了${colors.reset}\n`);

    // Test 2: ブラウザナビゲート
    console.log(`${colors.bold}${colors.yellow}Test 2: ブラウザナビゲート${colors.reset}`);
    const navigateInstruction = {
      type: 'navigate',
      url: 'https://example.com',
      description: 'Example.comにアクセス'
    };
    console.log(`${colors.blue}🌐 ナビゲート: ${navigateInstruction.url}${colors.reset}`);
    const navigateResult = await agent.callMCPServer(navigateInstruction, Date.now());
    console.log(`${colors.green}✅ 結果: ${JSON.stringify(navigateResult, null, 2)}${colors.reset}\n`);

    // Test 3: スクリーンショット
    console.log(`${colors.bold}${colors.yellow}Test 3: スクリーンショット取得${colors.reset}`);
    const screenshotInstruction = {
      type: 'screenshot',
      path: 'logs/integration-test-screenshot.png',
      description: 'ページのスクリーンショット取得'
    };
    console.log(`${colors.blue}📸 スクリーンショット保存先: ${screenshotInstruction.path}${colors.reset}`);
    const screenshotResult = await agent.callMCPServer(screenshotInstruction, Date.now());
    console.log(`${colors.green}✅ 結果: ${JSON.stringify(screenshotResult, null, 2)}${colors.reset}\n`);

    // Test 4: ページ評価
    console.log(`${colors.bold}${colors.yellow}Test 4: ページ評価 (JavaScript実行)${colors.reset}`);
    const evaluateInstruction = {
      type: 'evaluate',
      script: '() => document.title',
      description: 'ページタイトル取得'
    };
    console.log(`${colors.blue}⚙️ スクリプト実行: ${evaluateInstruction.script}${colors.reset}`);
    const evaluateResult = await agent.callMCPServer(evaluateInstruction, Date.now());
    console.log(`${colors.green}✅ 結果: ${JSON.stringify(evaluateResult, null, 2)}${colors.reset}\n`);

    // Test 5: セッション終了
    console.log(`${colors.bold}${colors.yellow}Test 5: セッション終了${colors.reset}`);
    console.log(`${colors.blue}🔒 セッションクローズ中...${colors.reset}`);
    await agent.closeSession();
    console.log(`${colors.green}✅ セッション終了完了${colors.reset}`);
    console.log(`${colors.green}✅ ブラウザクローズ完了${colors.reset}\n`);

    // 成功サマリー
    console.log(`${colors.bold}${colors.green}======================================${colors.reset}`);
    console.log(`${colors.bold}${colors.green}🎉 統合テスト成功！${colors.reset}`);
    console.log(`${colors.bold}${colors.green}======================================${colors.reset}\n`);

    console.log(`${colors.cyan}📊 実行サマリー:${colors.reset}`);
    console.log(`  ✅ MCP初期化ハンドシェイク`);
    console.log(`  ✅ ブラウザナビゲート`);
    console.log(`  ✅ スクリーンショット取得`);
    console.log(`  ✅ JavaScript実行`);
    console.log(`  ✅ セッション終了`);
    console.log();

  } catch (error) {
    console.error(`\n${colors.bold}${colors.red}❌ エラー発生:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    if (error.response) {
      console.error(`${colors.red}HTTP Status: ${error.response.status}${colors.reset}`);
      console.error(`${colors.red}Response Data: ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
    }
    console.error(`${colors.red}${error.stack}${colors.reset}\n`);
    process.exit(1);
  }
}

// 実行
main().catch(error => {
  console.error(`\n${colors.bold}${colors.red}❌ 致命的エラー:${colors.reset}`);
  console.error(`${colors.red}${error.message}${colors.reset}\n`);
  process.exit(1);
});
