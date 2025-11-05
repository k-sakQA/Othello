/**
 * Instruction Generator
 * カバレッジデータから次のテスト指示を生成
 */

class InstructionGenerator {
  constructor(config) {
    this.config = config;
    this.maxInstructionsPerType = 5; // ページ/機能それぞれ最大5件
  }

  /**
   * カバレッジデータから次のテスト指示を生成
   * @param {Object} coverageData - Analyzerからのカバレッジデータ
   * @param {number} iteration - 現在のイテレーション番号
   * @returns {Object} テスト指示オブジェクト
   */
  async generate(coverageData, iteration) {
    const testInstructions = [];

    // 未カバーページからの指示生成
    if (coverageData.uncovered && coverageData.uncovered.pages && coverageData.uncovered.pages.length > 0) {
      const pageInstructions = this.generatePageInstructions(coverageData.uncovered.pages);
      testInstructions.push(...pageInstructions);
    }

    // 未カバー機能からの指示生成
    if (coverageData.uncovered && coverageData.uncovered.elements && coverageData.uncovered.elements.length > 0) {
      const featureInstructions = this.generateFeatureInstructions(coverageData.uncovered.elements);
      testInstructions.push(...featureInstructions);
    }

    // 初回実行時や未カバー領域がない場合は、基本的な探索的テストを生成
    // ただし、カバレッジが100%の場合（全て完了している場合）は生成しない
    const isFullCoverage = coverageData.coverage && coverageData.coverage.percentage === 100;
    if (testInstructions.length === 0 && !isFullCoverage) {
      testInstructions.push({
        priority: 'high',
        target: 'Initial Exploration',
        instruction: '基本的なページ探索とUI要素の確認',
        type: 'page_coverage',
        description: 'ページを開いて基本的な要素を確認する'
      });
    }

    // 優先度でソート（high → medium → low）
    const sortedInstructions = this.sortByPriority(testInstructions);

    const instructions = {
      iteration,
      generated_at: new Date().toISOString(),
      test_instructions: sortedInstructions
    };

    // 将来的にClaude APIで最適化
    return await this.optimizeWithClaude(instructions);
  }

  /**
   * 未カバーページからテスト指示を生成
   * @param {Array} uncoveredPages - 未カバーページのリスト
   * @returns {Array} テスト指示の配列
   */
  generatePageInstructions(uncoveredPages) {
    const instructions = [];
    const limit = Math.min(uncoveredPages.length, this.maxInstructionsPerType);

    for (let i = 0; i < limit; i++) {
      const page = uncoveredPages[i];
      instructions.push({
        priority: this.determinePriority(page, 'page'),
        target: `Page: ${page.url}`,
        instruction: this.buildPageInstruction(page),
        focus_areas: this.extractFocusAreasForPage(page)
      });
    }

    return instructions;
  }

  /**
   * 未カバー機能からテスト指示を生成
   * @param {Array} uncoveredFeatures - 未カバー機能のリスト
   * @returns {Array} テスト指示の配列
   */
  generateFeatureInstructions(uncoveredFeatures) {
    const instructions = [];
    const limit = Math.min(uncoveredFeatures.length, this.maxInstructionsPerType);

    for (let i = 0; i < limit; i++) {
      const feature = uncoveredFeatures[i];
      instructions.push({
        priority: this.determinePriority(feature, 'feature'),
        target: `Feature: ${feature.page} - ${feature.element}`,
        instruction: this.buildFeatureInstruction(feature),
        focus_areas: this.extractFocusAreasForFeature(feature)
      });
    }

    return instructions;
  }

  /**
   * 優先度を決定（ルールベース）
   * @param {Object} item - ページまたは機能
   * @param {string} type - 'page' または 'feature'
   * @returns {string} 優先度 ('high', 'medium', 'low')
   */
  determinePriority(item, type) {
    // ルールベースで優先度を決定
    // 将来的にはClaude APIで洗練された判定が可能
    
    if (type === 'page') {
      const url = item.url.toLowerCase();
      // ログイン、ダッシュボード、メインページは高優先度
      if (url.includes('login') || url.includes('dashboard') || url === '/' || url.includes('home')) {
        return 'high';
      }
      // 設定、ヘルプは低優先度
      if (url.includes('settings') || url.includes('help') || url.includes('about')) {
        return 'low';
      }
      return 'medium';
    } else if (type === 'feature') {
      const element = item.element.toLowerCase();
      // ボタン、フォームは高優先度
      if (element.includes('button') || element.includes('ボタン') || 
          element.includes('form') || element.includes('フォーム') ||
          element.includes('submit') || element.includes('送信')) {
        return 'high';
      }
      // リンク、テキストは低優先度
      if (element.includes('link') || element.includes('text') || 
          element.includes('リンク') || element.includes('テキスト')) {
        return 'low';
      }
      return 'medium';
    }

    return 'medium';
  }

  /**
   * ページテスト指示を構築
   * @param {Object} page - ページオブジェクト
   * @returns {string} テスト指示テキスト
   */
  buildPageInstruction(page) {
    return `「${page.description || page.url}」にアクセスし、主要な機能をテストしてください。` +
           `ページの読み込み、表示要素の確認、基本操作を実行してください。`;
  }

  /**
   * 機能テスト指示を構築
   * @param {Object} feature - 機能オブジェクト
   * @returns {string} テスト指示テキスト
   */
  buildFeatureInstruction(feature) {
    return `「${feature.page}」ページの「${feature.element}」(セレクタ: ${feature.selector})をテストしてください。` +
           `この要素に対して適切な操作を実行し、動作を検証してください。`;
  }

  /**
   * ページのフォーカス領域を抽出
   * @param {Object} page - ページオブジェクト
   * @returns {Array} フォーカス領域の配列
   */
  extractFocusAreasForPage(page) {
    const focusAreas = [
      'ページナビゲーション',
      '主要UI要素の表示確認'
    ];

    // URLから推測されるフォーカス領域を追加
    const url = page.url.toLowerCase();
    if (url.includes('login') || url.includes('auth')) {
      focusAreas.push('認証フロー');
    }
    if (url.includes('dashboard') || url.includes('home')) {
      focusAreas.push('ダッシュボード機能');
    }
    if (url.includes('settings') || url.includes('config')) {
      focusAreas.push('設定変更機能');
    }

    return focusAreas;
  }

  /**
   * 機能のフォーカス領域を抽出
   * @param {Object} feature - 機能オブジェクト
   * @returns {Array} フォーカス領域の配列
   */
  extractFocusAreasForFeature(feature) {
    const focusAreas = [
      '要素の存在確認',
      '要素の操作可能性'
    ];

    const element = feature.element.toLowerCase();
    if (element.includes('button') || element.includes('ボタン')) {
      focusAreas.push('ボタンクリック動作');
    }
    if (element.includes('form') || element.includes('フォーム') || 
        element.includes('input') || element.includes('入力')) {
      focusAreas.push('入力値の検証');
    }
    if (element.includes('search') || element.includes('検索')) {
      focusAreas.push('検索結果の確認');
    }

    return focusAreas;
  }

  /**
   * 優先度でソート
   * @param {Array} instructions - テスト指示の配列
   * @returns {Array} ソート済みテスト指示の配列
   */
  sortByPriority(instructions) {
    const priorityValues = { high: 1, medium: 2, low: 3 };
    return instructions.sort((a, b) => 
      priorityValues[a.priority] - priorityValues[b.priority]
    );
  }

  /**
   * Claude APIでテスト指示を最適化（将来実装）
   * @param {Object} instructions - テスト指示オブジェクト
   * @returns {Object} 最適化されたテスト指示オブジェクト
   */
  async optimizeWithClaude(instructions) {
    // Phase 2では未実装（ルールベースのみ）
    // Phase 3でClaude APIと統合予定
    const claudeSettings = this.config.get('claude_api');
    
    if (!claudeSettings.enabled) {
      // Claude API無効時はそのまま返す
      return instructions;
    }

    // TODO: Phase 3でClaude API連携を実装
    // - 指示文の自然言語最適化
    // - 優先度の再評価
    // - フォーカス領域の洗練
    
    return instructions;
  }
}

module.exports = InstructionGenerator;
