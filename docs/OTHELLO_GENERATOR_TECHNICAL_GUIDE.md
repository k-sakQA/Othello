# 🔧 Othello-Generator 技術ガイド

## 📖 概要

**Othello-Generator** は、Othello-Plannerが生成したテストケース（手順と期待結果）を、Playwright MCPで実行可能なコマンドシーケンスに変換するエージェントです。

テストの「何をするか」という記述から、「どのように実行するか」という具体的な命令を自動生成します。

---

## 🔄 仕組み（アーキテクチャ）

### 処理フロー全体

```
入力
  ├─ テストケース配列（Plannerの出力）
  ├─ Snapshot（ページDOM構造）
  └─ 対象URL

     ↓

ステップ1: テストケース解釈
  └─ 手順と期待結果を分析

ステップ2: Snapshot分析
  └─ 要素リストを抽出（role, name, ref）

ステップ3: プロンプト構築
  └─ LLMに送るプロンプトを生成

ステップ4: LLM変換
  └─ GPT-4o/Claudeにテストケース→MCP命令変換を依頼

ステップ5: レスポンス解析
  └─ JSON形式のMCP命令をパース

ステップ6: 検証
  └─ 生成された命令の妥当性チェック

出力
  └─ MCP命令配列（実行可能なシーケンス）
```

### クラス構成

```javascript
class OthelloGenerator {
  // メインロジック
  generate(options)                      // 全体フロー
  
  // プロンプト構築
  buildGenerationPrompt(options)         // LLMプロンプト生成
  formatSnapshotForPrompt(snapshot)      // Snapshot整形
  
  // レスポンス処理
  parseGenerationResponse(content)       // JSON抽出・パース
  
  // Snapshot分析
  extractSnapshotElements(snapshot)      // 要素リスト抽出
  
  // 検証
  validateInstructions(instructions)     // 命令の妥当性チェック
}
```

---

## 🔧 各ステップの詳細

### ステップ1: テストケース解釈

**入力例**:
```javascript
{
  case_id: 'TC001',
  title: '予約フォームの入力テスト',
  steps: [
    '予約ページを開く',
    '氏名フィールドに「山田太郎」を入力',
    '予約ボタンをクリック'
  ],
  expected_results: [
    '確認ページに遷移する',
    '入力した情報が表示される'
  ],
  aspect_no: 4,
  priority: 'P0'
}
```

**処理**:
- 手順数をカウント（3ステップ）
- 期待結果数をカウント（2つ）
- 入力値を抽出（「山田太郎」）

---

### ステップ2: Snapshot分析

**入力例**:
```javascript
{
  role: 'WebArea',
  name: 'Reservation Page',
  children: [
    { role: 'textbox', name: '氏名', ref: 'e10' },
    { role: 'button', name: '予約する', ref: 'e20' }
  ]
}
```

**`extractSnapshotElements()`の実装**:
```javascript
extractSnapshotElements(snapshot, elements = []) {
  if (!snapshot || typeof snapshot !== 'object') {
    return elements;
  }

  // 現在のノードを追加
  if (snapshot.role) {
    elements.push({
      role: snapshot.role,
      name: snapshot.name,
      ref: snapshot.ref
    });
  }

  // 子要素を再帰的に処理
  if (Array.isArray(snapshot.children)) {
    for (const child of snapshot.children) {
      this.extractSnapshotElements(child, elements);
    }
  }

  return elements;
}
```

**出力**:
```javascript
[
  { role: 'WebArea', name: 'Reservation Page', ref: undefined },
  { role: 'textbox', name: '氏名', ref: 'e10' },
  { role: 'button', name: '予約する', ref: 'e20' }
]
```

---

### ステップ3: プロンプト構築

**`buildGenerationPrompt()`の役割**:
1. テストケース情報をフォーマット
2. Snapshotを読みやすい形式に変換
3. 使用可能なMCP命令タイプを明示
4. セレクタ戦略を指示
5. JSON出力形式を指定

**プロンプト構造**:
```
あなたはテスト自動化の専門家です。

【対象URL】
https://example.com

【テストケース】
ID: TC001
タイトル: 予約フォームの入力テスト

【テスト手順】
1. 予約ページを開く
2. 氏名フィールドに「山田太郎」を入力
3. 予約ボタンをクリック

【期待結果】
1. 確認ページに遷移する

【ページSnapshot（要素情報）】
- WebArea "Reservation Page"
  - textbox "氏名" [e10]
  - button "予約する" [e20]

【使用可能なMCP命令タイプ】
- navigate: ページ遷移
- fill: テキスト入力
- click: クリック
- verify_text_visible: テキスト表示確認
...

【セレクタ戦略（優先順位）】
1. Snapshot の ref（最優先）
2. data-testid 属性
3. アクセシブルな名前（role + name）
4. セマンティックセレクタ

【出力形式】
JSON配列で出力してください：
[...]
```

---

### ステップ4: LLM変換

**設定**:
- **モデル**: GPT-4o（Plannerより決定的な出力が必要）
- **Temperature**: 0.3（より一貫性のある出力）
- **Max Tokens**: 3000

**実装**:
```javascript
async generate(options) {
  const { testCases, snapshot, url } = options;
  const allInstructions = [];

  for (const testCase of testCases) {
    const prompt = this.buildGenerationPrompt({
      testCase,
      snapshot,
      url
    });

    const response = await this.llm.chat({
      messages: [
        { 
          role: 'system', 
          content: 'あなたはテスト自動化の専門家です。テストケースをPlaywright MCP命令に変換してください。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      maxTokens: 3000
    });

    const parsed = this.parseGenerationResponse(response.content);
    
    // 検証
    for (const result of parsed) {
      if (!this.validateInstructions(result.instructions)) {
        console.warn(`Invalid instructions for ${result.test_case_id}`);
      }
    }

    allInstructions.push(...parsed);
  }

  return allInstructions;
}
```

---

### ステップ5: レスポンス解析

**`parseGenerationResponse()`の実装**:
```javascript
parseGenerationResponse(content) {
  // Markdownコードブロックから抽出
  const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (error) {
      throw new Error(`Failed to parse LLM response (code block): ${error.message}`);
    }
  }

  // 直接JSONをパース
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}
```

**期待レスポンス**:
```json
[
  {
    "test_case_id": "TC001",
    "aspect_no": 4,
    "instructions": [
      {
        "type": "navigate",
        "url": "https://example.com",
        "description": "予約ページを開く"
      },
      {
        "type": "fill",
        "ref": "e10",
        "selector": "input[name='name']",
        "value": "山田太郎",
        "description": "氏名を入力"
      },
      {
        "type": "click",
        "ref": "e20",
        "selector": "button[type='submit']",
        "description": "予約ボタンをクリック"
      }
    ]
  }
]
```

---

### ステップ6: 検証

**`validateInstructions()`の役割**:
生成された命令が実行可能かチェックする

**検証項目**:

1. **基本検証**
   - `type`が有効な命令タイプか
   - `description`が存在するか

2. **命令タイプ別の検証**

| 命令タイプ | 必須フィールド |
|-----------|---------------|
| `navigate` | `url` |
| `fill` | `value`, `ref` or `selector` |
| `click` | `ref` or `selector` |
| `select_option` | `values` (配列), `ref` or `selector` |
| `verify_text_visible` | `text` or `ref` or `selector` |
| `verify_element_visible` | `role` and `accessibleName`, or `ref`, or `selector` |
| `wait_for` | `text` or `textGone` or `time` or `selector` |

**実装**:
```javascript
validateInstructions(instructions) {
  if (!Array.isArray(instructions)) {
    return false;
  }

  if (instructions.length === 0) {
    return true;
  }

  const validTypes = [
    'navigate', 'fill', 'click', 'select_option',
    'verify_text_visible', 'verify_element_visible', 'wait_for'
  ];

  for (const instruction of instructions) {
    // type チェック
    if (!instruction.type || !validTypes.includes(instruction.type)) {
      return false;
    }

    // description チェック
    if (!instruction.description) {
      return false;
    }

    // type 固有の必須フィールドチェック
    switch (instruction.type) {
      case 'navigate':
        if (!instruction.url) return false;
        break;
      case 'fill':
        if (!instruction.value) return false;
        if (!instruction.ref && !instruction.selector) return false;
        break;
      // ... 他の命令タイプ
    }
  }

  return true;
}
```

---

## 📊 出力形式

### MCP命令配列

```typescript
interface MCPInstructionSet {
  test_case_id: string;                 // テストケースID
  aspect_no: number;                    // 観点番号
  instructions: MCPInstruction[];       // 命令配列
}

interface MCPInstruction {
  type: string;                         // 命令タイプ
  description: string;                  // 説明（必須）
  url?: string;                         // navigate用
  ref?: string;                         // 要素参照（Snapshot）
  selector?: string;                    // セレクタ（フォールバック）
  value?: string;                       // fill用
  values?: string[];                    // select_option用
  text?: string;                        // verify_text_visible用
  role?: string;                        // verify_element_visible用
  accessibleName?: string;              // verify_element_visible用
  time?: number;                        // wait_for用（秒）
}
```

---

## 🎯 セレクタ戦略

### 優先順位

1. **Snapshot の ref（最優先）**
   ```javascript
   { ref: 'e10' }
   ```
   - Playwright MCPが提供する一意な要素参照
   - 最も信頼性が高い

2. **data-testid 属性**
   ```javascript
   { selector: '[data-testid="submit-button"]' }
   ```
   - テスト用に明示的に付与された属性

3. **アクセシブルな名前（role + name）**
   ```javascript
   { role: 'button', accessibleName: '送信' }
   ```
   - アクセシビリティツリーに基づく

4. **セマンティックセレクタ**
   ```javascript
   { selector: 'button:has-text("送信")' }
   ```
   - Playwrightのテキストベースセレクタ

5. **CSSセレクタ（最後の手段）**
   ```javascript
   { selector: 'button[type="submit"]' }
   ```
   - DOM構造に依存、脆弱

---

## 💡 使用例

### 基本的な使用方法

```javascript
const OthelloGenerator = require('./src/agents/othello-generator');
const { LLMFactory } = require('./src/llm/llm-factory');

// LLMクライアントを初期化
const llm = LLMFactory.create('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  temperature: 0.3
});

// Generator インスタンスを作成
const generator = new OthelloGenerator({ llm });

// テストケース（Plannerの出力）
const testCases = [
  {
    case_id: 'TC001',
    title: 'ログインテスト',
    steps: ['ログインページを開く', 'ユーザー名を入力', 'ログインボタンをクリック'],
    expected_results: ['ダッシュボードに遷移'],
    aspect_no: 1,
    priority: 'P0'
  }
];

// Snapshot（実際のページ構造）
const snapshot = {
  role: 'WebArea',
  children: [
    { role: 'textbox', name: 'Username', ref: 'e1' },
    { role: 'button', name: 'Login', ref: 'e2' }
  ]
};

// MCP命令を生成
const instructions = await generator.generate({
  testCases,
  snapshot,
  url: 'https://example.com/login'
});

console.log(instructions);
```

---

## 📈 パフォーマンス特性

| 項目 | 実測値 | 備考 |
|------|--------|------|
| プロンプト構築 | 2-5ms | 1テストケース |
| Snapshot解析 | 1-3ms | 8要素のSnapshot |
| LLM API 呼び出し | 10-20秒 | GPT-4o、ネットワーク含む |
| JSON パース | 5-10ms | 5-10命令 |
| 命令検証 | 1-2ms | 10命令 |
| **全体処理時間** | **10-20秒** | 実測: 12.94秒（2テストケース） |

---

## 🔍 トラブルシューティング

### よくある問題

#### 1. `Invalid instructions` 警告

**原因**: LLMが必須フィールドを含まない命令を生成

**対処法**:
- プロンプトの改善（より明確な指示）
- 温度を下げる（temperature: 0.2）
- 出力例を増やす

#### 2. セレクタが見つからない

**原因**: Snapshotに該当要素が存在しない

**対処法**:
- Snapshotを最新化
- フォールバックセレクタを追加
- LLMに複数の戦略を指示

#### 3. パフォーマンスが遅い

**原因**: 多数のテストケースを一度に処理

**対処法**:
- バッチサイズを制限（5-10ケースずつ）
- 並列処理（複数LLM呼び出し）
- キャッシュ機構の導入

---

## 🧪 テスト

### テスト実行

```bash
# 全テスト実行
npx jest __tests__/agents/othello-generator.test.js

# デモ実行
node examples/demo-generator.js
```

### テストカバレッジ

- **ユニットテスト**: 20/20 パス ✅
- **カバレッジ**: 主要メソッド100%

---

## 🔗 関連ファイル

- **実装**: `src/agents/othello-generator.js`
- **テスト**: `__tests__/agents/othello-generator.test.js`
- **デモ**: `examples/demo-generator.js`
- **依存**: `src/llm/llm-factory.js`, `src/llm/openai-client.js`

---

## 🚀 次のステップ

1. **Othello-Healer**: 失敗したテストの自動修復
2. **Executor統合**: 生成した命令を実際に実行
3. **セレクタ戦略の改善**: より堅牢なセレクタ生成
4. **キャッシュ機構**: 類似テストケースの再利用

---

**作成日**: 2025年10月28日  
**バージョン**: 1.0  
**著者**: Othello Development Team
