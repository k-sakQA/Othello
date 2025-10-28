# Othello - Playwright E2Eテスト自動化ツール 詳細設計書（Phase 9版）

**システム名**: Othello  
**バージョン**: 2.0  
**作成日**: 2025年10月23日  
**更新日**: 2025年10月28日  
**対象フェーズ**: Phase 9（完全自動化版）  
**実装状況**: Othello-Planner 実装完了（2025年10月27日）

---

## 📋 目次

1. [システム構成](#1-システム構成)
2. [コンポーネント詳細設計](#2-コンポーネント詳細設計)
3. [データモデル](#3-データモデル)
4. [API仕様](#4-api仕様)
5. [エラーハンドリング](#5-エラーハンドリング)
6. [テスト戦略](#6-テスト戦略)

---

## 1. システム構成

### 1.1 ディレクトリ構造

```
Othello/
├── bin/
│   └── othello.js                    # CLIエントリーポイント
├── src/
│   ├── orchestrator.js               # イテレーションループ管理（未実装）
│   ├── agents/
│   │   ├── othello-planner.js        # テスト分析・計画生成 ✅ 実装完了
│   │   ├── othello-generator.js      # テストスクリプト生成（未実装）
│   │   └── othello-healer.js         # 失敗テスト自動修復（未実装）
│   ├── analyzer.js                   # カバレッジ分析（未実装）
│   ├── collector.js                  # カバレッジデータ収集（未実装）
│   ├── reporter.js                   # レポート生成（未実装）
│   ├── playwright-agent.js           # MCP通信（Phase 8完成） ✅
│   ├── llm/
│   │   ├── openai-client.js          # OpenAI API クライアント ✅ 実装完了
│   │   ├── claude-client.js          # Claude API クライアント（未実装）
│   │   ├── mock-client.js            # Mock LLM（テスト用） ✅ 実装完了
│   │   └── llm-factory.js            # LLMプロバイダ選択 ✅ 実装完了
│   └── utils/
│       ├── csv-parser.js             # CSV解析 ✅ 実装完了
│       ├── json-validator.js         # JSON検証（未実装）
│       └── logger.js                 # ログユーティリティ（未実装）
├── config/
│   ├── default.json                  # デフォルト設定
│   └── test-ViewpointList-simple.csv # テスト観点リスト（23項目） ✅
├── examples/
│   ├── demo-planner.js               # Planner基本デモ ✅
│   └── demo-planner-custom.js        # Plannerカスタムデモ ✅
├── logs/
│   ├── execution-history-*.json      # 実行履歴
│   └── snapshots/                    # 失敗時スナップショット
├── output/
│   └── test-plan-*.md                # 生成されたテスト計画書 ✅
├── reports/
│   ├── test-analysis.json            # テスト分析結果
│   ├── coverage-report.json          # カバレッジレポート
│   ├── final-report.html             # 最終HTMLレポート
│   └── bug-reports/                  # バグレポート
├── tests/
│   ├── agents/
│   │   ├── othello-planner.test.js   # Plannerテスト ✅ 16/16 パス
│   │   ├── othello-generator.test.js # Generatorテスト（未実装）
│   │   └── othello-healer.test.js    # Healerテスト（未実装）
│   ├── llm/
│   │   ├── llm-factory.test.js       # LLM Factoryテスト ✅ 7/7 パス
│   │   └── openai-client.test.js     # OpenAI Clientテスト
│   ├── utils/
│   │   └── csv-parser.test.js        # CSV Parserテスト ✅ 10/10 パス
│   ├── orchestrator.test.js          # Orchestratorテスト（未実装）
│   ├── analyzer.test.js              # Analyzerテスト（未実装）
│   └── integration/
│       └── full-cycle.test.js        # E2E統合テスト（未実装）
├── docs/
│   ├── REQUIREMENTS_PHASE9.md        # 要件定義書 ✅
│   ├── DETAILED_DESIGN_PHASE9.md     # 詳細設計書（本ドキュメント）
│   ├── OTHELLO_PLANNER_TECHNICAL_GUIDE.md # Planner技術ガイド ✅
│   └── DEMO_GUIDE.md                 # デモガイド ✅
└── .env                              # API Key設定 ✅
```

---

## 2. コンポーネント詳細設計

### 2.1 bin/othello.js（CLIエントリーポイント）

**実装状況**: ❌ 未実装

#### 2.1.1 責務

- コマンドライン引数の解析
- 設定ファイルの読み込み
- Orchestratorの起動

#### 2.1.2 インターフェース

```javascript
#!/usr/bin/env node

const Orchestrator = require('../src/orchestrator');
const { parseArgs } = require('../src/utils/cli-parser');
const { loadConfig } = require('../src/utils/config-loader');

async function main() {
  // コマンドライン引数解析
  const args = parseArgs(process.argv);
  
  // 設定ファイル読み込み
  const config = await loadConfig(args.config || './config/default.json');
  
  // 引数で設定を上書き
  const mergedConfig = {
    ...config,
    url: args.url,
    maxIterations: args.maxIterations || config.maxIterations,
    coverageTarget: args.coverageTarget || config.coverageTarget,
    browser: args.browser || config.browser,
    outputDir: args.output || config.outputDir,
    testAspectsCSV: args.testAspectsCSV || config.testAspectsCSV,
    autoHeal: args.autoHeal !== undefined ? args.autoHeal : config.autoHeal,
    llmProvider: args.llmProvider || config.llmProvider
  };
  
  // Orchestrator起動
  const orchestrator = new Orchestrator(mergedConfig);
  await orchestrator.run();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

---

### 2.2 src/orchestrator.js（イテレーションループ管理）

**実装状況**: ❌ 未実装

#### 2.2.1 クラス定義

```javascript
const OthelloPlanner = require('./agents/othello-planner');
const OthelloGenerator = require('./agents/othello-generator');
const OthelloHealer = require('./agents/othello-healer');
const PlaywrightAgent = require('./playwright-agent');
const Analyzer = require('./analyzer');
const Reporter = require('./reporter');
const { LLMFactory } = require('./llm/llm-factory');

class Orchestrator {
  constructor(config) {
    this.config = config;
    this.iteration = 0;
    this.coverageHistory = [];
    this.testResults = [];
    
    // コンポーネント初期化
    this.llm = LLMFactory.createClient(config.llmProvider, config.llmConfig);
    this.planner = new OthelloPlanner({ llm: this.llm, config });
    this.generator = new OthelloGenerator({ llm: this.llm, config });
    this.healer = new OthelloHealer({ llm: this.llm, config });
    this.agent = new PlaywrightAgent(config.mcpConfig);
    this.analyzer = new Analyzer(config);
    this.reporter = new Reporter(config);
  }

  async run() {
    console.log('🎭 Othello starting...');
    console.log(`Target URL: ${this.config.url}`);
    console.log(`Coverage target: ${this.config.coverageTarget}%`);
    
    try {
      // MCPセッション開始
      await this.agent.connect();
      
      // イテレーションループ
      while (this.shouldContinue()) {
        this.iteration++;
        console.log(`\n📊 Iteration ${this.iteration}/${this.config.maxIterations}`);
        
        await this.runIteration();
        
        // カバレッジ判定
        const coverage = this.getCurrentCoverage();
        console.log(`Current coverage: ${coverage.aspectCoverage.percentage}%`);
        
        if (coverage.aspectCoverage.percentage >= this.config.coverageTarget) {
          console.log('✅ Coverage target reached!');
          break;
        }
        
        // 停滞判定
        if (this.isStagnant()) {
          console.log('⚠️  Coverage stagnant, stopping...');
          break;
        }
      }
      
      // 最終レポート生成
      await this.generateFinalReport();
      
      console.log('🎉 Othello completed successfully!');
    } catch (error) {
      console.error('❌ Othello failed:', error);
      throw error;
    } finally {
      await this.agent.disconnect();
    }
  }

  async runIteration() {
    // Step 1: Othello-Planner - テスト分析・計画生成
    console.log('  1️⃣  Planner: Analyzing and generating test plan...');
    const testPlan = await this.planner.generateTestPlan({
      url: this.config.url,
      testAspectsCSV: this.config.testAspectsCSV,
      existingCoverage: this.getCurrentCoverage(),
      iteration: this.iteration
    });
    
    // Step 2: Othello-Generator - テストスクリプト生成
    console.log('  2️⃣  Generator: Generating test scripts...');
    const snapshot = await this.agent.getSnapshot();
    const testScripts = await this.generator.generate({
      testCases: testPlan.testCases,
      snapshot,
      existingCoverage: this.getCurrentCoverage()
    });
    
    // Step 3: Playwright MCP - テスト実行
    console.log('  3️⃣  Agent: Executing tests...');
    const executionResults = await this.executeTests(testScripts);
    
    // Step 4: LLM AI - 結果分析
    console.log('  4️⃣  LLM: Analyzing results...');
    const analysis = await this.analyzeResults(executionResults, testPlan);
    
    // Step 5: Othello-Healer - 失敗テスト修復
    if (this.config.autoHeal) {
      console.log('  5️⃣  Healer: Healing failed tests...');
      await this.healFailedTests(executionResults, analysis);
    }
    
    // Step 6: Analyzer - カバレッジ算出
    console.log('  6️⃣  Analyzer: Calculating coverage...');
    const coverage = await this.analyzer.analyze({
      testPlan,
      executionResults,
      analysis,
      testAspectsCSV: this.config.testAspectsCSV
    });
    
    this.coverageHistory.push(coverage);
    
    // イテレーションレポート保存
    await this.reporter.saveIterationReport({
      iteration: this.iteration,
      testPlan,
      executionResults,
      analysis,
      coverage
    });
  }

  shouldContinue() {
    return this.iteration < this.config.maxIterations;
  }

  getCurrentCoverage() {
    if (this.coverageHistory.length === 0) {
      return {
        aspectCoverage: { 
          total: 23, 
          tested: 0, 
          percentage: 0, 
          tested_aspects: [] 
        },
        functionCoverage: { 
          total: 0, 
          tested: 0, 
          percentage: 0 
        }
      };
    }
    return this.coverageHistory[this.coverageHistory.length - 1];
  }

  isStagnant() {
    if (this.coverageHistory.length < 3) return false;
    
    const recent = this.coverageHistory.slice(-3);
    const percentages = recent.map(c => c.aspectCoverage.percentage);
    
    // 3回連続で変化なし
    return percentages[0] === percentages[1] && percentages[1] === percentages[2];
  }
}

module.exports = Orchestrator;
```

---

### 2.3 src/agents/othello-planner.js（テスト分析・計画生成）

**実装状況**: ✅ **実装完了**（2025年10月27日）

#### 2.3.1 クラス定義（実装済み）

```javascript
/**
 * @file Othello-Planner
 * @description テスト観点リストに基づくテスト分析・計画生成エージェント（Phase 9版）
 */

const fs = require('fs').promises;
const path = require('path');
const { parseCSV } = require('../utils/csv-parser');

class OthelloPlanner {
  constructor({ llm, config }) {
    this.llm = llm;
    this.config = config || {};
  }

  /**
   * テスト計画を生成
   * @param {Object} options - オプション
   * @param {string} options.url - 対象URL
   * @param {string} options.testAspectsCSV - テスト観点リストCSVパス
   * @param {Object} options.existingCoverage - 既存カバレッジ（2回目以降）
   * @param {number} options.iteration - イテレーション番号
   * @returns {Object} テスト計画結果
   */
  async generateTestPlan(options) {
    const { url, testAspectsCSV, existingCoverage, iteration = 1 } = options;
    
    // 1. テスト観点リストを読み込み
    const aspects = await this.loadTestAspects(testAspectsCSV);
    
    // 2. 優先順位付け（未テスト観点を優先）
    const priorityAspects = this.prioritizeAspects(aspects, existingCoverage || {});
    
    // 3. LLM による分析
    const analysis = await this.analyzeWithLLM({ 
      url, 
      aspects: priorityAspects, 
      existingCoverage, 
      iteration 
    });
    
    // 4. テストケース抽出
    const testCases = this.extractTestCases(analysis);
    
    // 5. Markdown 形式でレポート生成
    const markdown = this.formatAsMarkdown(analysis);
    
    return { 
      iteration, 
      aspects: priorityAspects, 
      analysis, 
      testCases, 
      markdown 
    };
  }

  /**
   * CSV からテスト観点を読み込み
   * @param {string} csvPath - CSVファイルパス
   * @returns {Array} テスト観点配列
   */
  async loadTestAspects(csvPath) {
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);
    
    const aspects = rows.map((row, index) => {
      // ヘッダーの様々なバリエーションに対応
      const noValue = row['No,'] || row['No'] || row['no'] || row['NO'];
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
    }).filter(aspect => 
      // 空のエントリを除外（テストタイプまたは観点があるもののみ）
      aspect.test_type_major || aspect.test_aspect
    );
    
    return aspects;
  }

  /**
   * テスト観点の優先順位付け
   * @param {Array} aspects - 全テスト観点
   * @param {Object} existingCoverage - 既存カバレッジ
   * @returns {Array} 優先順位付けされた観点（最大10個）
   */
  prioritizeAspects(aspects, existingCoverage) {
    const tested = existingCoverage?.aspectCoverage?.tested_aspects || [];
    const untested = aspects.filter(a => !tested.includes(a.aspect_no));
    
    const prioritized = [
      ...untested, 
      ...aspects.filter(a => tested.includes(a.aspect_no))
    ];
    
    return prioritized.slice(0, 10); // 最大10個に制限
  }

  /**
   * LLM による分析実行
   * @param {Object} options - 分析オプション
   * @returns {Array} 分析結果（JSON配列）
   */
  async analyzeWithLLM(options) {
    const { url, aspects, existingCoverage, iteration } = options;
    const prompt = this.buildAnalysisPrompt({ 
      url, 
      aspects, 
      existingCoverage, 
      iteration 
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

  /**
   * LLM プロンプトを構築
   * @param {Object} options - プロンプト構築オプション
   * @returns {string} プロンプト文字列
   */
  buildAnalysisPrompt({ url, aspects, existingCoverage, iteration }) {
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

  /**
   * LLM レスポンスを解析
   * @param {string} content - LLM レスポンス
   * @returns {Array} パースされたJSON配列
   */
  parseAnalysisResponse(content) {
    // Markdown コードブロックから JSON を抽出
    const jsonMatch = content.match(/\`\`\`json\n([\s\S]+?)\n\`\`\`/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // フォールバック：直接 JSON をパース
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }

  /**
   * 分析結果からテストケースを抽出
   * @param {Array} analysis - 分析結果
   * @returns {Array} テストケース配列
   */
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

  /**
   * Markdown レポートを生成
   * @param {Array} analysis - 分析結果
   * @returns {string} Markdown 文字列
   */
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
}

module.exports = OthelloPlanner;
```

#### 2.3.2 パフォーマンス特性（実測値）

| 項目 | 実測値 | 備考 |
|------|--------|------|
| CSV 読み込み | 5-10ms | 23観点のCSV |
| 優先順位付け | 1-2ms | 最大23観点 |
| プロンプト構築 | 2-5ms | 10観点 |
| LLM API 呼び出し | 15-25秒 | GPT-4o、ネットワーク含む |
| JSON パース | 5-10ms | 3-10観点 |
| テストケース抽出 | 2-5ms | 3-20ケース |
| Markdown 生成 | 10-20ms | 3-10観点 |
| **全体処理時間** | **15-30秒** | 実測: 19.37秒（GPT-4o） |

---

### 2.4 src/llm/llm-factory.js（LLMプロバイダ選択）

**実装状況**: ✅ **実装完了**

#### 2.4.1 クラス定義

```javascript
const OpenAIClient = require('./openai-client');
const MockLLMClient = require('./mock-client');

class LLMFactory {
  static createClient(provider, config = {}) {
    switch (provider) {
      case 'openai':
        return new OpenAIClient(config);
      
      case 'claude':
        // TODO: Anthropic SDK実装
        throw new Error('Claude provider not yet implemented');
      
      case 'mock':
        return new MockLLMClient(config);
      
      default:
        throw new Error(`Unknown LLM provider: ${provider}`);
    }
  }
}

module.exports = { LLMFactory };
```

---

### 2.5 src/llm/openai-client.js（OpenAI API クライアント）

**実装状況**: ✅ **実装完了**

#### 2.5.1 クラス定義

```javascript
const axios = require('axios');

class OpenAIClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || 'gpt-4o'; // デフォルト: GPT-4o
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 4000;
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async chat({ messages, temperature, maxTokens }) {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages,
        temperature: temperature ?? this.temperature,
        max_tokens: maxTokens ?? this.maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      content: response.data.choices[0].message.content,
      usage: response.data.usage
    };
  }
}

module.exports = OpenAIClient;
```

---

### 2.6 src/utils/csv-parser.js（CSV解析）

**実装状況**: ✅ **実装完了**

#### 2.6.1 関数定義

```javascript
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}

module.exports = { parseCSV };
```

---

## 3. データモデル

### 3.1 テスト観点（Test Aspect）

```typescript
interface TestAspect {
  aspect_no: number;                    // 観点番号（1-23）
  quality_characteristic: string;       // 品質特性
  test_type_major: string;              // テストタイプ中分類
  test_type_minor: string;              // テストタイプ小分類
  test_aspect: string;                  // テスト観点
}
```

### 3.2 分析結果（Analysis Result）

```typescript
interface AnalysisResult {
  aspect_no: number;                    // 観点番号
  test_type: string;                    // テストタイプ
  test_category: string;                // テストカテゴリ
  target_function: string;              // 対象の機能構造
  specifications: string[];             // 考慮すべき仕様（3-5個）
  target_bugs: string[];                // 狙うバグ（2-3個）
  priority: 'P0' | 'P1' | 'P2';        // 優先度
  test_cases: TestCase[];               // テストケース（1-2個）
}
```

### 3.3 テストケース（Test Case）

```typescript
interface TestCase {
  case_id: string;                      // テストケースID（TC001など）
  title: string;                        // テストケースタイトル
  steps: string[];                      // テスト手順
  expected_results: string[];           // 期待結果
  aspect_no?: number;                   // 紐づく観点番号
  test_type?: string;                   // テストタイプ
  priority?: 'P0' | 'P1' | 'P2';       // 優先度
}
```

### 3.4 カバレッジ（Coverage）

```typescript
interface Coverage {
  aspectCoverage: {
    total: number;                      // 総観点数（23）
    tested: number;                     // テスト済み観点数
    percentage: number;                 // カバレッジ率（%）
    tested_aspects: number[];           // テスト済み観点番号
    untested_aspects: number[];         // 未テスト観点番号
  };
  functionCoverage: {
    total: number;                      // 総機能数
    tested: number;                     // テスト済み機能数
    percentage: number;                 // カバレッジ率（%）
    untested_functions: string[];       // 未テスト機能名
  };
}
```

---

## 4. API仕様

### 4.1 Othello-Planner API

#### `generateTestPlan(options)`

**パラメータ**:
```typescript
{
  url: string;                          // 対象URL
  testAspectsCSV: string;               // CSVファイルパス
  existingCoverage?: Coverage;          // 既存カバレッジ（オプション）
  iteration?: number;                   // イテレーション番号（デフォルト: 1）
}
```

**戻り値**:
```typescript
{
  iteration: number;                    // イテレーション番号
  aspects: TestAspect[];                // 優先順位付けされた観点（最大10個）
  analysis: AnalysisResult[];           // LLM分析結果
  testCases: TestCase[];                // 抽出されたテストケース
  markdown: string;                     // Markdown形式のレポート
}
```

---

## 5. エラーハンドリング

### 5.1 エラータイプ

| エラータイプ | 説明 | ハンドリング |
|------------|------|------------|
| `CSV_PARSE_ERROR` | CSV解析失敗 | ファイル形式を確認、エラーメッセージ表示 |
| `LLM_API_ERROR` | LLM API呼び出し失敗 | リトライ（最大3回）、フォールバック |
| `JSON_PARSE_ERROR` | JSONパース失敗 | エラー詳細をログ出力、プロンプト改善提案 |
| `FILE_NOT_FOUND` | ファイル未検出 | パスを確認、デフォルトファイル提示 |
| `INVALID_CONFIG` | 設定エラー | 必須項目チェック、デフォルト値使用 |

### 5.2 エラーハンドリング例

```javascript
try {
  const testPlan = await planner.generateTestPlan(options);
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('❌ OpenAI API key not found. Please set OPENAI_API_KEY in .env');
  } else if (error.message.includes('parse')) {
    console.error('❌ Failed to parse LLM response:', error.message);
  } else {
    console.error('❌ Unexpected error:', error);
  }
  process.exit(1);
}
```

---

## 6. テスト戦略

### 6.1 実装済みテスト

| テストファイル | テストケース数 | ステータス |
|--------------|--------------|-----------|
| `csv-parser.test.js` | 10 | ✅ 10/10 パス |
| `llm-factory.test.js` | 7 | ✅ 7/7 パス |
| `othello-planner.test.js` | 16 | ✅ 16/16 パス |

### 6.2 テストカバレッジ目標

- ユニットテスト: 80%以上
- 統合テスト: 主要フロー100%
- E2Eテスト: 1つ以上の完全サイクル

### 6.3 テスト実行

```bash
# 全テスト実行
npm test

# 特定のテストファイル実行
npm test tests/agents/othello-planner.test.js

# カバレッジレポート生成
npm run test:coverage
```

---

## 7. デプロイメント

### 7.1 環境変数

```bash
# .env ファイル
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
LLM_PROVIDER=openai
```

### 7.2 インストール

```bash
# 依存関係インストール
npm install

# Playwright ブラウザインストール
npx playwright install
```

---

**作成者**: Othello Development Team  
**レビュー**: 2025年10月28日  
**次回更新予定**: Othello-Generator 実装完了後
