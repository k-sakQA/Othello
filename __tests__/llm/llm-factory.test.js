/**
 * @file LLM Factory Tests
 * @description テストファースト：LLMプロバイダの抽象化と依存性注入のテスト
 */

const { LLMFactory } = require('../../src/llm/llm-factory');
const { ClaudeClient } = require('../../src/llm/claude-client');
const { OpenAIClient } = require('../../src/llm/openai-client');
const { MockLLMClient } = require('../../src/llm/mock-llm-client');

describe('LLMFactory', () => {
  describe('create()', () => {
    test('Claudeプロバイダを作成できる', () => {
      const config = {
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        maxTokens: 4000
      };
      
      const llm = LLMFactory.create('claude', config);
      
      expect(llm).toBeInstanceOf(ClaudeClient);
    });

    test('OpenAIプロバイダを作成できる', () => {
      const config = {
        model: 'gpt-4',
        apiKey: 'test-key',
        maxTokens: 4000
      };
      
      const llm = LLMFactory.create('openai', config);
      
      expect(llm).toBeInstanceOf(OpenAIClient);
    });

    test('Mockプロバイダを作成できる', () => {
      const config = {};
      
      const llm = LLMFactory.create('mock', config);
      
      expect(llm).toBeInstanceOf(MockLLMClient);
    });

    test('デフォルトはMockプロバイダ', () => {
      const llm = LLMFactory.create();
      
      expect(llm).toBeInstanceOf(MockLLMClient);
    });

    test('不明なプロバイダはエラー', () => {
      expect(() => {
        LLMFactory.create('unknown', {});
      }).toThrow('Unknown LLM provider: unknown');
    });
  });

  describe('LLMインターフェース統一性', () => {
    test('すべてのLLMはchat()メソッドを持つ', () => {
      const providers = ['claude', 'openai', 'mock'];
      
      providers.forEach(provider => {
        const llm = LLMFactory.create(provider, { apiKey: 'test' });
        expect(typeof llm.chat).toBe('function');
      });
    });

    test('すべてのLLMはanalyze()メソッドを持つ', () => {
      const providers = ['claude', 'openai', 'mock'];
      
      providers.forEach(provider => {
        const llm = LLMFactory.create(provider, { apiKey: 'test' });
        expect(typeof llm.analyze).toBe('function');
      });
    });
  });
});
