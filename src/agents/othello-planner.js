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

  prioritizeAspects(aspects, existingCoverage) {
    const tested = existingCoverage?.aspectCoverage?.tested_aspects || [];
    const untested = aspects.filter(a => !tested.includes(a.aspect_no));
    
    const prioritized = [...untested, ...aspects.filter(a => tested.includes(a.aspect_no))];
    return prioritized.slice(0, 10);
  }

  async generateTestPlan(options) {
    const { url, testAspectsCSV, existingCoverage, iteration = 1 } = options;
    
    const aspects = await this.loadTestAspects(testAspectsCSV);
    const priorityAspects = this.prioritizeAspects(aspects, existingCoverage || {});
    const analysis = await this.analyzeWithLLM({ url, aspects: priorityAspects, existingCoverage, iteration });
    
    const testCases = this.extractTestCases(analysis);
    const markdown = this.formatAsMarkdown(analysis);
    
    return { iteration, aspects: priorityAspects, analysis, testCases, markdown };
  }

  async analyzeWithLLM(options) {
    const { url, aspects, existingCoverage, iteration } = options;
    const prompt = this.buildAnalysisPrompt({ url, aspects, existingCoverage, iteration });
    
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

  buildAnalysisPrompt({ url, aspects, existingCoverage, iteration }) {
    const aspectsList = aspects.map(a => `No.${a.aspect_no}: ${a.test_type_major}${a.test_type_minor ? ' - ' + a.test_type_minor : ''}\n観点: ${a.test_aspect}`).join('\n\n');
    
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
