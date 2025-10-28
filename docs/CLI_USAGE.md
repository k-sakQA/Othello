# Othello CLI Usage Guide

## インストール

### ローカルインストール

```bash
cd Othello
npm install
```

### グローバルインストール（オプション）

```bash
npm install -g .
```

グローバルインストール後は、どのディレクトリからでも `othello` コマンドが使えます。

---

## 基本的な使い方

### 最小限の実行

```bash
othello --url https://hotel.example.com
```

これだけで以下が自動実行されます：
- 23観点からテスト計画を生成
- テストスクリプトを生成
- テストを実行
- 失敗テストを自動修復
- カバレッジを計算
- レポートを生成（JSON/Markdown/HTML）

---

## コマンドラインオプション

### 必須オプション

| オプション | 短縮形 | 説明 | 例 |
|----------|--------|------|-----|
| `--url` | `-u` | テスト対象URL | `--url https://example.com` |

### イテレーション制御

| オプション | 短縮形 | デフォルト | 説明 | 例 |
|----------|--------|----------|------|-----|
| `--max-iterations` | `-m` | 10 | 最大イテレーション数（1-100） | `-m 15` |
| `--coverage-target` | `-c` | 80 | 目標カバレッジ%（0-100） | `-c 90` |

### 修復設定

| オプション | 短縮形 | デフォルト | 説明 | 例 |
|----------|--------|----------|------|-----|
| `--no-auto-heal` | - | false | 自動修復を無効化 | `--no-auto-heal` |

### 出力設定

| オプション | 短縮形 | デフォルト | 説明 | 例 |
|----------|--------|----------|------|-----|
| `--output-dir` | `-o` | ./reports | レポート出力先ディレクトリ | `-o ./my-reports` |

### テスト設定

| オプション | 短縮形 | デフォルト | 説明 | 例 |
|----------|--------|----------|------|-----|
| `--test-aspects-csv` | `-t` | ./config/test-ViewpointList-simple.csv | 23観点定義CSVファイル | `-t ./my-aspects.csv` |
| `--browser` | `-b` | chromium | ブラウザ種別 (chromium/firefox/webkit) | `-b firefox` |
| `--headless` | - | true | ヘッドレスモードで実行 | `--headless` |

### その他

| オプション | 短縮形 | デフォルト | 説明 | 例 |
|----------|--------|----------|------|-----|
| `--config` | - | - | 設定ファイルパス（JSON） | `--config ./config.json` |
| `--verbose` | `-v` | false | 詳細ログを表示 | `-v` |
| `--help` | `-h` | - | ヘルプを表示 | `--help` |
| `--version` | `-V` | - | バージョンを表示 | `--version` |

---

## 使用例

### 例1: 基本実行

```bash
othello --url https://hotel.example.com
```

**結果:**
- 最大10イテレーション
- カバレッジ目標80%
- 自動修復ON
- レポート: `./reports/session-*.{json,md,html}`

---

### 例2: 高カバレッジ目標

```bash
othello \
  --url https://hotel.example.com \
  --max-iterations 15 \
  --coverage-target 95
```

**結果:**
- 最大15イテレーション
- カバレッジ目標95%
- より多くのテストを生成

---

### 例3: 自動修復なし（デバッグ用）

```bash
othello \
  --url https://hotel.example.com \
  --no-auto-heal \
  --verbose
```

**結果:**
- 失敗テストをそのまま記録
- 詳細ログで問題を特定しやすい

---

### 例4: カスタム出力先

```bash
othello \
  --url https://hotel.example.com \
  --output-dir ./test-results/$(date +%Y%m%d)
```

**結果:**
- 日付別ディレクトリにレポート保存
- 例: `./test-results/20251029/session-*.html`

---

### 例5: Firefoxで実行

```bash
othello \
  --url https://hotel.example.com \
  --browser firefox \
  --headless false
```

**結果:**
- Firefoxで実行
- ブラウザウィンドウを表示（デバッグ用）

---

### 例6: 設定ファイル使用

**config.json:**
```json
{
  "url": "https://hotel.example.com",
  "maxIterations": 20,
  "coverageTarget": 85,
  "autoHeal": true,
  "outputDir": "./production-reports",
  "browser": "chromium",
  "headless": true
}
```

**実行:**
```bash
othello --config ./config.json
```

**コマンドライン引数で上書き:**
```bash
othello --config ./config.json --coverage-target 90
```

---

## 出力例

### 実行中のログ

```
═══════════════════════════════════════════════════════════════════
🎭 Othello - Automated Web UI Testing Framework
═══════════════════════════════════════════════════════════════════

⚙️  Configuration:
   URL:              https://hotel.example.com
   Max Iterations:   10
   Coverage Target:  80%
   Auto Heal:        ON
   Output Dir:       ./reports
   Browser:          chromium
   Headless:         ON
   Test Aspects:     ./config/test-ViewpointList-simple.csv

🎭 Othello (Phase 9) starting...
📍 Target URL: https://hotel.example.com
🎯 Coverage target: 80%
🔄 Max iterations: 10
🔧 Auto-heal: ON
📊 Session ID: 20251029-143022

═══════════════════════════════════════════════════════════════════
📊 Iteration 1/10
═══════════════════════════════════════════════════════════════════
  1️⃣  Planner: Generating test plan...
     ✅ Generated 5 test cases
  2️⃣  Generator: Generating test scripts...
     ✅ Generated 5 test scripts
  3️⃣  Executor: Executing tests...
     ✅ TC-001: Success
     ✅ TC-002: Success
     ❌ TC-003: Failed - Element not found
     🔧 Healer: Attempting to heal TC-003...
     ✅ Healed successfully with fix type: LOCATOR_FIX
     ✅ TC-003: Retry success
     ✅ TC-004: Success
     ✅ TC-005: Success
  4️⃣  Analyzer: Analyzing coverage...
     ✅ Coverage: 21.7%
     ✅ Pass rate: 100.0%

📈 Current coverage: 21.7%
   Tested: 5/23 aspects

...

═══════════════════════════════════════════════════════════════════
📝 Generating final report...
═══════════════════════════════════════════════════════════════════

📄 Reports generated:
   - JSON:     ./reports/session-20251029-143022.json
   - Markdown: ./reports/session-20251029-143022.md
   - HTML:     ./reports/session-20251029-143022.html

🎉 Othello completed successfully!
⏱️  Total duration: 3m 45s
🔄 Total iterations: 4
📊 Final coverage: 82.6%

═══════════════════════════════════════════════════════════════════
✅ Othello completed successfully!
═══════════════════════════════════════════════════════════════════

📊 Summary:
   Total Time:       3m 45s
   Iterations:       4
   Final Coverage:   82.6%
   Tests Passed:     18
   Tests Failed:     2
   Reports:          ./reports/session-20251029-143022.*
```

---

## エラーハンドリング

### URL検証エラー

```bash
$ othello --url invalid-url
❌ Configuration errors:
   - Invalid URL: invalid-url
```

**解決方法:** 完全なURL（`https://` 含む）を指定

---

### CSVファイルが見つからない

```bash
$ othello --url https://example.com --test-aspects-csv ./missing.csv
❌ Configuration errors:
   - Test aspects CSV not found: ./missing.csv
```

**解決方法:** 正しいCSVファイルパスを指定

---

### 実行時エラー

```bash
═══════════════════════════════════════════════════════════════════
❌ Othello failed!
═══════════════════════════════════════════════════════════════════

Error: Connection to Playwright MCP failed

Ran for 1m 23s before failure.
```

**解決方法:** `--verbose` オプションで詳細ログを確認

---

## CI/CD統合

### GitHub Actions

```yaml
name: E2E Tests with Othello

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run Othello
        run: |
          npx othello \
            --url ${{ secrets.TEST_URL }} \
            --max-iterations 10 \
            --coverage-target 80 \
            --output-dir ./test-reports
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: othello-reports
          path: ./test-reports/
```

---

### Jenkins

```groovy
pipeline {
    agent any
    
    stages {
        stage('Install') {
            steps {
                sh 'npm install'
            }
        }
        
        stage('Test') {
            steps {
                sh '''
                    npx othello \
                        --url ${TEST_URL} \
                        --max-iterations 10 \
                        --coverage-target 80 \
                        --output-dir ./reports
                '''
            }
        }
        
        stage('Publish Reports') {
            steps {
                publishHTML([
                    reportDir: 'reports',
                    reportFiles: '*.html',
                    reportName: 'Othello Test Reports'
                ])
            }
        }
    }
}
```

---

## トラブルシューティング

### 問題1: コマンドが見つからない

```bash
$ othello --url https://example.com
bash: othello: command not found
```

**解決方法:**
```bash
# ローカル実行
npx othello --url https://example.com

# または
node bin/othello.js --url https://example.com
```

---

### 問題2: 権限エラー

```bash
$ othello --url https://example.com
Error: EACCES: permission denied, mkdir './reports'
```

**解決方法:**
```bash
# 出力先を変更
othello --url https://example.com --output-dir ~/my-reports
```

---

### 問題3: メモリ不足

```bash
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**解決方法:**
```bash
# Node.jsメモリ上限を増やす
NODE_OPTIONS="--max-old-space-size=4096" othello --url https://example.com
```

---

## ベストプラクティス

### 1. 段階的なカバレッジ目標

```bash
# 最初は低めの目標で全体の流れを確認
othello --url https://example.com --coverage-target 50

# 問題なければ目標を上げる
othello --url https://example.com --coverage-target 80
```

---

### 2. 開発時はverboseモード

```bash
othello \
  --url https://example.com \
  --verbose \
  --no-auto-heal
```

失敗原因を詳細に確認できます。

---

### 3. 本番環境では設定ファイル使用

```bash
# 設定を分離して管理
othello --config ./config/production.json
```

バージョン管理しやすく、再現性が高い。

---

### 4. レポートを日付別に保存

```bash
# Bash/Zsh
othello --url https://example.com --output-dir ./reports/$(date +%Y%m%d)

# PowerShell
othello --url https://example.com --output-dir "./reports/$(Get-Date -Format 'yyyyMMdd')"
```

履歴を追跡しやすい。

---

## まとめ

Othello CLIを使えば、複雑な設定なしで**コマンド一発**で完全自動テストが実行できます！

```bash
# これだけ！
othello --url https://your-app.com
```

詳細な技術仕様は以下を参照:
- [Orchestrator Technical Guide](./OTHELLO_ORCHESTRATOR_TECHNICAL_GUIDE.md)
- [Phase 9 Requirements](./REQUIREMENTS_PHASE9.md)
- [Detailed Design](./DETAILED_DESIGN_PHASE9.md)

Happy Testing! 🎭✨
