# エラーリカバリー機能ガイド

Othello Phase 8で追加されたエラーリカバリー機能の詳細ガイド。

## 概要

エラーリカバリー機能は、ネットワーク不安定性、一時的なサーバーエラー、セッション切断などの問題から自動的に回復する機能です。

### 主要機能

1. **自動再試行**: 一時的なエラーから自動回復
2. **指数バックオフ**: 再試行間隔を段階的に増加
3. **セッション再接続**: MCP接続が切れた際の自動復旧
4. **失敗スナップショット**: デバッグ用の状態保存

## 設定

### コンストラクタオプション

```javascript
const Othello = require('./src/playwright-agent');

const othello = new Othello(config, {
  // 自動再試行設定
  maxRetries: 3,              // 最大再試行回数（デフォルト: 0）
  retryDelay: 1000,           // 初期待機時間（ミリ秒、デフォルト: 1000）
  backoffMultiplier: 2,       // 指数バックオフ倍率（デフォルト: 2）
  maxRetryDelay: 30000,       // 最大待機時間（ミリ秒、デフォルト: 30000）
  
  // セッション管理
  autoReconnect: true,        // 自動再接続（デフォルト: true）
  
  // デバッグ
  saveSnapshotOnFailure: true,      // 失敗時スナップショット（デフォルト: false）
  snapshotDir: './error-snapshots'  // 保存先（デフォルト: './error-snapshots'）
});
```

## 使用例

### 1. 基本的な自動再試行

```javascript
const othello = new Othello(config, {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2
});

// executeWithRetryを使用
const result = await othello.executeWithRetry(
  async () => {
    return await othello.executeInstruction({
      type: 'click',
      selector: '#submit-button',
      description: 'Submit button click'
    });
  },
  'submitButtonClick'  // アクション名（ログ記録用）
);

// 自動的に以下を実行：
// - 1回目失敗 → 1秒待機 → 再試行
// - 2回目失敗 → 2秒待機 → 再試行
// - 3回目失敗 → 4秒待機 → 再試行
// - 4回目失敗 → エラーをthrow
```

### 2. 複数の指示を再試行

```javascript
const othello = new Othello(config, {
  maxRetries: 2,
  autoReconnect: true
});

// 複数の指示を含むアクションを再試行
const result = await othello.executeWithRetry(async () => {
  await othello.executeInstruction({ 
    type: 'navigate', 
    url: 'https://example.com' 
  });
  
  await othello.executeInstruction({ 
    type: 'click', 
    selector: '#login-button' 
  });
  
  return await othello.executeInstruction({ 
    type: 'fill', 
    selector: '#username', 
    value: 'testuser' 
  });
}, 'loginFlow');
```

### 3. セッション再接続

```javascript
const othello = new Othello(config, {
  autoReconnect: true  // デフォルトでtrue
});

await othello.initializeSession();

// セッションが切断されても自動的に再接続を試行
try {
  await othello.executeInstruction({
    type: 'click',
    selector: '#button'
  });
} catch (error) {
  // セッション切断エラーの場合、自動的に：
  // 1. エラーを検知
  // 2. initializeSession()を呼び出し
  // 3. 再接続成功をログに記録
  console.error('Operation failed:', error);
}
```

### 4. 失敗時のスナップショット保存

```javascript
const othello = new Othello(config, {
  saveSnapshotOnFailure: true,
  snapshotDir: './debug-snapshots',
  debugMode: true  // スタックトレースも記録
});

await othello.initializeSession();

try {
  await othello.executeInstruction({
    type: 'click',
    selector: '#nonexistent-element'
  });
} catch (error) {
  // 自動的に ./debug-snapshots/failure-YYYYMMDD-HHMMSS-{sessionId}.json に保存:
  // {
  //   "timestamp": "2025-10-22T12:34:56.789Z",
  //   "sessionId": "abc123",
  //   "instruction": { ... },
  //   "error": {
  //     "message": "Element not found",
  //     "stack": "..."
  //   },
  //   "executionHistory": [ ... ]
  // }
}
```

## 指数バックオフの動作

### 計算式

```
待機時間 = min(
  retryDelay × (backoffMultiplier ^ attempt),
  maxRetryDelay
)
```

### 例: デフォルト設定

- `retryDelay = 1000`（1秒）
- `backoffMultiplier = 2`
- `maxRetryDelay = 30000`（30秒）

| 試行回数 | 計算 | 待機時間 |
|---------|-----|---------|
| 1回目失敗後 | 1000 × 2^0 = 1000 | 1秒 |
| 2回目失敗後 | 1000 × 2^1 = 2000 | 2秒 |
| 3回目失敗後 | 1000 × 2^2 = 4000 | 4秒 |
| 4回目失敗後 | 1000 × 2^3 = 8000 | 8秒 |
| 5回目失敗後 | 1000 × 2^4 = 16000 | 16秒 |
| 6回目失敗後 | 1000 × 2^5 = 32000 → 30000 | 30秒（上限） |

## 実行履歴との統合

エラーリカバリーは実行履歴に自動的に記録されます：

```javascript
const othello = new Othello(config, {
  maxRetries: 3,
  logFile: './logs/execution.log'
});

await othello.executeWithRetry(
  async () => await someAction(),
  'testAction'
);

// 履歴を取得
const history = othello.getExecutionHistory();

// リトライ警告ログ（各失敗時）
const retryWarnings = history.filter(
  entry => entry.level === 'warn' && entry.action === 'executeWithRetry'
);

// 最終成功ログ
const successLog = history.find(
  entry => entry.level === 'info' && 
           entry.action === 'executeWithRetry' &&
           entry.data.success === true
);

console.log('Total attempts:', successLog.data.attempts);
console.log('Max retries:', successLog.data.maxRetries);
```

## セッション切断エラーの判定

以下のパターンがセッション切断エラーとして判定されます：

```javascript
// 判定される文字列パターン:
- "session"を含むエラー
- "disconnected"を含むエラー
- "connection"を含むエラー
- "ECONNREFUSED"を含むエラー
- "ECONNRESET"を含むエラー
- "timeout"を含むエラー
```

カスタム判定を追加したい場合は、`isSessionDisconnected()`メソッドをオーバーライド：

```javascript
class CustomOthello extends Othello {
  isSessionDisconnected(error) {
    // 親クラスの判定を実行
    if (super.isSessionDisconnected(error)) {
      return true;
    }
    
    // カスタム判定を追加
    return error.message.includes('custom_error_pattern');
  }
}
```

## ベストプラクティス

### 1. 環境別設定

```javascript
// 開発環境: 詳細ログ + スナップショット
const devOptions = {
  maxRetries: 2,
  debugMode: true,
  saveSnapshotOnFailure: true,
  snapshotDir: './debug-snapshots',
  logFile: './logs/dev.log'
};

// テスト環境: 再試行なし（テストの確実性優先）
const testOptions = {
  maxRetries: 0,
  autoReconnect: false,
  debugMode: true,
  logFile: './logs/test.log'
};

// 本番環境: 適度な再試行 + ログのみ
const prodOptions = {
  maxRetries: 3,
  retryDelay: 2000,
  autoReconnect: true,
  saveSnapshotOnFailure: false,  // 本番では無効
  logFile: './logs/production.log'
};

const othello = new Othello(
  config,
  process.env.NODE_ENV === 'production' ? prodOptions :
  process.env.NODE_ENV === 'test' ? testOptions :
  devOptions
);
```

### 2. 適切なリトライ回数

```javascript
// ❌ 悪い例: 過剰なリトライ
const othello = new Othello(config, {
  maxRetries: 10  // 時間がかかりすぎる
});

// ✅ 良い例: 適度なリトライ
const othello = new Othello(config, {
  maxRetries: 3,  // 通常は2-3回で十分
  maxRetryDelay: 10000  // 最大10秒まで
});
```

### 3. 重要な操作のみ再試行

```javascript
// ✅ 良い例: 重要な操作のみexecuteWithRetryを使用
const othello = new Othello(config, { maxRetries: 3 });

// 重要: フォーム送信
await othello.executeWithRetry(
  () => othello.executeInstruction({ type: 'click', selector: '#submit' }),
  'formSubmit'
);

// 重要でない: ページ読み込み（通常のexecuteInstructionで十分）
await othello.executeInstruction({ 
  type: 'navigate', 
  url: 'https://example.com' 
});
```

### 4. エラーハンドリング

```javascript
const othello = new Othello(config, {
  maxRetries: 3,
  saveSnapshotOnFailure: true
});

try {
  await othello.executeWithRetry(
    async () => await criticalOperation(),
    'criticalOp'
  );
} catch (error) {
  // 全ての再試行が失敗した場合
  console.error('All retries exhausted:', error);
  
  // スナップショットの場所を確認
  const errorLogs = othello.getExecutionHistory({ level: 'error' });
  const snapshotInfo = errorLogs[errorLogs.length - 1];
  
  console.log('Debug snapshot saved at:', snapshotInfo?.data?.snapshotPath);
  
  // 適切なリカバリー処理
  await performFallback();
}
```

### 5. 監視とアラート

```javascript
const othello = new Othello(config, {
  maxRetries: 3,
  logFile: './logs/production.log'
});

// 定期的にリトライ率を監視
setInterval(() => {
  const history = othello.getExecutionHistory({
    since: new Date(Date.now() - 3600000)  // 過去1時間
  });
  
  const retries = history.filter(
    e => e.action === 'executeWithRetry' && e.level === 'warn'
  );
  
  const successes = history.filter(
    e => e.action === 'executeWithRetry' && e.level === 'info'
  );
  
  const retryRate = retries.length / successes.length;
  
  if (retryRate > 0.5) {
    // リトライ率が50%を超えたらアラート
    console.warn(`High retry rate: ${(retryRate * 100).toFixed(2)}%`);
    // アラート送信処理...
  }
}, 300000);  // 5分ごと
```

## トラブルシューティング

### Q: リトライが機能しない

A: `maxRetries`が0以外に設定されているか確認：

```javascript
// ❌ 悪い例
const othello = new Othello(config);  // maxRetries = 0（デフォルト）

// ✅ 良い例
const othello = new Othello(config, { maxRetries: 3 });
```

### Q: セッション再接続が動作しない

A: `autoReconnect`が有効か、エラーが切断エラーと判定されているか確認：

```javascript
const othello = new Othello(config, {
  autoReconnect: true,  // 有効化
  debugMode: true       // ログで確認
});

// ログで "Session disconnected, attempting to reconnect..." を確認
```

### Q: スナップショットが保存されない

A: `saveSnapshotOnFailure`が有効か、ディレクトリの書き込み権限があるか確認：

```javascript
const othello = new Othello(config, {
  saveSnapshotOnFailure: true,
  snapshotDir: './error-snapshots'  // 書き込み可能なパス
});
```

### Q: リトライ間隔が長すぎる

A: `maxRetryDelay`を調整：

```javascript
const othello = new Othello(config, {
  maxRetries: 3,
  retryDelay: 500,      // 初期待機を短く
  maxRetryDelay: 5000   // 最大5秒に制限
});
```

## パフォーマンスへの影響

### メモリ使用量

- 実行履歴: エントリあたり約1-2KB
- スナップショット: 1ファイルあたり約10-50KB
- 推奨: 定期的に`clearExecutionHistory()`を呼び出す

### 実行時間

- リトライなし: 通常の実行時間
- リトライあり（成功時）: 通常の実行時間 + ログオーバーヘッド（< 1ms）
- リトライあり（失敗時）: 通常の実行時間 × (attempts + 1) + 待機時間の合計

例（maxRetries=3, デフォルト設定）:
- 1回目成功: +0秒
- 2回目成功: +1秒（1回失敗）
- 3回目成功: +3秒（2回失敗: 1秒 + 2秒）
- 4回目成功: +7秒（3回失敗: 1秒 + 2秒 + 4秒）
- 全て失敗: +15秒（4回失敗: 1秒 + 2秒 + 4秒 + 8秒）

## まとめ

エラーリカバリー機能は、以下のシナリオで特に有効です：

- ✅ ネットワークが不安定な環境
- ✅ CI/CDパイプラインでの自動テスト
- ✅ 長時間実行されるテストスイート
- ✅ 外部APIに依存する処理
- ✅ 本番環境での監視・自動テスト

適切に設定することで、テストの安定性と信頼性を大幅に向上させることができます。
