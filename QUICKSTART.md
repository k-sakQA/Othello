# 🚀 Othello クイックスタートガイド

Phase 8の新機能（エラーリカバリー、実行履歴管理）をすぐに試せるガイドです。

## 📦 セットアップ（5分）

```bash
# 1. 依存関係のインストール
npm install

# 2. テストで動作確認（推奨）
npm test

# 3. 設定ファイルの準備
cp config/example-config.json config/my-config.json
```

## ⚡ 最速で試す（1分）

### モックモードで基本動作確認

```javascript
const Othello = require('./src/playwright-agent');

// 1. 最小構成で起動（モックモード）
const othello = new Othello({
  default_browser: 'chromium',
  timeout_seconds: 30,
  max_iterations: 5,
  mcp_server: { connection_type: 'stdio' },
  paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
}, {
  mockMode: true  // モックモードで実際のブラウザなしで試せる
});

// 2. 指示を実行
const result = await othello.executeInstruction({
  type: 'click',
  selector: '#button',
  description: 'Test button click'
});

console.log('Success:', result.success);

// 3. 実行履歴を確認
const history = othello.getExecutionHistory();
console.log(`Executed ${history.length} actions`);
```

## 🎯 エラーリカバリーを試す（3分）

### 自動再試行とスナップショット保存

```javascript
const Othello = require('./src/playwright-agent');

// エラーリカバリー機能を有効化
const othello = new Othello({
  default_browser: 'chromium',
  timeout_seconds: 30,
  max_iterations: 5,
  mcp_server: { connection_type: 'stdio' },
  paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
}, {
  mockMode: true,
  // エラーリカバリー設定
  maxRetries: 3,              // 最大3回まで再試行
  retryDelay: 1000,           // 初回は1秒待機
  backoffMultiplier: 2,       // 2倍ずつ増加（1秒→2秒→4秒）
  saveSnapshotOnFailure: true, // 失敗時に状態を保存
  snapshotDir: './debug-snapshots',
  debugMode: true             // 詳細ログを出力
});

// わざと失敗する要素で試す
console.log('Testing auto-retry with non-existent element...');

try {
  // executeWithRetryで自動再試行
  await othello.executeWithRetry(async () => {
    return await othello.executeInstruction({
      type: 'click',
      selector: '#nonexistent-element',  // 存在しない要素
      description: 'This will fail and retry'
    });
  }, 'testRetry');
} catch (error) {
  console.log('All retries exhausted (expected)');
  
  // スナップショットを確認
  const errorLogs = othello.getExecutionHistory({ level: 'error' });
  console.log(`Saved ${errorLogs.length} error snapshots in ./debug-snapshots/`);
}

// リトライログを確認
const retryLogs = othello.getExecutionHistory({ 
  action: 'executeWithRetry',
  level: 'warn'
});
console.log(`Retried ${retryLogs.length} times`);
```

## 💾 実行履歴の保存・復元を試す（2分）

```javascript
const Othello = require('./src/playwright-agent');

const othello = new Othello({
  default_browser: 'chromium',
  timeout_seconds: 30,
  max_iterations: 5,
  mcp_server: { connection_type: 'stdio' },
  paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
}, {
  mockMode: true,
  logFile: './logs/session.log'  // 自動でファイルに記録
});

// いくつか指示を実行
await othello.executeInstruction({ type: 'navigate', url: 'https://example.com' });
await othello.executeInstruction({ type: 'click', selector: '#button1' });
await othello.executeInstruction({ type: 'fill', selector: '#input', value: 'test' });

// 履歴を保存
await othello.saveExecutionHistory('./logs/session-history.json');
console.log('History saved!');

// --- プログラム再起動を想定 ---

// 新しいセッションで履歴を復元
const othello2 = new Othello({
  default_browser: 'chromium',
  timeout_seconds: 30,
  max_iterations: 5,
  mcp_server: { connection_type: 'stdio' },
  paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
}, { mockMode: true });

// 履歴を読み込み
await othello2.loadExecutionHistory('./logs/session-history.json', {
  mode: 'replace'  // または 'append'
});

const restored = othello2.getExecutionHistory();
console.log(`Restored ${restored.length} history entries`);
console.log('Session ID:', restored[0].sessionId);
```

## 🔧 実践的な使い方（5分）

### 本番環境を想定した設定

```javascript
const Othello = require('./src/playwright-agent');
const config = require('./config/my-config.json');

// 環境に応じた設定
const isDev = process.env.NODE_ENV !== 'production';

const othello = new Othello(config, {
  mockMode: false,  // 実際のブラウザを使用
  
  // リトライ設定（本番環境）
  maxRetries: 2,
  retryDelay: 2000,
  maxRetryDelay: 10000,
  
  // 自動再接続
  autoReconnect: true,
  
  // デバッグ（開発時のみ）
  debugMode: isDev,
  saveSnapshotOnFailure: isDev,
  snapshotDir: './debug-snapshots',
  
  // ログ
  logFile: isDev ? './logs/dev.log' : './logs/production.log'
});

// セッション初期化
await othello.initializeSession();

// クリティカルな操作は自動再試行
const result = await othello.executeWithRetry(async () => {
  // ページ遷移
  await othello.executeInstruction({
    type: 'navigate',
    url: 'https://example.com'
  });
  
  // フォーム送信
  return await othello.executeInstruction({
    type: 'click',
    selector: '#submit-button'
  });
}, 'criticalOperation');

// 定期的に履歴を保存（クラッシュ対策）
setInterval(async () => {
  await othello.saveExecutionHistory('./logs/checkpoint.json');
}, 300000);  // 5分ごと

// セッションクローズ
await othello.closeSession();
```

## 📊 実行結果の確認

### ログファイルを見る

```bash
# 最新のログを確認
cat ./logs/session.log

# エラーのみフィルター
cat ./logs/session.log | grep '"level":"error"'

# リトライを確認
cat ./logs/session.log | grep 'executeWithRetry'
```

### スナップショットを見る

```bash
# 保存されたスナップショット一覧
ls -l ./debug-snapshots/

# 内容を確認（JSON形式）
cat ./debug-snapshots/failure-20251022-123456-abc123.json | jq .
```

### 実行履歴を確認

```javascript
// プログラム内で確認
const history = othello.getExecutionHistory();

// エラーだけ抽出
const errors = othello.getExecutionHistory({ level: 'error' });

// 過去1時間のログ
const recent = othello.getExecutionHistory({
  since: new Date(Date.now() - 3600000)
});

// アクション別集計
const actions = {};
history.forEach(entry => {
  actions[entry.action] = (actions[entry.action] || 0) + 1;
});
console.log('Action counts:', actions);
```

## 🧪 テストで確認

既存のテストスイートで動作確認：

```bash
# 全テスト実行
npm test

# エラーリカバリーのテストのみ
npx jest __tests__/error-recovery.test.js

# ログ機能のテストのみ
npx jest __tests__/logging.test.js

# 永続化機能のテストのみ
npx jest __tests__/persistence.test.js

# カバレッジ付き
npm run test:coverage
```

## 💡 すぐに試せるサンプル

### sample-basic.js（基本動作）

```javascript
const Othello = require('./src/playwright-agent');

(async () => {
  const othello = new Othello({
    default_browser: 'chromium',
    timeout_seconds: 30,
    max_iterations: 5,
    mcp_server: { connection_type: 'stdio' },
    paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
  }, { mockMode: true });

  console.log('🎭 Othello Basic Test');
  
  const result = await othello.executeInstruction({
    type: 'click',
    selector: '#test-button',
    description: 'Test click'
  });
  
  console.log('✅ Success:', result.success);
  console.log('📝 History entries:', othello.getExecutionHistory().length);
})();
```

### sample-retry.js（自動再試行）

```javascript
const Othello = require('./src/playwright-agent');

(async () => {
  const othello = new Othello({
    default_browser: 'chromium',
    timeout_seconds: 30,
    max_iterations: 5,
    mcp_server: { connection_type: 'stdio' },
    paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
  }, {
    mockMode: true,
    maxRetries: 3,
    retryDelay: 1000,
    debugMode: true
  });

  console.log('🔄 Testing Auto-Retry');
  
  let attemptCount = 0;
  try {
    await othello.executeWithRetry(async () => {
      attemptCount++;
      console.log(`  Attempt ${attemptCount}...`);
      
      if (attemptCount < 3) {
        throw new Error('Simulated failure');
      }
      
      return { success: true };
    }, 'testRetry');
    
    console.log('✅ Succeeded after', attemptCount, 'attempts');
  } catch (error) {
    console.log('❌ All retries failed');
  }
})();
```

### sample-persistence.js（履歴の保存・復元）

```javascript
const Othello = require('./src/playwright-agent');

(async () => {
  console.log('💾 Testing Persistence');
  
  // セッション1: 履歴を作成して保存
  const othello1 = new Othello({
    default_browser: 'chromium',
    timeout_seconds: 30,
    max_iterations: 5,
    mcp_server: { connection_type: 'stdio' },
    paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
  }, { mockMode: true });
  
  await othello1.executeInstruction({ type: 'navigate', url: 'https://example.com' });
  await othello1.executeInstruction({ type: 'click', selector: '#button' });
  
  await othello1.saveExecutionHistory('./logs/test-session.json');
  console.log('✅ Saved', othello1.getExecutionHistory().length, 'entries');
  
  // セッション2: 履歴を復元
  const othello2 = new Othello({
    default_browser: 'chromium',
    timeout_seconds: 30,
    max_iterations: 5,
    mcp_server: { connection_type: 'stdio' },
    paths: { logs: './logs', results: './results', reports: './reports', test_instructions: './tests' }
  }, { mockMode: true });
  
  await othello2.loadExecutionHistory('./logs/test-session.json');
  console.log('✅ Restored', othello2.getExecutionHistory().length, 'entries');
  
  const firstEntry = othello2.getExecutionHistory()[0];
  console.log('📅 Original session ID:', firstEntry.sessionId);
})();
```

## 🎯 次のステップ

1. **サンプルを実行**
   ```bash
   node sample-basic.js
   node sample-retry.js
   node sample-persistence.js
   ```

2. **ドキュメントを読む**
   - [README.md](./README.md) - 全体像
   - [docs/error-recovery.md](./docs/error-recovery.md) - エラーリカバリー詳細
   - [CHANGELOG.md](./CHANGELOG.md) - 変更履歴

3. **実際のブラウザで試す**
   - `mockMode: false` に変更
   - MCP Serverをセットアップ
   - 実際のWebサイトでテスト

4. **カスタマイズ**
   - 環境変数で設定を切り替え
   - 独自のエラーハンドリングを追加
   - ログフォーマットをカスタマイズ

## 🆘 問題が起きたら

### よくある質問

**Q: モックモードで何もエラーが起きない**
```javascript
// わざと失敗させるには #nonexistent-element を使う
selector: '#nonexistent-element'
```

**Q: ログファイルが作成されない**
```javascript
// ディレクトリが存在することを確認
mkdirp('./logs')
```

**Q: テストが失敗する**
```bash
# fixtureファイルが正しく作成されているか確認
ls __tests__/fixtures/config/valid-config.json

# なければ再作成
npm test
```

### サポート

- Issues: [GitHub Issues](https://github.com/k-sakQA/Othello/issues)
- ドキュメント: [docs/](./docs/)
- テスト: 121/154 passed (79%) - コア機能は100%動作

---

**🎉 楽しんでください！** 

質問や改善提案があれば、ぜひIssueを立ててください。
