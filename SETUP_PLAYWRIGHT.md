# Playwright環境セットアップガイド

**対象**: Othello開発環境  
**作成日**: 2025年10月15日  
**前提条件**: Node.js 18以上、VS Code

---

## 📋 セットアップ概要

Othelloを動作させるには、以下の2つのコンポーネントが必要です：

1. **Playwright本体** - ブラウザ自動化ライブラリ
2. **VS Code Playwright拡張** - テスト作成・実行を支援するエージェント

**注意**: 詳細設計書で言及されている「Playwrightエージェント」は、VS Code拡張機能の「Playwright Test for VS Code」を指しています。

---

## 🚀 セットアップ手順

### Step 1: Playwright本体のインストール

プロジェクトにPlaywrightをインストールします。

```powershell
# プロジェクトルートで実行
cd C:\workspace\Othello

# Playwrightをインストール
npm install -D @playwright/test

# Playwrightブラウザのインストール
npx playwright install chromium

# （オプション）すべてのブラウザをインストール
npx playwright install
```

**インストール確認**:
```powershell
npx playwright --version
```

予想される出力:
```
Version 1.40.0
```

---

### Step 2: VS Code Playwright拡張のインストール

#### 方法1: VS Code UI経由（推奨）

1. VS Codeを開く
2. 拡張機能パネルを開く（`Ctrl+Shift+X`）
3. "Playwright Test for VS Code"を検索
4. 「インストール」をクリック

**拡張ID**: `ms-playwright.playwright`

#### 方法2: コマンドライン経由

```powershell
code --install-extension ms-playwright.playwright
```

**インストール確認**:
```powershell
code --list-extensions | Select-String "playwright"
```

予想される出力:
```
ms-playwright.playwright
```

---

### Step 3: Playwrightプロジェクトの初期化

Playwrightの設定ファイルとサンプルテストを作成します。

```powershell
# 対話的なセットアップ（推奨）
npx playwright init

# 自動セットアップ（すべてデフォルト）
npx playwright init --yes
```

**対話型の場合の推奨設定**:
```
? Do you want to use TypeScript or JavaScript? › JavaScript
? Where to put your end-to-end tests? › tests
? Add a GitHub Actions workflow? › false
? Install Playwright browsers? › true
```

**生成されるファイル**:
- `playwright.config.js` - Playwright設定ファイル
- `tests/example.spec.js` - サンプルテスト
- `tests-examples/` - 追加サンプル

---

### Step 4: 動作確認

#### テストの実行（コマンドライン）

```powershell
# サンプルテストを実行
npx playwright test

# ブラウザを表示して実行（headed mode）
npx playwright test --headed

# 特定のブラウザで実行
npx playwright test --project=chromium
```

#### テストの実行（VS Code拡張経由）

1. VS Codeで `tests/example.spec.js` を開く
2. サイドバーに「Testing」アイコンが表示される
3. テストツリーから実行したいテストを選択
4. 「▶️ Run Test」をクリック

**成功時の表示**:
```
✓ tests/example.spec.js:3:1 › has title (1.2s)
✓ tests/example.spec.js:8:1 › get started link (1.5s)

2 passed (3.0s)
```

---

## 🔧 Othello統合のための追加設定

### 1. playwright.config.jsのカスタマイズ

Othelloからの実行に適した設定に変更します。

```javascript
// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  
  // Othelloが生成したテストのタイムアウト設定
  timeout: 60 * 1000,
  
  // 並列実行の無効化（Othelloがシーケンシャルに実行）
  workers: 1,
  
  // レポート設定
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  
  use: {
    // ベースURL（Othelloの--urlで上書き）
    baseURL: 'http://localhost:3000',
    
    // スクリーンショット設定
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 必要に応じて他のブラウザを追加
  ],
});
```

### 2. Othello連携用ディレクトリの作成

```powershell
# テスト指示を置くディレクトリ
New-Item -ItemType Directory -Force -Path .\test-instructions

# Playwrightの結果を置くディレクトリ
New-Item -ItemType Directory -Force -Path .\playwright-results

# .gitignoreに追加（オプション）
Add-Content -Path .\.gitignore -Value @"

# Playwright
test-results/
playwright-report/
playwright/.cache/
playwright-results/
"@
```

---

## 🔌 Playwright MCP (Model Context Protocol) について

**注意**: 「Playwright MCP」は2025年10月時点では公式にはリリースされていない可能性があります。

詳細設計書で言及されている「Playwright MCP」が指すものは以下のいずれかと推測されます：

### 可能性1: VS Code Playwright拡張の機能

- **Planner**: テストシナリオの提案機能
- **Generator**: テストコードの自動生成
- **Healer**: 失敗したテストの自動修復

→ これらは `ms-playwright.playwright` 拡張に統合されている可能性があります。

### 可能性2: カスタムMCPサーバー（要開発）

もし専用のMCPサーバーが必要な場合は、以下のような構成を検討：

```
Othello CLI
    ↓ (ファイルベース連携)
Playwright MCP Server (Node.js)
    ↓ (VS Code API経由)
VS Code Playwright Extension
    ↓ (Playwright Test実行)
ブラウザ
```

**開発が必要な場合**:
- `src/mcp-server/` に独自サーバーを実装
- Model Context Protocol仕様に準拠
- VS Code拡張とのIPC通信

---

## 🧪 統合テスト: OthelloとPlaywrightの連携確認

### サンプルテストの作成

```javascript
// tests/othello-sample.spec.js
const { test, expect } = require('@playwright/test');

test('Othello統合テスト: ログイン画面', async ({ page }) => {
  // Othelloが指定したURLにアクセス
  await page.goto('https://example.com');
  
  // タイトルを確認
  await expect(page).toHaveTitle(/Example Domain/);
  
  // 結果をOthelloが読み取れる形式で出力
  console.log('TEST_RESULT:', JSON.stringify({
    test_name: 'ログイン画面の表示確認',
    status: 'passed',
    visited_urls: ['https://example.com'],
    screenshots: ['screenshot-1.png']
  }));
});
```

### 実行確認

```powershell
# テストを実行してJSON出力
npx playwright test tests/othello-sample.spec.js --reporter=json > playwright-results/result.json

# Othelloが読み取れることを確認
Get-Content .\playwright-results\result.json | ConvertFrom-Json
```

---

## 📊 ファイルベース連携の仕様（Othello ⇔ Playwright）

Othelloは以下の方式でPlaywrightと連携します：

### 1. Othello → Playwright（テスト指示）

**ファイル**: `test-instructions/instruction_iteration-{N}.json`

```json
{
  "iteration": 1,
  "target_url": "https://internal-system.company.com",
  "instruction": "ログイン機能をテストしてください",
  "focus_areas": [
    "正常系の動作確認",
    "異常系のエラーハンドリング"
  ]
}
```

**Playwrightでの読み込み例**:
```javascript
// tests/othello-generated.spec.js
const fs = require('fs');
const instruction = JSON.parse(
  fs.readFileSync('./test-instructions/instruction_iteration-1.json', 'utf8')
);

test(instruction.instruction, async ({ page }) => {
  await page.goto(instruction.target_url);
  // テスト実装...
});
```

### 2. Playwright → Othello（実行結果）

**ファイル**: `playwright-results/result_iteration-{N}.json`

```json
{
  "iteration": 1,
  "target_url": "https://internal-system.company.com",
  "start_time": "2025-10-15T10:30:00Z",
  "end_time": "2025-10-15T10:31:23Z",
  "duration_seconds": 83,
  "status": "success",
  "tests_executed": 3,
  "tests_passed": 3,
  "tests_failed": 0,
  "test_details": [
    {
      "name": "ログイン正常系",
      "status": "passed",
      "inputs": ["testuser", "password123"],
      "visited_urls": ["https://internal-system.company.com/login"]
    }
  ]
}
```

**Playwrightでの書き出し例**:
```javascript
// tests/othello-generated.spec.js
test.afterAll(async () => {
  const result = {
    iteration: 1,
    tests_executed: 3,
    tests_passed: 3,
    // ... その他の情報
  };
  
  fs.writeFileSync(
    './playwright-results/result_iteration-1.json',
    JSON.stringify(result, null, 2)
  );
});
```

---

## ✅ セットアップ完了チェックリスト

- [ ] Node.js 18以上がインストール済み (`node --version`)
- [ ] Playwrightがインストール済み (`npm list @playwright/test`)
- [ ] Playwrightブラウザがインストール済み (`npx playwright install chromium`)
- [ ] VS Code Playwright拡張がインストール済み (`code --list-extensions | Select-String playwright`)
- [ ] サンプルテストが実行できる (`npx playwright test`)
- [ ] `playwright.config.js`がOthello用にカスタマイズ済み
- [ ] `test-instructions/`ディレクトリが作成済み
- [ ] `playwright-results/`ディレクトリが作成済み

---

## 🔍 トラブルシューティング

### 問題: Playwrightブラウザのダウンロードに失敗

**解決策**:
```powershell
# プロキシ設定が必要な場合
$env:HTTPS_PROXY="http://proxy.company.com:8080"
npx playwright install chromium
```

### 問題: VS Code拡張が動作しない

**解決策**:
1. VS Codeを再起動
2. "Playwright Test for VS Code"拡張を再インストール
3. Playwright設定ファイルが正しい位置にあるか確認（ルートに`playwright.config.js`）

### 問題: テスト実行時にタイムアウト

**解決策**:
```javascript
// playwright.config.js
module.exports = defineConfig({
  timeout: 120 * 1000, // 2分に延長
});
```

---

## 📚 参考リソース

- **Playwright公式**: https://playwright.dev/
- **VS Code拡張**: https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright
- **Playwrightドキュメント（日本語）**: https://playwright.dev/docs/intro
- **Model Context Protocol**: https://modelcontextprotocol.io/

---

## 🚧 次のステップ

セットアップ完了後、以下を実施：

1. **動作確認**: サンプルテストを実行してPlaywrightが正常動作することを確認
2. **Othello統合**: `src/orchestrator.js`を実装してファイルベース連携を確立
3. **テスト自動生成**: Playwrightのcodegen機能を使ってテスト雛形を生成

```powershell
# Codegen（テスト自動生成）の起動
npx playwright codegen https://example.com
```

---

**作成者**: GitHub Copilot  
**最終更新**: 2025年10月15日
