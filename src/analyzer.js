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
   * カバレッジ分析を実行
   * @returns {Promise<Object>} カバレッジデータ
   */
  async analyze() {
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
}

module.exports = Analyzer;
