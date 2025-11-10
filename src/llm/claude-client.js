/**
 * @file Claude Client
 * @description Anthropic Claude API クライアント
 */

const axios = require('axios');

/**
 * Claude APIクライアント
 */
class ClaudeClient {
  /**
   * @param {Object} config - Claude設定
   * @param {string} config.apiKey - Claude API Key
   * @param {string} config.model - モデル名
   * @param {number} config.maxTokens - 最大トークン数
   * @param {number} config.temperature - 温度パラメータ
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4000;
    this.temperature = config.temperature || 0.7;
    this.baseUrl = 'https://api.anthropic.com/v1/messages';
    this.apiVersion = config.apiVersion || '2023-06-01';
  }

  /**
   * チャット補完
   * @param {Object} options - チャットオプション
   * @param {Array} options.messages - メッセージ配列
   * @param {number} options.temperature - 温度（オプション）
   * @param {number} options.maxTokens - 最大トークン数（オプション）
   * @returns {Promise<Object>} レスポンス { content: string }
   */
  async chat(options) {
    const { messages, temperature, maxTokens } = options;
    
    try {
      // systemメッセージを分離
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');
      
      const requestBody = {
        model: this.model,
        max_tokens: maxTokens || this.maxTokens,
        temperature: temperature !== undefined ? temperature : this.temperature,
        messages: userMessages
      };
      
      // systemメッセージがあれば追加
      if (systemMessage) {
        requestBody.system = systemMessage.content;
      }
      
      const response = await axios.post(this.baseUrl, requestBody, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
          'content-type': 'application/json'
        },
        timeout: 60000
      });
      
      return {
        content: response.data.content[0].text
      };
    } catch (error) {
      // より詳細なエラー情報を出力
      if (error.response) {
        const details = error.response.data || error.response.statusText;
        throw new Error(`Claude API error (${error.response.status}): ${JSON.stringify(details)}`);
      }
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * テスト結果分析（chat()のラッパー）
   * @param {Object} data - 分析データ
   * @returns {Promise<Object>} 分析結果
   */
  async analyze(data) {
    const prompt = this._buildAnalysisPrompt(data);
    
    const response = await this.chat({
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });
    
    return JSON.parse(response.content);
  }

  /**
   * 分析プロンプト構築（内部用）
   * @private
   */
  _buildAnalysisPrompt(data) {
    return `
あなたはテスト結果分析の専門家です。

テストケース: ${JSON.stringify(data.testCase, null, 2)}
実行結果: ${JSON.stringify(data.result, null, 2)}

以下をJSON形式で分析してください：
{
  "is_bug": true/false,
  "bug_type": "...",
  "failure_reason": "...",
  "covered_aspects": [1, 2, 3],
  "recommendation": "..."
}
`;
  }
}

module.exports = { ClaudeClient };
