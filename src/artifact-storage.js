/**
 * 成果物保存クラス
 * Planner、Generator、スクリーンショットなどの成果物を保存・管理
 */

const fs = require('fs');
const path = require('path');

class ArtifactStorage {
  /**
   * @param {Object} options
   * @param {string} options.sessionId - セッションID
   * @param {string} options.outputDir - 出力ディレクトリ（デフォルト: ./reports）
   */
  constructor(options = {}) {
    this.sessionId = options.sessionId;
    this.outputDir = options.outputDir || './reports';
    this.plannerOutputs = [];
    this.generatorOutputs = [];
    this.screenshots = [];
    
    this.ensureDirectories();
  }

  /**
   * 必要なディレクトリを作成
   */
  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * スクリーンショットディレクトリを確保
   */
  ensureScreenshotDir() {
    // 全イテレーションのディレクトリを確保するため、親ディレクトリを作成
    const screenshotBaseDir = path.join(this.outputDir, 'screenshots', this.sessionId);
    if (!fs.existsSync(screenshotBaseDir)) {
      fs.mkdirSync(screenshotBaseDir, { recursive: true });
    }
    return screenshotBaseDir;
  }

  /**
   * Plannerの生成物を保存
   * @param {number} iteration - イテレーション番号
   * @param {Object} plannerOutput - Plannerの出力
   * @returns {Promise<string>} 保存されたファイルパス
   */
  async savePlannerOutput(iteration, plannerOutput) {
    const filename = `planner-iteration-${iteration}-${this.sessionId}.json`;
    const filePath = path.join(this.outputDir, filename);
    
    const data = {
      ...plannerOutput,
      iteration,
      sessionId: this.sessionId,
      savedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.plannerOutputs.push(filePath);
    
    return filePath;
  }

  /**
   * Generatorの生成物を保存
   * @param {number} iteration - イテレーション番号
   * @param {string} testCaseId - テストケースID
   * @param {Object} generatorOutput - Generatorの出力
   * @returns {Promise<string>} 保存されたファイルパス
   */
  async saveGeneratorOutput(iteration, testCaseId, generatorOutput) {
    const filename = `generator-iteration-${iteration}-${testCaseId}-${this.sessionId}.json`;
    const filePath = path.join(this.outputDir, filename);
    
    const data = {
      ...generatorOutput,
      iteration,
      testCaseId,
      sessionId: this.sessionId,
      savedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.generatorOutputs.push(filePath);
    
    return filePath;
  }

  /**
   * スクリーンショットのパスを生成
   * @param {number} iteration - イテレーション番号
   * @param {string} testCaseId - テストケースID
   * @param {string} stepName - ステップ名
   * @returns {string} スクリーンショットファイルパス
   */
  getScreenshotPath(iteration, testCaseId, stepName) {
    const screenshotDir = path.join(this.outputDir, 'screenshots', this.sessionId, `iteration-${iteration}`);
    const filename = `${testCaseId}-${stepName}.png`;
    return path.join(screenshotDir, filename);
  }

  /**
   * スクリーンショットを記録（パスのみ、実際の画像は別途保存）
   * @param {string} screenshotPath - スクリーンショットパス
   */
  recordScreenshot(screenshotPath) {
    this.screenshots.push(screenshotPath);
  }

  /**
   * 保存された成果物のサマリーを取得
   * @returns {Object} サマリー情報
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      outputDir: this.outputDir,
      plannerOutputs: [...this.plannerOutputs],
      generatorOutputs: [...this.generatorOutputs],
      screenshots: [...this.screenshots]
    };
  }

  /**
   * サマリーをコンソールに表示
   */
  printSummary() {
    console.log('\n📦 保存された成果物:');
    console.log('==========================================');
    
    if (this.plannerOutputs.length > 0) {
      console.log(`\n📋 Planner生成物 (${this.plannerOutputs.length}件):`);
      this.plannerOutputs.forEach(file => {
        console.log(`   ${file}`);
      });
    }
    
    if (this.generatorOutputs.length > 0) {
      console.log(`\n🔧 Generator生成物 (${this.generatorOutputs.length}件):`);
      this.generatorOutputs.forEach(file => {
        console.log(`   ${file}`);
      });
    }
    
    if (this.screenshots.length > 0) {
      console.log(`\n📸 スクリーンショット (${this.screenshots.length}件):`);
      this.screenshots.forEach(file => {
        console.log(`   ${file}`);
      });
    }
    
    console.log(`\n📁 全ての成果物: ${this.outputDir}`);
    console.log('==========================================\n');
  }
}

module.exports = ArtifactStorage;
