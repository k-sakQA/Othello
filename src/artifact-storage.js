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
   * @param {number} iteration - イテレーション番号
   * @param {string} testCaseId - テストケースID
   * @returns {string} スクリーンショットディレクトリのパス
   */
  ensureScreenshotDir(iteration, testCaseId) {
    const screenshotDir = path.join(
      this.outputDir, 
      'screenshots', 
      this.sessionId || 'default',
      `iteration-${iteration}`
    );
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    return screenshotDir;
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
   * @param {string|number} stepName - ステップ名またはステップ番号
   * @returns {string} スクリーンショットファイルパス
   */
  getScreenshotPath(iteration, testCaseId, stepName) {
    // ステップ番号の場合は"step-N"に変換
    const label = typeof stepName === 'number' ? `step-${stepName}` : stepName;
    
    // 特殊文字をサニタイズ
    const sanitizedLabel = label.replace(/[/\\?%*:|"<>]/g, '-');
    
    const screenshotDir = path.join(
      this.outputDir, 
      'screenshots', 
      this.sessionId || 'default',
      `iteration-${iteration}`
    );
    const filename = `${testCaseId}-${sanitizedLabel}.png`;
    return path.join(screenshotDir, filename);
  }

  /**
   * スクリーンショットのメタデータを保存
   * @param {number} iteration - イテレーション番号
   * @param {string} testCaseId - テストケースID
   * @param {Object} metadata - メタデータ
   * @returns {Promise<string>} 保存されたファイルパス
   */
  async saveScreenshotMetadata(iteration, testCaseId, metadata) {
    // ディレクトリを確保
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `screenshot-metadata-${testCaseId}-${metadata.stepLabel}-${timestamp}.json`;
    const filePath = path.join(this.outputDir, filename);
    
    const data = {
      ...metadata,
      sessionId: this.sessionId,
      savedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    this.screenshots.push(filePath);
    
    return filePath;
  }

  /**
   * スクリーンショットを記録（パスのみ、実際の画像は別途保存）
   * @param {string} screenshotPath - スクリーンショットパス
   */
  recordScreenshot(screenshotPath) {
    this.screenshots.push(screenshotPath);
  }

  /**
   * イテレーションのスクリーンショットサマリーを取得
   * @param {number} iteration - イテレーション番号
   * @returns {Object} サマリー情報
   */
  getScreenshotSummary(iteration) {
    // メタデータファイルを検索
    const metadataFiles = fs.existsSync(this.outputDir) 
      ? fs.readdirSync(this.outputDir).filter(f => f.startsWith('screenshot-metadata-'))
      : [];
    
    const testCases = new Set();
    let totalScreenshots = 0;
    
    for (const file of metadataFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(this.outputDir, file), 'utf-8'));
        if (content.iteration === iteration) {
          testCases.add(content.testCaseId);
          totalScreenshots++;
        }
      } catch (error) {
        // ファイル読み込みエラーは無視
      }
    }
    
    return {
      iteration,
      totalScreenshots,
      testCases: Array.from(testCases).sort()
    };
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
