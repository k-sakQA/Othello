# Changelog

All notable changes to the Othello project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase 8: Session Management & Error Recovery

#### エラーリカバリー機能 (2025-10-22)
- **自動再試行**: `maxRetries`オプションで最大再試行回数を設定可能
- **指数バックオフ**: 再試行間隔を段階的に増加（`retryDelay`, `backoffMultiplier`, `maxRetryDelay`）
- **セッション自動再接続**: `autoReconnect`オプションでセッション切断時に自動再接続
- **失敗時スナップショット保存**: `saveSnapshotOnFailure`で失敗時の状態をJSON形式で保存
- **executeWithRetry()**: 任意のアクションを自動再試行付きで実行するメソッド
- **isSessionDisconnected()**: セッション切断エラーを判定するメソッド
- **saveFailureSnapshot()**: 失敗時のスナップショットを保存するメソッド

Tests: 14テスト追加（全パス）
- 自動再試行機能: 5テスト
- 指数バックオフ: 2テスト
- セッション再接続: 3テスト
- スナップショット保存: 3テスト
- 統合テスト: 1テスト

#### 実行履歴管理 (2025-10-21)
- **logExecution()**: 構造化ログ記録（レベル、アクション、データ、タイムスタンプ）
- **getExecutionHistory()**: フィルター機能付き履歴取得（level, action, since）
- **clearExecutionHistory()**: 履歴クリア
- **セッションID**: 各セッションを一意に識別
- **デバッグモード**: 詳細ログとスタックトレース出力
- **ログファイル出力**: 指定パスへの自動ログ記録

Tests: 13テスト追加（全パス）

#### 永続化機能 (2025-10-21)
- **saveExecutionHistory()**: 実行履歴をJSON形式でファイル保存
- **loadExecutionHistory()**: 履歴の読み込み（replace/appendモード）
- **セッション復元**: 以前の実行履歴を引き継いで再開可能
- **ディレクトリ自動作成**: 保存先ディレクトリの自動生成

Tests: 8テスト追加（全パス）

#### MCP Session Management (2025-10-20)
- **MCPStdioClient統合**: stdio通信によるMCPサーバー接続
- **セッションライフサイクル管理**: 初期化・維持・クローズの完全制御
- **ブラウザ管理**: MCPサーバー側でのブラウザインスタンス管理
- **エラーハンドリング**: MCP通信エラーの適切な処理
- **アクションマッピング**: 指示タイプからMCPツール名への変換

Tests: 15テスト追加（全パス）

### Changed

#### テスト整備
- Jest導入とテスト環境構築
- fixtureファイル追加（`__tests__/fixtures/config/valid-config.json`）
- 121/154テスト（79%）がパス
  - ✅ ログ機能: 13テスト
  - ✅ 永続化機能: 8テスト
  - ✅ エラーリカバリー: 14テスト
  - ✅ 設定管理: 17テスト
  - ✅ セッション管理: 15テスト
  - ✅ PlaywrightAgent: 24テスト
  - ✅ Orchestrator: 12テスト
  - ✅ ResultCollector: 12テスト

#### 設定ファイル構造
- 必須項目追加: `default_browser`, `timeout_seconds`, `max_iterations`
- paths設定拡張: `logs`, `results`, `reports`, `test_instructions`, `screenshots`

### Fixed
- persistenceテストのエラーパス修正（Windows互換性）
- ディレクトリ自動作成のバグ修正
- ログエントリの`action`プロパティ命名統一

## [0.1.0] - 2025-10-15

### Added
- 初期プロジェクト構造
- 基本的なPlaywrightAgent実装
- ConfigManager実装
- 基本的なテストフレームワーク

### Phase 1-7 (履歴省略)
- Phase 1: 基本構造
- Phase 2: 設定管理
- Phase 3: コマンドライン
- Phase 4: 命令生成
- Phase 5: オーケストレーション
- Phase 6: レポート生成
- Phase 7: カバレッジ分析

---

## Commit History

- `15db3a9` - fix: テストfixtureファイル追加とpersistenceテスト修正
- `fd9ebaa` - feat: エラーリカバリー機能実装（TDD）
- `a3ae40e` - test: ログ・永続化機能のテスト追加（21テスト全パス）
- `b24efa7` - feat: 実行履歴の永続化機能実装
- `a09e114` - feat: ログファイル出力機能実装
- Phase 8以前のコミット履歴...

---

## Migration Guide

### v0.1.x → v0.2.x (Phase 8)

#### 新しいコンストラクタオプション
```javascript
// Before
const othello = new Othello(config);

// After - エラーリカバリー機能を活用
const othello = new Othello(config, {
  maxRetries: 3,
  autoReconnect: true,
  saveSnapshotOnFailure: true,
  logFile: './logs/execution.log'
});
```

#### 実行履歴の活用
```javascript
// 履歴の保存（新機能）
await othello.saveExecutionHistory('./logs/session.json');

// 履歴の取得（新機能）
const errors = othello.getExecutionHistory({ level: 'error' });
```

#### 自動再試行の活用
```javascript
// Before - 手動でリトライ処理
let result;
for (let i = 0; i < 3; i++) {
  try {
    result = await othello.executeInstruction(instruction);
    break;
  } catch (error) {
    if (i === 2) throw error;
    await new Promise(r => setTimeout(r, 1000));
  }
}

// After - executeWithRetryを使用
const result = await othello.executeWithRetry(
  () => othello.executeInstruction(instruction),
  'instructionExecution'
);
```

### Breaking Changes
なし（後方互換性を維持）

### Deprecations
なし
