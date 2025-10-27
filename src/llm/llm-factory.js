/**
 * @file LLM Factory
 * @description LLMプロバイダの抽象化ファクトリー
 */

const { ClaudeClient } = require('./claude-client');
const { OpenAIClient } = require('./openai-client');
const { MockLLMClient } = require('./mock-llm-client');

/**
 * LLMプロバイダファクトリー
 */
class LLMFactory {
  /**
   * LLMクライアントを作成
   * @param {string} provider - プロバイダ名 ('claude' | 'openai' | 'mock')
   * @param {Object} config - プロバイダ設定
   * @returns {ClaudeClient|OpenAIClient|MockLLMClient} LLMクライアント
   * @throws {Error} 不明なプロバイダの場合
   */
  static create(provider = 'mock', config = {}) {
    switch (provider.toLowerCase()) {
      case 'claude':
        return new ClaudeClient(config);
      
      case 'openai':
        return new OpenAIClient(config);
      
      case 'mock':
        return new MockLLMClient(config);
      
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }
}

module.exports = { LLMFactory };
