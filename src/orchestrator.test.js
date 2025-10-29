const fs = require('fs').promises;
const path = require('path');

/**
 * Orchestrator
 * テスト実行の全体的な制御と管理を担当するクラス
 */
class Orchestrator {
  /**
   * @param {Object} dependencies - 依存モジュール
   * @param {ConfigManager} dependencies.configManager - 設定マネージャー
   * @param {InstructionGenerator} dependencies.instructionGenerator - 指示生成モジュール
   * @param {Analyzer} dependencies.analyzer - カバレッジ分析モジュール
   * @param {ResultCollector} dependencies.resultCollector - 結果収集モジュール
   * @param {Object} [dependencies.playwrightAgent] - Playwrightエージェント (オプション)
   * @param {Object} [dependencies.claudeAPI] - Claude APIモジュール (オプション)
   */
  constructor(dependencies) {
    this.config = dependencies.configManager;
    this.instructionGenerator = dependencies.instructionGenerator;
    this.analyzer = dependencies.analyzer;
    this.resultCollector = dependencies.resultCollector;
    this.playwrightAgent = dependencies.playwrightAgent;
    this.claudeAPI = dependencies.claudeAPI;
    
    this.maxIterations = this.config.max_iterations || 10;
    this.coverageThreshold = this.config.coverage_threshold || {
      target_percentage: 80,
      stop_if_no_improvement: true
    };
  }

  /**
   * テストの全体的な実行サイクルを管理
   * @param {string} targetUrl - テスト対象URL（オプション）
   * @returns {Promise<Object>} テスト実行の総合結果
   */
  async execute(targetUrl = null) {
    const coverageHistory = [];
    const coverageReports = [];
    let totalIterations = 0;
    let exitReason = 'max_iterations';

    try {
      while (totalIterations < this.maxIterations) {
        // カバレッジデータを取得
        const coverageData = await this.analyzer.analyze();
        coverageReports.push(coverageData);
        coverageHistory.push(coverageData.coverage_summary);

        // 続行判定（2回目以降の反復で判定）
        if (totalIterations > 0 && !this.shouldContinue(coverageHistory)) {
          exitReason = 'coverage_threshold_reached';
          break;
        }

        // テスト指示の生成
        const instructionsResult = await this.generateInstructions(coverageData);
        const instructions = instructionsResult.test_instructions || [];

        if (instructions.length === 0) {
          exitReason = 'full_coverage';
          break;
        }

        // Playwrightエージェントでテストを実行
        let testResults = [];
        if (this.playwrightAgent) {
          // 指示を実行可能なテストに変換
          for (const instruction of instructions) {
            const testInstruction = this.convertInstructionToTest(instruction, targetUrl, totalIterations + 1);
            const result = await this.playwrightAgent.executeTest(testInstruction);
            testResults.push(result);
            
            // ログを保存
            const logsDir = this.config.getPath('logs');
            const logPath = path.join(logsDir, `iteration-${totalIterations + 1}-${result.test_id}.json`);
            await this.playwrightAgent.saveLog(result, logPath);
          }
        }

        // 各反復の結果を記録
        const iterationResult = {
          iteration: totalIterations + 1,
          instructions: instructions.length,
          tests_executed: testResults.length,
          tests_passed: testResults.filter(r => r.success).length,
          tests_failed: testResults.filter(r => !r.success).length,
          status: testResults.every(r => r.success) ? 'success' : 'partial_success'
        };

        await this.recordIteration(iterationResult);

        totalIterations++;
      }

      // 最終カバレッジ
      const finalCoverage = coverageHistory[coverageHistory.length - 1] || { percentage: 0 };

      return {
        status: 'success',
        total_iterations: totalIterations,
        exit_reason: exitReason,
        coverage_reports: coverageReports,
        final_coverage: finalCoverage
      };

    } catch (error) {
      return {
        status: 'error',
        total_iterations: totalIterations,
        error_details: error.message,
        coverage_reports: coverageReports
      };
    }
  }

  /**
   * カバレッジ向上のための指示を生成
   * @param {Object} coverageData - カバレッジ分析結果
   * @returns {Promise<Array>} テスト指示の配列
   */
  async generateInstructions(coverageData) {
    // InstructionGeneratorを使用して指示を生成
    // generateメソッドは内部で未カバー領域をチェックし、必要に応じて指示を生成する
    const instructions = await this.instructionGenerator.generate(coverageData);

    // Claude APIで最適化（オプション）
    if (this.claudeAPI && this.claudeAPI.optimize) {
      const optimizedResult = await this.claudeAPI.optimize(instructions);
      return optimizedResult.optimized_instructions || instructions;
    }

    return instructions;
  }

  /**
   * テスト指示を実行可能なテストに変換
   * @param {Object} instruction - InstructionGeneratorからの指示
   * @param {string} targetUrl - テスト対象URL
   * @param {number} iteration - イテレーション番号
   * @returns {Object} Playwright Agentが実行できるテスト指示
   */
  convertInstructionToTest(instruction, targetUrl, iteration) {
    const testId = `test-iter${iteration}-${Date.now()}`;
    
    // 指示テキストから基本的なアクションを生成
    const actions = [];
    
    // ナビゲーション
    if (targetUrl || instruction.target_url) {
      actions.push({
        type: 'navigate',
        url: targetUrl || instruction.target_url,
        description: `${instruction.target_url || targetUrl}に移動`
      });
    }
    
    // 指示内容からアクションを推測
    if (instruction.priority === 'high' && instruction.target_page) {
      actions.push({
        type: 'screenshot',
        path: `./screenshots/iter${iteration}-${instruction.target_page.replace(/\//g, '-')}.png`,
        description: `${instruction.target_page}のスクリーンショット`
      });
    }
    
    return {
      test_id: testId,
      target_url: targetUrl || instruction.target_url || '',
      scenario: instruction.instruction,
      priority: instruction.priority,
      actions
    };
  }

  /**
   * 反復結果を記録
   * @param {Object} iterationResult - 反復の結果データ
   */
  async recordIteration(iterationResult) {
    const logsPath = this.config.getPath('logs');
    const logFilePath = path.join(logsPath, `iteration_${iterationResult.iteration}.json`);

    // ログディレクトリが存在しない場合は作成
    await fs.mkdir(logsPath, { recursive: true });

    // ログファイルに書き出し
    await fs.writeFile(logFilePath, JSON.stringify(iterationResult, null, 2), 'utf8');

    // 結果収集モジュールを呼び出し
    const collectedData = await this.resultCollector.collect(iterationResult);
    const resultsPath = this.config.getPath('results');
    const resultsJsonPath = path.join(resultsPath, `iteration_${iterationResult.iteration}.json`);
    const resultsCsvPath = path.join(resultsPath, 'results.csv');
    
    await this.resultCollector.saveJSON(resultsJsonPath, collectedData);
    await this.resultCollector.saveCSV(resultsCsvPath, collectedData, { append: true });
  }

  /**
   * 反復を続けるかどうかを判定
   * @param {Array} coverageHistory - カバレッジ履歴
   * @returns {boolean} 続行するかどうか
   */
  shouldContinue(coverageHistory) {
    if (coverageHistory.length < 2) {
      return true;
    }

    const latestCoverage = coverageHistory[coverageHistory.length - 1];
    const previousCoverage = coverageHistory[coverageHistory.length - 2];

    // 閾値に達している場合は停止
    if (latestCoverage.percentage >= this.coverageThreshold.target_percentage) {
      return false;
    }

    // カバレッジが向上していない場合
    const hasImprovement = latestCoverage.percentage > previousCoverage.percentage;

    // 設定に応じて判定
    if (this.coverageThreshold.stop_if_no_improvement && !hasImprovement) {
      return false;
    }

    return true;
  }
}

module.exports = Orchestrator;