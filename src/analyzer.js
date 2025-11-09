const fs = require('fs').promises;
const path = require('path');

/**
 * Analyzer
 * 実行ログからカバレッジデータを分析し、未カバー領域を検出する
 */
class Analyzer {
  /**
   * @param {ConfigManager} config - 設定マネージャー
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Phase 9: 実行結果からテスト観点カバレッジを分析
   * @param {Array} executionResults - 実行結果の配列
   * @returns {Promise<Object>} カバレッジデータ
   */
  async analyze(executionResults) {
    // Phase 9: テスト観点ベースの分析のみを使用
    if (!executionResults || !Array.isArray(executionResults) || executionResults.length === 0) {
      // 空の場合はデフォルト値を返す
      return {
        percentage: 0,
        covered: 0,
        total: 10,
        covered_aspects: [],
        uncovered_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        tests_passed: 0,
        tests_failed: 0,
        tests_healed: 0,
        total_tests: 0
      };
    }
    
    return this.analyzeTestAspects(executionResults);
  }

  /**
   * テスト観点ベースのカバレッジ分析
   * @param {Array} executionResults - 実行結果
   * @returns {Object} カバレッジデータ
   */
  analyzeTestAspects(executionResults) {
    // ユニークなaspect_noを取得
    const coveredAspects = new Set(); // 成功したテストの観点
    const attemptedAspects = new Set(); // 試みられた全ての観点（成功/失敗問わず）
    const passedTests = executionResults.filter(r => r.success).length;
    const failedTests = executionResults.filter(r => !r.success).length;
    const healedTests = executionResults.filter(r => r.healed).length;
    
    for (const result of executionResults) {
      if (result.aspect_no) {
        attemptedAspects.add(result.aspect_no); // 試みられた観点
        if (result.success) {
          coveredAspects.add(result.aspect_no); // 成功した観点
        }
      }
    }
    
    // テスト観点の総数を取得（Plannerが生成した観点数）
    // 仮に10観点とする（実際はPlannerの結果から取得すべき）
    const totalAspects = 10;
    const covered = coveredAspects.size;
    const percentage = (covered / totalAspects) * 100;
    
    // 未カバーの観点を特定（一度も試みられていない観点のみ）
    const uncoveredAspects = [];
    for (let i = 1; i <= totalAspects; i++) {
      if (!attemptedAspects.has(i)) {
        uncoveredAspects.push(i);
      }
    }
    
    // 統一フォーマット（エージェントが読みやすい形式）
    return {
      percentage,
      covered,
      total: totalAspects,
      covered_aspects: Array.from(coveredAspects).sort((a, b) => a - b),
      uncovered_aspects: uncoveredAspects,
      tests_passed: passedTests,
      tests_failed: failedTests,
      tests_healed: healedTests,
      total_tests: executionResults.length
    };
  }

  /**
   * 従来のログベース分析
   * @returns {Promise<Object>} カバレッジデータ
   */
  async analyzeLegacy() {
    try {
      // 全ログファイルを読み込み
      const logs = await this.loadAllLogs();

      if (logs.length === 0) {
        return this.getEmptyCoverage();
      }

      // 訪問済みページと機能を抽出
      const visitedPages = this.extractVisitedPages(logs);
      const testedFeatures = this.extractTestedFeatures(logs);

      // 推定総数を計算
      const estimatedTotalPages = this.estimateTotalPages(logs);
      const estimatedTotalFeatures = this.estimateTotalFeatures(logs);

      // カバレッジ計算
      const coveragePercentage = this.calculateCoverage(
        visitedPages.length,
        estimatedTotalPages,
        testedFeatures.length,
        estimatedTotalFeatures
      );

      // 未カバー領域を検出
      const uncoveredPages = this.findUncoveredPages(visitedPages, estimatedTotalPages);
      const uncoveredFeatures = this.findUncoveredFeatures(testedFeatures, estimatedTotalFeatures);

      return {
        analysis_date: new Date().toISOString(),
        total_scenarios_executed: logs.length,
        coverage_summary: {
          percentage: coveragePercentage,
          visited_pages: visitedPages.length,
          total_estimated_pages: estimatedTotalPages,
          tested_features: testedFeatures.length,
          total_estimated_features: estimatedTotalFeatures
        },
        visited_pages: visitedPages,
        tested_features: testedFeatures,
        uncovered: {
          pages: uncoveredPages,
          elements: uncoveredFeatures
        }
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return this.getEmptyCoverage();
    }
  }

  /**
   * ログディレクトリから全JSONファイルを読み込む
   * @returns {Promise<Array>} ログデータの配列
   */
  async loadAllLogs() {
    const logsDir = this.config.getPath('logs');

    try {
      // ディレクトリ内のファイル一覧を取得
      const files = await fs.readdir(logsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      // 全ファイルを並列読み込み
      const logPromises = jsonFiles.map(async (file) => {
        try {
          const filePath = path.join(logsDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          return JSON.parse(content);
        } catch (error) {
          console.warn(`Failed to load log file ${file}:`, error.message);
          return null;
        }
      });

      const logs = await Promise.all(logPromises);
      
      // nullを除外（不正なJSONファイル）
      return logs.filter(log => log !== null);
    } catch (error) {
      console.warn('Failed to load logs:', error.message);
      return [];
    }
  }

  /**
   * ログから訪問済みページを抽出
   * @param {Array} logs - ログデータの配列
   * @returns {Array<string>} 訪問済みページのURL配列（重複なし）
   */
  extractVisitedPages(logs) {
    const pagesSet = new Set();

    for (const log of logs) {
      if (!log.playwright_agent_results || !log.playwright_agent_results.test_details) {
        continue;
      }

      for (const testDetail of log.playwright_agent_results.test_details) {
        if (Array.isArray(testDetail.visited_urls)) {
          testDetail.visited_urls.forEach(url => pagesSet.add(url));
        }
      }
    }

    return Array.from(pagesSet);
  }

  /**
   * ログからテスト済み機能を抽出
   * @param {Array} logs - ログデータの配列
   * @returns {Array<string>} テスト済み機能の配列（重複なし）
   */
  extractTestedFeatures(logs) {
    const featuresSet = new Set();

    for (const log of logs) {
      if (!log.playwright_agent_results || !log.playwright_agent_results.test_details) {
        continue;
      }

      for (const testDetail of log.playwright_agent_results.test_details) {
        // featureフィールドがあればそれを使用
        if (testDetail.feature) {
          featuresSet.add(testDetail.feature);
        } else if (testDetail.name) {
          // featureフィールドがない場合はテスト名から推測
          featuresSet.add(this.extractFeatureFromName(testDetail.name));
        }
      }
    }

    return Array.from(featuresSet);
  }

  /**
   * テスト名から機能名を推測
   * @param {string} testName - テスト名
   * @returns {string} 推測された機能名
   */
  extractFeatureFromName(testName) {
    // 「○○機能」「○○テスト」などのパターンから機能名を抽出
    const patterns = [
      /(.+?)機能/,
      /(.+?)テスト/,
      /(.+?)の/,
      /(.+?)\s/
    ];

    for (const pattern of patterns) {
      const match = testName.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // パターンにマッチしない場合はテスト名全体を返す
    return testName;
  }

  /**
   * カバレッジパーセンテージを計算
   * @param {number} visitedPages - 訪問済みページ数
   * @param {number} totalPages - 推定総ページ数
   * @param {number} testedFeatures - テスト済み機能数
   * @param {number} totalFeatures - 推定総機能数
   * @returns {number} カバレッジパーセンテージ（0-100）
   */
  calculateCoverage(visitedPages, totalPages, testedFeatures, totalFeatures) {
    // ページカバレッジと機能カバレッジの重み付け平均
    // ページ: 60%, 機能: 40%
    const pageWeight = 0.6;
    const featureWeight = 0.4;

    if (totalPages === 0 && totalFeatures === 0) {
      return 0;
    }

    const pageCoverage = totalPages > 0 ? (visitedPages / totalPages) * 100 : 0;
    const featureCoverage = totalFeatures > 0 ? (testedFeatures / totalFeatures) * 100 : 0;

    const weightedCoverage = (pageCoverage * pageWeight) + (featureCoverage * featureWeight);

    return Math.min(100, Math.round(weightedCoverage * 10) / 10); // 小数点第1位まで
  }

  /**
   * 未カバーページを検出
   * @param {Array<string>} visitedPages - 訪問済みページ
   * @param {number} estimatedTotal - 推定総ページ数
   * @returns {Array<string>} 未カバーページの配列
   */
  findUncoveredPages(visitedPages, estimatedTotal) {
    const uncoveredCount = Math.max(0, estimatedTotal - visitedPages.length);
    
    // 実際の未カバーページは検出できないため、プレースホルダーを返す
    const uncovered = [];
    for (let i = 0; i < uncoveredCount; i++) {
      uncovered.push(`[未検出ページ ${i + 1}]`);
    }

    return uncovered;
  }

  /**
   * 未カバー機能を検出
   * @param {Array<string>} testedFeatures - テスト済み機能
   * @param {number} estimatedTotal - 推定総機能数
   * @returns {Array<string>} 未カバー機能の配列
   */
  findUncoveredFeatures(testedFeatures, estimatedTotal) {
    const uncoveredCount = Math.max(0, estimatedTotal - testedFeatures.length);
    
    // 実際の未カバー機能は検出できないため、プレースホルダーを返す
    const uncovered = [];
    for (let i = 0; i < uncoveredCount; i++) {
      uncovered.push(`[未検出機能 ${i + 1}]`);
    }

    return uncovered;
  }

  /**
   * 推定総ページ数を計算
   * @param {Array} logs - ログデータの配列
   * @returns {number} 推定総ページ数
   */
  estimateTotalPages(logs) {
    // 現在の訪問済みページ数から推定
    // 探索的テストでは通常、全ページの70-80%程度をカバーすると仮定
    const visitedPages = this.extractVisitedPages(logs);
    const estimatedTotal = Math.ceil(visitedPages.length / 0.75);

    return Math.max(visitedPages.length, estimatedTotal);
  }

  /**
   * 推定総機能数を計算
   * @param {Array} logs - ログデータの配列
   * @returns {number} 推定総機能数
   */
  estimateTotalFeatures(logs) {
    // 現在のテスト済み機能数から推定
    // 探索的テストでは通常、全機能の60-70%程度をカバーすると仮定
    const testedFeatures = this.extractTestedFeatures(logs);
    const estimatedTotal = Math.ceil(testedFeatures.length / 0.65);

    return Math.max(testedFeatures.length, estimatedTotal);
  }

  /**
   * 空のカバレッジデータを生成
   * @returns {Object} 空のカバレッジデータ
   */
  getEmptyCoverage() {
    return {
      analysis_date: new Date().toISOString(),
      total_scenarios_executed: 0,
      coverage_summary: {
        percentage: 0,
        visited_pages: 0,
        total_estimated_pages: 0,
        tested_features: 0,
        total_estimated_features: 0
      },
      visited_pages: [],
      tested_features: [],
      uncovered: {
        pages: [],
        elements: []
      }
    };
  }

  /**
   * 実行結果とカバレッジデータから推奨テストを生成
   * @param {Array} executionResults - 実行結果の配列
   * @param {Object} coverageData - カバレッジデータ
   * @returns {Promise<Array>} 推奨テストリスト
   */
  async generateRecommendations(executionResults, coverageData) {
    const recommendations = [];
    const maxRecommendations = 5;
    
    // 1. 失敗したテストを抽出（重複する観点は最新のもののみ）
    const failedTests = new Map(); // aspectId -> 最新の失敗テスト
    
    if (executionResults && Array.isArray(executionResults)) {
      for (const result of executionResults) {
        if (!result.success && result.aspect_no) {
          // 同じ観点の失敗は最新のもので上書き
          failedTests.set(result.aspect_no, result);
        }
      }
    }
    
    // 失敗したテストを推奨リストに追加
    for (const [aspectId, failedTest] of failedTests) {
      recommendations.push({
        type: 'failed',
        priority: 'High',
        title: `失敗したテスト: 観点${aspectId}`,
        reason: `前回実行で失敗: ${failedTest.error?.message || 'エラー'}`,
        aspectId: aspectId,
        originalTestCaseId: failedTest.test_case_id,
        error: failedTest.error
      });
    }
    
    // 2. 未カバー観点から推奨を生成（失敗テストと合わせて最大5件まで）
    const remainingSlots = maxRecommendations - recommendations.length;

    if (remainingSlots > 0 && coverageData.uncovered_aspects && coverageData.uncovered_aspects.length > 0) {
      const uncoveredAspects = coverageData.uncovered_aspects.slice(0, remainingSlots);

      for (let i = 0; i < uncoveredAspects.length; i++) {
        const aspectId = uncoveredAspects[i];

        // 優先度を動的に設定
        let priority;
        if (i < 2) {
          priority = 'High';   // 最初の2つは高優先度
        } else if (i < 4) {
          priority = 'Medium'; // 次の2つは中優先度
        } else {
          priority = 'Low';    // 残りは低優先度
        }

        recommendations.push({
          type: 'uncovered',
          priority: priority,
          title: `観点${aspectId}のテスト`,
          reason: `未カバー観点: 観点${aspectId}`,
          aspectId: aspectId
        });
      }
    }
    
    // 3. 全観点がカバー済みで失敗もない場合、より深いテストを提案
    const allCovered = !coverageData.uncovered_aspects || coverageData.uncovered_aspects.length === 0;
    const noFailures = failedTests.size === 0;
    
    if (allCovered && noFailures && coverageData.percentage === 100) {
      // より深いテストを生成するオプション
      recommendations.push({
        type: 'deeper',
        priority: 'Medium',
        title: 'より深いテスト（エッジケース、組み合わせテスト）を生成',
        reason: '全観点がカバー済み。さらなるテスト品質向上のため',
        requiresAI: true
      });
      
      // テスト完了オプション
      recommendations.push({
        type: 'complete',
        priority: 'Low',
        title: 'テスト完了（終了）',
        reason: '全観点がカバー済み。テストを完了します'
      });
    }
    
    return recommendations;
  }
}

module.exports = Analyzer;
