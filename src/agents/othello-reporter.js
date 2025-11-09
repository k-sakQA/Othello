/**
 * Othello-Reporter
 * テスト実行結果から各種形式のレポートを生成するエージェント
 * 
 * 主な機能:
 * 1. JSON形式レポート生成（機械可読）
 * 2. Markdown形式レポート生成（人間可読）
 * 3. HTML形式レポート生成（ビジュアル）
 * 4. ファイル保存機能
 */

const fs = require('fs');
const path = require('path');

class OthelloReporter {
  /**
   * コンストラクタ
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.outputDir = options.outputDir || './reports';
    this.includeTimestamp = options.includeTimestamp !== false;
  }

  /**
   * 全形式のレポートを生成
   * @param {Object} testData - テスト実行データ
   * @returns {Object} 生成されたレポート
   */
  async generateReport(testData) {
    return {
      json: this.generateJSON(testData),
      markdown: this.generateMarkdown(testData),
      html: this.generateHTML(testData)
    };
  }

  /**
   * JSON形式のレポートを生成
   * @param {Object} testData - テスト実行データ
   * @returns {string} JSON文字列
   */
  generateJSON(testData) {
    return JSON.stringify(testData, null, 2);
  }

  /**
   * Markdown形式のレポートを生成
   * @param {Object} testData - テスト実行データ
   * @returns {string} Markdown文字列
   */
  generateMarkdown(testData) {
    const { coverage, executionResults, iterations, sessionId, startTime, endTime, totalDuration } = testData;
    const { aspectCoverage, testCaseCoverage } = coverage;

    const lines = [];

    // ヘッダー
    lines.push('# Othello テスト実行レポート');
    lines.push('');

    // セッション情報
    if (sessionId) {
      lines.push(`**セッションID**: ${sessionId}`);
    }
    if (startTime) {
      lines.push(`**開始時刻**: ${this.formatTimestamp(new Date(startTime))}`);
    }
    if (endTime) {
      lines.push(`**終了時刻**: ${this.formatTimestamp(new Date(endTime))}`);
    }
    if (totalDuration) {
      lines.push(`**実行時間**: ${this.formatDuration(totalDuration)}`);
    }
    if (iterations) {
      lines.push(`**イテレーション数**: ${iterations}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // カバレッジサマリー
    lines.push('## 📊 カバレッジサマリー');
    lines.push('');
    lines.push('### 観点カバレッジ');
    lines.push('');
    lines.push(`- **テスト済み観点**: ${aspectCoverage.tested}/${aspectCoverage.total}`);
    lines.push(`- **カバレッジ率**: ${aspectCoverage.percentage}%`);
    lines.push(`- **未テスト観点数**: ${aspectCoverage.untested_aspects ? aspectCoverage.untested_aspects.length : 0}`);
    lines.push('');

    // プログレスバー
    const progress = this.generateProgressBar(aspectCoverage.percentage);
    lines.push('```');
    lines.push(progress);
    lines.push('```');
    lines.push('');

    // テストケースカバレッジ
    lines.push('### テストケース実行結果');
    lines.push('');
    lines.push(`- **総実行数**: ${testCaseCoverage.total}`);
    lines.push(`- **成功**: ${testCaseCoverage.passed}/${testCaseCoverage.total} (${testCaseCoverage.pass_rate}%)`);
    lines.push(`- **失敗**: ${testCaseCoverage.failed}/${testCaseCoverage.total}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // 観点詳細
    lines.push('## 🎯 観点詳細');
    lines.push('');
    lines.push('### テスト済み観点');
    lines.push('');
    lines.push((aspectCoverage.tested_aspects || []).join(', ') || 'なし');
    lines.push('');
    lines.push('### 未テスト観点');
    lines.push('');
    lines.push((aspectCoverage.untested_aspects || []).join(', ') || 'なし');
    lines.push('');
    lines.push('---');
    lines.push('');

    // イテレーション詳細
    if (testData.history && testData.history.length > 0) {
      lines.push('## 🔄 イテレーション詳細');
      lines.push('');
      
      testData.history.forEach((iter, index) => {
        lines.push(`### Iteration ${index + 1}`);
        lines.push('');
        lines.push(`- **実行時刻**: ${this.formatTimestamp(new Date(iter.timestamp))}`);
        lines.push(`- **テストケース数**: ${iter.executionResults.length}`);
        lines.push(`- **成功**: ${iter.executionResults.filter(r => r.success).length} / **失敗**: ${iter.executionResults.filter(r => !r.success).length}`);
        
        if (iter.coverage) {
          lines.push(`- **カバレッジ**: ${iter.coverage.percentage}% (${iter.coverage.covered}/${iter.coverage.total} 観点)`);
        }
        
        lines.push('');
        lines.push('| テストケースID | 観点 | 結果 | 実行時間 |');
        lines.push('|---------------|------|------|----------|');
        
        iter.executionResults.forEach(result => {
          const status = result.success ? '✅ 成功' : '❌ 失敗';
          const duration = result.duration_ms ? this.formatDuration(result.duration_ms) : '-';
          const aspectNo = result.aspect_no || '-';
          lines.push(`| ${result.test_case_id} | ${aspectNo} | ${status} | ${duration} |`);
        });
        
        lines.push('');
      });
      
      lines.push('---');
      lines.push('');
    }

    // 全実行結果サマリー
    if (executionResults && executionResults.length > 0) {
      lines.push('## 📝 全実行結果サマリー');
      lines.push('');
      lines.push('| テストケースID | 観点 | 結果 | 実行時間 | エラー |');
      lines.push('|---------------|------|------|----------|--------|');

      executionResults.forEach(result => {
        const status = result.success ? '✅ 成功' : '❌ 失敗';
        const duration = result.duration_ms ? this.formatDuration(result.duration_ms) : '-';
        const error = result.error || '-';
        const aspectNo = result.aspect_no || '-';

        lines.push(`| ${result.test_case_id} | ${aspectNo} | ${status} | ${duration} | ${error} |`);
      });

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * HTML形式のレポートを生成
   * @param {Object} testData - テスト実行データ
   * @returns {string} HTML文字列
   */
  generateHTML(testData) {
    const { coverage, executionResults, iterations, sessionId, startTime, endTime, totalDuration } = testData;
    const { aspectCoverage, testCaseCoverage } = coverage;

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Othello テスト実行レポート</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 40px;
    }
    
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #3498db;
      padding-left: 10px;
    }
    
    .session-info {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    
    .session-info p {
      margin: 5px 0;
    }
    
    .session-info strong {
      color: #2c3e50;
      min-width: 150px;
      display: inline-block;
    }
    
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    
    .metric-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .metric-card.success {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }
    
    .metric-card.warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    
    .metric-card h3 {
      font-size: 14px;
      margin-bottom: 10px;
      opacity: 0.9;
    }
    
    .metric-card .value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .metric-card .label {
      font-size: 12px;
      opacity: 0.8;
    }
    
    .progress-container {
      background: #ecf0f1;
      border-radius: 10px;
      height: 30px;
      margin: 15px 0;
      overflow: hidden;
      position: relative;
    }
    
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #3498db, #2ecc71);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th {
      background: #34495e;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #ecf0f1;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .status-success {
      color: #27ae60;
      font-weight: bold;
    }
    
    .status-failed {
      color: #e74c3c;
      font-weight: bold;
    }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .badge-success {
      background: #d4edda;
      color: #155724;
    }
    
    .badge-danger {
      background: #f8d7da;
      color: #721c24;
    }
    
    .aspect-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 15px 0;
    }
    
    .aspect-badge {
      background: #3498db;
      color: white;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 14px;
      font-weight: 500;
    }
    
    .aspect-badge.untested {
      background: #95a5a6;
    }
    
    footer {
      margin-top: 40px;
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Othello テスト実行レポート</h1>
    
    <div class="session-info">
      ${sessionId ? `<p><strong>セッションID:</strong> ${sessionId}</p>` : ''}
      ${startTime ? `<p><strong>開始時刻:</strong> ${this.formatTimestamp(new Date(startTime))}</p>` : ''}
      ${endTime ? `<p><strong>終了時刻:</strong> ${this.formatTimestamp(new Date(endTime))}</p>` : ''}
      ${totalDuration ? `<p><strong>実行時間:</strong> ${this.formatDuration(totalDuration)}</p>` : ''}
      ${iterations ? `<p><strong>イテレーション数:</strong> ${iterations}</p>` : ''}
    </div>
    
    <h2>📊 カバレッジサマリー</h2>
    
    <div class="metrics">
      <div class="metric-card">
        <h3>観点カバレッジ</h3>
        <div class="value">${aspectCoverage.percentage}%</div>
        <div class="label">${aspectCoverage.tested}/${aspectCoverage.total} 観点</div>
      </div>
      
      <div class="metric-card success">
        <h3>テスト成功率</h3>
        <div class="value">${testCaseCoverage.pass_rate}%</div>
        <div class="label">${testCaseCoverage.passed}/${testCaseCoverage.total} ケース</div>
      </div>
      
      <div class="metric-card warning">
        <h3>失敗ケース</h3>
        <div class="value">${testCaseCoverage.failed}</div>
        <div class="label">/${testCaseCoverage.total} ケース</div>
      </div>
    </div>
    
    <h3>カバレッジ進捗</h3>
    <div class="progress-container">
      <div class="progress-bar" style="width: ${aspectCoverage.percentage}%">
        ${aspectCoverage.percentage}%
      </div>
    </div>
    
    <h2>🎯 観点詳細</h2>
    
    <h3>✅ テスト済み観点 (${aspectCoverage.tested})</h3>
    <div class="aspect-list">
      ${(aspectCoverage.tested_aspects || []).map(n => `<span class="aspect-badge">${n}</span>`).join('') || 'なし'}
    </div>
    
    <h3>⏳ 未テスト観点 (${aspectCoverage.untested_aspects ? aspectCoverage.untested_aspects.length : 0})</h3>
    <div class="aspect-list">
      ${(aspectCoverage.untested_aspects || []).map(n => `<span class="aspect-badge untested">${n}</span>`).join('') || 'なし'}
    </div>
    
    ${testData.history && testData.history.length > 0 ? `
    <h2>🔄 イテレーション詳細</h2>
    ${testData.history.map((iter, index) => `
      <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <h3>Iteration ${index + 1}</h3>
        <p><strong>実行時刻:</strong> ${this.formatTimestamp(new Date(iter.timestamp))}</p>
        <p><strong>テストケース数:</strong> ${iter.executionResults.length}</p>
        <p><strong>成功:</strong> ${iter.executionResults.filter(r => r.success).length} / 
           <strong>失敗:</strong> ${iter.executionResults.filter(r => !r.success).length}</p>
        ${iter.coverage ? `
          <p><strong>カバレッジ:</strong> ${iter.coverage.percentage}% 
          (${iter.coverage.covered}/${iter.coverage.total} 観点)</p>
        ` : ''}
        <details style="margin-top: 10px;">
          <summary style="cursor: pointer; font-weight: bold;">テストケース詳細を表示</summary>
          <table style="margin-top: 10px;">
            <thead>
              <tr>
                <th>テストケースID</th>
                <th>観点</th>
                <th>結果</th>
                <th>実行時間</th>
                <th>エラー</th>
              </tr>
            </thead>
            <tbody>
              ${iter.executionResults.map(result => `
              <tr>
                <td>${result.test_case_id}</td>
                <td>${result.aspect_no || '-'}</td>
                <td>
                  ${result.success 
                    ? '<span class="badge badge-success">✅ 成功</span>' 
                    : '<span class="badge badge-danger">❌ 失敗</span>'}
                </td>
                <td>${result.duration_ms ? this.formatDuration(result.duration_ms) : '-'}</td>
                <td>${result.error || '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </details>
      </div>
    `).join('')}
    ` : ''}
    
    ${executionResults && executionResults.length > 0 ? `
    <h2>📝 全実行結果サマリー</h2>
    
    <table>
      <thead>
        <tr>
          <th>テストケースID</th>
          <th>観点</th>
          <th>結果</th>
          <th>実行時間</th>
          <th>エラー</th>
        </tr>
      </thead>
      <tbody>
        ${executionResults.map(result => `
        <tr>
          <td>${result.test_case_id}</td>
          <td>${result.aspect_no || '-'}</td>
          <td>
            ${result.success 
              ? '<span class="badge badge-success">✅ 成功</span>' 
              : '<span class="badge badge-danger">❌ 失敗</span>'}
          </td>
          <td>${result.duration_ms ? this.formatDuration(result.duration_ms) : '-'}</td>
          <td>${result.error || '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}
    
    <footer>
      <p>Generated by Othello Test Automation System</p>
      <p>${new Date().toLocaleString('ja-JP')}</p>
    </footer>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * レポートをファイルに保存
   * @param {Object} testData - テスト実行データ
   * @param {string} format - 形式（json/markdown/html）
   * @param {string} filename - ファイル名
   * @returns {Promise<string>} 保存されたファイルパス
   */
  async saveReport(testData, format, filename) {
    // 出力ディレクトリを作成
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // レポート生成
    let content;
    switch (format) {
      case 'json':
        content = this.generateJSON(testData);
        break;
      case 'markdown':
        content = this.generateMarkdown(testData);
        break;
      case 'html':
        content = this.generateHTML(testData);
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }

    // ファイル保存
    const filePath = path.join(this.outputDir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * 全形式のレポートを一括保存
   * @param {Object} testData - テスト実行データ
   * @param {string} baseName - ベースファイル名
   * @returns {Promise<Object>} 保存されたファイルパス
   */
  async saveAllReports(testData, baseName) {
    const timestamp = this.includeTimestamp 
      ? `-${this.getTimestamp()}` 
      : '';

    const jsonPath = await this.saveReport(
      testData, 
      'json', 
      `${baseName}${timestamp}.json`
    );

    const markdownPath = await this.saveReport(
      testData, 
      'markdown', 
      `${baseName}${timestamp}.md`
    );

    const htmlPath = await this.saveReport(
      testData, 
      'html', 
      `${baseName}${timestamp}.html`
    );

    return {
      json: jsonPath,
      markdown: markdownPath,
      html: htmlPath
    };
  }

  /**
   * プログレスバーを生成
   * @param {number} percentage - パーセンテージ
   * @returns {string} プログレスバー文字列
   */
  generateProgressBar(percentage) {
    const width = 50;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
  }

  /**
   * ミリ秒を人間が読める形式に変換
   * @param {number} ms - ミリ秒
   * @returns {string} フォーマットされた文字列
   */
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const m = minutes % 60;
      const s = seconds % 60;
      return `${hours}h ${m}m ${s}s`;
    }
    
    if (minutes > 0) {
      const s = seconds % 60;
      return `${minutes}m ${s}s`;
    }
    
    const decimal = (ms / 1000).toFixed(2);
    return `${decimal}s`;
  }

  /**
   * タイムスタンプをフォーマット
   * @param {Date} date - 日付オブジェクト
   * @returns {string} フォーマットされた文字列
   */
  formatTimestamp(date) {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * ファイル名用タイムスタンプを取得
   * @returns {string} YYYYMMdd-HHmmss形式
   */
  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }
}

module.exports = OthelloReporter;
