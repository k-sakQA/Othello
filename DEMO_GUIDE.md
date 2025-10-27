# 🎯 Othello-Planner デモガイド

## 📋 概要

Othello-Plannerを使って、実際のWebサイトに対するテスト計画を自動生成するデモです。

## 🚀 クイックスタート

### 1. API Keyの設定

`.env` ファイルにOpenAI API Keyを設定してください：

**ファイルパス**: `c:\workspace\Othello\.env`

```env
# OpenAI API キー（GPT-4o用）
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx

# LLMプロバイダ選択
LLM_PROVIDER=openai
```

> **注意**: デフォルトは **GPT-4o** に設定されています（2024年11月版）。
> gpt-4o-mini（高速・低コスト版）も使用可能です。

### 2. デモの実行

```powershell
# プロジェクトディレクトリに移動
cd c:\workspace\Othello

# デモスクリプト実行
node examples/demo-planner-custom.js
```

### 3. 実行内容

以下の設定でテスト計画が生成されます：

- **対象URL**: `https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0`
- **テスト観点リスト**: `config/test-ViewpointList-simple.csv` (23観点)
- **LLMモデル**: GPT-4o（または gpt-4o-mini）
- **イテレーション**: 1回目

## 📊 出力結果

### コンソール出力

```
🎯 Othello-Planner カスタムデモ開始

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 LLMプロバイダ: OPENAI
🤖 モデル: gpt-4o
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 テスト観点リスト: test-ViewpointList-simple.csv
🌐 対象URL: https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0

⏳ テスト計画生成中... (LLM APIを呼び出しています)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ テスト計画生成完了！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️  実行時間: 12.34秒
🔄 イテレーション: 1
📊 優先テスト観点数: 10
📝 生成されたテストケース数: 15

【優先テスト観点リスト】
  1. No.1: 表示（UI） - レイアウト/文言
     アイテムの配置/表示サイズは？
  2. No.2: 表示（UI） - エラー表示（正常系）
     エラーメッセージはある？
  ...

【生成されたテストケース（上位5件）】
  1. TC001: 予約フォームのレイアウト確認
     観点No: 1, 優先度: P1
     手順: 4ステップ, 期待結果: 3項目
     - https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0 にアクセス
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 レポート保存
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💾 c:\workspace\Othello\output\test-plan-2025-10-27T12-34-56.md

✅ デモ完了！生成されたMarkdownファイルを確認してください。
```

### Markdownレポート

`output/test-plan-YYYY-MM-DDThh-mm-ss.md` にテスト計画の詳細が保存されます：

- 各テスト観点の分析
- 対象の機能構造
- 考慮すべき仕様の具体例
- 狙うバグ
- 具体的なテストケース（手順・期待結果）

## 🧪 Mockモードでの実行（API Key不要）

API Keyが設定されていない場合、自動的にMockモードで実行されます：

```powershell
# 明示的にMockモードで実行
$env:LLM_PROVIDER="mock"
node examples/demo-planner-custom.js
```

Mockモードでは、固定のレスポンスを使用してテスト計画の構造を確認できます。

## 📝 使用しているファイル

| ファイル | 説明 |
|---------|------|
| `config/test-ViewpointList-simple.csv` | テスト観点リスト（23観点） |
| `.env` | API Key設定ファイル |
| `examples/demo-planner-custom.js` | デモスクリプト |
| `src/agents/othello-planner.js` | Othello-Planner本体 |
| `src/llm/openai-client.js` | OpenAI APIクライアント（GPT-4o対応） |
| `output/test-plan-*.md` | 生成されたテスト計画レポート |

## 🔧 カスタマイズ

### 対象URLの変更

`examples/demo-planner-custom.js` の以下の行を編集：

```javascript
const targetUrl = 'https://your-target-site.com/page.html';
```

### テスト観点リストの変更

別のCSVファイルを使用する場合：

```javascript
const testAspectsCSV = path.resolve(__dirname, '../config/your-custom-list.csv');
```

### LLMモデルの変更

`.env` ファイルまたは `demo-planner-custom.js` で設定：

```javascript
model: 'gpt-4o', // GPT-4o（2024年11月版）
model: 'gpt-4o-mini', // 高速・低コストモデル
```

利用可能なモデル：
- `gpt-4o` - 最新の高性能モデル（推奨、2024年11月リリース）
- `gpt-4o-mini` - 高速・低コストモデル
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-4` - GPT-4

## 🆘 トラブルシューティング

### API Keyエラー

```
Error: Invalid API Key
```

→ `.env` ファイルの `OPENAI_API_KEY` が正しく設定されているか確認



### CSVファイルが見つからない

```
Error: ENOENT: no such file or directory
```

→ `config/test-ViewpointList-simple.csv` が存在するか確認

### ネットワークエラー

```
Error: connect ETIMEDOUT
```

→ インターネット接続を確認、プロキシ設定が必要な場合は設定

## 📚 次のステップ

1. **生成されたテスト計画の確認**: `output/` フォルダのMarkdownファイルを開く
2. **テストケースの実行**: Othello-Generator（次のタスク）で自動実行
3. **カバレッジ分析**: 2回目以降のイテレーションで未カバー観点を優先

---

**質問・問題がある場合は、以下を確認してください：**
- `.env` ファイルのパス: `c:\workspace\Othello\.env`
- テスト観点リストのパス: `c:\workspace\Othello\config\test-ViewpointList-simple.csv`
- デモスクリプトのパス: `c:\workspace\Othello\examples\demo-planner-custom.js`
