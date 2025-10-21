# Othello ♟️

**セッション管理・中継レイヤー** - Playwright Agentsと Playwright MCPの間を取り持つ中核基盤

Playwright AgentsとPlaywright MCPの間で、セッション管理・命令構造化・コンテキスト保持を担当する中継レイヤーです。

## 🏗️ アーキテクチャ

```
┌─────────────────────────────────────────────┐
│ 💭 自然言語層（ユーザー）                   │
│  - "ホテル予約フォームをテストして"         │
└──────┬──────────────────────────────────────┘
       │ 自然言語の要求
┌──────▼──────────────────────────────────────┐
│ 🎭 Playwright Agents層（公式エージェント）  │
│  - Planner: テスト計画を生成                │
│  - Generator: テストコードを生成            │
│  - Healer: 失敗したテストを修復             │
└──────┬────────────────────────▲─────────────┘
       │ MCP呼び出し           │ 実行結果
┌──────▼────────────────────────┴─────────────┐
│ ♟️  Othello層（このプロジェクト）            │
│  - セッション管理・ライフサイクル制御       │
│  - 命令構造化・コンテキスト保持             │
│  - MCPStdioClient統合                       │
└──────┬────────────────────────▲─────────────┘
       │ JSON RPC              │ 実行結果
┌──────▼────────────────────────┴─────────────┐
│ 🧩 MCP層（Playwright MCP Server）           │
│  - browser_snapshot, browser_click等        │
│  - プロトコル変換・ref解決                  │
└──────┬────────────────────────▲─────────────┘
       │ Playwright API        │ DOM状態
┌──────▼────────────────────────┴─────────────┐
│ 🌐 Playwright層（Execution）                │
│  - 実際のブラウザ操作                       │
└─────────────────────────────────────────────┘
```

## 🎯 Othelloの役割

### セッション管理
- MCPStdioClientのライフサイクル制御
- ブラウザインスタンスの保持・再利用
- エラーハンドリングと再接続

### 命令構造化
- 自然言語 → MCP JSON RPC変換
- ref取得とSnapshot解析の橋渡し
- 実行結果の整形と分析

### コンテキスト保持
- 実行履歴の管理
- テスト状態の追跡
- デバッグ情報の蓄積

## 🚀 使い方

### 基本的な使用方法

```javascript
const Othello = require('./src/playwright-agent');

// Othelloインスタンス作成
const othello = new Othello(config, { mockMode: false });

// セッション初期化
await othello.initializeSession();

// Snapshotを取得してページ構造を理解
const snapshot = await othello.mcpClient.snapshot();

// refベースで操作
await othello.mcpClient.callTool('browser_type', {
  ref: 'e16',
  text: '2025-10-27',
  intent: '宿泊日を入力'
});

// セッションクローズ
await othello.closeSession();
```

### エラーリカバリー機能（New! ✨）

自動再試行、指数バックオフ、セッション再接続、失敗時スナップショット保存で安定性を大幅向上：

```javascript
const Othello = require('./src/playwright-agent');

// エラーリカバリーオプション付きでインスタンス作成
const othello = new Othello(config, {
  mockMode: false,
  // 自動再試行設定
  maxRetries: 3,              // 最大3回まで再試行
  retryDelay: 1000,           // 初期待機時間: 1秒
  backoffMultiplier: 2,       // 指数バックオフ: 2倍ずつ増加
  maxRetryDelay: 30000,       // 最大待機時間: 30秒
  
  // セッション再接続
  autoReconnect: true,        // セッション切断時に自動再接続
  
  // 失敗時デバッグ
  saveSnapshotOnFailure: true,      // 失敗時にスナップショット保存
  snapshotDir: './error-snapshots'  // スナップショット保存先
});

await othello.initializeSession();

// executeWithRetry: 指定アクションを自動再試行
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

// 失敗時は自動的に：
// 1. 指数バックオフで待機時間を増やしながら再試行
// 2. セッション切断エラーの場合は自動再接続を試行
// 3. スナップショットをJSONで保存（タイムスタンプ付き）
```

### 実行履歴の管理

```javascript
// ログレベル指定でログ記録
await othello.logExecution('info', 'testAction', {
  status: 'success',
  duration: 1234
});

// 実行履歴の取得（フィルター可能）
const allHistory = othello.getExecutionHistory();
const errorLogs = othello.getExecutionHistory({ level: 'error' });
const recentLogs = othello.getExecutionHistory({ 
  since: new Date(Date.now() - 3600000) // 過去1時間
});

// 履歴の永続化
await othello.saveExecutionHistory('./logs/session-history.json');

// 履歴の読み込み（セッション復元）
await othello.loadExecutionHistory('./logs/session-history.json', {
  mode: 'append'  // 'replace' または 'append'
});
```

## ⚡ 主要機能

### 1. セッション管理
- **MCPStdioClient統合**: stdio通信による安定したMCP接続
- **ライフサイクル制御**: セッション初期化・維持・クローズの完全管理
- **自動再接続**: セッション切断時の自動復旧

### 2. エラーリカバリー（New! ✨）
- **自動再試行**: 一時的なエラーから自動回復（最大回数設定可能）
- **指数バックオフ**: 再試行間隔を段階的に増加（1秒→2秒→4秒...）
- **セッション再接続**: 切断エラーを検知して自動再接続
- **失敗スナップショット**: デバッグ用にエラー時の状態を自動保存

### 3. 実行履歴管理
- **構造化ログ**: JSON形式で実行履歴を記録（レベル・アクション・データ）
- **セッションID**: 各セッションを一意に識別
- **タイムスタンプ**: ISO 8601形式で正確な時刻記録
- **フィルター機能**: レベル・アクション・時刻範囲で絞り込み
- **永続化**: ファイル保存・読み込みでセッション復元

### 4. デバッグサポート
- **デバッグモード**: 詳細なログ出力とスタックトレース
- **スナップショット保存**: エラー時のページ状態を保存
- **実行時間計測**: 各操作のパフォーマンス追跡

## 🧪 テスト

```bash
# 全テスト実行
npm test

# カバレッジ付き
npm run test:coverage

# 特定のテストスイート
npx jest __tests__/error-recovery.test.js
npx jest __tests__/logging.test.js
npx jest __tests__/persistence.test.js
```

**テスト状況**: 121/154テスト（79%）パス
- ✅ ログ機能: 13テスト
- ✅ 永続化機能: 8テスト
- ✅ エラーリカバリー: 14テスト
- ✅ 設定管理: 17テスト
- ✅ セッション管理: 15テスト
- ✅ PlaywrightAgent: 24テスト
- ✅ Orchestrator: 12テスト
- ✅ ResultCollector: 12テスト

## 📖 APIリファレンス

### コンストラクタオプション

```javascript
new Othello(config, options)
```

**options:**
- `mockMode` (boolean): モックモードの有効化（デフォルト: false）
- `maxRetries` (number): 最大再試行回数（デフォルト: 0）
- `retryDelay` (number): 初期再試行遅延（ミリ秒、デフォルト: 1000）
- `backoffMultiplier` (number): バックオフ倍率（デフォルト: 2）
- `maxRetryDelay` (number): 最大再試行遅延（ミリ秒、デフォルト: 30000）
- `autoReconnect` (boolean): 自動再接続（デフォルト: true）
- `saveSnapshotOnFailure` (boolean): 失敗時スナップショット保存（デフォルト: false）
- `snapshotDir` (string): スナップショット保存先（デフォルト: './error-snapshots'）
- `debugMode` (boolean): デバッグモード（デフォルト: false）
- `logFile` (string): ログファイルパス（デフォルト: null）

### 主要メソッド

#### `executeWithRetry(action, actionName)`
指定されたアクションを自動再試行付きで実行。

**パラメータ:**
- `action` (Function): 実行する非同期関数
- `actionName` (string): アクション名（ログ記録用）

**戻り値:** アクションの実行結果

**例:**
```javascript
const result = await othello.executeWithRetry(
  async () => await othello.executeInstruction(instruction),
  'navigationAction'
);
```

#### `logExecution(level, action, data)`
実行履歴にログエントリを追加。

**パラメータ:**
- `level` (string): ログレベル（'info', 'warn', 'error'）
- `action` (string): アクション名
- `data` (object): ログデータ

#### `getExecutionHistory(filter)`
実行履歴を取得（オプションでフィルター）。

**filter:**
- `level` (string): ログレベルでフィルター
- `action` (string): アクション名でフィルター
- `since` (Date): 指定時刻以降のログのみ

#### `saveExecutionHistory(filepath)`
実行履歴をJSONファイルに保存。

#### `loadExecutionHistory(filepath, options)`
実行履歴をファイルから読み込み。

**options:**
- `mode` (string): 'replace'（置き換え）または 'append'（追加）

## 💡 ベストプラクティス

### 1. エラーリカバリーの活用
```javascript
// 推奨: ネットワーク不安定な環境では再試行を有効化
const othello = new Othello(config, {
  maxRetries: 3,
  retryDelay: 2000,
  autoReconnect: true
});
```

### 2. 失敗時のデバッグ
```javascript
// 推奨: 開発時はスナップショット保存を有効化
const othello = new Othello(config, {
  saveSnapshotOnFailure: true,
  snapshotDir: './debug-snapshots',
  debugMode: true,
  logFile: './logs/debug.log'
});
```

### 3. 本番環境設定
```javascript
// 推奨: 本番環境では適切なリトライとログ設定
const othello = new Othello(config, {
  maxRetries: 2,
  retryDelay: 1000,
  backoffMultiplier: 2,
  autoReconnect: true,
  saveSnapshotOnFailure: false,  // 本番ではfalse
  logFile: './logs/production.log'
});
```

### 4. セッション復元
```javascript
// 推奨: 長時間実行時は定期的に履歴を保存
setInterval(async () => {
  await othello.saveExecutionHistory('./logs/checkpoint.json');
}, 300000); // 5分ごと

// クラッシュ後の復元
await othello.loadExecutionHistory('./logs/checkpoint.json', {
  mode: 'replace'
});
```

## 📚 詳細ドキュメント

- [Phase 8: MCP Session Management](docs/phase8-mcp-session.md)
- [三層構造の設計原則](docs/architecture.md)
- [Playwright Agents統合ガイド](docs/playwright-agents.md)

