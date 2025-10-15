# Playwright Agents セットアップ完了報告

**日時**: 2025年10月15日  
**ドキュメント**: https://playwright.dev/docs/test-agents  
**状態**: ✅ インストール完了

---

## ✅ インストール完了

### Playwright Agents (3つのエージェント)

| エージェント | 役割 | 状態 |
|------------|------|------|
| **🎭 Planner** | テスト計画の作成 | ✅ インストール済み |
| **🎭 Generator** | テストコードの生成 | ✅ インストール済み |
| **🎭 Healer** | 失敗テストの自動修復 | ✅ インストール済み |

---

## 📁 生成されたファイル

```
C:\workspace\Othello\
├── .github/
│   └── chatmodes/
│       ├── 🎭 planner.chatmode.md      ← Plannerエージェント定義
│       ├── 🎭 generator.chatmode.md    ← Generatorエージェント定義
│       └── 🎭 healer.chatmode.md       ← Healerエージェント定義
├── .vscode/
│   └── mcp.json                         ← MCP設定（playwright-test）
└── tests/
    └── seed.spec.ts                     ← シードテスト（初期化用）
```

---

## 🎯 各エージェントの機能

### 🎭 Planner（計画立案エージェント）

**入力**:
- テスト対象のURL
- シードテスト（`tests/seed.spec.ts`）
- （オプション）要件定義書（PRD）

**処理**:
1. ブラウザでアプリを探索
2. UI要素、ナビゲーションパス、機能を特定
3. ユーザーフローをマッピング
4. テストシナリオを設計

**出力**:
- Markdown形式のテスト計画（`specs/*.md`）
- 人間が読めるが、Generator用に十分詳細な記述

**使い方**:
```
VS Codeのチャットで「🎭 planner」モードを選択

プロンプト例:
「https://example.com のログイン機能について、
包括的なテスト計画を作成してください」
```

---

### 🎭 Generator（コード生成エージェント）

**入力**:
- Markdownテスト計画（`specs/*.md`）
- シードテスト（参考用）

**処理**:
1. テスト計画を読み込み
2. セレクタとアサーションを検証
3. 実行可能なPlaywrightテストを生成

**出力**:
- Playwrightテストファイル（`tests/*.spec.ts`）
- 初期エラーがある場合もあり（Healerで修復可能）

**使い方**:
```
VS Codeのチャットで「🎭 generator」モードを選択

プロンプト例:
「specs/basic-operations.md からテストコードを生成してください」
```

---

### 🎭 Healer（修復エージェント）

**入力**:
- 失敗したテスト名

**処理**:
1. 失敗したステップを再実行
2. 現在のUIを検査して同等の要素を探す
3. パッチを提案（セレクタ更新、待機調整、データ修正）
4. テストが成功するまで再実行

**出力**:
- 修復されたテスト（成功）
- または、機能が壊れている場合はスキップされたテスト

**使い方**:
```
VS Codeのチャットで「🎭 healer」モードを選択

プロンプト例:
「tests/add-valid-todo.spec.ts の失敗を修復してください」
```

---

## 🔄 エージェントのワークフロー

### シーケンシャル実行（推奨）

```
1. 🎭 Planner
   ↓ テスト計画を作成（specs/*.md）
   
2. 🎭 Generator
   ↓ テストコードを生成（tests/*.spec.ts）
   
3. npx playwright test
   ↓ テスト実行
   
4. 🎭 Healer（失敗時のみ）
   ↓ 失敗したテストを修復
   
5. 完成したテストスイート
```

### アジェントループ（自動化）

VS Code Insiders v1.105以降では、エージェントループを使用可能：
- エージェントが自動的にチェーン実行
- 人間の介入なしでテストカバレッジを拡大

---

## 🛠️ MCP設定

### `.vscode/mcp.json`

```json
{
  "servers": {
    "playwright-test": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "playwright",
        "run-test-mcp-server"
      ],
      "cwd": "${workspaceFolder}"
    }
  },
  "inputs": []
}
```

**機能**:
- Playwright Test MCP Server を起動
- VS Codeチャットからブラウザ操作ツールを利用可能
- `browser_*` ツール群が利用可能

---

## 📝 シードテスト（`tests/seed.spec.ts`）

```typescript
import { test, expect } from '@playwright/test';

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    // generate code here.
  });
});
```

**目的**:
- エージェントが使用する初期化テスト
- 環境セットアップ、認証、初期状態の設定
- すべての生成テストの参考例

**カスタマイズ例**:
```typescript
test('seed', async ({ page }) => {
  // ログイン処理
  await page.goto('https://internal-system.company.com/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'password123');
  await page.click('#login-btn');
  
  // ダッシュボードに到達したことを確認
  await expect(page).toHaveURL(/.*dashboard/);
});
```

---

## 🎓 Othelloとの統合

### 統合ポイント

Othello CLIは以下のようにPlaywright Agentsを活用できます：

#### 1. Planner連携

**Othello → Planner**:
```javascript
// src/orchestrator.js
async function generateTestPlan(targetUrl, instruction) {
  // VS Code Chat APIを呼び出して🎭 plannerに依頼
  const plannerPrompt = `
    ${targetUrl} の ${instruction.target} について、
    包括的なテスト計画を作成してください。
    
    重点領域:
    ${instruction.focus_areas.join(', ')}
  `;
  
  // → specs/iteration-{N}.md が生成される
}
```

#### 2. Generator連携

**Othello → Generator**:
```javascript
async function generateTestCode(specPath) {
  // specs/*.md からテストコードを生成
  const generatorPrompt = `
    ${specPath} からテストコードを生成してください
  `;
  
  // → tests/iteration-{N}.spec.ts が生成される
}
```

#### 3. Healer連携

**テスト失敗時の自動修復**:
```javascript
async function healFailedTests(failedTestName) {
  const healerPrompt = `
    ${failedTestName} の失敗を修復してください
  `;
  
  // → テストが修復される
}
```

---

## 🚀 VS Codeでの使い方

### 前提条件

- **VS Code Insiders v1.105以降**（2025年11月に安定版リリース予定）
- または現在のVS Codeでも基本機能は利用可能

### 手順

1. **VS Codeを開く**
   ```powershell
   code C:\workspace\Othello
   ```

2. **チャットパネルを開く**
   - `Ctrl+Shift+I` または
   - コマンドパレット → "Chat: Focus on Chat View"

3. **エージェントを選択**
   - チャット入力欄の上に「🎭 planner」「🎭 generator」「🎭 healer」が表示される
   - または、プロンプトに `@🎭 planner` と入力

4. **エージェントに指示**
   ```
   @🎭 planner https://example.com のログイン機能について、
   正常系・異常系を含む包括的なテスト計画を作成してください
   ```

5. **生成されたファイルを確認**
   - `specs/` ディレクトリにMarkdown計画
   - `tests/` ディレクトリにテストコード

---

## ✅ セットアップ完了チェックリスト

- [x] Playwright本体 (`@playwright/test@1.56.0`) インストール済み
- [x] Chromiumブラウザ インストール済み
- [x] VS Code Playwright拡張 (`ms-playwright.playwright@1.1.16`) インストール済み
- [x] Playwright MCP (`@playwright/mcp@0.0.42`) インストール済み
- [x] **Playwright Agents (planner, generator, healer) インストール済み** ← NEW!
- [x] `.github/chatmodes/` にエージェント定義作成済み
- [x] `.vscode/mcp.json` に playwright-test 設定済み
- [x] `tests/seed.spec.ts` 作成済み

---

## 📊 全体アーキテクチャ（更新版）

```
Othello CLI (bin/othello.js)
    ↓
Config Manager (src/config.js)
    ↓
Orchestrator (src/orchestrator.js)
    ├─→ Playwright MCP (@playwright/mcp)
    │   └─ HTTP API: browser automation
    │
    └─→ Playwright Agents (VS Code Chat)
        ├─ 🎭 Planner: テスト計画作成
        ├─ 🎭 Generator: コード生成
        └─ 🎭 Healer: テスト修復
    ↓
Result Collector (src/result-collector.js)
    ↓
Analyzer (src/analyzer.js)
    ↓
Instruction Generator (src/instruction-generator.js)
    ↓
Reporter (src/reporter.js)
```

---

## 🎯 次のステップ

### 即座に試せること

1. **シードテストをカスタマイズ**
   ```powershell
   code tests\seed.spec.ts
   ```

2. **Plannerでテスト計画を作成**
   - VS Codeチャットを開く
   - `@🎭 planner` を選択して指示

3. **生成されたテスト計画を確認**
   ```powershell
   Get-ChildItem specs\*.md
   ```

### Phase 1実装への組み込み

1. **Orchestrator実装**
   - VS Code Chat API経由でエージェント呼び出し
   - または、生成されたファイルを監視

2. **Analyzer統合**
   - `specs/` と `tests/` の内容を解析
   - カバレッジ計算

3. **自動ループ**
   - Othello → Planner → Generator → Test実行 → Healer → Othello

---

## 📚 参考リソース

- **Playwright Agents公式**: https://playwright.dev/docs/test-agents
- **VS Code Insiders**: https://code.visualstudio.com/insiders/
- **Model Context Protocol**: https://modelcontextprotocol.io/

---

**セットアップ完了**: Playwright Agentsがすべてインストールされました！  
**次のアクション**: VS Codeで🎭 plannerを使ってテスト計画を作成できます。

---

**作成者**: GitHub Copilot  
**最終更新**: 2025年10月15日
