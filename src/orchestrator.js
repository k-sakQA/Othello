/**
 * Orchestrator (Phase 9)
 * Phase 9 integration component
 */

const OthelloPlanner = require('./agents/othello-planner');
const OthelloGenerator = require('./agents/othello-generator');
const OthelloExecutor = require('./agents/othello-executor');
const OthelloHealer = require('./agents/othello-healer');
const OthelloAnalyzer = require('./agents/othello-analyzer');
const OthelloReporter = require('./agents/othello-reporter');

class Orchestrator {
  constructor(config = {}) {
    this.config = {
      url: config.url || 'https://example.com',
      maxIterations: config.maxIterations || 10,
      coverageTarget: config.coverageTarget || 80,
      autoHeal: config.autoHeal !== false,
      outputDir: config.outputDir || './reports',
      testAspectsCSV: config.testAspectsCSV || './config/test-ViewpointList-simple.csv',
      ...config
    };
    this.iteration = 0;
    this.history = [];
    this.startTime = null;
    this.endTime = null;
    this.sessionId = this.generateSessionId();
    this.planner = null;
    this.generator = null;
    this.executor = null;
    this.healer = null;
    this.analyzer = null;
    this.reporter = null;
    this.playwrightMCP = null;
  }

  async run() {
    this.startTime = new Date();
    console.log('Phase 9 Orchestrator starting...');
    try {
      if (this.playwrightMCP) {
        await this.playwrightMCP.setupPage(this.config.url);
      }
      while (this.shouldContinue()) {
        this.iteration++;
        await this.runIteration();
        const currentCoverage = this.getCurrentCoverage();
        const coveragePercentage = currentCoverage?.aspectCoverage?.percentage || 0;
        // カバレッジ目標達成チェック
        if (coveragePercentage >= this.config.coverageTarget) {
          console.log(`Coverage target ${this.config.coverageTarget}% reached!`);
          break;
        }
        if (this.isStagnant()) {
          break;
        }
      }
      await this.generateFinalReport();
      this.endTime = new Date();
      
      // 実行結果を返す
      const currentCoverage = this.getCurrentCoverage();
      const coveragePercentage = currentCoverage?.aspectCoverage?.percentage || 0;
      const passedTests = this.history.flatMap(h => h.executionResults).filter(r => r.success).length;
      const failedTests = this.history.flatMap(h => h.executionResults).filter(r => !r.success).length;
      const healedTests = this.history.flatMap(h => h.executionResults).filter(r => r.healed).length;
      
      return {
        iterations: this.iteration,
        coverage: coveragePercentage,
        passed: passedTests,
        failed: failedTests,
        healed: healedTests,
        duration: this.endTime - this.startTime,
        history: this.history
      };
    } catch (error) {
      console.error('Orchestrator failed:', error.message);
      throw error;
    } finally {
      if (this.playwrightMCP) {
        await this.playwrightMCP.closePage();
      }
    }
  }

  async runIteration() {
    const iterationResults = {
      iteration: this.iteration,
      testCases: [],
      executionResults: [],
      coverage: null
    };
    try {
      const testPlan = await this.planner.generateTestPlan({
        url: this.config.url,
        testAspectsCSV: this.config.testAspectsCSV,
        existingCoverage: this.getCurrentCoverage()
      });
      iterationResults.testCases = testPlan.testCases;
      const snapshot = this.playwrightMCP ? await this.playwrightMCP.snapshot() : null;
      const generatedTests = await this.generator.generate({ 
        testCases: testPlan.testCases, 
        snapshot,
        url: this.config.url 
      });
      // generatedTestsは配列で直接返される
      for (const testCase of generatedTests) {
        const result = await this.executor.execute(testCase);
        iterationResults.executionResults.push({
          test_case_id: testCase.test_case_id,
          aspect_no: testCase.aspect_no,
          success: result.success,
          duration_ms: result.duration_ms,
          error: result.error
        });
        if (!result.success && this.config.autoHeal) {
          const healResult = await this.healer.heal({
            test_case_id: testCase.test_case_id,
            instructions: testCase.instructions,
            error: result.error,
            snapshot: result.snapshot
          });
          if (healResult.healed) {
            testCase.instructions = healResult.fixed_instructions;
            const retryResult = await this.executor.execute(testCase);
            if (retryResult.success) {
              const lastResult = iterationResults.executionResults[iterationResults.executionResults.length - 1];
              lastResult.success = true;
              lastResult.healed = true;
            }
          }
        }
      }
      const coverage = await this.analyzer.analyze(iterationResults.executionResults);
      iterationResults.coverage = coverage;
      this.history.push(iterationResults);
    } catch (error) {
      console.error(`Iteration ${this.iteration} failed:`, error.message);
      throw error;
    }
  }

  shouldContinue() {
    return this.iteration < this.config.maxIterations;
  }

  getCurrentCoverage() {
    if (this.history.length === 0) {
      return {
        aspectCoverage: { total: 23, tested: 0, percentage: 0, tested_aspects: [], untested_aspects: Array.from({ length: 23 }, (_, i) => i + 1) },
        testCaseCoverage: { total: 0, passed: 0, failed: 0, pass_rate: 0 }
      };
    }
    const allResults = this.history.flatMap(h => h.executionResults);
    return this.analyzer.analyze(allResults);
  }

  isStagnant() {
    if (this.history.length < 3) return false;
    const recent = this.history.slice(-3);
    const coverages = recent.map(h => h.coverage.aspectCoverage.percentage);
    const maxDiff = Math.max(...coverages) - Math.min(...coverages);
    return maxDiff < 1.0;
  }

  async generateFinalReport() {
    this.endTime = new Date();
    const analysis = this.analyzer.analyzeWithHistory(this.history.map(h => ({ iteration: h.iteration, results: h.executionResults })));
    const reportData = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: this.endTime,
      totalDuration: this.endTime - this.startTime,
      iterations: this.iteration,
      coverage: analysis.cumulativeCoverage,
      executionResults: this.history.flatMap(h => h.executionResults)
    };
    const reports = await this.reporter.saveAllReports(reportData, `session-${this.sessionId}`);
    return reports;
  }

  generateSessionId() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${dateStr}-${timeStr}`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

module.exports = Orchestrator;