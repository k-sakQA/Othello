/**
 * 複雑なSPAサイトのテスト戦略（Phase 9実装イメージ）
 * 
 * シナリオ：Notion風のドキュメントエディタをテスト
 * - 動的DOM（React/Vue）
 * - リッチテキストエディタ
 * - ドラッグ&ドロップ
 * - リアルタイム同期
 */

const OthelloPlanner = require('../src/agents/othello-planner');
const OthelloGenerator = require('../src/agents/othello-generator');
const OthelloHealer = require('../src/agents/othello-healer');
const Othello = require('../src/playwright-agent');
const Analyzer = require('../src/analyzer');
const ConfigManager = require('../src/config');

async function testComplexSPA() {
  console.log('🎯 複雑なSPAサイトのテスト戦略\n');

  // 設定読み込み
  const config = await ConfigManager.load('./config/default.json');
  
  // ===================================
  // Phase 1: Othello-Planner - サイト構造を理解
  // ===================================
  console.log('📋 Phase 1: Othello-Planner - サイト構造の探索\n');
  
  const planner = new OthelloPlanner(config);
  
  const testPlan = await planner.generateTestPlan({
    url: 'https://complex-app.example.com',
    requirements: [
      'ドキュメント作成・編集機能のテスト',
      '複数ユーザーのコラボレーション',
      'リアルタイム同期の検証'
    ],
    existingCoverage: null // 初回実行
  });

  console.log('✅ テスト計画生成完了');
  console.log(`   発見されたページ: ${testPlan.plan.pages_discovered?.length || 0}件`);
  console.log(`   生成されたシナリオ: ${testPlan.scenarios.length}件\n`);

  // テスト計画をファイルに保存
  await planner.saveToFile(testPlan, './specs/complex-spa-plan.md');

  // ===================================
  // Phase 2: Othello-Generator - 実行可能な指示に変換
  // ===================================
  console.log('🔧 Phase 2: Othello-Generator - MCP互換指示の生成\n');
  
  const generator = new OthelloGenerator(config);
  
  const instructions = await generator.generateInstructions({
    testPlan: testPlan,
    scenario: testPlan.scenarios[0], // 最初のシナリオ
    format: 'mcp',
    options: {
      // 動的要素への対応
      waitStrategy: 'adaptive', // ページの状態に応じた待機
      selectorStrategy: 'ref-based', // MCPのrefを優先使用
      errorHandling: 'retry-with-heal' // エラー時はHealerを呼び出し
    }
  });

  console.log('✅ 指示生成完了');
  console.log(`   生成された指示: ${instructions.length}件\n`);

  // 指示の例を表示
  console.log('📝 生成された指示の例:');
  instructions.slice(0, 3).forEach((inst, idx) => {
    console.log(`   ${idx + 1}. ${inst.type}: ${inst.description}`);
  });
  console.log();

  // ===================================
  // Phase 3: Othello - 実際にテスト実行
  // ===================================
  console.log('🎭 Phase 3: Othello - テスト実行\n');
  
  const othello = new Othello(config, { mockMode: false });
  await othello.initializeSession();

  const results = [];
  let failedInstructions = [];

  for (const instruction of instructions) {
    console.log(`🔄 実行中: ${instruction.description}`);
    
    try {
      // エラーリカバリー付きで実行
      const result = await othello.executeWithRetry(
        async () => await othello.executeInstruction(instruction),
        instruction.description
      );

      results.push(result);

      if (!result.success) {
        console.log(`   ⚠️  失敗: ${result.error}`);
        failedInstructions.push({ instruction, error: result.error });
      } else {
        console.log(`   ✅ 成功`);
      }
    } catch (error) {
      console.log(`   ❌ エラー: ${error.message}`);
      failedInstructions.push({ instruction, error: error.message });
    }
  }

  console.log();

  // ===================================
  // Phase 4: Othello-Healer - 失敗したテストを修復
  // ===================================
  if (failedInstructions.length > 0) {
    console.log('🩹 Phase 4: Othello-Healer - 失敗テストの修復\n');
    
    const healer = new OthelloHealer(config);

    for (const { instruction, error } of failedInstructions) {
      console.log(`🔍 修復を試みています: ${instruction.description}`);
      
      // 現在のスナップショットを取得
      const currentSnapshot = await othello.mcpClient.snapshot();
      
      // Healerで修復
      const healed = await healer.heal({
        originalInstruction: instruction,
        error: {
          message: error,
          snapshot: currentSnapshot.content
        }
      });

      if (healed.fixed) {
        console.log(`   ✅ 修復成功: ${healed.reasoning}`);
        console.log(`   🔄 修復後の指示で再実行中...`);
        
        // 修復した指示で再実行
        const retryResult = await othello.executeInstruction(healed.newInstruction);
        
        if (retryResult.success) {
          console.log(`   🎉 再実行成功！\n`);
        } else {
          console.log(`   ⚠️  再実行も失敗: ${retryResult.error}\n`);
        }
      } else {
        console.log(`   ❌ 修復不可能: ${healed.reasoning}\n`);
      }
    }
  }

  // ===================================
  // Phase 5: Analyzer - カバレッジ分析
  // ===================================
  console.log('📊 Phase 5: Analyzer - カバレッジ分析\n');
  
  const analyzer = new Analyzer(config);
  
  // 実行履歴を分析
  const coverage = await analyzer.analyzeCoverage({
    results: results,
    targetUrl: 'https://complex-app.example.com'
  });

  console.log(`✅ カバレッジ分析完了`);
  console.log(`   テスト済み要素: ${coverage.tested_elements?.length || 0}件`);
  console.log(`   未テスト要素: ${coverage.untested_elements?.length || 0}件`);
  console.log(`   カバレッジ率: ${coverage.coverage_percentage || 0}%\n`);

  // 未カバー要素があれば次のイテレーションへ
  if (coverage.untested_elements && coverage.untested_elements.length > 0) {
    console.log('🔄 未カバー要素が存在 → 次のイテレーションで追加テスト');
    console.log('   未テスト要素の例:');
    coverage.untested_elements.slice(0, 3).forEach((elem, idx) => {
      console.log(`   ${idx + 1}. ${elem.type}: ${elem.description}`);
    });
  } else {
    console.log('🎉 すべての要素をカバー！');
  }

  // セッションクローズ
  await othello.closeSession();
  
  console.log('\n✨ テスト完了！');
}

// ===================================
// 重要な実装ポイント
// ===================================

/**
 * 1. Othello-Planner: LLMでサイト構造を理解
 * 
 * プロンプト例:
 * ```
 * You are analyzing a complex web application.
 * 
 * URL: https://complex-app.example.com
 * Current Snapshot:
 * [MCPから取得したアクセシビリティツリー]
 * 
 * Tasks:
 * 1. Identify all interactive elements (buttons, inputs, links)
 * 2. Understand the business logic (what does this button do?)
 * 3. Detect common patterns (forms, modals, navigation)
 * 4. Generate test scenarios covering:
 *    - Happy paths
 *    - Edge cases
 *    - Error handling
 * 
 * Output format: Markdown test plan
 * ```
 */

/**
 * 2. Othello-Generator: セレクタ戦略
 * 
 * 優先順位:
 * 1. MCP ref (最も信頼性が高い)
 * 2. data-testid属性
 * 3. アクセシブルな名前 (role + name)
 * 4. セマンティックセレクタ (button:has-text("Submit"))
 * 5. CSSセレクタ (最後の手段)
 * 
 * 例:
 * ```javascript
 * async selectElement(description) {
 *   // 1. Snapshotからrefを検索
 *   const ref = this.findRefByDescription(description);
 *   if (ref) return { type: 'ref', value: ref };
 *   
 *   // 2. data-testid
 *   const testId = await page.locator(`[data-testid="${description}"]`);
 *   if (await testId.count() > 0) return { type: 'testid', value: description };
 *   
 *   // 3. アクセシブル名
 *   const accessible = await page.getByRole('button', { name: description });
 *   if (await accessible.count() > 0) return { type: 'accessible', ... };
 *   
 *   // ... 以下同様
 * }
 * ```
 */

/**
 * 3. Othello-Healer: 失敗パターンの分類
 * 
 * パターン1: 要素が見つからない
 * → 新しいSnapshotから代替refを探す
 * 
 * パターン2: タイムアウト
 * → 待機時間を延長、別の待機戦略を試す
 * 
 * パターン3: 要素が隠れている
 * → スクロール、モーダルを閉じる、など
 * 
 * パターン4: 値が無効
 * → LLMで妥当な値を生成
 * 
 * 例:
 * ```javascript
 * async categorizeFailure(error, snapshot) {
 *   const prompt = `
 *     Error: ${error.message}
 *     Current page state: ${snapshot}
 *     
 *     Categorize this error:
 *     1. Element not found
 *     2. Timeout
 *     3. Element hidden
 *     4. Invalid value
 *     5. Other
 *     
 *     Suggest a fix.
 *   `;
 *   
 *   const analysis = await this.callLLM(prompt);
 *   return this.parseHealing(analysis);
 * }
 * ```
 */

// 実行（モック）
if (require.main === module) {
  testComplexSPA()
    .then(() => console.log('\n🎉 完了'))
    .catch(err => console.error('\n❌ エラー:', err));
}

module.exports = { testComplexSPA };
