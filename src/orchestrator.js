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
   * @returns {Promise<Object>} テスト実行の総合結果
   */
  async execute() {
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
        const instructions = await this.generateInstructions(coverageData);

        if (instructions.length === 0) {
          exitReason = 'full_coverage';
          break;
        }

        // Playwrightエージェントでテストを生成・実行
        let testResults = instructions;
        if (this.playwrightAgent && this.playwrightAgent.generateTests) {
          testResults = await this.playwrightAgent.generateTests(instructions);
        }

        // 各反復の結果を記録
        const iterationResult = {
          iteration: totalIterations + 1,
          playwright_agent_results: {
            generated_tests: testResults,
            test_details: []
          },
          status: 'success'
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
    const { uncovered = { pages: [], elements: [] } } = coverageData;

    // 未カバーページと未カバー機能がない場合は空配列を返す
    if (uncovered.pages.length === 0 && uncovered.elements.length === 0) {
      return [];
    }

    // InstructionGeneratorを使用して指示を生成
    const instructions = await this.instructionGenerator.generate(coverageData);

    // Claude APIで最適化（オプション）
    if (this.claudeAPI && this.claudeAPI.optimize) {
      const optimizedResult = await this.claudeAPI.optimize(instructions);
      return optimizedResult.optimized_instructions || instructions;
    }

    return instructions;
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