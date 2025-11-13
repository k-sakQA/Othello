# Othello ♟️

Othelloは、Web UIテストケースの自動生成・実行・失敗修復・レポート作成を統合したテスト自動化フレームワークです。ユーザーが用意した仕様書と23のテスト観点に基づきテストを自動生成し、失敗したケースは自動修復しながら目標の網羅率に達するまで自律的にイテレーション実行します。

## セットアップ

### 1. 環境の準備

Node.js（バージョン14以上）をインストールしてください。また、OpenAI APIキーを取得しておきます（LLMを利用したテスト分析に必要です）。

### 2. プロジェクトの取得

```bash
git clone https://github.com/k-sakQA/Othello.git
cd Othello
npm install
```

### 3. 環境変数の設定

```bash
cp .env.example .env
```

エディタで生成された `.env` ファイルを開き、`OPENAI_API_KEY=` に取得したAPIキーを入力してください。

### 4. Playwright MCPサーバーの準備

テスト実行にはPlaywrightのMCPサーバーが必要です。Othello起動時にサーバー起動状況を自動チェックし、未起動の場合は起動方法をコンソールに表示します。必要に応じて別ターミナルで以下のコマンドを実行し、MCPサーバーを起動してください：

```bash
npx @playwright/mcp@latest --browser chromium
```

> **補足**: 初回実行時にはPlaywrightがブラウザモジュールをダウンロードするため時間がかかる場合があります。

### 5. 仕様書の配置（任意）

テスト対象システムの仕様書がある場合は、本プロジェクト直下に `spec` ディレクトリを作成し、その中にMarkdownもしくはテキスト形式で仕様書ファイルを配置してください。

**対応フォーマット**: Markdown (`.md`)・テキスト (`.txt`)

複数ファイルを置いた場合、Othello実行時に自動で結合して読み込みます。

## 使い方

### 基本的な実行

テストを実行するには、テスト対象WebサイトのURLを指定してOthelloを起動します：

```bash
node bin/othello.js \
  --url "https://your-website.example.com" \
  --coverage-target 80 \
  --max-iterations 5 \
  --llm-provider openai
  -- test-aspects "YOUR_OTHELLO_FOLDER/Othello/docs/test-matrix.csv”
```

仕様書や「観点リスト.csv」を配置している場合はその内容に基づいてテストケースが網羅的に生成され、仕様書がない場合はサイト探索モードでページ構造を分析してテストケースを作成します。テストは複数回のイテレーション（繰り返し実行）によって行われ、毎回未カバーの観点を優先して新たなテストを追加していきます。指定したカバレッジ目標に到達するか最大イテレーション数に達するまで、自動イテレーションが続きます。

また、観点リストは、[カスタムGPT](https://chatgpt.com/g/g-68fae81993e48191abeae542c4cb664e-tesutoguan-dian-risutozuo-cheng-asisutanto)に仕様書を添付して実行することで得ることができます。


### 対話モードによる追加テスト

対話型のテスト拡張機能を利用できます。コマンドに `--interactive` オプションを付けて実行すると、初回イテレーション完了後に対話モードに入り、AIが提案する追加テスト候補（未カバー観点のテストやエッジケースの深いテスト）が一覧表示されます：

```bash
node bin/othello.js \
  --url "https://your-website.example.com" \
  --interactive \
  --llm-provider openai
```

ユーザーは提案一覧から実行したいテストを選択でき、選択に応じて次のテストが即座に実行されます。この対話モードを用いることで、カバレッジ100%達成後もさらに踏み込んだテストを継続することが可能です。

### レポートの確認

テスト実行後、結果レポートが自動的に `reports/` ディレクトリに生成されます。最終的な総合結果は機械可読なJSON形式の `reports/final-report.json` に出力されるほか、Markdown形式およびHTML形式のレポートも同時に出力されます。HTMLレポートではテストケースごとの結果やカバレッジ統計グラフをブラウザで確認できます：

```bash
# Windowsの場合:
start reports/othello-report-*.html

# Mac/Linuxの場合:
open reports/othello-report-*.html
```

## 特徴

- **仕様書駆動のテスト自動生成**: 事前に用意した仕様書に基づき、画面項目や遷移のテストケースを自動生成します。仕様書がない場合でも画面構造の探索により基本的なテストパターンを網羅します。

- **23のテスト観点に基づく網羅率計測**: 入力フィールドのバリデーション、UI表示、エラー処理、状態遷移など、ソフトウェア品質特性に基づく23の観点でテストケースを分類しカバレッジを自動計算します。不足しているテスト分野を可視化し、重点的な追加テストが可能です。

- **失敗テストの自動修復**: テスト実行中に失敗が発生した場合、要素の再特定や待機時間の挿入など複数の戦略で自動リトライを行い、テストの安定化を図ります。手動メンテナンスなしで一時的な要因による失敗を克服し、継続的なテスト実行が可能です。

- **AIによる深掘りテスト & 対話モード**: 各イテレーションの完了時にAIが未カバーのテスト観点やエッジケースとなるテストを優先順位付けして提案します。対話モードを通じてユーザーが追加実行するテストを選択でき、100%カバレッジ達成後もより踏み込んだテストを継続できます。

- **豊富なレポート出力形式**: テスト結果レポートはJSON（機械処理向け）、Markdown（テキストレポート）、HTML（グラフ付きの詳細レポート）の3種類で自動生成されます。CIへの組み込みから人間によるレビューまで、用途に応じて適切な形式で結果を確認できます。

- **自律的な反復と停止条件**: Orchestratorによる統制の下、テストは自動反復実行されますが、カバレッジの向上が停滞した場合には自動でループを終了します。無限ループに陥ることなく、必要十分なテストが完了した時点で効率的に処理が止まる仕組みです。

以上の特徴により、Othelloを使用することでテスト網羅性の向上やテスト作業の効率化が期待できます。人手では困難な広範囲の観点をカバーできるほか、失敗時の復旧も自動化されるため、QA担当者はより高次の分析や探索的テストに注力できます。

## CLIオプション

```bash
# 基本的な使い方
node bin/othello.js --url https://your-website.example.com

# 対話モードで実行
node bin/othello.js --url https://your-website.example.com --interactive

# カスタム設定
node bin/othello.js \
  --url https://your-website.example.com \
  --max-iterations 10 \
  --coverage-target 90 \
  --output-dir ./my-reports

# 自動修復なし
node bin/othello.js --url https://example.com --no-auto-heal

# ヘルプ表示
node bin/othello.js --help
```

## 生成される成果物

テスト実行後、以下のファイルが `reports/` ディレクトリに保存されます：

```
reports/
├── final-report.json              # 最終結果（JSON形式）
├── othello-report-*.md            # テストレポート（Markdown）
├── othello-report-*.html          # テストレポート（HTML、グラフ付き）
├── planner-iteration-*.json       # テスト計画
├── generator-iteration-*.json     # 生成されたスクリプト

C:\Users\your-account\AppData\Local\Temp\playwright-mcp-output/
└── othello-TC001-error-2-xxxxxxxx.png     # スクリーンショット
```

## テスト実行

```bash
# 全テスト実行
npm test

# カバレッジ付き
npm run test:coverage
```

## 製作者

- Kazunori Sakata ([@k-sakQA](https://github.com/k-sakQA))

## ライセンス

Copyright (c) 2025 Kazunori Sakata

このプロジェクトはMITライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルをご覧ください。

