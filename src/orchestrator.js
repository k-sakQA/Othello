/**
 * Orchestrator (Phase 9)
 * Phase 9 integration component
 */

const OthelloPlanner = require('./agents/othello-planner');
const OthelloGenerator = require('./agents/othello-generator');
const OthelloExecutor = require('./agents/othello-executor');
const OthelloHealer = require('./agents/othello-healer');
const OthelloAnalyzer = require('./agents/othello-analyzer');
const OthelloReporter = require('./agents/othello-reporter');

class Orchestrator {
  constructor(config = {}) {
    this.config = {
      url: config.url || 'https://example.com',
      maxIterations: config.maxIterations || 10,
      coverageTarget: config.coverageTarget || 80,
      autoHeal: config.autoHeal !== false,
      outputDir: config.outputDir || './reports',
      testAspectsCSV: config.testAspectsCSV || './config/test-ViewpointList-simple.csv',
      ...config
    };
    this.iteration = 0;
    this.history = [];
    this.startTime = null;
    this.endTime = null;
    this.sessionId = this.generateSessionId();
    this.planner = null;
    this.generator = null;
    this.executor = null;
    this.healer = null;
    this.analyzer = null;
    this.reporter = null;
    this.playwrightMCP = null;
  }

  async run() {
    this.startTime = new Date();
    console.log('Phase 9 Orchestrator starting...');
    try {
      if (this.playwrightMCP) {
        await this.playwrightMCP.setupPage(this.config.url);
      }
      
      let continueLoop = true;
      while (continueLoop) {
        // 通常イテレーションの実行チェック
        if (this.shouldContinue()) {
          this.iteration++;
          const iterationResult = await this.runIteration();
          
          // 早期終了チェック
          if (iterationResult && iterationResult.earlyExit) {
            break;
          }
        }
        
        // 対話モードが有効な場合、推奨テストを表示
        if (this.config.interactive && this.analyzer) {
          const currentCoverage = await this.getCurrentCoverage();
          const allResults = this.history.flatMap(h => h.executionResults);
          const recommendations = await this.analyzer.generateRecommendations(
            allResults,
            currentCoverage
          );
          
          if (recommendations && recommendations.length > 0) {
            const userAction = await this.waitForUserAction(recommendations);
            
            if (userAction.type === 'exit') {
              console.log('\n👋 ユーザーによる終了');
              continueLoop = false; // ループを終了してレポート生成へ
              break;
            } else if (userAction.type === 'specific') {
              // 選択されたテストを実行（イテレーションカウントは増やさない）
              await this.executeSpecificTest(userAction.recommendation);
              // 対話モードでは、maxIterationsを超えても継続可能
              continue;
            } else if (userAction.type === 'deeper') {
              // より深いテストを生成・実行（イテレーションカウントは増やさない）
              await this.executeDeeperTests(userAction.recommendation);
              // 対話モードでは、maxIterationsを超えても継続可能
              continue;
            } else if (userAction.type === 'complete') {
              // 完了オプション選択
              const completeResult = await this.handleCompleteOption(userAction.recommendation);
              if (completeResult.shouldExit) {
                break;
              }
              continue;
            }
            // type === 'continue' の場合は、通常のループ継続
          } else {
            // 推奨テストがない場合は終了
            console.log('\n✅ 全ての観点がカバー済みです。');
            break;
          }
        }
        
        // 対話モードでない場合、通常のイテレーション制限で終了
        if (!this.config.interactive && !this.shouldContinue()) {
          break;
        }
        
        if (this.isStagnant()) {
          console.log('\n⚠️  Coverage stagnant, stopping iterations...');
          break;
        }
      }
      await this.generateFinalReport();
      this.endTime = new Date();
      
      // 実行結果を返す
      const currentCoverage = await this.getCurrentCoverage();
      // 新旧フォーマット両対応
      const coveragePercentage = currentCoverage?.percentage 
        || currentCoverage?.aspectCoverage?.percentage 
        || 0;
      const passedTests = this.history.flatMap(h => h.executionResults).filter(r => r.success).length;
      const failedTests = this.history.flatMap(h => h.executionResults).filter(r => !r.success).length;
      const healedTests = this.history.flatMap(h => h.executionResults).filter(r => r.healed).length;
      
      return {
        iterations: this.iteration,
        coverage: coveragePercentage,
        passed: passedTests,
        failed: failedTests,
        healed: healedTests,
        duration: this.endTime - this.startTime,
        history: this.history
      };
    } catch (error) {
      console.error('Orchestrator failed:', error.message);
      throw error;
    } finally {
      if (this.playwrightMCP) {
        await this.playwrightMCP.closePage();
      }
    }
  }

  async runIteration() {
    const iterationResults = {
      iteration: this.iteration,
      testCases: [],
      executionResults: [],
      coverage: null
    };
    try {
      const currentCoverage = await this.getCurrentCoverage();
      const testPlan = await this.planner.generateTestPlan({
        url: this.config.url,
        testAspectsCSV: this.config.testAspectsCSV,
        existingCoverage: currentCoverage,
        uncoveredAspects: currentCoverage.uncovered_aspects || []
      });
      iterationResults.testCases = testPlan.testCases;
      const snapshot = this.playwrightMCP ? await this.playwrightMCP.snapshot() : null;
      const generatedTests = await this.generator.generate({ 
        testCases: testPlan.testCases, 
        snapshot,
        url: this.config.url 
      });
      // generatedTestsは配列で直接返される
      for (const testCase of generatedTests) {
        const result = await this.executor.execute(testCase);
        
        // 元のtest_case情報を取得（Plannerから返されたもの）
        const originalTestCase = testPlan.testCases.find(tc => tc.test_case_id === testCase.test_case_id);
        
        iterationResults.executionResults.push({
          test_case_id: testCase.test_case_id,
          aspect_no: testCase.aspect_no,
          success: result.success,
          duration_ms: result.duration_ms,
          error: result.error,
          test_case: originalTestCase // 元のテスト内容を保存
        });
        if (!result.success && this.config.autoHeal) {
          console.log(`\n🔧 Auto-healing test case: ${testCase.test_case_id}`);
          
          // Stage 1: Quick retry with wait (高速・低コスト - UI干渉の80%を解決)
          const failedIndex = result.error?.instruction_index || 0;
          const quickFixed = JSON.parse(JSON.stringify(testCase.instructions));
          quickFixed.splice(failedIndex, 0, {
            type: 'wait',
            duration: 500,
            description: 'Auto-inserted wait for UI stability'
          });
          
          const quickResult = await this.executor.execute({
            ...testCase,
            instructions: quickFixed
          });
          
          if (quickResult.success) {
            console.log(`   ✅ Quick fix succeeded (500ms wait)`);
            testCase.instructions = quickFixed;
            const lastResult = iterationResults.executionResults[iterationResults.executionResults.length - 1];
            lastResult.success = true;
            lastResult.healed = true;
            lastResult.heal_method = 'quick_wait';
            lastResult.heal_time_ms = Date.now() - result.timestamp;
          } else {
            // Stage 2: LLM-based Healer (深い分析 - セレクタ問題・複雑な問題を解決)
            const currentSnapshot = this.playwrightMCP ? await this.playwrightMCP.snapshot() : null;
            
            const healResult = await this.healer.heal({
              test_case_id: testCase.test_case_id,
              instructions: testCase.instructions,
              error: result.error,
              snapshot: currentSnapshot
            });
            
            if (healResult.success && healResult.fixed_instructions) {
              console.log(`   🔧 Healer: ${healResult.root_cause}`);
              testCase.instructions = healResult.fixed_instructions;
              
              const healerRetryResult = await this.executor.execute(testCase);
              
              if (healerRetryResult.success) {
                const lastResult = iterationResults.executionResults[iterationResults.executionResults.length - 1];
                lastResult.success = true;
                lastResult.healed = true;
                lastResult.heal_method = 'llm_analysis';
                lastResult.root_cause = healResult.root_cause;
                console.log(`   ✅ Auto-healed successfully!`);
              }
            } else if (healResult.is_bug) {
              console.log(`   🐛 Potential bug detected: ${healResult.root_cause}`);
            }
          }
        }
      }
      const coverage = await this.analyzer.analyze(iterationResults.executionResults);
      iterationResults.coverage = coverage;
      this.history.push(iterationResults);
      
      // 累積カバレッジを計算（全イテレーションの結果）
      const allResults = this.history.flatMap(h => h.executionResults);
      const cumulativeCoverage = await this.analyzer.analyze(allResults);
      
      if (cumulativeCoverage && cumulativeCoverage.percentage !== undefined) {
        console.log(`\n📊 Iteration ${this.iteration}: Coverage ${cumulativeCoverage.percentage.toFixed(2)}% (${cumulativeCoverage.covered}/${cumulativeCoverage.total} aspects)`);
        
        // カバレッジ目標達成で早期終了
        if (cumulativeCoverage.percentage >= this.config.coverageTarget) {
          console.log(`🎯 Target coverage ${this.config.coverageTarget}% reached!`);
          return { earlyExit: true, coverage: cumulativeCoverage };
        }
      }
      
      return iterationResults; // イテレーション結果を返す
    } catch (error) {
      console.error(`Iteration ${this.iteration} failed:`, error.message);
      throw error;
    }
  }

  shouldContinue() {
    return this.iteration < this.config.maxIterations;
  }

  async getCurrentCoverage() {
    if (this.history.length === 0) {
      return {
        percentage: 0,
        covered: 0,
        total: 10, // Plannerが生成する観点数
        covered_aspects: [],
        uncovered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      };
    }
    const allResults = this.history.flatMap(h => h.executionResults);
    return await this.analyzer.analyze(allResults);
  }

  isStagnant() {
    if (this.history.length < 3) return false;
    const recent = this.history.slice(-3);
    const coverages = recent.map(h => h.coverage?.percentage || 0);
    const maxDiff = Math.max(...coverages) - Math.min(...coverages);
    return maxDiff < 1.0;
  }

  async generateFinalReport() {
    this.endTime = new Date();
    
    // 全実行結果から最終カバレッジを計算
    const allResults = this.history.flatMap(h => h.executionResults);
    const finalCoverage = await this.analyzer.analyze(allResults);
    
    const reportData = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime,
      totalDuration: this.endTime - this.startTime,
      iterations: this.iteration,
      coverage: finalCoverage,
      executionResults: allResults
    };
    const reports = await this.reporter.saveAllReports(reportData, `session-${this.sessionId}`);
    return reports;
  }

  generateSessionId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${dateStr}-${timeStr}`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * 推奨テストを表示
   * @param {Array} recommendations - 推奨テストリスト
   */
  async showRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) {
      console.log('\n✅ 全ての観点がカバー済みです。');
      return;
    }

    console.log('\n🎯 次にやるべきテスト:\n');
    recommendations.forEach((rec, index) => {
      console.log(`[${index + 1}] ${rec.title} (${rec.priority})`);
      console.log(`    理由: ${rec.reason}\n`);
    });
    
    console.log('[0] 終了');
    console.log('[Enter] 次のイテレーションを続行\n');
  }

  /**
   * ユーザー入力を受け付ける
   * @param {string} prompt - プロンプトメッセージ
   * @returns {Promise<string>} ユーザー入力
   */
  async promptUser(prompt) {
    // テストモード用のモック入力
    if (this._mockUserInput !== undefined) {
      const input = this._mockUserInput;
      this._mockUserInput = undefined; // 一度使ったらクリア
      return input;
    }

    // 実際の入力処理（readline使用）
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  /**
   * ユーザーの選択を処理
   * @param {string} input - ユーザー入力
   * @param {Array} recommendations - 推奨テストリスト
   * @returns {Object|null} 選択結果
   */
  async handleUserSelection(input, recommendations) {
    // 0: 終了
    if (input === '0') {
      return { type: 'exit' };
    }

    // Enter: 続行
    if (input === '' || input === '\n') {
      return { type: 'continue' };
    }

    // 番号選択
    const index = parseInt(input) - 1;
    if (index >= 0 && index < recommendations.length) {
      const recommendation = recommendations[index];
      
      // より深いテスト or 完了オプションの場合、typeをそのまま返す
      if (recommendation.type === 'deeper') {
        return {
          type: 'deeper',
          recommendation
        };
      } else if (recommendation.type === 'complete') {
        return {
          type: 'complete',
          recommendation
        };
      }
      
      // 通常の推奨テスト（failed, uncovered）
      return {
        type: 'specific',
        recommendation
      };
    }

    // 無効な入力
    return null;
  }

  /**
   * 推奨テストを表示してユーザーアクションを待つ
   * @param {Array} recommendations - 推奨テストリスト
   * @returns {Promise<Object>} ユーザーアクション
   */
  async waitForUserAction(recommendations) {
    await this.showRecommendations(recommendations);
    const input = await this.promptUser('番号を選択してください: ');
    return this.handleUserSelection(input, recommendations);
  }

  /**
   * 選択された推奨テストを全エージェント経由で実行
   * @param {Object} recommendation - 推奨テスト
   * @returns {Promise<Object>} 実行結果
   */
  async executeSpecificTest(recommendation) {
    console.log(`\n🎯 実行中: ${recommendation.title}`);
    
    const iterationResults = {
      iteration: this.iteration,
      testCases: [],
      executionResults: [],
      coverage: null,
      specificTest: true,
      targetAspectId: recommendation.aspectId
    };

    try {
      // 1. Planner: 特定の観点に絞ったテスト計画を生成
      const currentCoverage = await this.getCurrentCoverage();
      const plannerOptions = {
        url: this.config.url,
        testAspectsCSV: this.config.testAspectsCSV,
        existingCoverage: currentCoverage,
        targetAspectId: recommendation.aspectId
      };
      
      // 失敗したテストの場合は、失敗情報をPlannerに渡す
      if (recommendation.type === 'failed') {
        plannerOptions.failedTest = {
          testCaseId: recommendation.originalTestCaseId,
          error: recommendation.error,
          aspectId: recommendation.aspectId
        };
        console.log(`   📝 前回の失敗情報をPlannerに渡して修復を試みます`);
      }
      
      const testPlan = await this.planner.generateTestPlan(plannerOptions);
      iterationResults.testCases = testPlan.testCases;

      // 2. Generator: テストコードを生成
      const snapshot = this.playwrightMCP ? await this.playwrightMCP.snapshot() : null;
      const generatedTests = await this.generator.generate({
        testCases: testPlan.testCases,
        snapshot,
        url: this.config.url
      });

      // 3. Executor: テストを実行（+ Healer: 必要に応じて修復）
      for (const testCase of generatedTests) {
        const result = await this.executor.execute(testCase);
        iterationResults.executionResults.push({
          test_case_id: testCase.test_case_id,
          aspect_no: testCase.aspect_no,
          success: result.success,
          duration_ms: result.duration_ms,
          error: result.error
        });

        // 失敗時の自動修復
        if (!result.success && this.config.autoHeal) {
          console.log(`\n🔧 Auto-healing test case: ${testCase.test_case_id}`);

          // Stage 1: Quick retry with wait
          const failedIndex = result.error?.instruction_index || 0;
          const quickFixed = JSON.parse(JSON.stringify(testCase.instructions));
          quickFixed.splice(failedIndex, 0, {
            type: 'wait',
            duration: 500,
            description: 'Auto-inserted wait for UI stability'
          });

          const quickResult = await this.executor.execute({
            ...testCase,
            instructions: quickFixed
          });

          if (quickResult.success) {
            console.log(`   ✅ Quick fix succeeded (500ms wait)`);
            testCase.instructions = quickFixed;
            const lastResult = iterationResults.executionResults[iterationResults.executionResults.length - 1];
            lastResult.success = true;
            lastResult.healed = true;
            lastResult.heal_method = 'quick_wait';
          } else {
            // Stage 2: LLM-based Healer
            const currentSnapshot = this.playwrightMCP ? await this.playwrightMCP.snapshot() : null;

            const healResult = await this.healer.heal({
              test_case_id: testCase.test_case_id,
              instructions: testCase.instructions,
              error: result.error,
              snapshot: currentSnapshot
            });

            if (healResult.success && healResult.fixed_instructions) {
              console.log(`   🔧 Healer: ${healResult.root_cause}`);
              testCase.instructions = healResult.fixed_instructions;

              const healerRetryResult = await this.executor.execute(testCase);

              if (healerRetryResult.success) {
                const lastResult = iterationResults.executionResults[iterationResults.executionResults.length - 1];
                lastResult.success = true;
                lastResult.healed = true;
                lastResult.heal_method = 'llm_analysis';
                lastResult.root_cause = healResult.root_cause;
                console.log(`   ✅ Auto-healed successfully!`);
              }
            }
          }
        }
      }

      // 4. Analyzer: カバレッジを分析
      const coverage = await this.analyzer.analyze(iterationResults.executionResults);
      iterationResults.coverage = coverage;

      // 5. 履歴に追加
      this.history.push(iterationResults);

      // 成功判定
      const success = iterationResults.executionResults.every(r => r.success);
      
      console.log(success ? '\n✅ テスト実行成功' : '\n❌ テスト実行失敗');

      return {
        success,
        testCases: iterationResults.testCases,
        executionResults: iterationResults.executionResults,
        coverage
      };
    } catch (error) {
      console.error(`特定テスト実行失敗: ${error.message}`);
      throw error;
    }
  }

  /**
   * より深いテストを実行
   * @param {Object} recommendation - 推奨テスト情報（type='deeper'）
   * @returns {Promise<Object>} 実行結果
   */
  async executeDeeperTests(recommendation) {
    console.log(`\n🧠 より深いテストを生成中...`);
    
    try {
      const iterationResults = {
        iteration: this.history.length + 1,
        testCases: [],
        executionResults: [],
        coverage: null,
        deeperTest: true // フラグを追加
      };

      // 1. Planner: 実行履歴を元にAIで深いテストを生成
      const deeperTestPlan = await this.planner.generateDeeperTests({
        history: this.history,
        url: this.config.url
      });
      iterationResults.testCases = deeperTestPlan.testCases;

      // 2. Generator: テストコードを生成
      const snapshot = this.playwrightMCP ? await this.playwrightMCP.snapshot() : null;
      const generatedTests = await this.generator.generate({
        testCases: deeperTestPlan.testCases,
        snapshot,
        url: this.config.url
      });

      // 3. Executor: テストを実行
      for (const testCase of generatedTests) {
        const result = await this.executor.execute(testCase);
        iterationResults.executionResults.push({
          test_case_id: testCase.test_case_id,
          aspect_no: testCase.aspect_no,
          success: result.success,
          duration_ms: result.duration_ms,
          error: result.error
        });
      }

      // 4. Analyzer: カバレッジを分析
      const coverage = await this.analyzer.analyze(iterationResults.executionResults);
      iterationResults.coverage = coverage;

      // 5. 履歴に追加
      this.history.push(iterationResults);

      const success = iterationResults.executionResults.every(r => r.success);
      console.log(success ? '\n✅ より深いテスト実行成功' : '\n❌ より深いテスト実行失敗');

      return {
        success,
        testCases: iterationResults.testCases,
        executionResults: iterationResults.executionResults,
        coverage
      };
    } catch (error) {
      console.error(`より深いテスト実行失敗: ${error.message}`);
      throw error;
    }
  }

  /**
   * 完了オプションを処理
   * @param {Object} recommendation - 推奨テスト情報（type='complete'）
   * @returns {Promise<Object>} 処理結果
   */
  async handleCompleteOption(recommendation) {
    console.log('\n✅ テスト完了！すべての観点がカバーされました。');
    return { shouldExit: true };
  }
}

module.exports = Orchestrator;