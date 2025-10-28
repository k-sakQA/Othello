# Othello-Analyzer 技術ガイド

## 概要

Othello-Analyzerは、テスト実行結果を分析してカバレッジを算出するエージェントです。23観点のテスト網羅率を計算し、イテレーション継続判定を行います。

### 主な機能

- **観点カバレッジ計算**: 23観点の網羅率をリアルタイムで算出
- **テストケース統計**: 成功/失敗率、実行数を集計
- **イテレーション履歴分析**: 複数イテレーションの累積カバレッジを計算
- **継続判定**: 目標カバレッジ達成判定（デフォルト80%）
- **進捗可視化**: カバレッジ推移をビジュアルチャートで表示
- **推薦機能**: 次にテストすべき観点を提案

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                  Othello-Analyzer                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  入力: Execution Results (from Executor)                 │
│  ├─ test_case_id                                         │
│  ├─ aspect_no (観点番号)                                 │
│  └─ success (成功/失敗)                                  │
│                                                          │
│  処理:                                                   │
│  ├─ extractTestedAspects()     → [1,2,3,...]           │
│  ├─ calculateAspectCoverage()  → 13.04%                │
│  ├─ calculateTestCaseCoverage()→ 2/3 passed            │
│  └─ shouldContinueTesting()    → true/false            │
│                                                          │
│  出力: Coverage Object                                   │
│  ├─ aspectCoverage                                      │
│  │  ├─ total: 23                                        │
│  │  ├─ tested: 3                                        │
│  │  ├─ percentage: 13.04                                │
│  │  ├─ tested_aspects: [1,2,3]                          │
│  │  └─ untested_aspects: [4,5,6,...,23]                 │
│  └─ testCaseCoverage                                    │
│     ├─ total: 3                                         │
│     ├─ passed: 2                                        │
│     ├─ failed: 1                                        │
│     └─ pass_rate: 66.67                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 使用方法

### 基本的な使い方

```javascript
const OthelloAnalyzer = require('./src/agents/othello-analyzer');

const analyzer = new OthelloAnalyzer();

// 実行結果を分析
const executionResults = [
  { test_case_id: 'TC001', aspect_no: 1, success: true },
  { test_case_id: 'TC002', aspect_no: 2, success: true },
  { test_case_id: 'TC003', aspect_no: 3, success: false }
];

const coverage = analyzer.analyze(executionResults);

console.log(coverage);
// {
//   aspectCoverage: {
//     total: 23,
//     tested: 3,
//     percentage: 13.04,
//     tested_aspects: [1, 2, 3],
//     untested_aspects: [4, 5, 6, ..., 23]
//   },
//   testCaseCoverage: {
//     total: 3,
//     passed: 2,
//     failed: 1,
//     pass_rate: 66.67
//   }
// }
```

### イテレーション履歴の分析

```javascript
const history = [
  {
    iteration: 1,
    results: [
      { test_case_id: 'TC001', aspect_no: 1, success: true },
      { test_case_id: 'TC002', aspect_no: 2, success: true }
    ]
  },
  {
    iteration: 2,
    results: [
      { test_case_id: 'TC003', aspect_no: 3, success: true },
      { test_case_id: 'TC004', aspect_no: 4, success: false }
    ]
  }
];

const analysis = analyzer.analyzeWithHistory(history);

console.log(analysis.totalIterations);        // 2
console.log(analysis.cumulativeCoverage);     // 累積カバレッジ
console.log(analysis.iterationCoverages);     // 各イテレーションのカバレッジ
```

### 継続判定

```javascript
const targetCoverage = 80; // 目標80%

const shouldContinue = analyzer.shouldContinueTesting(
  coverage, 
  targetCoverage
);

if (shouldContinue) {
  console.log('目標未達成 - 次のイテレーションを実行');
} else {
  console.log('目標達成 - テスト終了');
}
```

## カバレッジ計算詳細

### 23観点とは

Othelloシステムでは、UIテストを以下の23観点で分類します：

1. 正常系フロー
2. 境界値テスト
3. 異常系エラー処理
4. バリデーションチェック
5. 権限・認証
6. データ整合性
7. レスポンス時間
8. 並行処理
9. ページ遷移
10. フォーム入力
11. 検索機能
12. フィルタリング
13. ソート機能
14. ページネーション
15. モーダル・ダイアログ
16. 通知・メッセージ
17. ファイルアップロード
18. ダウンロード機能
19. 印刷機能
20. モバイル対応
21. アクセシビリティ
22. 多言語対応
23. ブラウザ互換性

### カバレッジ計算式

```javascript
カバレッジ率(%) = (テスト済み観点数 / 23) × 100

// 例: 5観点をテストした場合
coverage = (5 / 23) × 100 = 21.74%
```

### 重複処理

同じ観点を複数回テストしても、カバレッジは1回としてカウントされます：

```javascript
const results = [
  { test_case_id: 'TC001', aspect_no: 1, success: true },
  { test_case_id: 'TC002', aspect_no: 1, success: true }, // 重複
  { test_case_id: 'TC003', aspect_no: 2, success: true }
];

const coverage = analyzer.analyze(results);
// tested: 2 (観点1と2のみ)
```

### 失敗ケースの扱い

失敗したテストケースもカバレッジに含まれます：

```javascript
const results = [
  { test_case_id: 'TC001', aspect_no: 1, success: true },
  { test_case_id: 'TC002', aspect_no: 2, success: false } // 失敗でもカウント
];

const coverage = analyzer.analyze(results);
// tested: 2 (両方カウント)
// testCaseCoverage.passed: 1
// testCaseCoverage.failed: 1
```

## API リファレンス

### `analyze(executionResults)`

実行結果を分析してカバレッジを算出

**パラメータ:**
- `executionResults` (Array): 実行結果の配列
  - `test_case_id` (string): テストケースID
  - `aspect_no` (number): 観点番号 (1-23)
  - `success` (boolean): 成功/失敗

**戻り値:**
```javascript
{
  aspectCoverage: {
    total: number,
    tested: number,
    percentage: number,
    tested_aspects: number[],
    untested_aspects: number[]
  },
  testCaseCoverage: {
    total: number,
    passed: number,
    failed: number,
    pass_rate: number
  }
}
```

### `calculateAspectCoverage(testedAspects)`

観点カバレッジを計算

**パラメータ:**
- `testedAspects` (Array<number>): テスト済み観点番号の配列

**戻り値:** aspectCoverageオブジェクト

### `calculateTestCaseCoverage(executionResults)`

テストケースカバレッジを計算

**パラメータ:**
- `executionResults` (Array): 実行結果の配列

**戻り値:** testCaseCoverageオブジェクト

### `extractTestedAspects(executionResults)`

実行結果から観点番号を抽出

**パラメータ:**
- `executionResults` (Array): 実行結果の配列

**戻り値:** 重複なしソート済み観点番号配列

### `getUntestedAspects(testedAspects)`

未テスト観点を取得

**パラメータ:**
- `testedAspects` (Array<number>): テスト済み観点番号の配列

**戻り値:** 未テスト観点番号配列

### `analyzeWithHistory(history)`

複数イテレーションの履歴から累積カバレッジを計算

**パラメータ:**
- `history` (Array): イテレーション履歴
  ```javascript
  [
    {
      iteration: number,
      results: Array<ExecutionResult>
    },
    ...
  ]
  ```

**戻り値:**
```javascript
{
  totalIterations: number,
  cumulativeCoverage: Coverage,
  iterationCoverages: Coverage[]
}
```

### `shouldContinueTesting(coverage, targetPercentage)`

テスト継続が必要かどうかを判定

**パラメータ:**
- `coverage` (Object): カバレッジ情報
- `targetPercentage` (number): 目標カバレッジ（デフォルト: 80）

**戻り値:** boolean (継続が必要な場合true)

### `formatSummary(coverage)`

カバレッジサマリーをフォーマット

**パラメータ:**
- `coverage` (Object): カバレッジ情報

**戻り値:** フォーマットされた文字列

### `visualizeProgress(history)`

カバレッジ進捗を可視化

**パラメータ:**
- `history` (Array): イテレーション履歴

**戻り値:** 進捗チャート文字列

### `recommendNextAspects(coverage, count)`

次のイテレーションで優先すべき観点を推薦

**パラメータ:**
- `coverage` (Object): 現在のカバレッジ
- `count` (number): 推薦する観点数（デフォルト: 5）

**戻り値:** 推薦観点番号配列

## 他エージェントとの連携

### Executorからの入力

```javascript
// Executorの実行結果を受け取る
const executorResult = await executor.execute(testCase);

const executionResult = {
  test_case_id: testCase.test_case_id,
  aspect_no: testCase.aspect_no,
  success: executorResult.success
};

// Analyzerで分析
const coverage = analyzer.analyze([executionResult]);
```

### Plannerへの出力

```javascript
// カバレッジ情報をPlannerに渡す
const coverage = analyzer.analyze(executionResults);

const plannerInput = {
  existingCoverage: coverage,
  untested_aspects: coverage.aspectCoverage.untested_aspects
};

const nextTestCases = await planner.plan(plannerInput);
```

### Orchestratorでのループ制御

```javascript
const orchestrator = {
  async run() {
    let iteration = 1;
    const maxIterations = 10;
    const targetCoverage = 80;
    const history = [];

    while (iteration <= maxIterations) {
      // テスト実行
      const results = await this.executeIteration();
      history.push({ iteration, results });

      // カバレッジ分析
      const analysis = analyzer.analyzeWithHistory(history);
      
      // 継続判定
      if (!analyzer.shouldContinueTesting(analysis.cumulativeCoverage, targetCoverage)) {
        console.log('目標カバレッジ達成！');
        break;
      }

      iteration++;
    }
  }
};
```

## カバレッジ進捗の可視化

### プログレスバー

```javascript
const history = [/* ... */];
console.log(analyzer.visualizeProgress(history));

// 出力例:
// 【カバレッジ進捗】
//
// イテレーション 1: [███░░░░░░░░░░░░░░░░░] 13.04% (3観点)
// イテレーション 2: [████░░░░░░░░░░░░░░░░] 21.74% (5観点)
// イテレーション 3: [██████░░░░░░░░░░░░░░] 30.43% (7観点)
//
// 累積カバレッジ: 30.43% (7/23観点)
```

### サマリーレポート

```javascript
const coverage = analyzer.analyze(results);
console.log(analyzer.formatSummary(coverage));

// 出力例:
// 【カバレッジサマリー】
//
// ■ 観点カバレッジ
//   - テスト済み: 10/23
//   - カバレッジ率: 43.48%
//   - 未テスト観点数: 13
//
// ■ テストケース実行結果
//   - 実行数: 15
//   - 成功: 12/15
//   - 失敗: 3/15
//   - 成功率: 80%
```

## パフォーマンス特性

| 操作 | 実行時間 | メモリ使用量 |
|------|----------|--------------|
| analyze (10件) | <1ms | 微小 |
| analyze (100件) | <5ms | 微小 |
| analyzeWithHistory (5イテレーション) | <10ms | 微小 |
| visualizeProgress (10イテレーション) | <5ms | 微小 |

### 最適化のヒント

1. **大量データ処理**: 実行結果が多い場合はバッチ処理を検討
2. **メモリ効率**: イテレーション履歴が長い場合は古いデータを削除
3. **リアルタイム更新**: WebSocketで進捗をリアルタイム送信

## エラーハンドリング

### 不正な観点番号

```javascript
const results = [
  { test_case_id: 'TC001', aspect_no: 99, success: true } // 不正（1-23のみ）
];

const coverage = analyzer.analyze(results);
// 不正な観点番号は無視され、tested: 0
```

### aspect_noなしの結果

```javascript
const results = [
  { test_case_id: 'TC001', success: true } // aspect_noなし
];

const coverage = analyzer.analyze(results);
// testCaseCoverageには含まれるが、aspectCoverageには影響なし
```

### 空の実行結果

```javascript
const coverage = analyzer.analyze([]);
// {
//   aspectCoverage: { tested: 0, percentage: 0, ... },
//   testCaseCoverage: { total: 0, passed: 0, failed: 0, pass_rate: 0 }
// }
```

## ベストプラクティス

### 1. イテレーション戦略

```javascript
// 推薦観点を使って次のイテレーションを効率化
const nextAspects = analyzer.recommendNextAspects(coverage, 5);
const plannerInput = {
  priority_aspects: nextAspects,
  existingCoverage: coverage
};
```

### 2. 目標カバレッジの設定

```javascript
// プロジェクトの重要度に応じて調整
const targetCoverage = {
  critical: 95,    // ミッションクリティカル
  standard: 80,    // 標準
  exploratory: 60  // 探索的テスト
};
```

### 3. 進捗モニタリング

```javascript
// 定期的にカバレッジを出力
setInterval(() => {
  const analysis = analyzer.analyzeWithHistory(history);
  console.log(analyzer.visualizeProgress(history));
}, 30000); // 30秒ごと
```

### 4. カバレッジレポート保存

```javascript
const fs = require('fs');

const analysis = analyzer.analyzeWithHistory(history);
fs.writeFileSync(
  'coverage-report.json',
  JSON.stringify(analysis, null, 2)
);
```

## トラブルシューティング

### Q: カバレッジが想定より低い

**A:** 以下を確認してください：
- `aspect_no`が正しく設定されているか
- 重複観点が多くないか（1観点=1カウント）
- 実行結果の配列が空でないか

### Q: イテレーション間でカバレッジが減少

**A:** `analyzeWithHistory`を使用していますか？各イテレーション単体では減少する可能性がありますが、累積カバレッジは常に増加します。

### Q: 目標カバレッジに到達しない

**A:** 以下を検討してください：
- 目標値が現実的か（100%は難しい場合も）
- 最大イテレーション数を増やす
- Plannerの優先度戦略を見直す

## まとめ

Othello-Analyzerは、テスト実行結果を分析してカバレッジを算出する重要なエージェントです。23観点の網羅率を正確に計算し、イテレーション継続判定を行うことで、効率的なテスト戦略を支援します。

次のステップ:
- Reporterでカバレッジレポートを生成
- Orchestratorでイテレーションループを統合
- Phase 9システム完成！

---

**関連ドキュメント:**
- [OTHELLO_EXECUTOR_TECHNICAL_GUIDE.md](OTHELLO_EXECUTOR_TECHNICAL_GUIDE.md)
- [OTHELLO_HEALER_TECHNICAL_GUIDE.md](OTHELLO_HEALER_TECHNICAL_GUIDE.md)
- [DETAILED_DESIGN_PHASE9.md](DETAILED_DESIGN_PHASE9.md)
