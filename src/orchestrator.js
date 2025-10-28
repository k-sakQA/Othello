/**const fs = require('fs').promises;

 * Orchestrator (Phase 9)const path = require('path');

 * 全エージェントを統合する8ステップイテレーションループ

 * /**

 * 主な機能: * Orchestrator

 * 1. Planner → Generator → Executor → Healer → Analyzer → Reporter の統合 * テスト実行の全体的な制御と管理を担当するクラス

 * 2. カバレッジ目標達成までイテレーションループ */

 * 3. 停滞判定による早期終了class Orchestrator {

 * 4. 最終レポート生成  /**

 */   * @param {Object} dependencies - 依存モジュール

   * @param {ConfigManager} dependencies.configManager - 設定マネージャー

const OthelloPlanner = require('./agents/othello-planner');   * @param {InstructionGenerator} dependencies.instructionGenerator - 指示生成モジュール

const OthelloGenerator = require('./agents/othello-generator');   * @param {Analyzer} dependencies.analyzer - カバレッジ分析モジュール

const OthelloExecutor = require('./agents/othello-executor');   * @param {ResultCollector} dependencies.resultCollector - 結果収集モジュール

const OthelloHealer = require('./agents/othello-healer');   * @param {Object} [dependencies.playwrightAgent] - Playwrightエージェント (オプション)

const OthelloAnalyzer = require('./agents/othello-analyzer');   * @param {Object} [dependencies.claudeAPI] - Claude APIモジュール (オプション)

const OthelloReporter = require('./agents/othello-reporter');   */

  constructor(dependencies) {

class Orchestrator {    this.config = dependencies.configManager;

  /**    this.instructionGenerator = dependencies.instructionGenerator;

   * コンストラクタ    this.analyzer = dependencies.analyzer;

   * @param {Object} config - 設定オブジェクト    this.resultCollector = dependencies.resultCollector;

   */    this.playwrightAgent = dependencies.playwrightAgent;

  constructor(config = {}) {    this.claudeAPI = dependencies.claudeAPI;

    this.config = {    

      url: config.url || 'https://example.com',    this.maxIterations = this.config.max_iterations || 10;

      maxIterations: config.maxIterations || 10,    this.coverageThreshold = this.config.coverage_threshold || {

      coverageTarget: config.coverageTarget || 80,      target_percentage: 80,

      autoHeal: config.autoHeal !== false,      stop_if_no_improvement: true

      outputDir: config.outputDir || './reports',    };

      testAspectsCSV: config.testAspectsCSV || './config/test-ViewpointList-simple.csv',  }

      ...config

    };  /**

   * テストの全体的な実行サイクルを管理

    this.iteration = 0;   * @param {string} targetUrl - テスト対象URL（オプション）

    this.history = [];   * @returns {Promise<Object>} テスト実行の総合結果

    this.startTime = null;   */

    this.endTime = null;  async execute(targetUrl = null) {

    this.sessionId = this.generateSessionId();    const coverageHistory = [];

    const coverageReports = [];

    // エージェント初期化（テストで注入可能）    let totalIterations = 0;

    this.planner = null;    let exitReason = 'max_iterations';

    this.generator = null;

    this.executor = null;    try {

    this.healer = null;      while (totalIterations < this.maxIterations) {

    this.analyzer = null;        // カバレッジデータを取得

    this.reporter = null;        const coverageData = await this.analyzer.analyze();

    this.playwrightMCP = null;        coverageReports.push(coverageData);

  }        coverageHistory.push(coverageData.coverage_summary);



  /**        // 続行判定（2回目以降の反復で判定）

   * メイン実行ループ        if (totalIterations > 0 && !this.shouldContinue(coverageHistory)) {

   */          exitReason = 'coverage_threshold_reached';

  async run() {          break;

    this.startTime = new Date();        }



    console.log('🎭 Othello (Phase 9) starting...');        // テスト指示の生成

    console.log(`📍 Target URL: ${this.config.url}`);        const instructionsResult = await this.generateInstructions(coverageData);

    console.log(`🎯 Coverage target: ${this.config.coverageTarget}%`);        const instructions = instructionsResult.test_instructions || [];

    console.log(`🔄 Max iterations: ${this.config.maxIterations}`);

    console.log(`🔧 Auto-heal: ${this.config.autoHeal ? 'ON' : 'OFF'}`);        if (instructions.length === 0) {

    console.log(`📊 Session ID: ${this.sessionId}`);          exitReason = 'full_coverage';

    console.log('');          break;

        }

    try {

      // Playwright MCPセットアップ        // Playwrightエージェントでテストを実行

      if (this.playwrightMCP) {        let testResults = [];

        console.log('🌐 Setting up Playwright MCP...');        if (this.playwrightAgent) {

        await this.playwrightMCP.setupPage(this.config.url);          // 指示を実行可能なテストに変換

      }          for (const instruction of instructions) {

            const testInstruction = this.convertInstructionToTest(instruction, targetUrl, totalIterations + 1);

      // イテレーションループ            const result = await this.playwrightAgent.executeTest(testInstruction);

      while (this.shouldContinue()) {            testResults.push(result);

        this.iteration++;            

        console.log('');            // ログを保存

        console.log('='.repeat(60));            const logsDir = this.config.getPath('logs');

        console.log(`📊 Iteration ${this.iteration}/${this.config.maxIterations}`);            const logPath = path.join(logsDir, `iteration-${totalIterations + 1}-${result.test_id}.json`);

        console.log('='.repeat(60));            await this.playwrightAgent.saveLog(result, logPath);

          }

        await this.runIteration();        }



        // カバレッジ確認        // 各反復の結果を記録

        const currentCoverage = this.getCurrentCoverage();        const iterationResult = {

        console.log('');          iteration: totalIterations + 1,

        console.log(`📈 Current coverage: ${currentCoverage.aspectCoverage.percentage}%`);          instructions: instructions.length,

        console.log(`   Tested: ${currentCoverage.aspectCoverage.tested}/23 aspects`);          tests_executed: testResults.length,

          tests_passed: testResults.filter(r => r.success).length,

        // 目標達成判定          tests_failed: testResults.filter(r => !r.success).length,

        if (this.analyzer && !this.analyzer.shouldContinueTesting(currentCoverage, this.config.coverageTarget)) {          status: testResults.every(r => r.success) ? 'success' : 'partial_success'

          console.log('');        };

          console.log('✅ Coverage target reached!');

          break;        await this.recordIteration(iterationResult);

        }

        totalIterations++;

        // 停滞判定      }

        if (this.isStagnant()) {

          console.log('');      // 最終カバレッジ

          console.log('⚠️  Coverage stagnant, stopping...');      const finalCoverage = coverageHistory[coverageHistory.length - 1] || { percentage: 0 };

          break;

        }      return {

      }        status: 'success',

        total_iterations: totalIterations,

      console.log('');        exit_reason: exitReason,

      console.log('='.repeat(60));        coverage_reports: coverageReports,

      console.log('📝 Generating final report...');        final_coverage: finalCoverage

      console.log('='.repeat(60));      };



      // 最終レポート生成    } catch (error) {

      await this.generateFinalReport();      return {

        status: 'error',

      this.endTime = new Date();        total_iterations: totalIterations,

      const duration = this.endTime - this.startTime;        error_details: error.message,

        coverage_reports: coverageReports

      console.log('');      };

      console.log('🎉 Othello completed successfully!');    }

      console.log(`⏱️  Total duration: ${this.formatDuration(duration)}`);  }

      console.log(`🔄 Total iterations: ${this.iteration}`);

      console.log(`📊 Final coverage: ${this.getCurrentCoverage().aspectCoverage.percentage}%`);  /**

      console.log('');   * カバレッジ向上のための指示を生成

   * @param {Object} coverageData - カバレッジ分析結果

    } catch (error) {   * @returns {Promise<Array>} テスト指示の配列

      console.error('');   */

      console.error('❌ Othello failed:', error.message);  async generateInstructions(coverageData) {

      throw error;    // InstructionGeneratorを使用して指示を生成

    } finally {    // generateメソッドは内部で未カバー領域をチェックし、必要に応じて指示を生成する

      // クリーンアップ    const instructions = await this.instructionGenerator.generate(coverageData);

      if (this.playwrightMCP) {

        await this.playwrightMCP.closePage();    // Claude APIで最適化（オプション）

      }    if (this.claudeAPI && this.claudeAPI.optimize) {

    }      const optimizedResult = await this.claudeAPI.optimize(instructions);

  }      return optimizedResult.optimized_instructions || instructions;

    }

  /**

   * 1イテレーションを実行    return instructions;

   */  }

  async runIteration() {

    const iterationResults = {  /**

      iteration: this.iteration,   * テスト指示を実行可能なテストに変換

      testCases: [],   * @param {Object} instruction - InstructionGeneratorからの指示

      executionResults: [],   * @param {string} targetUrl - テスト対象URL

      coverage: null   * @param {number} iteration - イテレーション番号

    };   * @returns {Object} Playwright Agentが実行できるテスト指示

   */

    try {  convertInstructionToTest(instruction, targetUrl, iteration) {

      // Step 1: Planner - テスト計画生成    const testId = `test-iter${iteration}-${Date.now()}`;

      console.log('  1️⃣  Planner: Generating test plan...');    

      const testPlan = await this.planner.generateTestPlan({    // 指示テキストから基本的なアクションを生成

        url: this.config.url,    const actions = [];

        testAspectsCSV: this.config.testAspectsCSV,    

        existingCoverage: this.getCurrentCoverage()    // ナビゲーション

      });    if (targetUrl || instruction.target_url) {

      console.log(`     ✅ Generated ${testPlan.testCases.length} test cases`);      actions.push({

        type: 'navigate',

      iterationResults.testCases = testPlan.testCases;        url: targetUrl || instruction.target_url,

        description: `${instruction.target_url || targetUrl}に移動`

      // Step 2: Generator - テストスクリプト生成      });

      console.log('  2️⃣  Generator: Generating test scripts...');    }

      const snapshot = this.playwrightMCP     

        ? await this.playwrightMCP.snapshot()     // 指示内容からアクションを推測

        : null;    if (instruction.priority === 'high' && instruction.target_page) {

            actions.push({

      const generatedTests = await this.generator.generate({        type: 'screenshot',

        testCases: testPlan.testCases,        path: `./screenshots/iter${iteration}-${instruction.target_page.replace(/\//g, '-')}.png`,

        snapshot        description: `${instruction.target_page}のスクリーンショット`

      });      });

      console.log(`     ✅ Generated ${generatedTests.testCases.length} test scripts`);    }

    

      // Step 3: Executor - テスト実行    return {

      console.log('  3️⃣  Executor: Executing tests...');      test_id: testId,

      for (const testCase of generatedTests.testCases) {      target_url: targetUrl || instruction.target_url || '',

        const result = await this.executor.execute(testCase);      scenario: instruction.instruction,

              priority: instruction.priority,

        iterationResults.executionResults.push({      actions

          test_case_id: testCase.test_case_id,    };

          aspect_no: testCase.aspect_no,  }

          success: result.success,

          duration_ms: result.duration_ms,  /**

          error: result.error   * 反復結果を記録

        });   * @param {Object} iterationResult - 反復の結果データ

   */

        if (result.success) {  async recordIteration(iterationResult) {

          console.log(`     ✅ ${testCase.test_case_id}: Success`);    const logsPath = this.config.getPath('logs');

        } else {    const logFilePath = path.join(logsPath, `iteration_${iterationResult.iteration}.json`);

          console.log(`     ❌ ${testCase.test_case_id}: Failed - ${result.error}`);

    // ログディレクトリが存在しない場合は作成

          // Step 4: Healer - 失敗テスト修復    await fs.mkdir(logsPath, { recursive: true });

          if (this.config.autoHeal) {

            console.log(`     🔧 Healer: Attempting to heal ${testCase.test_case_id}...`);    // ログファイルに書き出し

                await fs.writeFile(logFilePath, JSON.stringify(iterationResult, null, 2), 'utf8');

            const healResult = await this.healer.heal({

              test_case_id: testCase.test_case_id,    // 結果収集モジュールを呼び出し

              instructions: testCase.instructions,    const collectedData = await this.resultCollector.collect(iterationResult);

              error: result.error,    const resultsPath = this.config.getPath('results');

              snapshot: result.snapshot    const resultsJsonPath = path.join(resultsPath, `iteration_${iterationResult.iteration}.json`);

            });    const resultsCsvPath = path.join(resultsPath, 'results.csv');

    

            if (healResult.healed) {    await this.resultCollector.saveJSON(resultsJsonPath, collectedData);

              console.log(`     ✅ Healed successfully with fix type: ${healResult.fix_type}`);    await this.resultCollector.saveCSV(resultsCsvPath, collectedData, { append: true });

                }

              // 修復後に再実行

              testCase.instructions = healResult.fixed_instructions;  /**

              const retryResult = await this.executor.execute(testCase);   * 反復を続けるかどうかを判定

                 * @param {Array} coverageHistory - カバレッジ履歴

              if (retryResult.success) {   * @returns {boolean} 続行するかどうか

                console.log(`     ✅ ${testCase.test_case_id}: Retry success`);   */

                // 結果を更新  shouldContinue(coverageHistory) {

                const lastResult = iterationResults.executionResults[iterationResults.executionResults.length - 1];    if (coverageHistory.length < 2) {

                lastResult.success = true;      return true;

                lastResult.healed = true;    }

              }

            } else {    const latestCoverage = coverageHistory[coverageHistory.length - 1];

              console.log(`     ⚠️  Could not heal: ${healResult.reason}`);    const previousCoverage = coverageHistory[coverageHistory.length - 2];

            }

          }    // 閾値に達している場合は停止

        }    if (latestCoverage.percentage >= this.coverageThreshold.target_percentage) {

      }      return false;

    }

      // Step 5: Analyzer - カバレッジ分析

      console.log('  4️⃣  Analyzer: Analyzing coverage...');    // カバレッジが向上していない場合

      const coverage = this.analyzer.analyze(iterationResults.executionResults);    const hasImprovement = latestCoverage.percentage > previousCoverage.percentage;

      iterationResults.coverage = coverage;

    // 設定に応じて判定

      console.log(`     ✅ Coverage: ${coverage.aspectCoverage.percentage}%`);    if (this.coverageThreshold.stop_if_no_improvement && !hasImprovement) {

      console.log(`     ✅ Pass rate: ${coverage.testCaseCoverage.pass_rate}%`);      return false;

    }

      // 履歴に追加

      this.history.push(iterationResults);    return true;

  }

    } catch (error) {}

      console.error(`  ❌ Iteration ${this.iteration} failed:`, error.message);

      throw error;module.exports = Orchestrator;
    }
  }

  /**
   * ループ継続判定
   */
  shouldContinue() {
    return this.iteration < this.config.maxIterations;
  }

  /**
   * 現在のカバレッジを取得
   */
  getCurrentCoverage() {
    if (this.history.length === 0) {
      return {
        aspectCoverage: {
          total: 23,
          tested: 0,
          percentage: 0,
          tested_aspects: [],
          untested_aspects: Array.from({ length: 23 }, (_, i) => i + 1)
        },
        testCaseCoverage: {
          total: 0,
          passed: 0,
          failed: 0,
          pass_rate: 0
        }
      };
    }

    // 累積カバレッジを計算
    const allResults = this.history.flatMap(h => h.executionResults);
    return this.analyzer.analyze(allResults);
  }

  /**
   * 停滞判定
   */
  isStagnant() {
    if (this.history.length < 3) {
      return false;
    }

    const recent = this.history.slice(-3);
    const coverages = recent.map(h => h.coverage.aspectCoverage.percentage);

    // 3回連続でカバレッジが1%未満の変化
    const maxDiff = Math.max(...coverages) - Math.min(...coverages);
    return maxDiff < 1.0;
  }

  /**
   * 最終レポート生成
   */
  async generateFinalReport() {
    this.endTime = new Date();

    // 累積分析
    const analysis = this.analyzer.analyzeWithHistory(this.history.map(h => ({
      iteration: h.iteration,
      results: h.executionResults
    })));

    // レポートデータ作成
    const reportData = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime,
      totalDuration: this.endTime - this.startTime,
      iterations: this.iteration,
      coverage: analysis.cumulativeCoverage,
      executionResults: this.history.flatMap(h => h.executionResults)
    };

    // レポート保存
    const reports = await this.reporter.saveAllReports(
      reportData,
      `session-${this.sessionId}`
    );

    console.log('');
    console.log('📄 Reports generated:');
    console.log(`   - JSON:     ${reports.json}`);
    console.log(`   - Markdown: ${reports.markdown}`);
    console.log(`   - HTML:     ${reports.html}`);

    return reports;
  }

  /**
   * セッションID生成
   */
  generateSessionId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${dateStr}-${timeStr}`;
  }

  /**
   * 期間フォーマット
   */
  formatDuration(ms) {
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
}

module.exports = Orchestrator;
