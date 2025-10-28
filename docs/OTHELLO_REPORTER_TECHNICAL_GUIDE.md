# Othello-Reporter 技術ガイド

## 概要

Othello-Reporterは、テスト実行結果から各種形式のレポートを生成するエージェントです。JSON（機械可読）、Markdown（人間可読）、HTML（ビジュアル）の3形式に対応し、カバレッジ情報やテスト結果を視覚的に表現します。

### 主な機能

- **JSON形式レポート**: API連携やCI/CDツールでの利用に最適
- **Markdown形式レポート**: GitHubやドキュメントサイトで表示可能
- **HTML形式レポート**: ブラウザで閲覧できる美しいビジュアルレポート
- **自動ファイル保存**: タイムスタンプ付きファイル名で自動保存
- **プログレスバー**: カバレッジ進捗を視覚的に表示
- **エラー詳細**: 失敗テストケースの詳細情報を含む

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                  Othello-Reporter                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  入力: Test Data (from Analyzer)                         │
│  ├─ sessionId                                            │
│  ├─ coverage (aspectCoverage, testCaseCoverage)          │
│  ├─ executionResults                                     │
│  ├─ iterations                                           │
│  └─ timestamps                                           │
│                                                          │
│  処理:                                                   │
│  ├─ generateJSON()      → JSON文字列                     │
│  ├─ generateMarkdown()  → Markdown文字列                 │
│  ├─ generateHTML()      → HTML文字列                     │
│  └─ saveAllReports()    → ファイル保存                   │
│                                                          │
│  出力: Reports                                           │
│  ├─ *.json    (3-5 KB, 機械可読)                         │
│  ├─ *.md      (2-3 KB, 人間可読)                         │
│  └─ *.html    (10-15 KB, ビジュアル)                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 使用方法

### 基本的な使い方

```javascript
const OthelloReporter = require('./src/agents/othello-reporter');

const reporter = new OthelloReporter({
  outputDir: './reports',
  includeTimestamp: true
});

// テスト実行データ
const testData = {
  sessionId: 'session-001',
  startTime: new Date('2025-10-29T10:00:00'),
  endTime: new Date('2025-10-29T10:15:30'),
  totalDuration: 930000, // 15分30秒
  iterations: 4,
  coverage: {
    aspectCoverage: {
      total: 23,
      tested: 18,
      percentage: 78.26,
      tested_aspects: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      untested_aspects: [19, 20, 21, 22, 23]
    },
    testCaseCoverage: {
      total: 25,
      passed: 22,
      failed: 3,
      pass_rate: 88
    }
  },
  executionResults: [
    {
      test_case_id: 'TC001',
      aspect_no: 1,
      success: true,
      duration_ms: 1200
    },
    {
      test_case_id: 'TC002',
      aspect_no: 2,
      success: false,
      duration_ms: 1500,
      error: 'Element not found'
    }
  ]
};

// レポート生成
const reports = await reporter.generateReport(testData);
console.log(reports.json);      // JSON文字列
console.log(reports.markdown);  // Markdown文字列
console.log(reports.html);      // HTML文字列
```

### ファイル保存

```javascript
// 全形式を一括保存
const savedFiles = await reporter.saveAllReports(testData, 'test-run');

console.log(savedFiles.json);      // ./reports/test-run-20251029-123456.json
console.log(savedFiles.markdown);  // ./reports/test-run-20251029-123456.md
console.log(savedFiles.html);      // ./reports/test-run-20251029-123456.html
```

### 個別形式の生成

```javascript
// JSON形式のみ
const jsonReport = reporter.generateJSON(testData);
const jsonPath = await reporter.saveReport(testData, 'json', 'report.json');

// Markdown形式のみ
const markdownReport = reporter.generateMarkdown(testData);
const mdPath = await reporter.saveReport(testData, 'markdown', 'report.md');

// HTML形式のみ
const htmlReport = reporter.generateHTML(testData);
const htmlPath = await reporter.saveReport(testData, 'html', 'report.html');
```

## レポート形式詳細

### 1. JSON形式

**用途**: API連携、CI/CDツール、データ分析

**特徴**:
- 機械可読な構造化データ
- 完全なテスト実行データを保持
- 2階層のインデント（読みやすさ重視）

**サンプル**:
```json
{
  "sessionId": "session-001",
  "coverage": {
    "aspectCoverage": {
      "total": 23,
      "tested": 18,
      "percentage": 78.26,
      "tested_aspects": [1, 2, 3, ...],
      "untested_aspects": [19, 20, 21, 22, 23]
    },
    "testCaseCoverage": {
      "total": 25,
      "passed": 22,
      "failed": 3,
      "pass_rate": 88
    }
  },
  "executionResults": [...]
}
```

**サイズ**: 3-5 KB（25テストケース程度）

### 2. Markdown形式

**用途**: GitHub、GitLab、ドキュメントサイト

**特徴**:
- 人間が読みやすい形式
- GitHubで自動レンダリング
- テーブルとプログレスバーで視覚化

**サンプル**:
```markdown
# Othello テスト実行レポート

**セッションID**: session-001
**開始時刻**: 2025年10月29日 10:00:00
**終了時刻**: 2025年10月29日 10:15:30
**実行時間**: 15m 30s
**イテレーション数**: 4

---

## 📊 カバレッジサマリー

### 観点カバレッジ

- **テスト済み観点**: 18/23
- **カバレッジ率**: 78.26%
- **未テスト観点数**: 5

```
[███████████████████████████████████████░░░░░░░░░░░] 78.26%
```

### テストケース実行結果

- **総実行数**: 25
- **成功**: 22/25 (88%)
- **失敗**: 3/25

---

## 📝 実行結果詳細

| テストケースID | 観点 | 結果 | 実行時間 | エラー |
|---------------|------|------|----------|--------|
| TC001 | 1 | ✅ 成功 | 1.20s | - |
| TC002 | 2 | ❌ 失敗 | 1.50s | Element not found |
```

**サイズ**: 2-3 KB

### 3. HTML形式

**用途**: ブラウザでの閲覧、プレゼンテーション、アーカイブ

**特徴**:
- 美しいビジュアルデザイン
- レスポンシブレイアウト
- カラフルなメトリクスカード
- インタラクティブなプログレスバー
- グラデーション効果

**デザイン要素**:
- **メトリクスカード**: 3色のグラデーション（カバレッジ/成功/失敗）
- **プログレスバー**: アニメーション付き
- **テーブル**: ホバーエフェクト
- **バッジ**: 観点番号の視覚化

**サンプル構造**:
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Othello テスト実行レポート</title>
  <style>
    /* 美しいCSSスタイル */
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Othello テスト実行レポート</h1>
    
    <!-- メトリクスカード -->
    <div class="metrics">
      <div class="metric-card">
        <h3>観点カバレッジ</h3>
        <div class="value">78.26%</div>
      </div>
    </div>
    
    <!-- プログレスバー -->
    <div class="progress-bar" style="width: 78.26%">
      78.26%
    </div>
    
    <!-- テーブル -->
    <table>...</table>
  </div>
</body>
</html>
```

**サイズ**: 10-15 KB（CSS含む）

## API リファレンス

### `constructor(options)`

レポーター初期化

**パラメータ:**
```javascript
{
  outputDir: './reports',      // 出力ディレクトリ
  includeTimestamp: true       // ファイル名にタイムスタンプを含める
}
```

### `generateReport(testData)`

全形式のレポートを生成

**パラメータ:**
- `testData` (Object): テスト実行データ

**戻り値:**
```javascript
{
  json: string,      // JSON文字列
  markdown: string,  // Markdown文字列
  html: string       // HTML文字列
}
```

### `generateJSON(testData)`

JSON形式のレポートを生成

**戻り値:** JSON文字列（2スペースインデント）

### `generateMarkdown(testData)`

Markdown形式のレポートを生成

**戻り値:** Markdown文字列

### `generateHTML(testData)`

HTML形式のレポートを生成

**戻り値:** HTML文字列（完全なドキュメント）

### `saveReport(testData, format, filename)`

レポートをファイルに保存

**パラメータ:**
- `testData` (Object): テスト実行データ
- `format` (string): 'json' | 'markdown' | 'html'
- `filename` (string): ファイル名

**戻り値:** 保存されたファイルパス

### `saveAllReports(testData, baseName)`

全形式のレポートを一括保存

**パラメータ:**
- `testData` (Object): テスト実行データ
- `baseName` (string): ベースファイル名

**戻り値:**
```javascript
{
  json: string,      // JSONファイルパス
  markdown: string,  // Markdownファイルパス
  html: string       // HTMLファイルパス
}
```

### `formatDuration(ms)`

ミリ秒を人間が読める形式に変換

**パラメータ:**
- `ms` (number): ミリ秒

**戻り値:**
- `500ms` (500ミリ秒未満)
- `1.50s` (1秒以上1分未満)
- `1m 5s` (1分以上1時間未満)
- `1h 1m 5s` (1時間以上)

**例:**
```javascript
reporter.formatDuration(500);      // "500ms"
reporter.formatDuration(1500);     // "1.50s"
reporter.formatDuration(65000);    // "1m 5s"
reporter.formatDuration(3665000);  // "1h 1m 5s"
```

### `formatTimestamp(date)`

タイムスタンプをフォーマット

**パラメータ:**
- `date` (Date): 日付オブジェクト

**戻り値:** 日本語形式の日時文字列

**例:**
```javascript
const date = new Date('2025-10-29T12:34:56');
reporter.formatTimestamp(date);
// "2025年10月29日 12:34:56"
```

### `generateProgressBar(percentage)`

プログレスバーを生成

**パラメータ:**
- `percentage` (number): パーセンテージ (0-100)

**戻り値:** プログレスバー文字列（幅50文字）

**例:**
```javascript
reporter.generateProgressBar(78.26);
// "[███████████████████████████████████████░░░░░░░░░░░] 78.26%"
```

## 他エージェントとの連携

### Analyzerからの入力

```javascript
const OthelloAnalyzer = require('./src/agents/othello-analyzer');
const OthelloReporter = require('./src/agents/othello-reporter');

const analyzer = new OthelloAnalyzer();
const reporter = new OthelloReporter();

// Analyzerから分析結果を取得
const analysis = analyzer.analyzeWithHistory(history);

// Reporterでレポート生成
const testData = {
  sessionId: 'session-001',
  coverage: analysis.cumulativeCoverage,
  executionResults: history.flatMap(h => h.results),
  iterations: analysis.totalIterations
};

const reports = await reporter.saveAllReports(testData, 'final-report');
```

### Orchestratorでの利用

```javascript
class Orchestrator {
  async run() {
    // テスト実行ループ
    while (!this.shouldStop()) {
      // ... テスト実行 ...
    }

    // 最終レポート生成
    const testData = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: new Date(),
      totalDuration: Date.now() - this.startTime.getTime(),
      coverage: this.analyzer.getCoverage(),
      executionResults: this.getAllResults(),
      iterations: this.iterationCount
    };

    const reports = await this.reporter.saveAllReports(
      testData,
      `session-${this.sessionId}`
    );

    console.log('レポート生成完了:', reports);
  }
}
```

### CI/CDでの利用

```javascript
// GitHub Actions / Jenkins / GitLab CI
const reporter = new OthelloReporter({
  outputDir: process.env.REPORT_DIR || './test-reports',
  includeTimestamp: false  // CI環境では固定ファイル名
});

const testData = loadTestResults();
const reports = await reporter.saveAllReports(testData, 'ci-report');

// JSON形式をアーティファクトとして保存
// HTML形式をGitHub Pagesで公開
// Markdown形式をPRコメントに投稿
```

## パフォーマンス特性

| 操作 | 実行時間 | メモリ使用量 |
|------|----------|--------------|
| generateJSON (25件) | <5ms | 微小 |
| generateMarkdown (25件) | <10ms | 微小 |
| generateHTML (25件) | <15ms | 微小 |
| saveAllReports (25件) | <50ms | 微小 |

### サイズの目安

| テストケース数 | JSON | Markdown | HTML |
|--------------|------|----------|------|
| 10件 | 1.5 KB | 1 KB | 10 KB |
| 25件 | 3.5 KB | 2 KB | 12 KB |
| 50件 | 7 KB | 4 KB | 15 KB |
| 100件 | 14 KB | 8 KB | 20 KB |

## カスタマイズ

### CSSスタイルのカスタマイズ

`generateHTML()`メソッドを拡張してカスタムスタイルを適用：

```javascript
class CustomReporter extends OthelloReporter {
  generateHTML(testData) {
    const html = super.generateHTML(testData);
    
    // カスタムCSSを注入
    return html.replace(
      '</style>',
      `
      .container { max-width: 1400px; }
      .metric-card { border-radius: 12px; }
      </style>
      `
    );
  }
}
```

### レポート内容の拡張

```javascript
class ExtendedReporter extends OthelloReporter {
  generateMarkdown(testData) {
    let markdown = super.generateMarkdown(testData);
    
    // カスタムセクションを追加
    markdown += '\n## 🔍 詳細分析\n\n';
    markdown += this.generateDetailedAnalysis(testData);
    
    return markdown;
  }

  generateDetailedAnalysis(testData) {
    // カスタム分析ロジック
    return '詳細な分析内容...';
  }
}
```

### 多言語対応

```javascript
const reporter = new OthelloReporter({
  locale: 'en',  // 英語
  outputDir: './reports'
});

// i18n対応
const i18n = {
  ja: {
    title: 'Othello テスト実行レポート',
    coverage: 'カバレッジ'
  },
  en: {
    title: 'Othello Test Execution Report',
    coverage: 'Coverage'
  }
};
```

## ベストプラクティス

### 1. タイムスタンプ管理

```javascript
// 開発環境: タイムスタンプ有効
const devReporter = new OthelloReporter({
  includeTimestamp: true
});

// 本番環境: 固定ファイル名
const prodReporter = new OthelloReporter({
  includeTimestamp: false
});
```

### 2. エラーハンドリング

```javascript
try {
  const reports = await reporter.saveAllReports(testData, 'test-run');
  console.log('✅ レポート生成成功:', reports);
} catch (error) {
  console.error('❌ レポート生成失敗:', error);
  
  // フォールバック: JSON形式のみ保存
  const jsonPath = await reporter.saveReport(testData, 'json', 'fallback.json');
  console.log('JSON形式のみ保存:', jsonPath);
}
```

### 3. ディレクトリ構成

```
reports/
├── daily/
│   ├── 2025-10-29/
│   │   ├── session-001.json
│   │   ├── session-001.md
│   │   └── session-001.html
│   └── 2025-10-30/
├── weekly/
│   └── week-43-summary.html
└── monthly/
    └── 2025-10-summary.html
```

### 4. レポートの自動配信

```javascript
const nodemailer = require('nodemailer');

async function sendReport(reports) {
  const transporter = nodemailer.createTransporter({...});
  
  await transporter.sendMail({
    to: 'team@example.com',
    subject: 'Othello Test Report',
    html: fs.readFileSync(reports.html, 'utf-8'),
    attachments: [
      { path: reports.json },
      { path: reports.markdown }
    ]
  });
}
```

## トラブルシューティング

### Q: HTMLレポートのスタイルが崩れる

**A:** ブラウザのキャッシュをクリアしてください。または、HTMLファイルに`?v=timestamp`を追加してキャッシュバスターとして使用します。

### Q: ファイル保存時にPermission Denied

**A:** 出力ディレクトリの書き込み権限を確認してください：
```bash
chmod 755 ./reports
```

### Q: 大量のテストケースでメモリ不足

**A:** ストリーミング書き込みを使用：
```javascript
const fs = require('fs');
const stream = fs.createWriteStream('large-report.json');
stream.write(JSON.stringify(testData));
stream.end();
```

### Q: 日本語が文字化けする

**A:** UTF-8エンコーディングを明示的に指定：
```javascript
fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
```

## まとめ

Othello-Reporterは、テスト実行結果を3つの形式で出力できる柔軟なレポート生成エージェントです。JSON（機械可読）、Markdown（人間可読）、HTML（ビジュアル）の各形式は、それぞれ異なる用途に最適化されています。

次のステップ:
- Orchestratorでレポート生成を自動化
- CI/CDパイプラインに組み込む
- カスタムレポート形式を追加
- Phase 9システム完成！

---

**関連ドキュメント:**
- [OTHELLO_ANALYZER_TECHNICAL_GUIDE.md](OTHELLO_ANALYZER_TECHNICAL_GUIDE.md)
- [OTHELLO_EXECUTOR_TECHNICAL_GUIDE.md](OTHELLO_EXECUTOR_TECHNICAL_GUIDE.md)
- [DETAILED_DESIGN_PHASE9.md](DETAILED_DESIGN_PHASE9.md)
