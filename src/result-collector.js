/**
 * Result Collector
 * Playwright実行結果の収集とJSON/CSV形式での保存
 */

const fs = require('fs').promises;
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class ResultCollector {
  constructor(config) {
    this.config = config;
  }

  /**
   * Playwright結果データを収集
   * @param {Object} playwrightResult - Playwrightからの結果データ
   * @returns {Object} 収集したデータ
   */
  async collect(playwrightResult) {
    // データの正規化
    const collected = {
      ...playwrightResult,
      // Playwrightの 'passed' を Othelloの 'success' に変換
      status: playwrightResult.status === 'passed' ? 'success' : playwrightResult.status
    };

    return collected;
  }

  /**
   * 結果をJSON形式で保存
   * @param {string} filePath - 保存先ファイルパス
   * @param {Object} data - 保存するデータ
   */
  async saveJSON(filePath, data) {
    // ディレクトリが存在しない場合は作成
    await this.ensureDirectory(path.dirname(filePath));

    // JSON形式で書き込み（整形あり）
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * 結果をCSV形式で保存
   * @param {string} filePath - 保存先ファイルパス
   * @param {Object} data - 保存するデータ
   * @param {Object} options - オプション（append: 追記モード）
   */
  async saveCSV(filePath, data, options = {}) {
    // ディレクトリが存在しない場合は作成
    await this.ensureDirectory(path.dirname(filePath));

    const tests = data.playwright_agent_results?.generated_tests || [];
    
    if (tests.length === 0) {
      // テストが0件の場合はヘッダーのみ出力（新規作成時のみ）
      if (!options.append) {
        await this._writeCSVHeader(filePath);
      }
      return;
    }

    // CSV行データを準備
    const records = tests.map((test, index) => {
      return {
        no: `${data.iteration}-${index + 1}`,
        test_name: this._escapeCSV(test.name),
        result: test.status === 'passed' ? '成功' : '失敗',
        input1: test.inputs && test.inputs[0] ? this._escapeCSV(test.inputs[0]) : '',
        input2: test.inputs && test.inputs[1] ? this._escapeCSV(test.inputs[1]) : '',
        input3: test.inputs && test.inputs[2] ? this._escapeCSV(test.inputs[2]) : '',
        note: ''
      };
    });

    if (options.append) {
      // 追記モード: ヘッダーなしで追記
      await this._appendCSV(filePath, records);
    } else {
      // 新規作成モード: ヘッダーありで作成
      await this._writeCSV(filePath, records);
    }
  }

  /**
   * CSV新規作成（ヘッダーあり）
   * @private
   */
  async _writeCSV(filePath, records) {
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'no', title: 'No' },
        { id: 'test_name', title: 'テスト概要' },
        { id: 'result', title: '実行結果' },
        { id: 'input1', title: '入力値1' },
        { id: 'input2', title: '入力値2' },
        { id: 'input3', title: '入力値3' },
        { id: 'note', title: '備考' }
      ],
      encoding: 'utf8'
    });

    await csvWriter.writeRecords(records);

    // Excel用にBOMを追加
    await this._addBOM(filePath);
  }

  /**
   * CSV追記（ヘッダーなし）
   * @private
   */
  async _appendCSV(filePath, records) {
    const csvWriter = createCsvWriter({
      path: filePath,
      header: [
        { id: 'no', title: 'No' },
        { id: 'test_name', title: 'テスト概要' },
        { id: 'result', title: '実行結果' },
        { id: 'input1', title: '入力値1' },
        { id: 'input2', title: '入力値2' },
        { id: 'input3', title: '入力値3' },
        { id: 'note', title: '備考' }
      ],
      append: true,
      encoding: 'utf8'
    });

    await csvWriter.writeRecords(records);
  }

  /**
   * CSVヘッダーのみ書き込み
   * @private
   */
  async _writeCSVHeader(filePath) {
    const bom = '\uFEFF';
    const header = 'No,テスト概要,実行結果,入力値1,入力値2,入力値3,備考\n';
    await fs.writeFile(filePath, bom + header, 'utf8');
  }

  /**
   * ファイルの先頭にBOMを追加（Excel用）
   * @private
   */
  async _addBOM(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    if (content.charCodeAt(0) !== 0xFEFF) {
      await fs.writeFile(filePath, '\uFEFF' + content, 'utf8');
    }
  }

  /**
   * CSV特殊文字のエスケープ
   * @private
   */
  _escapeCSV(value) {
    if (typeof value !== 'string') {
      return String(value);
    }
    
    // ダブルクォートをエスケープ
    let escaped = value.replace(/"/g, '""');
    
    // カンマ、改行、ダブルクォートを含む場合はダブルクォートで囲む
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      escaped = `"${escaped}"`;
    }
    
    return escaped;
  }

  /**
   * ディレクトリが存在することを確認（存在しなければ作成）
   * @param {string} dirPath - ディレクトリパス
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = ResultCollector;
