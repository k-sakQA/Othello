/**
 * 対話モード デモスクリプト
 * 実際のMCP統合なしで対話機能をテスト
 */

const Orchestrator = require('./src/orchestrator');
const { LLMFactory } = require('./src/llm/llm-factory');
require('dotenv').config();

async function demoInteractiveMode() {
  console.log('🎭 Othello 対話モード デモ\n');
  console.log('URL: https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0');
  console.log('LLM: OpenAI GPT-4o\n');

  try {
    // LLMの初期化
    console.log('🤖 OpenAI APIを初期化中...');
    const llm = LLMFactory.create('openai', {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
      maxTokens: 4000,
      temperature: 0.7
    });

    console.log('✅ LLM初期化完了\n');

    // Orchestratorの設定
    const orchestrator = new Orchestrator({
      url: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0',
      maxIterations: 2,
      coverageTarget: 50,
      autoHeal: true,
      interactive: true, // 対話モード有効
      outputDir: './reports',
      testAspectsCSV: './config/test-ViewpointList-simple.csv'
    });

    // モックエージェントの設定（デモ用）
    console.log('📋 デモ用のモックエージェントを設定中...\n');

    // Mock Planner
    orchestrator.planner = {
      loadTestAspects: async () => {
        return [
          { aspect_no: 1, test_type: '表示（UI）', test_category: 'レイアウト/文言' },
          { aspect_no: 2, test_type: '表示（UI）', test_category: 'エラー表示' },
          { aspect_no: 3, test_type: '入力', test_category: '文字種' },
          { aspect_no: 4, test_type: '入力', test_category: '文字数（正常値）' },
          { aspect_no: 5, test_type: '入力', test_category: '未入力' }
        ];
      },
      generateTestPlan: async () => {
        return {
          testCases: [
            {
              test_case_id: 'TC001',
              aspect_no: 1,
              title: 'ホテル予約フォームのレイアウト確認',
              description: 'フォームの各要素が適切に配置されているか',
              steps: ['予約ページにアクセス', 'フォーム要素を確認'],
              expected_results: ['すべての入力項目が表示される']
            }
          ]
        };
      },
      generateDeeperTests: async ({ history, url }) => {
        console.log(`\n🧠 AIがより深いテストを生成中...`);
        console.log(`   実行履歴: ${history.length} イテレーション`);
        console.log(`   対象URL: ${url}\n`);

        // 実際にOpenAI APIを呼び出す
        const response = await llm.chat({
          messages: [
            {
              role: 'system',
              content: 'あなたは高度なテスト設計の専門家です。エッジケースと組み合わせテストを提案してください。'
            },
            {
              role: 'user',
              content: `以下のホテル予約サイトに対して、より深いテストケースを3つ生成してください：

URL: ${url}
既存のテスト実行数: ${history.length}回

以下の種類のテストを含めてください：
1. エッジケース（境界値、極端な入力）
2. 組み合わせテスト（複数項目の組み合わせ）
3. エラーケース（不正な入力）

JSON形式で出力してください：
{
  "test_cases": [
    {
      "test_case_id": "DEEPER-001",
      "aspect_no": 9001,
      "title": "テストケースのタイトル",
      "description": "テストの目的",
      "test_type": "エッジケース",
      "steps": ["手順1", "手順2"],
      "expected_results": ["期待結果1"]
    }
  ]
}`
            }
          ]
        });

        console.log('✅ AIがテストケースを生成しました\n');
        console.log('--- AIレスポンス ---');
        console.log(response.substring(0, 500) + '...\n');

        // JSONを抽出
        try {
          const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : response;
          const result = JSON.parse(jsonString);

          return {
            testCases: result.test_cases || [],
            metadata: {
              generated_at: new Date().toISOString(),
              type: 'deeper_tests',
              ai_provider: 'openai'
            }
          };
        } catch (error) {
          console.error('⚠️ JSON解析エラー、フォールバックテストを使用');
          return {
            testCases: [
              {
                test_case_id: 'DEEPER-FALLBACK-001',
                aspect_no: 9001,
                title: 'エッジケース: 全項目空白入力',
                description: 'すべての必須項目を空白のまま送信',
                test_type: 'エッジケース',
                steps: ['予約ページにアクセス', 'すべての入力を空白にする', '送信ボタンをクリック'],
                expected_results: ['適切なエラーメッセージが表示される']
              }
            ]
          };
        }
      }
    };

    // Mock Generator
    orchestrator.generator = {
      generate: async ({ testCases }) => {
        return testCases.map(tc => ({
          ...tc,
          instructions: [
            { type: 'navigate', url: orchestrator.config.url },
            { type: 'screenshot', description: 'Initial state' }
          ]
        }));
      }
    };

    // Mock Executor
    let executionCount = 0;
    orchestrator.executor = {
      execute: async () => {
        executionCount++;
        await new Promise(resolve => setTimeout(resolve, 500)); // 実行をシミュレート
        return {
          success: true,
          duration_ms: 500
        };
      }
    };

    // Mock Analyzer
    orchestrator.analyzer = {
      analyze: async (results) => {
        const coverage = Math.min(executionCount * 20, 100);
        const covered = Math.floor(coverage / 20);
        return {
          percentage: coverage,
          covered: covered,
          total: 5,
          covered_aspects: Array.from({ length: covered }, (_, i) => i + 1),
          uncovered_aspects: Array.from({ length: 5 - covered }, (_, i) => covered + i + 1)
        };
      },
      generateRecommendations: async (results, coverage) => {
        const recommendations = [];

        // 未カバー観点
        if (coverage.uncovered_aspects && coverage.uncovered_aspects.length > 0) {
          coverage.uncovered_aspects.slice(0, 3).forEach(aspectNo => {
            recommendations.push({
              type: 'uncovered',
              priority: 'High',
              title: `観点${aspectNo}のテスト`,
              reason: `未カバー観点 (No.${aspectNo})`,
              aspectNo: aspectNo
            });
          });
        }

        // 100%カバー時のみ deeper と complete を追加
        if (coverage.percentage === 100) {
          recommendations.push({
            type: 'deeper',
            priority: 'Medium',
            title: 'より深いテスト（エッジケース、組み合わせテスト）を生成',
            reason: '全観点がカバー済み。さらなるテスト品質向上のため',
            requiresAI: true
          });

          recommendations.push({
            type: 'complete',
            priority: 'Low',
            title: 'テスト完了（終了）',
            reason: '全観点がカバー済み。テストを完了します'
          });
        }

        return recommendations;
      }
    };

    // Mock Reporter
    orchestrator.reporter = {
      saveAllReports: async () => {
        return {
          json: './reports/report.json',
          markdown: './reports/report.md',
          html: './reports/report.html'
        };
      }
    };

    console.log('✅ セットアップ完了\n');
    console.log('=' .repeat(60));
    console.log('対話モードを開始します...');
    console.log('=' .repeat(60) + '\n');

    // 実行
    await orchestrator.run();

    console.log('\n' + '='.repeat(60));
    console.log('✅ デモ完了！');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
demoInteractiveMode().catch(console.error);
