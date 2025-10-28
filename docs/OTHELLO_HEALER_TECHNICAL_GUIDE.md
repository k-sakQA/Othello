# Othello-Healer テクニカルガイド

## 概要

Othello-Healerは、失敗したテストケースを分析し、**バグ**か**テストスクリプトの問題**かを判定し、テストスクリプトの問題であれば自動修復を行うエージェントです。

### 主要機能

1. **失敗分析**: テスト失敗の原因を特定
2. **バグ判定**: アプリケーションのバグか、テストスクリプトの問題かを分類
3. **自動修復**: テストスクリプトの問題を6種類の修正パターンで自動修正
4. **バグレポート生成**: 実際のバグの場合、詳細なバグレポートを生成

---

## アーキテクチャ

### ワークフロー

```
┌─────────────────┐
│  失敗データ入力  │
│ (test_case_id,  │
│  instructions,  │
│  error,         │
│  snapshot)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  analyze()      │
│ ・失敗分析      │
│ ・LLM推論       │
└────────┬────────┘
         │
         ▼
      is_bug?
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ▼         ▼
┌───────┐ ┌──────────┐
│ バグ  │ │ 自動修復 │
│レポート│ │ applyFix()│
└───────┘ └─────┬────┘
              │
              ▼
         ┌──────────┐
         │修正済み命令│
         │ + changes│
         └──────────┘
```

### コンポーネント構成

```javascript
OthelloHealer
├── llm (LLM Client - 依存性注入)
├── analyze(failureData) → { is_bug, root_cause, suggested_fix, confidence, bug_report? }
├── heal(failureData) → { success, fixed_instructions?, changes?, bug_report? }
├── buildAnalysisPrompt(failureData) → string
├── parseAnalysisResponse(content) → object
├── applyFix(instructions, fix) → array
├── extractChanges(original, fixed, fix) → array
└── formatSnapshotForPrompt(snapshot, depth) → string
```

---

## 使用方法

### 基本的な使い方

```javascript
const OthelloHealer = require('./src/agents/othello-healer');
const { LLMFactory } = require('./src/llm/llm-factory');

// LLMクライアント初期化
const llm = LLMFactory.create('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
  temperature: 0.3,  // 決定的な分析のため低めに設定
  maxTokens: 2000
});

// Healerインスタンス作成
const healer = new OthelloHealer({ llm });

// 失敗データ準備
const failureData = {
  test_case_id: 'TC001',
  instructions: [
    {
      type: 'click',
      selector: 'button#submit',
      description: '送信ボタンをクリック'
    }
  ],
  error: {
    message: 'Element not found: button#submit',
    stack: 'TimeoutError: waiting for selector "button#submit" failed'
  },
  snapshot: {
    role: 'WebArea',
    children: [
      { role: 'button', name: '送信', ref: 'e1' }
    ]
  }
};

// 分析と修復
const result = await healer.heal(failureData);

if (result.success) {
  console.log('✅ 修復成功！');
  console.log('修正された命令:', result.fixed_instructions);
  console.log('変更内容:', result.changes);
} else {
  console.log('🐛 バグを検出！');
  console.log('バグレポート:', result.bug_report);
}
```

### analyze() メソッド

失敗を分析し、バグかテストスクリプトの問題かを判定します。

```javascript
const analysis = await healer.analyze({
  test_case_id: 'TC001',
  instructions: [...],
  error: { message: '...', stack: '...' },
  snapshot: { ... }
});

console.log('is_bug:', analysis.is_bug);
console.log('root_cause:', analysis.root_cause);
console.log('confidence:', analysis.confidence);
console.log('suggested_fix:', analysis.suggested_fix);
```

**出力例:**

```json
{
  "is_bug": false,
  "root_cause": "セレクタが間違っている。実際の要素は 'button[data-testid=\"submit-btn\"]'",
  "suggested_fix": {
    "type": "update_selector",
    "instruction_index": 1,
    "new_selector": "button[data-testid='submit-btn']",
    "reason": "スナップショット内の実際の要素に基づいて修正"
  },
  "confidence": 0.95
}
```

### heal() メソッド

分析と修復を一度に実行します。

```javascript
const result = await healer.heal(failureData);

if (result.success) {
  // テストスクリプトの問題 → 自動修復
  console.log('修正済み:', result.fixed_instructions);
  console.log('変更:', result.changes);
} else {
  // 実際のバグ → バグレポート
  console.log('バグレポート:', result.bug_report);
}
```

---

## 修正パターン (Fix Types)

Healerは6種類の修正パターンをサポートしています。

### 1. update_selector

単一命令のセレクタを更新します。

**使用ケース:**
- セレクタのタイプミス
- 要素のID/クラス名変更
- より正確なセレクタへの変更

**例:**

```json
{
  "type": "update_selector",
  "instruction_index": 1,
  "new_selector": "button[data-testid='submit-btn']",
  "reason": "スナップショット内の実際の要素に基づいて修正"
}
```

**適用前:**
```javascript
{ type: 'click', selector: 'button#submit', description: '送信' }
```

**適用後:**
```javascript
{ type: 'click', selector: "button[data-testid='submit-btn']", description: '送信' }
```

---

### 2. update_multiple

複数の命令を一度に更新します。

**使用ケース:**
- 複数のセレクタが同時に変更された場合
- 一貫性のある修正が必要な場合

**例:**

```json
{
  "type": "update_multiple",
  "changes": [
    {
      "instruction_index": 0,
      "new_selector": "input[name='username']"
    },
    {
      "instruction_index": 2,
      "new_selector": "button[type='submit']"
    }
  ]
}
```

**適用前:**
```javascript
[
  { type: 'fill', selector: '#user', value: 'test' },
  { type: 'fill', selector: '#pass', value: '1234' },
  { type: 'click', selector: '#btn', description: 'ログイン' }
]
```

**適用後:**
```javascript
[
  { type: 'fill', selector: "input[name='username']", value: 'test' },
  { type: 'fill', selector: '#pass', value: '1234' },
  { type: 'click', selector: "button[type='submit']", description: 'ログイン' }
]
```

---

### 3. add_ref

スナップショット参照（ref）を追加します。

**使用ケース:**
- セレクタが不安定な場合
- スナップショットベースのセレクタが推奨される場合

**例:**

```json
{
  "type": "add_ref",
  "instruction_index": 1,
  "ref": "e50",
  "reason": "スナップショット参照を使用してより安定したセレクタに"
}
```

**適用前:**
```javascript
{ type: 'click', selector: 'button.submit', description: '送信' }
```

**適用後:**
```javascript
{ type: 'click', selector: 'button.submit', ref: 'e50', description: '送信' }
```

---

### 4. remove_instruction

問題のある命令を削除します。

**使用ケース:**
- 不要な命令
- 存在しない要素への操作
- テストロジックの誤り

**例:**

```json
{
  "type": "remove_instruction",
  "instruction_index": 2,
  "reason": "この命令は不要です。前の命令で既に同じ操作が実行されています"
}
```

**適用前:**
```javascript
[
  { type: 'navigate', url: 'https://example.com' },
  { type: 'click', selector: 'button', description: '送信' },
  { type: 'click', selector: 'button', description: '送信（重複）' }  // ← 削除
]
```

**適用後:**
```javascript
[
  { type: 'navigate', url: 'https://example.com' },
  { type: 'click', selector: 'button', description: '送信' }
]
```

---

### 5. insert_instruction

新しい命令を挿入します。

**使用ケース:**
- 待機処理の追加
- 中間ステップの追加
- 欠落した操作の補完

**例:**

```json
{
  "type": "insert_instruction",
  "instruction_index": 1,
  "new_instruction": {
    "type": "wait_for",
    "time": 2,
    "description": "モーダルの表示を待つ"
  },
  "reason": "モーダルの表示を待つ必要があります"
}
```

**適用前:**
```javascript
[
  { type: 'click', selector: 'button#open-modal', description: 'モーダルを開く' },
  { type: 'fill', selector: 'input#name', value: 'Test', description: '名前入力' }
]
```

**適用後:**
```javascript
[
  { type: 'click', selector: 'button#open-modal', description: 'モーダルを開く' },
  { type: 'wait_for', time: 2, description: 'モーダルの表示を待つ' },  // ← 挿入
  { type: 'fill', selector: 'input#name', value: 'Test', description: '名前入力' }
]
```

---

### 6. add_wait

特定の命令の前に待機命令を追加します。

**使用ケース:**
- タイミング問題の解決
- 動的コンテンツの読み込み待ち
- アニメーション完了待ち

**例:**

```json
{
  "type": "add_wait",
  "instruction_index": 2,
  "time": 3,
  "description": "ページ読み込みを待つ",
  "reason": "ページが完全に読み込まれる前に操作しようとしています"
}
```

**適用前:**
```javascript
[
  { type: 'navigate', url: 'https://example.com' },
  { type: 'click', selector: 'a#next', description: '次へ' },
  { type: 'fill', selector: 'input', value: 'Test', description: '入力' }  // ← この前に待機
]
```

**適用後:**
```javascript
[
  { type: 'navigate', url: 'https://example.com' },
  { type: 'click', selector: 'a#next', description: '次へ' },
  { type: 'wait_for', time: 3, description: 'ページ読み込みを待つ' },  // ← 追加
  { type: 'fill', selector: 'input', value: 'Test', description: '入力' }
]
```

---

## LLMプロンプト設計

### プロンプト構造

```
あなたはテスト自動化の専門家です。失敗したテストケースを分析し、
実際のアプリケーションのバグか、テストスクリプトの問題かを判定してください。

【テストケースID】
TC001

【実行した命令】
1. [click] N/A
   selector: button#submit
   description: 送信ボタンをクリック

【エラー情報】
メッセージ: Element not found: button#submit
スタックトレース: TimeoutError: waiting for selector...

【失敗時のページSnapshot】
- WebArea
  - button "送信" [e1]
    - text: "送信"

【判定基準】
- テストスクリプトの問題: セレクタ間違い、タイミング問題、ref不足など
- アプリケーションのバグ: 期待される要素が存在しない、期待される動作をしないなど

【出力形式】
JSON形式で以下を出力:
{
  "is_bug": false,
  "root_cause": "セレクタが間違っている...",
  "suggested_fix": {
    "type": "update_selector",
    "instruction_index": 0,
    "new_selector": "button[data-testid='submit-btn']",
    "reason": "..."
  },
  "confidence": 0.95
}

【修正タイプ】
1. update_selector: セレクタを修正
2. update_multiple: 複数の命令を修正
3. add_ref: snapshot参照を追加
4. remove_instruction: 命令を削除
5. insert_instruction: 新しい命令を挿入
6. add_wait: 待機命令を追加

【セレクタ優先順位】
1. ref (スナップショット参照) - 最も推奨
2. data-testid属性
3. role + name
4. CSS セレクタ (id, class, タグ)
```

### LLM設定

```javascript
const llm = LLMFactory.create('openai', {
  model: 'gpt-4o',
  temperature: 0.3,  // 決定的な分析のため低めに設定
  maxTokens: 2000    // 詳細な分析のため十分な長さ
});
```

**temperature 0.3の理由:**
- バグ判定の一貫性を保つ
- 同じ失敗に対して同じ結果を返す
- ランダム性を抑えて信頼性を向上

---

## パフォーマンス特性

### 処理時間

| 操作 | 平均時間 | 備考 |
|------|---------|------|
| analyze() | 3-5秒 | LLM呼び出しを含む |
| heal() | 3-5秒 | analyze() + applyFix() |
| applyFix() | <10ms | ローカル処理 |
| buildPrompt() | <5ms | 文字列生成 |

### スケーラビリティ

- **並列処理**: 複数の失敗を並列分析可能
- **バッチ処理**: 複数の失敗をまとめて処理可能
- **メモリ効率**: スナップショットは最大3階層まで（深すぎる場合は省略）

---

## エラーハンドリング

### 必須パラメータの検証

```javascript
try {
  const result = await healer.analyze({
    // test_case_id が欠落
    instructions: [...],
    error: {...}
  });
} catch (error) {
  console.error(error.message);
  // "test_case_id is required"
}
```

### LLM APIエラー

```javascript
try {
  const result = await healer.heal(failureData);
} catch (error) {
  console.error('LLM API error:', error.message);
  // Rate limit, network error など
}
```

### 不正な修正タイプ

```javascript
const fix = {
  type: 'unknown_type',  // ← サポートされていない
  instruction_index: 0
};

try {
  const fixed = healer.applyFix(instructions, fix);
} catch (error) {
  console.error(error.message);
  // "Unknown fix type: unknown_type"
}
```

---

## 統合例

### Executorとの統合

```javascript
// Executor → Healer の連携

const executor = new OthelloExecutor();
const healer = new OthelloHealer({ llm });

// テスト実行
const result = await executor.execute({
  test_case_id: 'TC001',
  instructions: [...]
});

if (!result.success) {
  // 失敗した場合、Healerで分析
  const healResult = await healer.heal({
    test_case_id: result.test_case_id,
    instructions: result.instructions,
    error: result.error,
    snapshot: result.snapshot
  });
  
  if (healResult.success) {
    // 修復成功 → 再実行
    const retryResult = await executor.execute({
      test_case_id: 'TC001',
      instructions: healResult.fixed_instructions
    });
    console.log('再実行結果:', retryResult.success);
  } else {
    // 実際のバグ → レポート
    console.log('バグレポート:', healResult.bug_report);
  }
}
```

### Orchestratorとの統合

```javascript
// Orchestratorの8ステップループ内

async function runTestLoop() {
  // 1. Planner
  const testCases = await planner.plan(...);
  
  // 2. Generator
  const instructions = await generator.generate(testCases, snapshot);
  
  // 3. Executor
  const results = await executor.execute(instructions);
  
  // 4. Healer (失敗時)
  for (const result of results) {
    if (!result.success) {
      const healResult = await healer.heal({
        test_case_id: result.test_case_id,
        instructions: result.instructions,
        error: result.error,
        snapshot: result.snapshot
      });
      
      if (healResult.success) {
        // 修復成功 → 次のイテレーションで再実行
        testCases.push({
          test_case_id: result.test_case_id,
          instructions: healResult.fixed_instructions
        });
      } else {
        // バグレポート → Reporterへ
        bugReports.push(healResult.bug_report);
      }
    }
  }
  
  // 5. Analyzer
  // 6. Reporter
}
```

---

## トラブルシューティング

### 問題: LLMが常に is_bug=true を返す

**原因:** temperature が高すぎる、またはプロンプトが不明瞭

**解決策:**
```javascript
const llm = LLMFactory.create('openai', {
  temperature: 0.3,  // 0.7 → 0.3 に下げる
  // ...
});
```

### 問題: セレクタ修正が不正確

**原因:** スナップショット情報が不足している

**解決策:**
- スナップショットに `ref` を含める
- スナップショットの階層を増やす
- プロンプトにより詳細な情報を追加

### 問題: 修正後も失敗が続く

**原因:** 実際のバグ、または複雑な問題

**解決策:**
1. `confidence` 値を確認（0.8未満なら慎重に扱う）
2. バグレポートを手動確認
3. 複数回の修正試行を実装

---

## ベストプラクティス

### 1. 適切なLLM設定

```javascript
// ✅ 推奨
const llm = LLMFactory.create('openai', {
  model: 'gpt-4o',      // 高精度モデル
  temperature: 0.3,     // 決定的
  maxTokens: 2000       // 十分な長さ
});

// ❌ 非推奨
const llm = LLMFactory.create('openai', {
  model: 'gpt-3.5-turbo',  // 精度不足の可能性
  temperature: 0.9,        // ランダム性が高すぎる
  maxTokens: 500           // 短すぎる
});
```

### 2. 信頼度の確認

```javascript
const result = await healer.analyze(failureData);

if (result.confidence < 0.8) {
  console.warn('⚠️  信頼度が低い:', result.confidence);
  console.log('手動確認を推奨');
}
```

### 3. 変更の記録

```javascript
const result = await healer.heal(failureData);

if (result.success) {
  // 変更を記録
  console.log('修正履歴:');
  result.changes.forEach(change => {
    console.log(`  - ${change.type}: ${change.old_value} → ${change.new_value}`);
  });
}
```

### 4. エラーハンドリング

```javascript
try {
  const result = await healer.heal(failureData);
  // ...
} catch (error) {
  if (error.message.includes('required')) {
    console.error('パラメータエラー:', error.message);
  } else if (error.message.includes('API')) {
    console.error('LLM APIエラー:', error.message);
    // リトライロジック
  } else {
    console.error('予期しないエラー:', error);
  }
}
```

---

## まとめ

Othello-Healerは、失敗したテストケースを自動的に分析・修復する強力なエージェントです。

**主要な利点:**
- 🔍 **自動分析**: LLMを使った高精度な失敗原因分析
- 🔧 **自動修復**: 6種類の修正パターンで柔軟に対応
- 🐛 **バグ検出**: 実際のバグと区別して適切に処理
- 📊 **信頼度付き**: 修正の信頼度を数値で提供

**使用シーン:**
- テスト失敗時の自動リカバリ
- テストメンテナンスの自動化
- バグトリアージの効率化
- CI/CDパイプラインでの自動修復

---

## 参考資料

- [Othello-Healer 実装コード](../src/agents/othello-healer.js)
- [Othello-Healer テストコード](../__tests__/agents/othello-healer.test.js)
- [デモスクリプト](../examples/demo-healer.js)
- [要件定義](./REQUIREMENTS_PHASE9.md)
- [詳細設計](./DETAILED_DESIGN_PHASE9.md)
