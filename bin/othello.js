#!/usr/bin/env node#!/usr/bin/env node

/**

 * Othello CLI Entry Point (Phase 9)/**

 * コマンドラインからOthelloを直接実行 * Othello - Playwright E2E Test Automation Tool

 *  * メインエントリーポイント

 * 使用例: */

 *   othello --url https://hotel.example.com

 *   othello -u https://hotel.example.com -m 10 -c 80const { program } = require('commander');

 *   othello --url https://example.com --no-auto-healconst path = require('path');

 */const fs = require('fs').promises;

const ConfigManager = require('../src/config');

const Orchestrator = require('../src/orchestrator');const Orchestrator = require('../src/orchestrator');

const OthelloPlanner = require('../src/agents/othello-planner');const InstructionGenerator = require('../src/instruction-generator');

const OthelloGenerator = require('../src/agents/othello-generator');const Analyzer = require('../src/analyzer');

const OthelloExecutor = require('../src/agents/othello-executor');const ResultCollector = require('../src/result-collector');

const OthelloHealer = require('../src/agents/othello-healer');const Reporter = require('../src/reporter');

const OthelloAnalyzer = require('../src/agents/othello-analyzer');

const OthelloReporter = require('../src/agents/othello-reporter');// バージョン情報（package.jsonから取得）

const yargs = require('yargs/yargs');const packageJson = require('../package.json');

const { hideBin } = require('yargs/helpers');

const fs = require('fs');/**

const path = require('path'); * CLIオプションのパース

 */

// コマンドライン引数パースfunction setupCLI() {

const argv = yargs(hideBin(process.argv))  program

  .usage('Usage: $0 --url <URL> [options]')    .name('othello')

  .option('url', {    .description('🎭 Othello - Playwright E2E Test Automation Tool')

    alias: 'u',    .version(packageJson.version)

    description: 'テスト対象URL',    .option('-u, --url <url>', 'テスト対象のURL（必須）')

    type: 'string',    .option('-m, --max-iterations <number>', '最大ループ回数', '10')

    demandOption: true    .option('-b, --browser <browser>', '使用ブラウザ (chromium/firefox/webkit)', 'chromium')

  })    .option('-o, --output <directory>', 'レポート出力先ディレクトリ', './reports')

  .option('max-iterations', {    .option('-c, --config <path>', '設定ファイルのパス', './config/default.json')

    alias: 'm',    .option('-a, --auto-approve', '全テスト自動承認モード', false)

    description: '最大イテレーション数',    .parse(process.argv);

    type: 'number',

    default: 10  return program.opts();

  })}

  .option('coverage-target', {

    alias: 'c',/**

    description: '目標カバレッジ% (0-100)', * 設定の初期化と検証

    type: 'number', */

    default: 80async function initializeConfig(options) {

  })  try {

  .option('no-auto-heal', {    // 設定ファイルの読み込み

    description: '自動修復を無効化',    const configPath = path.resolve(options.config);

    type: 'boolean',    console.log(`📄 設定ファイルを読み込み中: ${configPath}`);

    default: false    

  })    const configManager = await ConfigManager.load(configPath);

  .option('output-dir', {

    alias: 'o',    // CLIオプションで設定を上書き

    description: 'レポート出力ディレクトリ',    if (options.maxIterations) {

    type: 'string',      configManager.config.max_iterations = parseInt(options.maxIterations, 10);

    default: './reports'    }

  })    if (options.browser) {

  .option('test-aspects-csv', {      configManager.config.default_browser = options.browser;

    alias: 't',    }

    description: '23観点定義CSVファイルパス',    if (options.output) {

    type: 'string',      configManager.config.paths.reports = options.output;

    default: './config/test-ViewpointList-simple.csv'    }

  })

  .option('browser', {    return configManager;

    alias: 'b',  } catch (error) {

    description: 'ブラウザ種別 (chromium, firefox, webkit)',    if (error.message.includes('設定ファイルが見つかりません')) {

    type: 'string',      console.error('❌ エラー: 設定ファイルが見つかりません');

    default: 'chromium',      console.log('💡 ヒント: --config オプションで設定ファイルのパスを指定してください');

    choices: ['chromium', 'firefox', 'webkit']      console.log('   例: othello --url https://example.com --config ./config/default.json');

  })    } else {

  .option('headless', {      console.error('❌ 設定の読み込みに失敗しました:', error.message);

    description: 'ヘッドレスモードで実行',    }

    type: 'boolean',    process.exit(1);

    default: true  }

  })}

  .option('verbose', {

    alias: 'v',/**

    description: '詳細ログを表示', * 依存モジュールの初期化

    type: 'boolean', */

    default: falsefunction initializeModules(configManager) {

  })  console.log('🔧 モジュールを初期化中...');

  .option('config', {

    description: '設定ファイルパス (JSON)',  const instructionGenerator = new InstructionGenerator(configManager);

    type: 'string'  const analyzer = new Analyzer(configManager);

  })  const resultCollector = new ResultCollector(configManager);

  .help()  const reporter = new Reporter(configManager);

  .alias('help', 'h')

  .version()  const orchestrator = new Orchestrator({

  .alias('version', 'V')    configManager,

  .example('$0 --url https://example.com', '基本的な使い方')    instructionGenerator,

  .example('$0 -u https://example.com -m 5 -c 90', 'イテレーション5回、目標90%')    analyzer,

  .example('$0 -u https://example.com --no-auto-heal', '自動修復なし')    resultCollector,

  .example('$0 -u https://example.com -o ./my-reports', 'カスタム出力先')    // PlaywrightエージェントとClaude APIは将来の実装

  .epilogue('詳細: https://github.com/k-sakQA/Othello')    playwrightAgent: null,

  .argv;    claudeAPI: null

  });

/**

 * 設定ファイルを読み込む  return { orchestrator, reporter };

 */}

function loadConfigFile(configPath) {

  try {/**

    const fullPath = path.resolve(configPath); * 実行前の確認

    if (!fs.existsSync(fullPath)) { */

      console.error(`❌ Config file not found: ${fullPath}`);async function confirmExecution(options, configManager) {

      process.exit(1);  console.log('\n🎭 Othello - Playwright E2Eテスト自動化ツール');

    }  console.log('━'.repeat(60));

    const content = fs.readFileSync(fullPath, 'utf8');  console.log(`📍 対象URL: ${options.url || '(未指定)'}`);

    return JSON.parse(content);  console.log(`🔄 最大イテレーション: ${configManager.config.max_iterations}回`);

  } catch (error) {  console.log(`🌐 ブラウザ: ${configManager.config.default_browser}`);

    console.error(`❌ Failed to load config file: ${error.message}`);  console.log(`📊 レポート出力先: ${configManager.config.paths.reports}`);

    process.exit(1);  console.log(`🎯 カバレッジ目標: ${configManager.config.coverage_threshold.target_percentage}%`);

  }  console.log('━'.repeat(60));

}

  if (!options.url) {

/**    console.error('\n❌ エラー: --url オプションは必須です');

 * 設定をマージ（設定ファイル < コマンドライン引数）    console.log('💡 使用例: othello --url https://example.com');

 */    process.exit(1);

function mergeConfig(fileConfig, cliArgs) {  }

  return {

    url: cliArgs.url,  if (!options.autoApprove) {

    maxIterations: cliArgs.maxIterations,    console.log('\n⚠️  注意: このツールはテストを自動実行します。');

    coverageTarget: cliArgs.coverageTarget,    console.log('   続行する場合は Ctrl+C で中断してください (5秒待機)...\n');

    autoHeal: !cliArgs.noAutoHeal,    await sleep(5000);

    outputDir: cliArgs.outputDir,  }

    testAspectsCSV: cliArgs.testAspectsCsv,}

    browser: cliArgs.browser,

    headless: cliArgs.headless,/**

    verbose: cliArgs.verbose, * テスト実行のメインフロー

    ...fileConfig */

  };async function executeTests(orchestrator, options) {

}  console.log('🚀 テスト実行を開始します...\n');



/**  const startTime = Date.now();

 * 出力ディレクトリを作成

 */  try {

function ensureOutputDir(outputDir) {    // Orchestratorでテスト実行

  const fullPath = path.resolve(outputDir);    const result = await orchestrator.execute();

  if (!fs.existsSync(fullPath)) {

    fs.mkdirSync(fullPath, { recursive: true });    const endTime = Date.now();

    if (argv.verbose) {    const duration = Math.round((endTime - startTime) / 1000);

      console.log(`📁 Created output directory: ${fullPath}`);

    }    console.log('\n✅ テスト実行が完了しました！');

  }    console.log('━'.repeat(60));

}    console.log(`📊 実行結果:`);

    console.log(`   - 総イテレーション数: ${result.total_iterations}回`);

/**    console.log(`   - 終了理由: ${getExitReasonText(result.exit_reason)}`);

 * 設定を検証    console.log(`   - 最終カバレッジ: ${result.final_coverage.percentage}%`);

 */    console.log(`   - 実行時間: ${duration}秒`);

function validateConfig(config) {    console.log('━'.repeat(60));

  const errors = [];

    return result;

  // URL検証

  try {  } catch (error) {

    new URL(config.url);    console.error('\n❌ テスト実行中にエラーが発生しました:', error.message);

  } catch {    console.error(error.stack);

    errors.push(`Invalid URL: ${config.url}`);    process.exit(1);

  }  }

}

  // イテレーション数検証

  if (config.maxIterations < 1 || config.maxIterations > 100) {/**

    errors.push(`Max iterations must be between 1-100: ${config.maxIterations}`); * レポート生成

  } */

async function generateReport(reporter, testResult, configManager) {

  // カバレッジ目標検証  console.log('\n📝 レポートを生成中...');

  if (config.coverageTarget < 0 || config.coverageTarget > 100) {

    errors.push(`Coverage target must be between 0-100: ${config.coverageTarget}`);  try {

  }    // レポートデータの準備

    const reportData = {

  // CSVファイル存在確認      summary: {

  if (!fs.existsSync(config.testAspectsCSV)) {        total_iterations: testResult.total_iterations,

    errors.push(`Test aspects CSV not found: ${config.testAspectsCSV}`);        total_tests: testResult.coverage_reports.reduce((sum, report) => 

  }          sum + (report.total_scenarios_executed || 0), 0),

        passed: testResult.coverage_reports.reduce((sum, report) => 

  if (errors.length > 0) {          sum + (report.total_scenarios_executed || 0), 0),

    console.error('❌ Configuration errors:');        failed: 0,

    errors.forEach(err => console.error(`   - ${err}`));        final_coverage: testResult.final_coverage.percentage

    process.exit(1);      },

  }      iterations: testResult.coverage_reports.map((report, index) => ({

}        iteration: index + 1,

        tests_executed: report.total_scenarios_executed || 0,

/**        tests_passed: report.total_scenarios_executed || 0,

 * メイン処理        tests_failed: 0,

 */        coverage: report.coverage_summary.percentage,

async function main() {        duration_seconds: 0

  console.log('');      })),

  console.log('═'.repeat(70));      timestamp: new Date().toISOString()

  console.log('🎭 Othello - Automated Web UI Testing Framework');    };

  console.log('═'.repeat(70));

  console.log('');    // レポート生成

    const report = await reporter.generateReport(reportData);

  // 設定読み込み・マージ

  let config = { ...argv };    // レポート保存

  if (argv.config) {    const reportsDir = configManager.getPath('reports');

    const fileConfig = loadConfigFile(argv.config);    await fs.mkdir(reportsDir, { recursive: true });

    config = mergeConfig(fileConfig, argv);

  }    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

    const reportPath = path.join(reportsDir, `othello-report-${timestamp}.html`);

  // 設定検証

  validateConfig(config);    await reporter.saveReport(report, reportPath);



  // 出力ディレクトリ作成    console.log(`✅ レポートを保存しました: ${reportPath}`);

  ensureOutputDir(config.outputDir);    console.log(`🌐 ブラウザで開く: file://${path.resolve(reportPath)}`);



  // 設定表示    return reportPath;

  console.log('⚙️  Configuration:');

  console.log(`   URL:              ${config.url}`);  } catch (error) {

  console.log(`   Max Iterations:   ${config.maxIterations}`);    console.error('❌ レポート生成に失敗しました:', error.message);

  console.log(`   Coverage Target:  ${config.coverageTarget}%`);    // レポート生成の失敗は致命的ではないので続行

  console.log(`   Auto Heal:        ${config.autoHeal ? 'ON' : 'OFF'}`);  }

  console.log(`   Output Dir:       ${config.outputDir}`);}

  console.log(`   Browser:          ${config.browser}`);

  console.log(`   Headless:         ${config.headless ? 'ON' : 'OFF'}`);/**

  console.log(`   Test Aspects:     ${config.testAspectsCSV}`); * 終了理由のテキスト化

  console.log(''); */

function getExitReasonText(reason) {

  // Orchestrator初期化  const reasons = {

  const orchestrator = new Orchestrator({    'max_iterations': '最大イテレーション数に到達',

    url: config.url,    'coverage_threshold_reached': 'カバレッジ目標を達成',

    maxIterations: config.maxIterations,    'full_coverage': '100%カバレッジ達成',

    coverageTarget: config.coverageTarget,    'no_coverage_improvement': 'カバレッジの向上なし'

    autoHeal: config.autoHeal,  };

    outputDir: config.outputDir,  return reasons[reason] || reason;

    testAspectsCSV: config.testAspectsCSV,}

    browser: config.browser,

    headless: config.headless/**

  }); * スリープ関数

 */

  // エージェント初期化function sleep(ms) {

  orchestrator.planner = new OthelloPlanner({  return new Promise(resolve => setTimeout(resolve, ms));

    testAspectsCSV: config.testAspectsCSV}

  });

/**

  orchestrator.generator = new OthelloGenerator(); * メイン関数

  orchestrator.executor = new OthelloExecutor(); */

  orchestrator.healer = new OthelloHealer();async function main() {

  orchestrator.analyzer = new OthelloAnalyzer();  try {

  orchestrator.reporter = new OthelloReporter({    // CLIオプションのパース

    outputDir: config.outputDir    const options = setupCLI();

  });

    // 設定の初期化

  // Note: Playwright MCPは将来実装    const config = await initializeConfig(options);

  // orchestrator.playwrightMCP = new PlaywrightMCPClient({

  //   browser: config.browser,    // 実行前の確認

  //   headless: config.headless    await confirmExecution(options, config);

  // });

    // モジュールの初期化

  // 実行時間計測開始    const { orchestrator, reporter } = initializeModules(config);

  const startTime = Date.now();

    // テスト実行

  try {    const result = await executeTests(orchestrator, options);

    // Orchestrator実行

    await orchestrator.run();    // レポート生成

    await generateReport(reporter, result, config);

    const duration = Date.now() - startTime;

    console.log('\n🎉 すべての処理が完了しました！\n');

    console.log('');    process.exit(0);

    console.log('═'.repeat(70));

    console.log('✅ Othello completed successfully!');  } catch (error) {

    console.log('═'.repeat(70));    console.error('\n❌ 予期しないエラーが発生しました:', error.message);

    console.log('');    console.error(error.stack);

    console.log('📊 Summary:');    process.exit(1);

    console.log(`   Total Time:       ${formatDuration(duration)}`);  }

    console.log(`   Iterations:       ${orchestrator.iteration}`);}

    console.log(`   Final Coverage:   ${orchestrator.getCurrentCoverage().aspectCoverage.percentage}%`);

    console.log(`   Tests Passed:     ${orchestrator.getCurrentCoverage().testCaseCoverage.passed}`);// プログラム実行

    console.log(`   Tests Failed:     ${orchestrator.getCurrentCoverage().testCaseCoverage.failed}`);if (require.main === module) {

    console.log(`   Reports:          ${config.outputDir}/session-${orchestrator.sessionId}.*`);  main();

    console.log('');}



    process.exit(0);module.exports = { main, setupCLI, initializeConfig, initializeModules };


  } catch (error) {
    const duration = Date.now() - startTime;

    console.error('');
    console.error('═'.repeat(70));
    console.error('❌ Othello failed!');
    console.error('═'.repeat(70));
    console.error('');
    console.error('Error:', error.message);
    if (argv.verbose && error.stack) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    console.error(`Ran for ${formatDuration(duration)} before failure.`);
    console.error('');

    process.exit(1);
  }
}

/**
 * 期間フォーマット
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('');
  console.error('❌ Unhandled error:', error.message);
  if (argv.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  Interrupted by user (Ctrl+C)');
  console.log('');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('');
  console.log('⚠️  Terminated');
  console.log('');
  process.exit(143);
});

// 実行
if (require.main === module) {
  main();
}

module.exports = { main };
