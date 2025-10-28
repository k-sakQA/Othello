# 🧠 Othello-Planner 技術ガイド

## 📖 概要

**Othello-Planner** は、テスト観点リスト（CSV形式）と対象URLを入力として、LLM（大規模言語モデル）を活用してテスト分析・計画を自動生成するエージェントです。

テスト観点に基づいた「何をテストすべきか」という戦略的な分析から、「どのようにテストするか」という具体的なテストケースまでを生成します。

---

## 🔄 仕組み（アーキテクチャ）

### 処理フロー全体

```
入力
  ├─ テスト観点CSV（config/test-ViewpointList-simple.csv）
  ├─ 対象URL（https://hotel-example-site.takeyaqa.dev/ja/reserve.html）
  └─ 既存カバレッジ（前回のテスト結果）

     ↓

ステップ1: テスト観点の読み込み
  └─ CSV解析 → 23個の観点を抽出

ステップ2: 優先順位付け
  └─ 未テスト観点を優先 → 最大10観点に限定

ステップ3: LLMによる分析
  └─ GPT-4oに専門家プロンプトを送信

ステップ4: レスポンス解析
  └─ JSON形式の分析結果をパース

ステップ5: テストケース抽出
  └─ 分析結果からテストケースを構造化

ステップ6: Markdown生成
  └─ 読みやすいレポート形式に変換

出力
  ├─ 分析結果（JSON）
  ├─ テストケース配列
  └─ Markdownレポート
```

### クラス構成

```javascript
class OthelloPlanner {
  // 入力用メソッド
  loadTestAspects(csvPath)           // CSV読み込み
  prioritizeAspects(aspects, coverage) // 優先順位付け
  
  // メインロジック
  generateTestPlan(options)          // 全体フロー
  
  // LLM連携
  analyzeWithLLM(options)            // LLM呼び出し
  buildAnalysisPrompt(options)       // プロンプト構築
  parseAnalysisResponse(content)     // レスポンス解析
  
  // 出力フォーマット
  extractTestCases(analysis)         // テストケース抽出
  formatAsMarkdown(analysis)         // Markdown生成
}
```

---

## 🔧 各ステップの詳細

### ステップ1: テスト観点の読み込み（`loadTestAspects`）

**目的**: CSV形式のテスト観点リストをパースし、構造化されたデータに変換

**処理内容**:
1. CSVファイルを読み込み
2. ヘッダーの様々なバリエーションに対応（柔軟なキー検索）
3. 各行を観点オブジェクトに変換
4. 空のエントリを除外（フィルタリング）

**実装例**:
```javascript
async loadTestAspects(csvPath) {
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  
  const aspects = rows.map((row, index) => {
    // ヘッダーの様々なバリエーションに対応（No, No,など）
    const noValue = row['No,'] || row['No'] || row['no'] || row['NO'];
    
    // キーの部分一致で検索（改行やスペース対応）
    const qualityValue = Object.keys(row).find(k => k.includes('品質特性'));
    const majorValue = Object.keys(row).find(k => k.includes('テストタイプ中分類'));
    const minorValue = Object.keys(row).find(k => k.includes('テストタイプ小分類'));
    const aspectValue = Object.keys(row).find(k => k.includes('テスト観点'));
    
    return {
      aspect_no: parseInt(noValue, 10) || index + 1,
      quality_characteristic: qualityValue ? row[qualityValue] : '',
      test_type_major: majorValue ? row[majorValue] : '',
      test_type_minor: minorValue ? row[minorValue] : '',
      test_aspect: aspectValue ? row[aspectValue] : ''
    };
  })
  // 空のエントリを除外
  .filter(aspect => aspect.test_type_major || aspect.test_aspect);
  
  return aspects;
}
```

**出力例**:
```javascript
[
  {
    aspect_no: 1,
    quality_characteristic: "表示",
    test_type_major: "UI",
    test_type_minor: "レイアウト/文言",
    test_aspect: "ヘッダーとフッターの表示"
  },
  {
    aspect_no: 2,
    quality_characteristic: "機能",
    test_type_major: "入力検証",
    test_type_minor: "形式チェック",
    test_aspect: "電話番号入力フォーマット"
  },
  // ... 10/23個の有効な観点
]
```

---

### ステップ2: 優先順位付け（`prioritizeAspects`）

**目的**: 前回のテスト結果を踏まえて、テストすべき観点を優先順位付けする

**ロジック**:
1. 既存カバレッジから「テスト済み観点」を取得
2. 「未テスト観点」と「テスト済み観点」に分離
3. 未テスト観点を先に並べる（優先）
4. 最大10個に制限（LLM効率化）

**実装**:
```javascript
prioritizeAspects(aspects, existingCoverage) {
  const tested = existingCoverage?.aspectCoverage?.tested_aspects || [];
  const untested = aspects.filter(a => !tested.includes(a.aspect_no));
  
  const prioritized = [...untested, ...aspects.filter(a => tested.includes(a.aspect_no))];
  return prioritized.slice(0, 10); // 最大10個
}
```

**イテレーション戦略**:
- **1回目**: 全観点から未テスト10個 → 最初の分析
- **2回目**: 残りの未テスト観点 → 継続分析
- **3回目以降**: リスク重点テスト、エッジケース

---

### ステップ3: LLMによる分析（`analyzeWithLLM`）

**目的**: 専門家レベルのテスト分析を自動化

**処理**:
1. プロンプトを構築（対象URL、観点、既存カバレッジを含める）
2. OpenAI ChatCompletion APIに送信
3. JSON形式のレスポンスを受け取る

**実装**:
```javascript
async analyzeWithLLM(options) {
  const { url, aspects, existingCoverage, iteration } = options;
  const prompt = this.buildAnalysisPrompt({ 
    url, aspects, existingCoverage, iteration 
  });
  
  const response = await this.llm.chat({
    messages: [
      { role: 'system', content: 'あなたはテスト分析の専門家です。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    maxTokens: 4000
  });
  
  return this.parseAnalysisResponse(response.content);
}
```

**LLM設定**:
- **モデル**: GPT-4o（2024年11月版）
- **Temperature**: 0.7（創造性と確実性のバランス）
- **Max Tokens**: 4000（十分な詳細度）

---

### ステップ4: レスポンス解析（`parseAnalysisResponse`）

**目的**: LLMが返すJSON形式のテキストをJavaScript オブジェクトに変換

**処理**:
1. マークダウンコードブロック内のJSONを抽出
2. JSONをパース
3. パース失敗時は例外処理

**実装**:
```javascript
parseAnalysisResponse(content) {
  // ```json ... ``` ブロックから抽出
  const jsonMatch = content.match(/\`\`\`json\n([\s\S]+?)\n\`\`\`/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }
  
  // フォールバック：直接JSONをパース
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}
```

---

### ステップ5: テストケース抽出（`extractTestCases`）

**目的**: LLM分析結果から、実行可能なテストケースを抽出・構造化

**処理**:
1. 分析結果の各観点をイテレート
2. 各観点のテストケース配列を抽出
3. 観点情報を付加（トレーサビリティ）
4. テストケース配列に統合

**実装**:
```javascript
extractTestCases(analysis) {
  const testCases = [];
  for (const aspect of analysis) {
    for (const testCase of aspect.test_cases || []) {
      testCases.push({
        ...testCase,
        aspect_no: aspect.aspect_no,
        test_type: aspect.test_type,
        priority: aspect.priority || 'P2'
      });
    }
  }
  return testCases;
}
```

**出力例**:
```javascript
[
  {
    case_id: "TC001",
    title: "予約ページのヘッダーが正しく表示される",
    steps: ["ブラウザで予約ページを開く", "ヘッダーを確認"],
    expected_results: ["ロゴが左に表示", "ナビゲーションが右に表示"],
    aspect_no: 1,
    test_type: "UI - レイアウト",
    priority: "P0"
  },
  // ... 複数のテストケース
]
```

---

### ステップ6: Markdown生成（`formatAsMarkdown`）

**目的**: 分析結果を人間が読みやすいMarkdown形式に整形

**処理**:
1. ヘッダー情報を記述
2. 各観点ごとに以下を記述：
   - 対象の機能構造
   - 考慮すべき仕様
   - 狙うバグ
   - テストケース（手順＆期待結果）

**実装**:
```javascript
formatAsMarkdown(analysis) {
  let md = '# テスト分析結果\n\n';
  
  for (const aspect of analysis) {
    md += `## No.${aspect.aspect_no}: ${aspect.test_type}`;
    if (aspect.test_category) {
      md += ` - ${aspect.test_category}`;
    }
    md += '\n\n';
    
    md += `**対象の機能構造**: ${aspect.target_function}\n\n`;
    
    md += '**考慮すべき仕様**:\n';
    for (const spec of aspect.specifications || []) {
      md += `- ${spec}\n`;
    }
    
    md += '\n**狙うバグ**:\n';
    for (const bug of aspect.target_bugs || []) {
      md += `- ${bug}\n`;
    }
    
    md += '\n**テストケース**:\n';
    for (const tc of aspect.test_cases || []) {
      md += `\n### ${tc.case_id}: ${tc.title}\n\n`;
      md += '**手順**:\n';
      for (let i = 0; i < tc.steps.length; i++) {
        md += `${i + 1}. ${tc.steps[i]}\n`;
      }
      md += '\n**期待結果**:\n';
      for (let i = 0; i < tc.expected_results.length; i++) {
        md += `${i + 1}. ${tc.expected_results[i]}\n`;
      }
    }
    md += '\n---\n\n';
  }
  
  return md;
}
```

---

## 💬 LLM プロンプト設計

### プロンプトの全体構造

Othello-Planner では、以下の要素を含む構造化プロンプトを生成します：

```
【システムロール】
あなたはテスト分析の専門家です。

【入力情報】
- 対象URL
- イテレーション番号
- 既存カバレッジ（前回のテスト結果）
- テスト観点リスト（優先順位順）

【タスク説明】
各テスト観点について以下を分析する：
1. 対象の機能構造
2. 考慮すべき仕様
3. 狙うバグ
4. テストケース

【出力形式】
JSON配列形式で構造化出力
```

### プロンプト生成コード

```javascript
buildAnalysisPrompt({ url, aspects, existingCoverage, iteration }) {
  // 観点リストをフォーマット
  const aspectsList = aspects
    .map(a => `No.${a.aspect_no}: ${a.test_type_major}${a.test_type_minor ? ' - ' + a.test_type_minor : ''}\n観点: ${a.test_aspect}`)
    .join('\n\n');
  
  return `あなたはテスト分析の専門家です。

【対象URL】
${url}

【イテレーション】
${iteration}回目

【既存カバレッジ】
${existingCoverage ? JSON.stringify(existingCoverage, null, 2) : 'なし'}

【テスト観点リスト】（優先度順）
${aspectsList}

【タスク】
各テスト観点について、以下を分析してください：

1. **対象の機能構造**: このシステムのどの画面・機能・要素が該当するか
2. **考慮すべき仕様の具体例**: このシステム固有の具体的な仕様（3-5個）
3. **狙うバグ**: この観点で見つけるべきバグの種類（2-3個）
4. **テストケース**: 具体的なテスト手順と期待結果（1-2ケース）

【出力形式】
JSON配列で出力してください：

\`\`\`json
[
  {
    "aspect_no": 1,
    "test_type": "表示（UI）",
    "test_category": "レイアウト/文言",
    "target_function": "...",
    "specifications": ["...", "..."],
    "target_bugs": ["...", "..."],
    "priority": "P0",
    "test_cases": [
      {
        "case_id": "TC001",
        "title": "...",
        "steps": ["..."],
        "expected_results": ["..."]
      }
    ]
  }
]
\`\`\``;
}
```

### プロンプトの具体例

**入力観点**:
```
No.1: UI - レイアウト/文言
観点: ヘッダーとフッターの表示

No.2: 入力検証 - 形式チェック
観点: 電話番号入力フォーマット

No.3: 状態遷移 - 予約フロー
観点: キャンセル・変更機能
```

**生成されるプロンプト（簡略版）**:
```
あなたはテスト分析の専門家です。

【対象URL】
https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

【イテレーション】
1回目

【既存カバレッジ】
なし

【テスト観点リスト】（優先度順）
No.1: UI - レイアウト/文言
観点: ヘッダーとフッターの表示

No.2: 入力検証 - 形式チェック
観点: 電話番号入力フォーマット

No.3: 状態遷移 - 予約フロー
観点: キャンセル・変更機能

【タスク】
各テスト観点について、以下を分析してください：
...
```

---

## 📊 LLM レスポンス例

GPT-4o から返される期待レスポンス（JSON形式）:

```json
[
  {
    "aspect_no": 1,
    "test_type": "表示（UI）",
    "test_category": "レイアウト/文言",
    "target_function": "予約ページのヘッダーとフッター",
    "specifications": [
      "ヘッダーにはホテルのロゴとナビゲーションリンクが含まれている",
      "フッターには著作権情報と利用規約へのリンクが含まれている",
      "全ての文言は日本語で表示されている",
      "ロゴはヘッダー左側に配置される",
      "ナビゲーションメニューはヘッダー右側に配置される"
    ],
    "target_bugs": [
      "ヘッダーやフッターの要素が正しく表示されない",
      "文言が誤っている、または表示されない",
      "レスポンシブデザインでのレイアウト崩れ"
    ],
    "priority": "P0",
    "test_cases": [
      {
        "case_id": "TC001",
        "title": "予約ページのヘッダーが正しく表示される",
        "steps": [
          "ブラウザで予約ページを開く",
          "ヘッダーの各要素を確認する"
        ],
        "expected_results": [
          "ホテルロゴが表示されている",
          "ナビゲーションメニュー（ホーム、プラン一覧、予約確認、お問い合わせ）が表示されている"
        ]
      },
      {
        "case_id": "TC002",
        "title": "予約ページのフッターが正しく表示される",
        "steps": [
          "ブラウザで予約ページを開く",
          "ページ下部のフッターを確認する"
        ],
        "expected_results": [
          "著作権情報が表示されている",
          "利用規約へのリンクが表示されている"
        ]
      }
    ]
  },
  {
    "aspect_no": 2,
    "test_type": "入力検証",
    "test_category": "形式チェック",
    "target_function": "電話番号入力フォーム",
    "specifications": [
      "電話番号は11桁の数字である必要がある",
      "ハイフンを含めて入力してもよい",
      "空文字列は許可されない",
      "文字を含む入力は拒否される",
      "領域外クリック時にバリデーションが実行される"
    ],
    "target_bugs": [
      "有効な電話番号が拒否される",
      "無効な電話番号が受け入れられる",
      "エラーメッセージが不正確である"
    ],
    "priority": "P1",
    "test_cases": [
      {
        "case_id": "TC003",
        "title": "有効な電話番号（ハイフンあり）が受け入れられる",
        "steps": [
          "電話番号フィールドに『090-1234-5678』を入力する",
          "別フィールドをクリックしてバリデーションを実行する"
        ],
        "expected_results": [
          "エラーメッセージが表示されない",
          "電話番号が受け入れられる"
        ]
      },
      {
        "case_id": "TC004",
        "title": "無効な電話番号（桁数不足）が拒否される",
        "steps": [
          "電話番号フィールドに『090-123-456』を入力する",
          "別フィールドをクリックしてバリデーションを実行する"
        ],
        "expected_results": [
          "エラーメッセージ『電話番号は11桁で入力してください』が表示される",
          "フォーム送信がブロックされる"
        ]
      }
    ]
  }
]
```

---

## 🎯 プロンプト設計のポイント

### 1. システムロールの明確化

**重要性**: LLM に「テスト分析の専門家である」という役割を与える

```javascript
{ role: 'system', content: 'あなたはテスト分析の専門家です。' }
```

### 2. コンテキスト情報の提供

**含める情報**:
- 対象URL（テスト対象の具体的なシステム）
- イテレーション番号（何回目のテストか）
- 既存カバレッジ（前回のテスト結果、重複排除）
- テスト観点リスト（分析対象）

**利点**:
- URL から具体的なシステム特性を推定できる
- 既存カバレッジから未テスト領域を判定できる

### 3. タスク分解

**4つの明確なタスク**:
1. 対象の機能構造 → 「何がテスト対象か」
2. 考慮すべき仕様 → 「何を知る必要があるか」
3. 狙うバグ → 「何が悪くなりうるか」
4. テストケース → 「具体的に何をするか」

### 4. 出力フォーマットの指定

**JSONスキーマを明記する理由**:
- LLM が構造化出力を理解しやすい
- パース時のエラーが減る
- 回答が一貫する

```javascript
// LLM が期待するフォーマット
[
  {
    "aspect_no": number,
    "test_type": string,
    "test_category": string,
    "target_function": string,
    "specifications": string[],
    "target_bugs": string[],
    "priority": "P0" | "P1" | "P2",
    "test_cases": [
      {
        "case_id": string,
        "title": string,
        "steps": string[],
        "expected_results": string[]
      }
    ]
  }
]
```

---

## 🔍 処理フロー図（詳細版）

```
┌─────────────────────────────────────┐
│    入力：テスト観点CSV + URL        │
└──────────────┬──────────────────────┘
               │
               ▼
       ┌───────────────────┐
       │ CSV を解析        │
       │ (loadTestAspects) │
       └───────┬───────────┘
               │
               ▼ 23個の観点を抽出
       ┌──────────────────────┐
       │ 優先順位付け          │
       │ (prioritizeAspects)  │
       │ ├─ 未テスト優先     │
       │ └─ 最大10個に限定   │
       └───────┬──────────────┘
               │
               ▼ 10個の観点
       ┌──────────────────────────────┐
       │ プロンプト構築                 │
       │ (buildAnalysisPrompt)        │
       │ ├─ 対象URL              │
       │ ├─ イテレーション        │
       │ ├─ 既存カバレッジ        │
       │ └─ 観点リスト            │
       └───────┬──────────────────────┘
               │
               ▼
       ┌──────────────────────────────┐
       │ LLM 分析実行                  │
       │ (analyzeWithLLM)             │
       │ ├─ OpenAI Chat API 呼び出し  │
       │ ├─ システムロール設定         │
       │ └─ 4000トークン制限          │
       └───────┬──────────────────────┘
               │
               ▼ JSON（テキスト）
       ┌──────────────────────────────┐
       │ レスポンス解析                 │
       │ (parseAnalysisResponse)      │
       │ ├─ Markdownコードブロック抽出 │
       │ └─ JSON パース                │
       └───────┬──────────────────────┘
               │
               ▼ 解析結果（JSON）
       ┌──────────────────────────────┐
       │ テストケース抽出               │
       │ (extractTestCases)           │
       │ ├─ 各観点ごとに抽出           │
       │ └─ 観点情報を付加             │
       └───────┬──────────────────────┘
               │
               ▼ テストケース配列
       ┌──────────────────────────────┐
       │ Markdown 生成                 │
       │ (formatAsMarkdown)           │
       │ ├─ ヘッダー                   │
       │ ├─ 機能構造                   │
       │ ├─ 仕様                       │
       │ ├─ バグ対象                   │
       │ └─ テストケース               │
       └───────┬──────────────────────┘
               │
               ▼
    ┌────────────────────────────────┐
    │ 出力                           │
    ├─ analysis: JSON（分析結果）    │
    ├─ testCases: 配列               │
    └─ markdown: テキスト（レポート） │
    └────────────────────────────────┘
```

---

## 💡 使用例

### 基本的な使用方法

```javascript
const OthelloPlanner = require('./src/agents/othello-planner');
const { LLMFactory } = require('./src/llm/llm-factory');

// LLMクライアントを初期化
const llm = LLMFactory.createClient('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o'
});

// Planner インスタンスを作成
const planner = new OthelloPlanner({ llm });

// テスト計画を生成
const result = await planner.generateTestPlan({
  url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0',
  testAspectsCSV: './config/test-ViewpointList-simple.csv',
  iteration: 1
});

// 結果にアクセス
console.log('テストケース:', result.testCases);
console.log('Markdown レポート:', result.markdown);
```

---

## 📈 パフォーマンス特性

| 項目 | 値 | 備考 |
|------|-----|------|
| CSV 読み込み時間 | 5-10ms | 23観点のCSV |
| LLM API 呼び出し | 15-25秒 | ネットワーク遅延を含む |
| JSON パース | 5-10ms | 分析結果 |
| Markdown 生成 | 10-20ms | 3-4ケース/観点 |
| **全体処理時間** | **15-30秒** | 実測値: 19.37秒 |

---

## 🔗 関連ファイル

- **実装**: `src/agents/othello-planner.js`
- **LLM クライアント**: `src/llm/openai-client.js`
- **CSV パーサー**: `src/utils/csv-parser.js`
- **テスト**: `tests/othello-planner.test.js`
- **デモ**: `examples/demo-planner-custom.js`
- **設定**: `.env` (API Key)

---

## 🚀 次のステップ

1. **Othello-Generator**: テストケース → MCP playwright コマンド変換
2. **Othello-Executor**: MCP コマンドを実行してテストを実行
3. **Othello-Healer**: テスト失敗時の自動修復
4. **Analyzer**: カバレッジ分析
5. **Reporter**: レポート生成（JSON/HTML/Markdown）
6. **Orchestrator**: 8ステップの統合ループ

---

**作成日**: 2025年10月28日  
**バージョン**: 1.0  
**著者**: Othello Development Team
