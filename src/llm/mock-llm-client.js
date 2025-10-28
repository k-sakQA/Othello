/**
 * @file Mock LLM Client
 * @description テスト用モックLLMクライアント
 */

/**
 * モックLLMクライアント（テスト用）
 */
class MockLLMClient {
  /**
   * @param {Object} config - Mock設定
   */
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * チャット補完（モック）
   * @param {Object} options - チャットオプション
   * @returns {Promise<Object>} モックレスポンス
   */
  async chat(options) {
    // Othello-Planner用のモック応答（JSON配列形式）
    return {
      content: JSON.stringify([
        {
          aspect_no: 1,
          test_type: 'Mock Test Type',
          test_category: 'Mock Category',
          target_function: 'Mock function',
          specifications: ['Mock spec 1', 'Mock spec 2'],
          target_bugs: ['Mock bug 1', 'Mock bug 2'],
          priority: 'P1',
          test_cases: [
            {
              case_id: 'TC001',
              title: 'Mock test case',
              steps: ['Step 1', 'Step 2'],
              expected_results: ['Expected 1', 'Expected 2']
            }
          ]
        }
      ])
    };
  }

  /**
   * テスト結果分析（モック）
   * @param {Object} data - 分析データ
   * @returns {Promise<Object>} モック分析結果
   */
  async analyze(data) {
    // モック分析結果を返す
    return {
      is_bug: false,
      bug_type: 'N/A',
      failure_reason: 'Mock failure reason',
      covered_aspects: [1, 2, 3],
      recommendation: 'Mock recommendation'
    };
  }
}

module.exports = { MockLLMClient };
