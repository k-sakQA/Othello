# Othello-Executor テクニカルガイド

## 概要

Othello-Executorは、Generator が生成したMCP命令を**Playwright MCP**経由で実際に実行するエージェントです。

### 主要機能

1. **MCP命令実行**: Generator生成の命令を順次実行
2. **エラーハンドリング**: 失敗時の詳細情報取得
3. **スナップショット取得**: 失敗時のページ状態を記録
4. **実行結果の記録**: 各命令の成功/失敗を追跡

---

## アーキテクチャ

### ワークフロー

```
┌─────────────────┐
│ Generator出力   │
│ (MCP命令配列)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Executor       │
│  execute()      │
└────────┬────────┘
         │
         │ 各命令を順次実行
         ▼
┌─────────────────┐
│ Playwright MCP  │
│ - navigate      │
│ - click         │
│ - fill          │
│ - verify_*      │
└────────┬────────┘
         │
         ▼
      成功? ─────Yes──────→ 次の命令へ
         │
        No
         │
         ▼
┌─────────────────┐
│ スナップショット │
│ + エラー情報    │
│ → Healerへ      │
└─────────────────┘
```

### コンポーネント構成

```javascript
OthelloExecutor
├── playwrightMCP (Playwright MCP Client)
├── config (実行設定)
├── execute(testCase) → { success, executed_instructions, error, snapshot }
├── executeInstruction(instruction) → { success, duration_ms, mcp_result }
├── buildMCPArguments(instruction) → MCP引数
└── captureSnapshot() → スナップショット
```

---

## 使用方法

### 基本的な使い方

```javascript
const OthelloExecutor = require('./src/agents/othello-executor');
const PlaywrightMCPClient = require('./src/mcp/playwright-client');

// Playwright MCPクライアント初期化
const playwrightMCP = new PlaywrightMCPClient({
  endpoint: 'http://localhost:8931/mcp',
  timeout: 30000
});

// Executor インスタンス作成
const executor = new OthelloExecutor({
  playwrightMCP,
  config: {
    timeout: 30000,
    headless: true
  }
});

// Generator出力のMCP命令を実行
const testCase = {
  test_case_id: 'TC001',
  instructions: [
    {
      type: 'navigate',
      url: 'https://example.com',
      description: 'トップページを開く'
    },
    {
      type: 'fill',
      selector: 'input#email',
      ref: 'e1',
      value: 'test@example.com',
      description: 'メールアドレスを入力'
    },
    {
      type: 'click',
      selector: 'button#submit',
      ref: 'e2',
      description: '送信ボタンをクリック'
    }
  ]
};

const result = await executor.execute(testCase);

if (result.success) {
  console.log('✅ テスト成功！');
  console.log(`実行命令数: ${result.executed_instructions}`);
} else {
  console.log('❌ テスト失敗');
  console.log(`エラー: ${result.error.message}`);
  console.log(`スナップショット: ${result.snapshot}`);
}
```

---

## サポートされるMCP命令

### 1. navigate

ページに移動します。

**命令形式:**
```json
{
  "type": "navigate",
  "url": "https://example.com",
  "description": "トップページを開く"
}
```

**MCP呼び出し:**
```javascript
playwrightMCP.navigate({
  url: "https://example.com",
  intent: "トップページを開く"
});
```

---

### 2. click

要素をクリックします。

**命令形式:**
```json
{
  "type": "click",
  "selector": "button#submit",
  "ref": "e50",
  "description": "送信ボタンをクリック"
}
```

**MCP呼び出し:**
```javascript
playwrightMCP.click({
  element: "送信ボタンをクリック",
  ref: "e50",
  intent: "送信ボタンをクリック"
});
```

---

### 3. fill

入力フィールドに値を入力します。

**命令形式:**
```json
{
  "type": "fill",
  "selector": "input#email",
  "ref": "e10",
  "value": "test@example.com",
  "description": "メールアドレスを入力"
}
```

**MCP呼び出し:**
```javascript
playwrightMCP.fill({
  element: "メールアドレスを入力",
  ref: "e10",
  text: "test@example.com",
  intent: "メールアドレスを入力"
});
```

---

### 4. verify_text_visible

テキストが表示されていることを確認します。

**命令形式:**
```json
{
  "type": "verify_text_visible",
  "text": "送信完了",
  "description": "成功メッセージが表示される"
}
```

**MCP呼び出し:**
```javascript
playwrightMCP.verify_text_visible({
  text: "送信完了",
  intent: "成功メッセージが表示される"
});
```

---

### 5. verify_element_visible

要素が表示されていることを確認します。

**命令形式:**
```json
{
  "type": "verify_element_visible",
  "role": "button",
  "accessibleName": "送信",
  "description": "送信ボタンが表示されている"
}
```

**MCP呼び出し:**
```javascript
playwrightMCP.verify_element_visible({
  role: "button",
  accessibleName: "送信",
  intent: "送信ボタンが表示されている"
});
```

---

### 6. wait_for

指定時間待機します。

**命令形式:**
```json
{
  "type": "wait_for",
  "time": 2,
  "description": "ページ読み込みを待つ"
}
```

**MCP呼び出し:**
```javascript
playwrightMCP.wait_for({
  time: 2,
  intent: "ページ読み込みを待つ"
});
```

---

### 7. screenshot

スクリーンショットを取得します。

**命令形式:**
```json
{
  "type": "screenshot",
  "path": "./screenshots/test.png",
  "description": "スクリーンショットを取得"
}
```

**MCP呼び出し:**
```javascript
playwrightMCP.take_screenshot({
  filename: "./screenshots/test.png",
  intent: "スクリーンショットを取得"
});
```

---

## 実行結果の形式

### 成功時

```json
{
  "test_case_id": "TC001",
  "success": true,
  "executed_instructions": 5,
  "failed_instructions": 0,
  "instructions_results": [
    {
      "success": true,
      "instruction_type": "navigate",
      "description": "トップページを開く",
      "duration_ms": 234
    },
    {
      "success": true,
      "instruction_type": "fill",
      "description": "メールアドレスを入力",
      "duration_ms": 156
    }
  ],
  "duration_ms": 1250,
  "timestamp": "2025-10-28T12:34:56.789Z"
}
```

### 失敗時

```json
{
  "test_case_id": "TC002",
  "success": false,
  "executed_instructions": 3,
  "failed_instructions": 1,
  "instructions_results": [
    {
      "success": true,
      "instruction_type": "navigate",
      "description": "トップページを開く",
      "duration_ms": 245
    },
    {
      "success": true,
      "instruction_type": "fill",
      "description": "メールアドレスを入力",
      "duration_ms": 123
    },
    {
      "success": false,
      "instruction_type": "click",
      "error": "Element not found: button#missing"
    }
  ],
  "error": {
    "message": "Element not found: button#missing",
    "instruction_index": 2,
    "instruction_type": "click"
  },
  "snapshot": {
    "role": "WebArea",
    "children": [
      {
        "role": "textbox",
        "name": "メールアドレス",
        "ref": "e10"
      },
      {
        "role": "button",
        "name": "戻る",
        "ref": "e20"
      }
    ]
  },
  "duration_ms": 520,
  "timestamp": "2025-10-28T12:34:56.789Z"
}
```

---

## パフォーマンス特性

### 処理時間

| 操作 | 平均時間 | 備考 |
|------|---------|------|
| navigate | 200-500ms | ページ読み込み時間に依存 |
| click | 50-150ms | 要素の検索時間含む |
| fill | 50-100ms | 入力検証時間含む |
| verify_text_visible | 30-100ms | DOM検索時間 |
| verify_element_visible | 30-100ms | アクセシビリティツリー検索 |
| wait_for | 指定時間 | 明示的待機 |
| snapshot取得 | 50-200ms | ページサイズに依存 |

### スケーラビリティ

- **並列実行**: 複数のブラウザインスタンスで並列実行可能
- **タイムアウト管理**: 各命令に個別のタイムアウト設定可能
- **リソース効率**: ヘッドレスモードでメモリ使用量を削減

---

## エラーハンドリング

### エラーの種類

| エラータイプ | 説明 | 対処方法 |
|-------------|------|----------|
| Element not found | セレクタが見つからない | Healerで自動修復 |
| Timeout | 操作がタイムアウト | wait_for を追加 |
| Connection refused | MCPサーバー未起動 | MCPサーバーを起動 |
| Assertion failed | 検証失敗 | 期待値を確認 |

### エラー時の動作

1. **即座に停止**: エラー発生時、後続の命令は実行しない
2. **スナップショット取得**: 失敗時のページ状態を記録
3. **詳細情報収集**: エラーメッセージ、命令インデックス、タイプを記録
4. **Healerへ渡す**: 収集した情報をHealerに渡して自動修復を試みる

---

## Healerとの統合

Executorの失敗情報をHealerに渡して自動修復します。

```javascript
const executor = new OthelloExecutor({ playwrightMCP });
const healer = new OthelloHealer({ llm });

// テスト実行
const result = await executor.execute(testCase);

if (!result.success) {
  // Healerで分析・修復
  const healResult = await healer.heal({
    test_case_id: result.test_case_id,
    instructions: testCase.instructions,
    error: result.error,
    snapshot: result.snapshot
  });

  if (healResult.success) {
    // 修復成功 → 再実行
    const retryResult = await executor.execute({
      test_case_id: result.test_case_id,
      instructions: healResult.fixed_instructions
    });
    console.log('再実行結果:', retryResult.success);
  } else {
    // 実際のバグ → レポート
    console.log('バグレポート:', healResult.bug_report);
  }
}
```

---

## Playwright MCP 連携

### MCPクライアントの実装

```javascript
class PlaywrightMCPClient {
  constructor(config) {
    this.endpoint = config.endpoint || 'http://localhost:8931/mcp';
    this.timeout = config.timeout || 30000;
  }

  async navigate(args) {
    return await this.callMCP('browser_navigate', args);
  }

  async click(args) {
    return await this.callMCP('browser_click', args);
  }

  async fill(args) {
    return await this.callMCP('browser_type', args);
  }

  async verify_text_visible(args) {
    return await this.callMCP('browser_verify_text_visible', args);
  }

  async verify_element_visible(args) {
    return await this.callMCP('browser_verify_element_visible', args);
  }

  async wait_for(args) {
    return await this.callMCP('browser_wait_for', args);
  }

  async snapshot() {
    return await this.callMCP('browser_snapshot', {});
  }

  async callMCP(method, args) {
    const axios = require('axios');
    try {
      const response = await axios.post(
        this.endpoint,
        {
          method: 'tools/call',
          params: {
            name: method,
            arguments: args
          }
        },
        {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return this.parseResponse(response.data);
    } catch (error) {
      throw new Error(`MCP call failed: ${error.message}`);
    }
  }

  parseResponse(data) {
    if (data.content && Array.isArray(data.content)) {
      const textContent = data.content.find(c => c.type === 'text');
      if (textContent) {
        try {
          return JSON.parse(textContent.text);
        } catch {
          return { success: true };
        }
      }
    }
    return { success: false, error: 'Invalid MCP response' };
  }
}

module.exports = PlaywrightMCPClient;
```

---

## トラブルシューティング

### 問題: MCPサーバーに接続できない

**エラー**: `Connection refused: MCP server not running`

**原因**: Playwright MCPサーバーが起動していない

**解決策**:
```bash
# MCPサーバーを起動
npx @modelcontextprotocol/server-playwright
```

---

### 問題: 要素が見つからない

**エラー**: `Element not found: button#submit`

**原因**: セレクタが間違っている、または要素が存在しない

**解決策**:
1. Healerで自動修復を試みる
2. スナップショットを確認して正しいセレクタを特定
3. `ref` を使用してより安定したセレクタに変更

---

### 問題: タイムアウトが頻発する

**エラー**: `Timeout: Element not found within 30000ms`

**原因**: ページ読み込みが遅い、または要素の表示が遅い

**解決策**:
1. `wait_for` 命令を追加
2. タイムアウト時間を延長
3. ページ読み込み完了を待つ命令を追加

```javascript
const executor = new OthelloExecutor({
  playwrightMCP,
  config: {
    timeout: 60000  // 60秒に延長
  }
});
```

---

## ベストプラクティス

### 1. エラーハンドリング

```javascript
try {
  const result = await executor.execute(testCase);
  
  if (!result.success) {
    // Healerで自動修復
    const healResult = await healer.heal({
      test_case_id: result.test_case_id,
      instructions: testCase.instructions,
      error: result.error,
      snapshot: result.snapshot
    });
    
    if (healResult.success) {
      // 再実行
      await executor.execute({
        test_case_id: result.test_case_id,
        instructions: healResult.fixed_instructions
      });
    }
  }
} catch (error) {
  console.error('Executor error:', error);
}
```

### 2. タイムアウト設定

```javascript
// ✅ 推奨: 適切なタイムアウト設定
const executor = new OthelloExecutor({
  playwrightMCP,
  config: {
    timeout: 30000  // 30秒
  }
});

// ❌ 非推奨: タイムアウトが短すぎる
const executor = new OthelloExecutor({
  playwrightMCP,
  config: {
    timeout: 5000  // 5秒（短すぎる）
  }
});
```

### 3. スナップショットの活用

```javascript
const result = await executor.execute(testCase);

if (!result.success && result.snapshot) {
  // スナップショットを解析
  console.log('失敗時のページ状態:');
  console.log('  Role:', result.snapshot.role);
  console.log('  子要素数:', result.snapshot.children?.length);
  
  // 利用可能な要素を確認
  result.snapshot.children?.forEach(child => {
    console.log(`  - ${child.role}: ${child.name} [${child.ref}]`);
  });
}
```

### 4. 命令の粒度

```javascript
// ✅ 推奨: 適切な粒度
const instructions = [
  { type: 'navigate', url: 'https://example.com', description: 'ページを開く' },
  { type: 'fill', selector: 'input#name', value: 'Test', description: '名前入力' },
  { type: 'click', selector: 'button#submit', description: '送信' },
  { type: 'verify_text_visible', text: '成功', description: '成功確認' }
];

// ❌ 非推奨: 粒度が粗すぎる
const instructions = [
  { type: 'navigate', url: 'https://example.com', description: '全部実行' }
];
```

---

## まとめ

Othello-Executorは、Generator生成のMCP命令を実際に実行する重要なエージェントです。

**主要な利点:**
- 🚀 **自動実行**: Generator出力をそのまま実行可能
- 🔍 **詳細追跡**: 各命令の成功/失敗を記録
- 📸 **スナップショット**: 失敗時のページ状態を保存
- 🔄 **Healer連携**: 失敗情報を自動修復に活用

**使用シーン:**
- テスト自動実行
- 回帰テスト
- CI/CDパイプライン統合
- Healer連携による自動修復

---

## 参考資料

- [Othello-Executor 実装コード](../src/agents/othello-executor.js)
- [Othello-Executor テストコード](../__tests__/agents/othello-executor.test.js)
- [デモスクリプト](../examples/demo-executor.js)
- [Playwright MCP Documentation](https://github.com/modelcontextprotocol/servers/tree/main/src/playwright)
- [Othello-Generator テクニカルガイド](./OTHELLO_GENERATOR_TECHNICAL_GUIDE.md)
- [Othello-Healer テクニカルガイド](./OTHELLO_HEALER_TECHNICAL_GUIDE.md)
