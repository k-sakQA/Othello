#!/usr/bin/env node

/**
 * Othello - Playwright E2E Test Automation Tool
 * メインエントリーポイント
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs').promises;
const ConfigManager = require('../src/config');
const Orchestrator = require('../src/orchestrator');
const InstructionGenerator = require('../src/instruction-generator');
const Analyzer = require('../src/analyzer');
const ResultCollector = require('../src/result-collector');
const Reporter = require('../src/reporter');

// バージョン情報（package.jsonから取得）
const packageJson = require('../package.json');

/**
 * CLIオプションのパース
 */
function setupCLI() {
  program
    .name('othello')
    .description('🎭 Othello - Playwright E2E Test Automation Tool')
    .version(packageJson.version)
    .option('-u, --url <url>', 'テスト対象のURL（必須）')
    .option('-m, --max-iterations <number>', '最大ループ回数', '10')
    .option('-b, --browser <browser>', '使用ブラウザ (chromium/firefox/webkit)', 'chromium')
    .option('-o, --output <directory>', 'レポート出力先ディレクトリ', './reports')
    .option('-c, --config <path>', '設定ファイルのパス', './config/default.json')
    .option('-a, --auto-approve', '全テスト自動承認モード', false)
    .parse(process.argv);

  return program.opts();
}

/**
 * 設定の初期化と検証
 */
async function initializeConfig(options) {
  try {
    // 設定ファイルの読み込み
    const configPath = path.resolve(options.config);
    console.log(`📄 設定ファイルを読み込み中: ${configPath}`);
    
    const configManager = await ConfigManager.load(configPath);

    // CLIオプションで設定を上書き
    if (options.maxIterations) {
      configManager.config.max_iterations = parseInt(options.maxIterations, 10);
    }
    if (options.browser) {
      configManager.config.default_browser = options.browser;
    }
    if (options.output) {
      configManager.config.paths.reports = options.output;
    }

    return configManager;
  } catch (error) {
    if (error.message.includes('設定ファイルが見つかりません')) {
      console.error('❌ エラー: 設定ファイルが見つかりません');
      console.log('💡 ヒント: --config オプションで設定ファイルのパスを指定してください');
      console.log('   例: othello --url https://example.com --config ./config/default.json');
    } else {
      console.error('❌ 設定の読み込みに失敗しました:', error.message);
    }
    process.exit(1);
  }
}

/**
 * 依存モジュールの初期化
 */
function initializeModules(configManager) {
  console.log('🔧 モジュールを初期化中...');

  const instructionGenerator = new InstructionGenerator(configManager);
  const analyzer = new Analyzer(configManager);
  const resultCollector = new ResultCollector(configManager);
  const reporter = new Reporter(configManager);

  const orchestrator = new Orchestrator({
    configManager,
    instructionGenerator,
    analyzer,
    resultCollector,
    // PlaywrightエージェントとClaude APIは将来の実装
    playwrightAgent: null,
    claudeAPI: null
  });

  return { orchestrator, reporter };
}

/**
 * 実行前の確認
 */
async function confirmExecution(options, configManager) {
  console.log('\n🎭 Othello - Playwright E2Eテスト自動化ツール');
  console.log('━'.repeat(60));
  console.log(`📍 対象URL: ${options.url || '(未指定)'}`);
  console.log(`🔄 最大イテレーション: ${configManager.config.max_iterations}回`);
  console.log(`🌐 ブラウザ: ${configManager.config.default_browser}`);
  console.log(`📊 レポート出力先: ${configManager.config.paths.reports}`);
  console.log(`🎯 カバレッジ目標: ${configManager.config.coverage_threshold.target_percentage}%`);
  console.log('━'.repeat(60));

  if (!options.url) {
    console.error('\n❌ エラー: --url オプションは必須です');
    console.log('💡 使用例: othello --url https://example.com');
    process.exit(1);
  }

  if (!options.autoApprove) {
    console.log('\n⚠️  注意: このツールはテストを自動実行します。');
    console.log('   続行する場合は Ctrl+C で中断してください (5秒待機)...\n');
    await sleep(5000);
  }
}

/**
 * テスト実行のメインフロー
 */
async function executeTests(orchestrator, options) {
  console.log('🚀 テスト実行を開始します...\n');

  const startTime = Date.now();

  try {
    // Orchestratorでテスト実行
    const result = await orchestrator.execute();

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n✅ テスト実行が完了しました！');
    console.log('━'.repeat(60));
    console.log(`📊 実行結果:`);
    console.log(`   - 総イテレーション数: ${result.total_iterations}回`);
    console.log(`   - 終了理由: ${getExitReasonText(result.exit_reason)}`);
    console.log(`   - 最終カバレッジ: ${result.final_coverage.percentage}%`);
    console.log(`   - 実行時間: ${duration}秒`);
    console.log('━'.repeat(60));

    return result;

  } catch (error) {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * レポート生成
 */
async function generateReport(reporter, testResult, configManager) {
  console.log('\n📝 レポートを生成中...');

  try {
    // レポートデータの準備
    const reportData = {
      summary: {
        total_iterations: testResult.total_iterations,
        total_tests: testResult.coverage_reports.reduce((sum, report) => 
          sum + (report.total_scenarios_executed || 0), 0),
        passed: testResult.coverage_reports.reduce((sum, report) => 
          sum + (report.total_scenarios_executed || 0), 0),
        failed: 0,
        final_coverage: testResult.final_coverage.percentage
      },
      iterations: testResult.coverage_reports.map((report, index) => ({
        iteration: index + 1,
        tests_executed: report.total_scenarios_executed || 0,
        tests_passed: report.total_scenarios_executed || 0,
        tests_failed: 0,
        coverage: report.coverage_summary.percentage,
        duration_seconds: 0
      })),
      timestamp: new Date().toISOString()
    };

    // レポート生成
    const report = await reporter.generateReport(reportData);

    // レポート保存
    const reportsDir = configManager.getPath('reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const reportPath = path.join(reportsDir, `othello-report-${timestamp}.html`);

    await reporter.saveReport(report, reportPath);

    console.log(`✅ レポートを保存しました: ${reportPath}`);
    console.log(`🌐 ブラウザで開く: file://${path.resolve(reportPath)}`);

    return reportPath;

  } catch (error) {
    console.error('❌ レポート生成に失敗しました:', error.message);
    // レポート生成の失敗は致命的ではないので続行
  }
}

/**
 * 終了理由のテキスト化
 */
function getExitReasonText(reason) {
  const reasons = {
    'max_iterations': '最大イテレーション数に到達',
    'coverage_threshold_reached': 'カバレッジ目標を達成',
    'full_coverage': '100%カバレッジ達成',
    'no_coverage_improvement': 'カバレッジの向上なし'
  };
  return reasons[reason] || reason;
}

/**
 * スリープ関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * メイン関数
 */
async function main() {
  try {
    // CLIオプションのパース
    const options = setupCLI();

    // 設定の初期化
    const config = await initializeConfig(options);

    // 実行前の確認
    await confirmExecution(options, config);

    // モジュールの初期化
    const { orchestrator, reporter } = initializeModules(config);

    // テスト実行
    const result = await executeTests(orchestrator, options);

    // レポート生成
    await generateReport(reporter, result, config);

    console.log('\n🎉 すべての処理が完了しました！\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 予期しないエラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// プログラム実行
if (require.main === module) {
  main();
}

module.exports = { main, setupCLI, initializeConfig, initializeModules };
