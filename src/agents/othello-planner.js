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
   * 仕様書を読み込む（spec/フォルダから）
   * @param {string} specDir - 仕様書ディレクトリ
   * @returns {Promise<string>} 仕様書の内容
   */
  async loadSpecifications(specDir = './spec') {
    try {
      const files = await fs.readdir(specDir);
      const specFiles = files.filter(f => 
        f.endsWith('.md') || f.endsWith('.txt') || f.endsWith('.pdf') || f.endsWith('.docx')
      );
      
      if (specFiles.length === 0) {
        console.warn('⚠️  spec/フォルダに仕様書が見つかりません。サイト探索モードで動作します。');
        return null;
      }
      
      // 複数ファイルがある場合は結合
      const contents = [];
      for (const file of specFiles) {
        const filePath = path.join(specDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        contents.push(`## ${file}\n\n${content}`);
      }
      
      return contents.join('\n\n---\n\n');
    } catch (error) {
      console.warn('⚠️  仕様書の読み込みに失敗しました:', error.message);
      return null;
    }
  }

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
      const priorityValue = Object.keys(row).find(k => k.includes('優先度'));
      const targetStructureValue = Object.keys(row).find(k => k.includes('対象の機能構造'));
      const specExampleValue = Object.keys(row).find(k => k.includes('考慮すべき仕様'));
      const bugAssumptionValue = Object.keys(row).find(k => k.includes('狙うバグ') || k.includes('欠陥仮定'));
      
      const aspect = {
        aspect_no: parseInt(noValue, 10) || index + 1,
        quality_characteristic: qualityValue ? row[qualityValue] : '',
        test_type_major: majorValue ? row[majorValue] : '',
        test_type_minor: minorValue ? row[minorValue] : '',
        test_aspect: aspectValue ? row[aspectValue] : '',
        priority: priorityValue ? row[priorityValue] : 'P2',
        target_structure: targetStructureValue ? row[targetStructureValue] : '',
        spec_examples: specExampleValue ? row[specExampleValue] : '',
        bug_assumption: bugAssumptionValue ? row[bugAssumptionValue] : ''
      };
      
      return aspect;
    }).filter(aspect => 
      // 空のエントリを除外（テストタイプまたは観点があるもののみ）
      aspect.test_type_major || aspect.test_aspect
    );
    
    return aspects;
  }

  prioritizeAspects(aspects, existingCoverage, uncoveredAspects = []) {
    // 優先度の順序定義（P0 > P1 > P2 > P3 > N/A）
    const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3, 'N/A': 4 };
    
    // 優先度でソート
    const sortByPriority = (a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 99;
      const bPriority = priorityOrder[b.priority] ?? 99;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      // 同じ優先度の場合は観点番号順
      return a.aspect_no - b.aspect_no;
    };
    
    // Phase 9: 未カバー観点を優先し、その中で優先度順にソート
    if (uncoveredAspects.length > 0) {
      // 未カバーの観点を優先度順にソート
      const uncoveredSorted = aspects
        .filter(a => uncoveredAspects.includes(a.aspect_no))
        .sort(sortByPriority);
      
      // カバー済みの観点も優先度順にソート
      const coveredSorted = aspects
        .filter(a => !uncoveredAspects.includes(a.aspect_no))
        .sort(sortByPriority);
      
      return [...uncoveredSorted, ...coveredSorted].slice(0, 10);
    }
    
    // 従来のロジック: 未テスト観点を優先し、優先度順にソート
    const tested = existingCoverage?.aspectCoverage?.tested_aspects || [];
    const untested = aspects
      .filter(a => !tested.includes(a.aspect_no))
      .sort(sortByPriority);
    
    const testedSorted = aspects
      .filter(a => tested.includes(a.aspect_no))
      .sort(sortByPriority);
    
    const prioritized = [...untested, ...testedSorted];
    return prioritized.slice(0, 10);
  }

  async generateTestPlan(options) {
    const { url, testAspectsCSV, existingCoverage, uncoveredAspects, iteration = 1, specDir, targetAspectId } = options;
    
    // 仕様書を読み込む
    const specifications = await this.loadSpecifications(specDir || './spec');
    
    const aspects = await this.loadTestAspects(testAspectsCSV);
    
    // targetAspectIdが指定されている場合は、その観点のみに絞る
    let priorityAspects;
    if (targetAspectId !== undefined && targetAspectId !== null) {
      priorityAspects = aspects.filter(a => a.aspect_no == targetAspectId);
      if (priorityAspects.length === 0) {
        console.warn(`⚠️  指定された観点 No.${targetAspectId} が見つかりません`);
        // フォールバック: 全観点から優先順位付け
        priorityAspects = this.prioritizeAspects(aspects, existingCoverage || {}, uncoveredAspects);
      } else {
        console.log(`🎯 観点 No.${targetAspectId} に絞ってテスト計画を生成します`);
      }
    } else {
      priorityAspects = this.prioritizeAspects(aspects, existingCoverage || {}, uncoveredAspects);
    }
    
    const analysis = await this.analyzeWithLLM({ 
      url, 
      aspects: priorityAspects, 
      existingCoverage, 
      iteration,
      specifications,
      targetAspectId 
    });
    
    const testCases = this.extractTestCases(analysis, priorityAspects);
    const markdown = this.formatAsMarkdown(analysis);
    
    return { iteration, aspects: priorityAspects, analysis, testCases, markdown };
  }

  async analyzeWithLLM(options) {
    const { url, aspects, existingCoverage, iteration, specifications, targetAspectId } = options;
    const prompt = this.buildAnalysisPrompt({ url, aspects, existingCoverage, iteration, specifications, targetAspectId });
    
    const response = await this.llm.chat({
      messages: [
        { role: 'system', content: 'あなたはテスト分析の専門家です。仕様書とテスト観点リストに基づいて、日本語でテスト分析を行います。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      maxTokens: 8000
    });
    
    return this.parseAnalysisResponse(response.content);
  }

  buildAnalysisPrompt({ url, aspects, existingCoverage, iteration, specifications, targetAspectId }) {
    // 観点リストを詳細情報付きで生成
    const aspectsList = aspects.map(a => {
      let aspectInfo = `No.${a.aspect_no}: ${a.test_type_major}${a.test_type_minor ? ' - ' + a.test_type_minor : ''}\n観点: ${a.test_aspect}`;
      
      // 追加情報があれば含める
      if (a.priority) {
        aspectInfo += `\n優先度: ${a.priority}`;
      }
      if (a.target_structure) {
        aspectInfo += `\n対象機能: ${a.target_structure}`;
      }
      if (a.spec_examples) {
        aspectInfo += `\n仕様例:\n${a.spec_examples}`;
      }
      if (a.bug_assumption) {
        aspectInfo += `\n狙うバグ: ${a.bug_assumption}`;
      }
      
      return aspectInfo;
    }).join('\n\n');
    
    // targetAspectIdが指定されている場合の特別なメッセージ
    const targetAspectMessage = targetAspectId !== undefined && targetAspectId !== null
      ? `\n\n【重要】今回は観点 No.${targetAspectId} のテストケースのみを生成してください。他の観点は無視してください。`
      : '';
    
    // CSVが詳細分析済み（test-matrix.csv）か汎用テンプレート（test-ViewpointList-simple.csv）かを判定
    const hasDetailedInfo = aspects.some(a => a.priority || a.target_structure || a.spec_examples || a.bug_assumption);
    
    // 仕様書がある場合とない場合で分岐
    if (specifications) {
      return `あなたはテスト分析の専門家です。

【対象URL】
${url}

【イテレーション】
${iteration}回目

【既存カバレッジ】
${existingCoverage ? JSON.stringify(existingCoverage, null, 2) : 'なし'}

【仕様書】
${specifications}

【テスト観点リスト】（優先度順）
${aspectsList}${targetAspectMessage}

【タスク】
${hasDetailedInfo 
  ? `**このテスト観点リストはすでに人間が対象サイトに対して分析済みです。**
観点リストに記載された「対象機能」「仕様例」「狙うバグ」「優先度」の情報を**そのまま活用**してテストケースを生成してください。

1. **対象の機能構造**: 観点リストの「対象機能」をそのまま使用
2. **考慮すべき仕様の具体例**: 観点リストの「仕様例」をそのまま使用（3-5個）
3. **狙うバグ**: 観点リストの「狙うバグ」をそのまま使用（2-3個）
4. **テストケース**: 仕様例と狙うバグを考慮した、具体的なテスト手順と期待結果（1-2ケース）

**CRITICAL**: 
- 観点リストの情報を**変更せず**にそのまま使用してください
- priorityフィールドには観点リストに記載された優先度を**必ず**そのまま設定してください
- サイトを探索せず、仕様書と観点リストの情報のみに基づいて分析してください`
  : `**このテスト観点リストは汎用テンプレートです。**
対象サイトを分析して、各観点に対する具体的な機能、仕様、狙うバグを特定してください。

1. **対象の機能構造**: 仕様書から該当する機能・画面を特定
2. **考慮すべき仕様の具体例**: 仕様書から具体的な仕様を抽出（3-5個）
3. **狙うバグ**: この観点で見つけるべきバグの種類を考える（2-3個）
4. **テストケース**: 仕様例と狙うバグを考慮した、具体的なテスト手順と期待結果（1-2ケース）

**重要**: 
- サイトを探索せず、仕様書の情報のみに基づいて分析してください`}

【出力形式】
JSON配列で出力してください。**各observationのpriorityフィールドには、必ず上記【テスト観点リスト】に記載された当該観点の優先度をそのまま設定してください。**

\`\`\`json
[
  {
    "aspect_no": 1,
    "test_type": "表示（UI）",
    "test_category": "レイアウト/文言",
    "target_function": "...",
    "specifications": ["...", "..."],
    "target_bugs": ["...", "..."],
    "priority": "（当該観点の優先度をそのまま設定: 観点1ならP0）",
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
\`\`\`

**CRITICAL: priorityは上記テスト観点リストの各観点に記載された値をそのまま使ってください。例えば観点1の優先度はP0、観点2の優先度はP0、観点3の優先度はP1です。絶対に独自判断で変更しないでください。**`;
    } else {
      // 仕様書がない場合は従来通りサイト探索モード
      return `あなたはテスト分析の専門家です。

【対象URL】
${url}

【イテレーション】
${iteration}回目

【既存カバレッジ】
${existingCoverage ? JSON.stringify(existingCoverage, null, 2) : 'なし'}

【テスト観点リスト】（優先度順）
${aspectsList}${targetAspectMessage}

【タスク】
${hasDetailedInfo
  ? `**このテスト観点リストはすでに人間が対象サイトに対して分析済みです。**
観点リストに記載された「対象機能」「仕様例」「狙うバグ」「優先度」の情報を**そのまま活用**してテストケースを生成してください。

1. **対象の機能構造**: 観点リストの「対象機能」をそのまま使用
2. **考慮すべき仕様の具体例**: 観点リストの「仕様例」をそのまま使用（3-5個）
3. **狙うバグ**: 観点リストの「狙うバグ」をそのまま使用（2-3個）
4. **テストケース**: 仕様例と狙うバグを考慮した、具体的なテスト手順と期待結果（1-2ケース）

**CRITICAL**: 
- 観点リストの情報を**変更せず**にそのまま使用してください
- priorityフィールドには観点リストに記載された優先度を**必ず**そのまま設定してください`
  : `**このテスト観点リストは汎用テンプレートです。**
対象サイトを分析して、各観点に対する具体的な機能、仕様、狙うバグ、優先度を特定してください。

1. **対象の機能構造**: このシステムのどの画面・機能・要素が該当するか
2. **考慮すべき仕様の具体例**: このシステム固有の具体的な仕様（3-5個）
3. **狙うバグ**: この観点で見つけるべきバグの種類（2-3個）
4. **優先度**: この観点の重要度（P0: 必須/P1: 高/P2: 中/P3: 低）を判断
5. **テストケース**: 仕様例と狙うバグを考慮した、具体的なテスト手順と期待結果（1-2ケース）

**重要**: サイトの実際の機能を分析して、観点に合わせた具体的なテスト設計を行ってください`}

【出力形式】
${hasDetailedInfo
  ? `JSON配列で出力してください。**各観点のpriorityフィールドには、必ず上記【テスト観点リスト】に記載された当該観点の優先度をそのまま設定してください。**

\`\`\`json
[
  {
    "aspect_no": 1,
    "test_type": "表示（UI）",
    "test_category": "レイアウト/文言",
    "target_function": "...",
    "specifications": ["...", "..."],
    "target_bugs": ["...", "..."],
    "priority": "（当該観点の優先度をそのまま設定: 観点1ならP0）",
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
\`\`\`

**CRITICAL: priorityは上記テスト観点リストの各観点に記載された値をそのまま使ってください。例えば観点1の優先度はP0、観点2の優先度はP0、観点3の優先度はP1です。絶対に独自判断で変更しないでください。**`
  : `JSON配列で出力してください：

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
\`\`\`

**CRITICAL: priorityフィールドには、各観点の重要度を分析して適切な優先度（P0: 必須/P1: 高/P2: 中/P3: 低/N/A: 該当なし）を設定してください。**`}`;
    }
  }

  parseAnalysisResponse(content) {
    const jsonMatch = content.match(/\`\`\`json\n([\s\S]+?)\n\`\`\`/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }

  extractTestCases(analysis, aspectsWithPriority = []) {
    const testCases = [];
    
    // aspect_noをキーとしたマップを作成（優先度の高速検索用）
    const aspectMap = new Map();
    aspectsWithPriority.forEach(a => {
      aspectMap.set(a.aspect_no, a);
    });
    
    for (const aspect of analysis) {
      for (const testCase of aspect.test_cases || []) {
        // LLMからの出力(case_id, title)をOrchestrator/Reporterが期待する形式(test_case_id, description)に変換
        const { case_id, title, ...rest } = testCase;
        
        // 元のaspect情報から優先度を取得（LLM応答の優先度は信頼しない）
        const originalAspect = aspectMap.get(aspect.aspect_no);
        const priority = (originalAspect && originalAspect.priority) ? originalAspect.priority : 'P2';
        
        testCases.push({
          test_case_id: case_id,  // case_id → test_case_id
          description: title,     // title → description
          ...rest,
          aspect_no: aspect.aspect_no,
          test_type: aspect.test_type,
          priority: priority
        });
      }
    }
    return testCases;
  }

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

  /**
   * より深いテストケースを生成（AI活用）
   * @param {Object} options - 生成オプション
   * @param {Array} options.history - 実行履歴
   * @param {string} options.url - テスト対象URL
   * @returns {Promise<Object>} テスト計画
   */
  async generateDeeperTests({ history, url }) {
    console.log('🧠 AIで深いテストケースを分析中...');
    
    // 実行履歴からテスト済み観点を抽出
    const testedAspects = new Set();
    const successfulTests = [];
    const failedTests = [];
    
    for (const iteration of history) {
      for (const result of iteration.executionResults || []) {
        testedAspects.add(result.aspect_no);
        if (result.success) {
          successfulTests.push(result);
        } else {
          failedTests.push(result);
        }
      }
    }

    // LLMにプロンプトを送信
    const prompt = `あなたは高度なテスト設計の専門家です。

以下のWebアプリケーションに対して、既存のテストではカバーできていない「より深い」テストケースを生成してください。

## テスト対象
URL: ${url}

## 既存のテスト実行状況
- テスト済み観点数: ${testedAspects.size}
- 成功したテスト数: ${successfulTests.length}
- 失敗したテスト数: ${failedTests.length}

## より深いテストの観点
以下のような高度なテストケースを3つ生成してください：
1. **エッジケース**: 境界値、極端な入力値のテスト
2. **組み合わせテスト**: 複数機能の組み合わせ、連続操作のテスト
3. **非機能テスト**: パフォーマンス、セキュリティ、アクセシビリティ

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "test_cases": [
    {
      "test_case_id": "DEEPER-001",
      "aspect_no": 9001,
      "title": "テストケースのタイトル",
      "description": "テストの目的と狙い",
      "test_type": "エッジケース/組み合わせテスト/非機能テスト",
      "priority": "P1/P2/P3",
      "steps": ["手順1", "手順2", "..."],
      "expected_results": ["期待結果1", "期待結果2", "..."]
    }
  ]
}
\`\`\``;

    try {
      const response = await this.llm.chat([
        { role: 'system', content: 'あなたは高度なテスト設計の専門家です。JSON形式で回答してください。' },
        { role: 'user', content: prompt }
      ]);

      // JSONを抽出
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response;
      const result = JSON.parse(jsonString);

      return {
        testCases: result.test_cases || [],
        metadata: {
          generated_at: new Date().toISOString(),
          type: 'deeper_tests',
          based_on_history: history.length
        }
      };
    } catch (error) {
      console.error('❌ より深いテスト生成エラー:', error.message);
      
      // フォールバック: シンプルなエッジケーステストを返す
      return {
        testCases: [
          {
            test_case_id: 'DEEPER-FALLBACK-001',
            aspect_no: 9001,
            title: 'エッジケース: 空文字入力',
            description: '全ての入力フィールドに空文字を入力した場合の挙動を確認',
            test_type: 'エッジケース',
            priority: 'P2',
            steps: [
              'テスト対象ページにアクセス',
              '全ての必須入力フィールドを空のままにする',
              '送信ボタンをクリック'
            ],
            expected_results: [
              '適切なエラーメッセージが表示される',
              'フォームが送信されない'
            ]
          }
        ],
        metadata: {
          generated_at: new Date().toISOString(),
          type: 'deeper_tests_fallback',
          error: error.message
        }
      };
    }
  }
}

module.exports = OthelloPlanner;
