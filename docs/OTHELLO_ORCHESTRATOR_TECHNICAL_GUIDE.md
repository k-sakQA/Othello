# Othello-Orchestrator Technical Guide

## Overview

Othello-Orchestratorは、Phase 9アーキテクチャにおける最終統合コンポーネントで、6つの専門エージェント（Planner、Generator、Executor、Healer、Analyzer、Reporter）を統合し、8ステップのイテレーションループを実行します。

**主な責務:**
- 8ステップイテレーションループの制御
- カバレッジ目標達成判定
- 停滞検出による早期終了
- 最終レポート生成

**8ステップフロー:**
1. **Planner**: 未カバー観点からテスト計画生成
2. **Generator**: プラン→MCP命令変換
3. **Executor**: MCP命令実行
4. **Analyzer**: 結果分析（カバレッジ計算）
5. **Healer**: 失敗テスト修復（autoHeal時）
6. **Analyzer**: カバレッジ再計算（修復後）
7. **Reporter**: イテレーションレポート
8. **Decision**: 継続/終了判定

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Orchestrator                            │
│                  (8-Step Iteration Loop)                     │
└────┬────────────────────────────────────────────────────┬────┘
     │                                                     │
     │  ┌──────────────────────────────────────────────┐  │
     │  │         Iteration Control Logic              │  │
     │  │  • shouldContinue()                          │  │
     │  │  • isStagnant()                              │  │
     │  │  • getCurrentCoverage()                      │  │
     │  └──────────────────────────────────────────────┘  │
     │                                                     │
     ├──────┬──────┬──────┬──────┬──────┬──────┬─────────┤
     │      │      │      │      │      │      │         │
     v      v      v      v      v      v      v         v
  Planner Generator Executor Healer Analyzer Reporter Playwright
   (23観点) (MCP命令) (テスト実行) (自動修復) (カバレッジ) (3形式)    MCP
```

### Component Dependencies

- **Planner**: 23観点CSVからテストケース生成
- **Generator**: テストケース→MCP命令変換
- **Executor**: MCP命令実行（Playwright MCP経由）
- **Healer**: 失敗テストの自動修復
- **Analyzer**: カバレッジ計算（観点/テストケース）
- **Reporter**: JSON/Markdown/HTMLレポート生成

---

## Configuration

### Constructor Options

```javascript
const orchestrator = new Orchestrator({
  // 必須設定
  url: 'https://hotel.example.com',          // テスト対象URL
  
  // イテレーション制御
  maxIterations: 10,                          // 最大イテレーション数（デフォルト: 10）
  coverageTarget: 80,                         // 目標カバレッジ%（デフォルト: 80）
  autoHeal: true,                             // 自動修復有効化（デフォルト: true）
  
  // ファイルパス
  outputDir: './reports',                     // レポート出力先（デフォルト: ./reports）
  testAspectsCSV: './config/test-ViewpointList-simple.csv', // 観点定義CSV
  
  // その他
  browser: 'chromium'                         // ブラウザ種別（デフォルト: chromium）
});
```

### Configuration Details

| オプション | 型 | デフォルト | 説明 |
|----------|-----|----------|-----|
| `url` | string | 'https://example.com' | テスト対象URL |
| `maxIterations` | number | 10 | 最大イテレーション数（1-100推奨） |
| `coverageTarget` | number | 80 | 目標カバレッジ%（0-100） |
| `autoHeal` | boolean | true | 失敗テスト自動修復の有効化 |
| `outputDir` | string | './reports' | レポート保存ディレクトリ |
| `testAspectsCSV` | string | './config/test-ViewpointList-simple.csv' | 23観点定義ファイル |
| `browser` | string | 'chromium' | Playwright使用ブラウザ |

---

## Usage Examples

### Basic Usage

```javascript
const Orchestrator = require('./src/orchestrator');

async function main() {
  const orchestrator = new Orchestrator({
    url: 'https://hotel.example.com',
    maxIterations: 5,
    coverageTarget: 80,
    autoHeal: true
  });

  await orchestrator.run();
}

main().catch(console.error);
```

### Advanced Usage with Custom Agents

```javascript
const Orchestrator = require('./src/orchestrator');
const CustomPlanner = require('./custom/planner');

const orchestrator = new Orchestrator({
  url: 'https://hotel.example.com',
  maxIterations: 10
});

// カスタムエージェント注入
orchestrator.planner = new CustomPlanner({
  customStrategy: 'priority-based'
});

await orchestrator.run();
```

### CLI Usage (Future)

```bash
# 基本実行
node bin/othello.js --url https://hotel.example.com

# カスタム設定
node bin/othello.js \
  --url https://hotel.example.com \
  --max-iterations 10 \
  --coverage-target 90 \
  --no-auto-heal \
  --output-dir ./custom-reports
```

---

## 8-Step Breakdown

### Step 1: Planner - Test Planning

**Purpose**: 未カバー観点に基づいてテスト計画を生成

**Input:**
```javascript
{
  url: 'https://hotel.example.com',
  testAspectsCSV: './config/test-ViewpointList-simple.csv',
  existingCoverage: { /* 前回のカバレッジデータ */ }
}
```

**Output:**
```javascript
{
  testCases: [
    {
      test_case_id: 'TC-001',
      aspect_no: 1,
      aspect_name: 'レスポンシブデザイン',
      instructions: [/* テストステップ */]
    }
  ]
}
```

**Timing**: ~500ms

---

### Step 2: Generator - Test Script Generation

**Purpose**: テスト計画をMCP命令に変換

**Input:**
```javascript
{
  testCases: [/* Plannerの出力 */],
  snapshot: { /* Playwright MCPのページスナップショット */ }
}
```

**Output:**
```javascript
{
  testCases: [
    {
      test_case_id: 'TC-001',
      instructions: [
        { tool: 'browser_navigate', params: { url: '...' } },
        { tool: 'browser_click', params: { element: '...' } }
      ]
    }
  ]
}
```

**Timing**: ~1s

---

### Step 3: Executor - Test Execution

**Purpose**: MCP命令を実行してテスト結果を取得

**Input:**
```javascript
{
  test_case_id: 'TC-001',
  instructions: [/* Generatorの出力 */]
}
```

**Output:**
```javascript
{
  success: true,
  duration_ms: 1234,
  error: null,
  snapshot: { /* 実行後のスナップショット */ }
}
```

**Timing**: ~2-5s per test case

---

### Step 4: Analyzer - Coverage Analysis

**Purpose**: 実行結果からカバレッジを計算

**Input:**
```javascript
[
  { test_case_id: 'TC-001', aspect_no: 1, success: true },
  { test_case_id: 'TC-002', aspect_no: 2, success: false }
]
```

**Output:**
```javascript
{
  aspectCoverage: {
    total: 23,
    tested: 1,
    percentage: 4.3,
    tested_aspects: [1],
    untested_aspects: [2, 3, ..., 23]
  },
  testCaseCoverage: {
    total: 2,
    passed: 1,
    failed: 1,
    pass_rate: 50.0
  }
}
```

**Timing**: ~100ms

---

### Step 5: Healer - Failure Recovery (Conditional)

**Purpose**: 失敗テストを分析して自動修復

**Condition**: `config.autoHeal === true` かつ `test.success === false`

**Input:**
```javascript
{
  test_case_id: 'TC-002',
  instructions: [/* 失敗した命令 */],
  error: 'Element not found: button#submit',
  snapshot: { /* 失敗時のページ状態 */ }
}
```

**Output:**
```javascript
{
  healed: true,
  fix_type: 'LOCATOR_FIX',
  fixed_instructions: [/* 修復後の命令 */],
  reason: null
}
```

**Post-Healing**: 修復成功時は自動的に再実行

**Timing**: ~1-2s per failed test

---

### Step 6: Analyzer - Re-analysis (After Healing)

**Purpose**: 修復後のテスト結果でカバレッジを再計算

**Note**: Step 4と同じロジック、ただし修復後の結果を使用

---

### Step 7: Reporter - Report Generation

**Purpose**: イテレーション結果をレポート化（内部処理）

**Note**: 最終レポートは全イテレーション完了後に生成

---

### Step 8: Decision - Loop Control

**Purpose**: イテレーション継続/終了を判定

**Checks:**
1. **Coverage Target**: `currentCoverage >= coverageTarget` → 終了
2. **Max Iterations**: `iteration >= maxIterations` → 終了
3. **Stagnation**: `isStagnant()` → 終了
4. **Otherwise**: 次のイテレーションへ

---

## Loop Control Logic

### shouldContinue()

イテレーション継続可否を判定

```javascript
shouldContinue() {
  return this.iteration < this.config.maxIterations;
}
```

**Returns**: `boolean`

---

### isStagnant()

カバレッジ停滞を検出

```javascript
isStagnant() {
  if (this.history.length < 3) {
    return false;  // 3イテレーション未満は判定しない
  }

  const recent = this.history.slice(-3);
  const coverages = recent.map(h => h.coverage.aspectCoverage.percentage);
  const maxDiff = Math.max(...coverages) - Math.min(...coverages);

  return maxDiff < 1.0;  // 1%未満の変化 = 停滞
}
```

**Logic**: 直近3イテレーションのカバレッジ変化が1%未満なら停滞

**Returns**: `boolean`

---

### getCurrentCoverage()

現在の累積カバレッジを取得

```javascript
getCurrentCoverage() {
  if (this.history.length === 0) {
    return {
      aspectCoverage: { total: 23, tested: 0, percentage: 0 },
      testCaseCoverage: { total: 0, passed: 0, failed: 0, pass_rate: 0 }
    };
  }

  const allResults = this.history.flatMap(h => h.executionResults);
  return this.analyzer.analyze(allResults);
}
```

**Returns**: カバレッジデータオブジェクト

---

## Error Handling

### Iteration Failure

イテレーション実行中にエラーが発生した場合:

```javascript
try {
  await this.runIteration();
} catch (error) {
  console.error(`❌ Iteration ${this.iteration} failed:`, error.message);
  throw error;  // 上位へ伝播
}
```

**Behavior**: 
- エラーメッセージをコンソール出力
- イテレーションを中断してthrow
- Playwright MCPは`finally`ブロックでクリーンアップ

---

### Agent Failure

個別エージェントの失敗:

```javascript
// Executor失敗 → Healerで修復試行
if (!result.success && this.config.autoHeal) {
  const healResult = await this.healer.heal({...});
  
  if (healResult.healed) {
    // 修復成功 → 再実行
    const retryResult = await this.executor.execute(testCase);
  }
}
```

**Behavior**:
- Executor失敗時はHealerで修復試行（autoHeal時）
- 修復成功なら自動再実行
- 修復失敗なら失敗として記録

---

### Cleanup

```javascript
finally {
  if (this.playwrightMCP) {
    await this.playwrightMCP.closePage();
  }
}
```

**Guarantees**:
- 成功/失敗に関わらずPlaywright MCPをクリーンアップ
- リソースリークを防止

---

## Performance

### Expected Timing per Iteration

| Phase | Component | Avg Time | Max Time |
|-------|----------|---------|---------|
| 1 | Planner | 500ms | 1s |
| 2 | Generator | 1s | 2s |
| 3 | Executor (per test) | 3s | 10s |
| 4 | Analyzer | 100ms | 500ms |
| 5 | Healer (per failure) | 1.5s | 3s |
| 6 | Analyzer | 100ms | 500ms |
| 7 | Reporter | 200ms | 1s |
| 8 | Decision | <10ms | 50ms |

**Total per Iteration**: ~5-15s (テストケース数とHealer実行に依存)

### Full Run Estimation

```
Total Time = (Iterations × Average Time per Iteration) + Final Report
           = (5 × 10s) + 2s
           = 52s

For 10 iterations with 3 test cases each:
  - Planning:   5s
  - Generation: 10s
  - Execution:  90s (30 tests × 3s)
  - Healing:    15s (10 failures × 1.5s)
  - Analysis:   5s
  - Reporting:  2s
  ─────────────────
  Total:        127s (~2 minutes)
```

### Optimization Tips

1. **Parallel Execution**: Executor内でテストを並列実行（将来実装）
2. **Cache Planning**: 同じページ構造なら計画をキャッシュ
3. **Smart Healing**: 同じエラーパターンは修復結果を再利用
4. **Early Exit**: カバレッジ目標達成で即座に終了

---

## Integration

### With Configuration Files

```javascript
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./config/default.json', 'utf8'));

const orchestrator = new Orchestrator({
  url: config.target_url,
  maxIterations: config.max_iterations,
  coverageTarget: config.coverage_target,
  autoHeal: config.auto_heal
});
```

### With CLI Entry Point

```javascript
// bin/othello.js
const Orchestrator = require('../src/orchestrator');
const yargs = require('yargs');

const argv = yargs
  .option('url', {
    alias: 'u',
    description: 'Target URL',
    type: 'string',
    demandOption: true
  })
  .option('max-iterations', {
    alias: 'm',
    description: 'Maximum iterations',
    type: 'number',
    default: 10
  })
  .argv;

const orchestrator = new Orchestrator({
  url: argv.url,
  maxIterations: argv.maxIterations
});

orchestrator.run().catch(console.error);
```

### With Playwright MCP

```javascript
const PlaywrightMCPClient = require('./mcp/playwright-client');

const orchestrator = new Orchestrator({...});

// Playwright MCP接続
orchestrator.playwrightMCP = new PlaywrightMCPClient({
  browser: 'chromium',
  headless: true
});

await orchestrator.run();
```

---

## Best Practices

### 1. Configuration Management

```javascript
// ❌ Bad: ハードコーディング
const orchestrator = new Orchestrator({
  url: 'https://hotel.example.com',
  maxIterations: 10
});

// ✅ Good: 環境変数や設定ファイルから読み込み
const orchestrator = new Orchestrator({
  url: process.env.TARGET_URL || config.target_url,
  maxIterations: parseInt(process.env.MAX_ITERATIONS) || 10
});
```

---

### 2. Error Handling

```javascript
// ❌ Bad: エラーを無視
await orchestrator.run();

// ✅ Good: 適切なエラー処理
try {
  await orchestrator.run();
  console.log('✅ Orchestrator completed successfully');
} catch (error) {
  console.error('❌ Orchestrator failed:', error.message);
  process.exit(1);
}
```

---

### 3. Resource Cleanup

```javascript
// ❌ Bad: クリーンアップ忘れ
const orchestrator = new Orchestrator({...});
await orchestrator.run();

// ✅ Good: finallyでクリーンアップ
const orchestrator = new Orchestrator({...});
try {
  await orchestrator.run();
} finally {
  // 追加のクリーンアップ処理
  await cleanupResources();
}
```

---

### 4. Logging

```javascript
// ✅ Good: イテレーション開始時にログ
console.log(`Starting iteration ${orchestrator.iteration}`);
console.log(`Current coverage: ${orchestrator.getCurrentCoverage().aspectCoverage.percentage}%`);

// ✅ Good: 完了時に統計出力
console.log(`Completed in ${orchestrator.iteration} iterations`);
console.log(`Final coverage: ${orchestrator.getCurrentCoverage().aspectCoverage.percentage}%`);
```

---

## Troubleshooting

### Issue 1: イテレーションが進まない

**Symptoms**:
- `iteration = 1` で停止
- エラーメッセージなし

**Causes**:
1. `shouldContinue()` が常に `false` を返している
2. エージェントが初期化されていない

**Solutions**:
```javascript
// 1. maxIterations確認
console.log('Max iterations:', orchestrator.config.maxIterations);
console.log('Current iteration:', orchestrator.iteration);

// 2. エージェント初期化確認
console.log('Planner initialized:', !!orchestrator.planner);
console.log('Generator initialized:', !!orchestrator.generator);
```

---

### Issue 2: カバレッジが増えない

**Symptoms**:
- 複数イテレーション実行してもカバレッジ0%
- テストケースは生成されている

**Causes**:
1. 全テストが失敗している
2. Analyzerが正しく動作していない
3. 観点番号のマッピング不一致

**Solutions**:
```javascript
// 1. 実行結果確認
console.log('Execution results:', orchestrator.history[0].executionResults);

// 2. Analyzer出力確認
const coverage = orchestrator.getCurrentCoverage();
console.log('Coverage:', JSON.stringify(coverage, null, 2));

// 3. autoHeal有効化
orchestrator.config.autoHeal = true;
```

---

### Issue 3: 停滞誤検出

**Symptoms**:
- カバレッジが増加しているのに停滞判定で終了

**Causes**:
- 1%未満の増加が3回連続
- 停滞閾値が厳しすぎる

**Solutions**:
```javascript
// 停滞ロジックをカスタマイズ
orchestrator.isStagnant = function() {
  if (this.history.length < 5) return false;  // 5イテレーションまで待つ
  
  const recent = this.history.slice(-5);
  const coverages = recent.map(h => h.coverage.aspectCoverage.percentage);
  const maxDiff = Math.max(...coverages) - Math.min(...coverages);
  
  return maxDiff < 2.0;  // 2%未満を停滞と判定
};
```

---

### Issue 4: レポートが生成されない

**Symptoms**:
- `run()` 完了後もレポートファイルがない
- エラーなし

**Causes**:
1. `outputDir` が存在しない
2. Reporter未初期化
3. 書き込み権限なし

**Solutions**:
```javascript
// 1. ディレクトリ作成
const fs = require('fs');
if (!fs.existsSync(orchestrator.config.outputDir)) {
  fs.mkdirSync(orchestrator.config.outputDir, { recursive: true });
}

// 2. Reporter初期化確認
console.log('Reporter initialized:', !!orchestrator.reporter);

// 3. 手動レポート生成
const reports = await orchestrator.generateFinalReport();
console.log('Reports:', reports);
```

---

## API Reference

### Constructor

```typescript
constructor(config?: OrchestratorConfig): Orchestrator
```

**Parameters:**
- `config` (optional): 設定オブジェクト

**Returns**: Orchestrator instance

---

### run()

```typescript
async run(): Promise<void>
```

メインイテレーションループを実行

**Throws**: イテレーション実行中のエラー

---

### runIteration()

```typescript
async runIteration(): Promise<void>
```

1イテレーション（8ステップ）を実行

**Side Effects**: `history` に結果を追加

---

### shouldContinue()

```typescript
shouldContinue(): boolean
```

イテレーション継続判定

**Returns**: `true` if iteration < maxIterations

---

### getCurrentCoverage()

```typescript
getCurrentCoverage(): CoverageData
```

現在の累積カバレッジを取得

**Returns**: カバレッジデータオブジェクト

---

### isStagnant()

```typescript
isStagnant(): boolean
```

停滞判定

**Returns**: `true` if カバレッジが停滞

---

### generateFinalReport()

```typescript
async generateFinalReport(): Promise<ReportPaths>
```

最終レポートを全形式で生成

**Returns**:
```javascript
{
  json: string,     // JSONファイルパス
  markdown: string, // Markdownファイルパス
  html: string      // HTMLファイルパス
}
```

---

## Conclusion

Othello-Orchestratorは、Phase 9アーキテクチャの中核として、6つのエージェントを統合し、自動的にカバレッジ目標達成を目指します。

**Key Features:**
- ✅ 8ステップイテレーションループ
- ✅ カバレッジ駆動テスト生成
- ✅ 自動修復（Healer統合）
- ✅ 停滞検出
- ✅ 3形式レポート生成

**Next Steps:**
1. CLI entry point実装 (`bin/othello.js`)
2. End-to-end integration test
3. Performance optimization
4. Documentation finalization

Phase 9完成まであと一歩！🎉
