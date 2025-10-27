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
    // モック応答を返す
    return {
      content: JSON.stringify({
        analysis: 'Mock analysis result',
        testCases: [
          {
            case_id: 'TC001',
            title: 'Mock test case',
            steps: ['Step 1', 'Step 2'],
            expected_results: ['Expected 1', 'Expected 2']
          }
        ]
      })
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
