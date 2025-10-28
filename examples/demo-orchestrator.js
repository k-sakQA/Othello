/**
 * Orchestrator Demo Script
 * 8ステップイテレーションループの動作デモ
 */

const Orchestrator = require('../src/orchestrator');

// モックエージェント（デモ用）
class MockPlanner {
  async generateTestPlan(options) {
    const iteration = options.existingCoverage?.aspectCoverage?.tested || 0;
    
    // イテレーションごとに3つのテストケースを生成
    const testCases = [];
    for (let i = 0; i < 3; i++) {
      const aspectNo = iteration * 3 + i + 1;
      if (aspectNo <= 23) {
        testCases.push({
          test_case_id: `TC-${String(aspectNo).padStart(3, '0')}`,
          aspect_no: aspectNo,
          aspect_name: `Aspect ${aspectNo}`,
          instructions: [
            { type: 'navigate', url: options.url },
            { type: 'click', element: 'button' }
          ]
        });
      }
    }

    return { testCases };
  }
}

class MockGenerator {
  async generate(options) {
    return { testCases: options.testCases };
  }
}

class MockExecutor {
  constructor() {
    this.successRate = 0.8; // 80%成功率
  }

  async execute(testCase) {
    const success = Math.random() < this.successRate;
    
    return {
      success,
      duration_ms: Math.floor(Math.random() * 500) + 100,
      error: success ? null : 'Element not found',
      snapshot: {}
    };
  }
}

class MockHealer {
  async heal(options) {
    // 50%の確率で修復成功
    const healed = Math.random() < 0.5;

    return {
      healed,
      fix_type: healed ? 'LOCATOR_FIX' : null,
      fixed_instructions: healed ? options.instructions : null,
      reason: healed ? null : 'Cannot determine fix'
    };
  }
}

class MockAnalyzer {
  analyze(results) {
    // 観点カバレッジ計算
    const testedAspects = [...new Set(
      results
        .filter(r => r.success)
        .map(r => r.aspect_no)
    )].sort((a, b) => a - b);

    const untestedAspects = Array.from({ length: 23 }, (_, i) => i + 1)
      .filter(n => !testedAspects.includes(n));

    // テストケースカバレッジ計算
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    return {
      aspectCoverage: {
        total: 23,
        tested: testedAspects.length,
        percentage: Math.round((testedAspects.length / 23) * 100 * 10) / 10,
        tested_aspects: testedAspects,
        untested_aspects: untestedAspects
      },
      testCaseCoverage: {
        total,
        passed,
        failed,
        pass_rate: total > 0 ? Math.round((passed / total) * 100 * 10) / 10 : 0
      }
    };
  }

  analyzeWithHistory(history) {
    const allResults = history.flatMap(h => h.results);
    const cumulativeCoverage = this.analyze(allResults);

    return {
      iterations: history.length,
      cumulativeCoverage,
      iterationDetails: history.map(h => ({
        iteration: h.iteration,
        coverage: this.analyze(h.results)
      }))
    };
  }

  shouldContinueTesting(coverage, target) {
    return coverage.aspectCoverage.percentage < target;
  }
}

class MockReporter {
  async saveAllReports(data, baseName) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '-');
    const base = `${baseName}-${timestamp}`;

    return {
      json: `./reports/${base}.json`,
      markdown: `./reports/${base}.md`,
      html: `./reports/${base}.html`
    };
  }
}

class MockPlaywrightMCP {
  async setupPage(url) {
    console.log(`  🌐 Playwright MCP: Page setup for ${url}`);
  }

  async closePage() {
    console.log(`  🌐 Playwright MCP: Page closed`);
  }

  async snapshot() {
    return {
      elements: [
        { role: 'button', name: 'Submit' },
        { role: 'textbox', name: 'Email' }
      ]
    };
  }
}

// シナリオ1: 目標カバレッジ達成
async function scenario1() {
  console.log('\n' + '='.repeat(70));
  console.log('🎬 Scenario 1: Coverage Target Reached');
  console.log('='.repeat(70));

  const orchestrator = new Orchestrator({
    url: 'https://hotel.example.com',
    maxIterations: 10,
    coverageTarget: 70,
    autoHeal: true
  });

  // モック注入
  orchestrator.planner = new MockPlanner();
  orchestrator.generator = new MockGenerator();
  orchestrator.executor = new MockExecutor();
  orchestrator.healer = new MockHealer();
  orchestrator.analyzer = new MockAnalyzer();
  orchestrator.reporter = new MockReporter();
  orchestrator.playwrightMCP = new MockPlaywrightMCP();

  try {
    await orchestrator.run();
    console.log('\n✅ Scenario 1 completed successfully!');
  } catch (error) {
    console.error('\n❌ Scenario 1 failed:', error.message);
  }
}

// シナリオ2: 最大イテレーション到達
async function scenario2() {
  console.log('\n' + '='.repeat(70));
  console.log('🎬 Scenario 2: Max Iterations Reached');
  console.log('='.repeat(70));

  const orchestrator = new Orchestrator({
    url: 'https://hotel.example.com',
    maxIterations: 3,
    coverageTarget: 90, // 高い目標で達成不可
    autoHeal: false
  });

  // モック注入（成功率を下げる）
  const executor = new MockExecutor();
  executor.successRate = 0.6;

  orchestrator.planner = new MockPlanner();
  orchestrator.generator = new MockGenerator();
  orchestrator.executor = executor;
  orchestrator.healer = new MockHealer();
  orchestrator.analyzer = new MockAnalyzer();
  orchestrator.reporter = new MockReporter();
  orchestrator.playwrightMCP = new MockPlaywrightMCP();

  try {
    await orchestrator.run();
    console.log('\n✅ Scenario 2 completed (reached max iterations)');
  } catch (error) {
    console.error('\n❌ Scenario 2 failed:', error.message);
  }
}

// シナリオ3: 停滞検出
async function scenario3() {
  console.log('\n' + '='.repeat(70));
  console.log('🎬 Scenario 3: Stagnation Detection');
  console.log('='.repeat(70));

  const orchestrator = new Orchestrator({
    url: 'https://hotel.example.com',
    maxIterations: 10,
    coverageTarget: 90,
    autoHeal: false
  });

  // 停滞をシミュレート（成功率を極端に下げる）
  const executor = new MockExecutor();
  executor.successRate = 0.3;

  orchestrator.planner = new MockPlanner();
  orchestrator.generator = new MockGenerator();
  orchestrator.executor = executor;
  orchestrator.healer = new MockHealer();
  orchestrator.analyzer = new MockAnalyzer();
  orchestrator.reporter = new MockReporter();
  orchestrator.playwrightMCP = new MockPlaywrightMCP();

  try {
    await orchestrator.run();
    console.log('\n✅ Scenario 3 completed (detected stagnation)');
  } catch (error) {
    console.error('\n❌ Scenario 3 failed:', error.message);
  }
}

// メイン実行
async function main() {
  console.log('');
  console.log('═'.repeat(70));
  console.log('🎭 Othello Orchestrator Demo');
  console.log('═'.repeat(70));
  console.log('');
  console.log('This demo shows the Orchestrator integrating all 6 agents:');
  console.log('  1. Planner:   Test planning based on coverage');
  console.log('  2. Generator: Test script generation');
  console.log('  3. Executor:  Test execution');
  console.log('  4. Healer:    Failure recovery (auto-heal mode)');
  console.log('  5. Analyzer:  Coverage analysis');
  console.log('  6. Reporter:  Report generation');
  console.log('');

  await scenario1();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await scenario2();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await scenario3();

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 All demo scenarios completed!');
  console.log('═'.repeat(70));
  console.log('');
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
