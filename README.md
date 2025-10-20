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

## 📚 詳細ドキュメント

- [Phase 8: MCP Session Management](docs/phase8-mcp-session.md)
- [三層構造の設計原則](docs/architecture.md)
- [Playwright Agents統合ガイド](docs/playwright-agents.md)

