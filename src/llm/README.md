# LLM Module

LLMプロバイダの抽象化レイヤー。Claude、OpenAI、Mockプロバイダをサポート。

## 使い方

```javascript
const { LLMFactory } = require('./llm/llm-factory');

// Claudeプロバイダを作成
const llm = LLMFactory.create('claude', {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4000,
  temperature: 0.7
});

// チャット補完
const response = await llm.chat({
  messages: [
    { role: 'user', content: 'テスト計画を作成してください' }
  ]
});

console.log(response.content);

// テスト結果分析
const analysis = await llm.analyze({
  testCase: { ... },
  result: { ... }
});

console.log(analysis.is_bug); // true/false
```

## サポートするプロバイダ

### Claude (Anthropic)
- モデル: `claude-3-5-sonnet-20241022`
- API Key: `ANTHROPIC_API_KEY` 環境変数
- エンドポイント: `https://api.anthropic.com/v1/messages`

### OpenAI
- モデル: `gpt-4`
- API Key: `OPENAI_API_KEY` 環境変数
- エンドポイント: `https://api.openai.com/v1/chat/completions`

### Mock
- テスト用モッククライアント
- API呼び出しなし
- 固定レスポンス返却

## 共通インターフェース

すべてのLLMクライアントは以下のメソッドを実装：

### `chat(options)`
- **引数**: `{ messages, temperature?, maxTokens? }`
- **戻り値**: `Promise<{ content: string }>`

### `analyze(data)`
- **引数**: `{ testCase, result, snapshot? }`
- **戻り値**: `Promise<{ is_bug, bug_type, failure_reason, covered_aspects, recommendation }>`

## 設計原則

- **疎結合**: ファクトリーパターンで依存性注入
- **テスタビリティ**: Mock実装で単体テスト可能
- **拡張性**: 新しいプロバイダを簡単に追加可能
