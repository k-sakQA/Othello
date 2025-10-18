/**
 * E2Eテスト実行スクリプト
 * Othelloの実環境テストをデバッグ付きで実行
 */

const ConfigManager = require('./src/config');
const Orchestrator = require('./src/orchestrator');
const InstructionGenerator = require('./src/instruction-generator');
const Analyzer = require('./src/analyzer');
const ResultCollector = require('./src/result-collector');
const PlaywrightAgent = require('./src/playwright-agent');
const path = require('path');

async function runE2ETest() {
  console.log('🎭 Othello E2Eテスト開始\n');

  try {
    // 設定読み込み
    const configPath = path.join(__dirname, 'config', 'default.json');
    console.log(`📄 設定ファイル: ${configPath}`);
    const config = await ConfigManager.load(configPath);
    console.log(`✅ 設定読み込み完了`);
    console.log(`   - MCP Endpoint: ${config.config.playwright_agent?.api_endpoint}`);
    console.log(`   - Browser: ${config.config.default_browser}`);
    console.log(`   - Max Iterations: ${config.config.max_iterations}\n`);

    // モジュール初期化
    const instructionGenerator = new InstructionGenerator(config);
    const analyzer = new Analyzer(config);
    const resultCollector = new ResultCollector(config);
    const playwrightAgent = new PlaywrightAgent(config, { mockMode: false }); // 実モード

    console.log('✅ 全モジュール初期化完了');
    console.log(`   - Playwright Agent: ${playwrightAgent.mockMode ? 'モックモード' : '実モード'}`);
    console.log(`   - MCP Endpoint: ${playwrightAgent.mcpEndpoint}\n`);

    // Orchestrator初期化
    const orchestrator = new Orchestrator({
      configManager: config,
      instructionGenerator,
      analyzer,
      resultCollector,
      playwrightAgent
    });
    console.log('✅ Orchestrator初期化完了\n');

    // テスト実行
    console.log('🚀 テスト実行開始...\n');
    const targetUrl = 'https://example.com';
    const result = await orchestrator.execute(targetUrl);

    // 結果表示
    console.log('\n📊 実行結果:');
    console.log(JSON.stringify(result, null, 2));

    if (result.status === 'error') {
      console.error('\n❌ 実行エラー:');
      console.error(result.error_details);
    } else {
      console.log(`\n✅ ステータス: ${result.status}`);
      console.log(`   - 総イテレーション: ${result.total_iterations}回`);
      console.log(`   - 終了理由: ${result.exit_reason}`);
      console.log(`   - 最終カバレッジ: ${JSON.stringify(result.final_coverage)}`);
    }

    console.log('\n✅ テスト完了！');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.stack || error);
    process.exit(1);
  }
}

// 実行
runE2ETest().catch(console.error);
