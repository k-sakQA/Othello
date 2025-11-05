const fs = require('fs').promises;
const path = require('path');

/**
 * Reporter
 * テスト結果のレポート生成を担当するクラス
 */
class Reporter {
  /**
   * @param {ConfigManager} config - 設定マネージャー
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * テスト結果からレポートを生成
   * @param {Object} testData - テスト結果データ
   * @returns {Promise<Object>} レポートデータ（HTMLを含む）
   */
  async generateReport(testData) {
    const html = await this.generateHTML(testData);
    
    return {
      html,
      timestamp: testData.timestamp || new Date().toISOString(),
      summary: testData.summary
    };
  }

  /**
   * レポートをファイルとして保存
   * @param {Object} reportData - レポートデータ
   * @param {string} filePath - 保存先ファイルパス
   */
  async saveReport(reportData, filePath) {
    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // HTMLを保存
    await fs.writeFile(filePath, reportData.html, 'utf8');
  }

  /**
   * サマリーデータをフォーマット
   * @param {Object} summary - サマリーデータ
   * @returns {Object} フォーマット済みサマリー
   */
  formatSummary(summary) {
    const totalTests = summary.total_tests || 0;
    const passedTests = summary.passed || 0;
    const failedTests = summary.failed || 0;
    
    // 成功率を計算（ゼロ除算を回避）
    const successRate = totalTests > 0 
      ? (passedTests / totalTests) * 100 
      : 0;

    return {
      totalIterations: summary.total_iterations || 0,
      totalTests,
      passedTests,
      failedTests,
      successRate: Math.round(successRate * 100) / 100,
      finalCoverage: summary.final_coverage || 0
    };
  }

  /**
   * イテレーションデータをフォーマット
   * @param {Object} iteration - イテレーションデータ
   * @returns {Object} フォーマット済みイテレーション
   */
  formatIteration(iteration) {
    return {
      iterationNumber: iteration.iteration,
      testsExecuted: iteration.tests_executed || 0,
      testsPassed: iteration.tests_passed || 0,
      testsFailed: iteration.tests_failed || 0,
      coverage: iteration.coverage || 0,
      durationSeconds: iteration.duration_seconds || 0,
      durationFormatted: this.formatDuration(iteration.duration_seconds || 0),
      healerActions: iteration.healer_actions || 0,
      status: (iteration.tests_failed || 0) > 0 ? 'partial' : 'success'
    };
  }

  /**
   * 秒数を人間が読める形式にフォーマット
   * @param {number} seconds - 秒数
   * @returns {string} フォーマット済み時間文字列
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}時間`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);

    return parts.join('');
  }

  /**
   * HTMLレポートを生成
   * @param {Object} data - レポートデータ
   * @returns {Promise<string>} HTML文字列
   */
  async generateHTML(data) {
    const formattedSummary = this.formatSummary(data.summary);
    const formattedIterations = (data.iterations || []).map(iter => 
      this.formatIteration(iter)
    );

    const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString('ja-JP') : '';

    // HTMLテンプレートを生成
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Othello E2Eテスト実行レポート</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', 'Yu Gothic', 'Meiryo', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    .header-info {
      color: #7f8c8d;
      margin-bottom: 30px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #ecf0f1;
      padding: 20px;
      border-radius: 5px;
      text-align: center;
    }
    .summary-card.success {
      background: #d5f4e6;
      border-left: 4px solid #27ae60;
    }
    .summary-card.warning {
      background: #fff3cd;
      border-left: 4px solid #f39c12;
    }
    .summary-card.error {
      background: #f8d7da;
      border-left: 4px solid #e74c3c;
    }
    .summary-value {
      font-size: 2em;
      font-weight: bold;
      color: #2c3e50;
    }
    .summary-label {
      color: #7f8c8d;
      font-size: 0.9em;
      margin-top: 5px;
    }
    .iteration {
      background: #f8f9fa;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 5px;
      border-left: 4px solid #3498db;
    }
    .iteration.success {
      border-left-color: #27ae60;
    }
    .iteration.partial {
      border-left-color: #f39c12;
    }
    .iteration-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .iteration-title {
      font-size: 1.2em;
      font-weight: bold;
      color: #2c3e50;
    }
    .iteration-status {
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: bold;
    }
    .status-success {
      background: #27ae60;
      color: white;
    }
    .status-partial {
      background: #f39c12;
      color: white;
    }
    .iteration-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }
    .stat-item {
      background: white;
      padding: 10px;
      border-radius: 3px;
    }
    .stat-label {
      font-size: 0.85em;
      color: #7f8c8d;
    }
    .stat-value {
      font-size: 1.1em;
      font-weight: bold;
      color: #2c3e50;
    }
    .coverage-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.9em;
      font-weight: bold;
      color: white;
    }
    .coverage-high { background: #27ae60; }
    .coverage-medium { background: #f39c12; }
    .coverage-low { background: #e74c3c; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
      text-align: center;
      color: #7f8c8d;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎭 Othello E2Eテスト実行レポート</h1>
    <div class="header-info">
      <p>実行日時: ${timestamp}</p>
    </div>

    <h2>📊 サマリー</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">${formattedSummary.totalIterations}</div>
        <div class="summary-label">総イテレーション数</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">${formattedSummary.totalTests}</div>
        <div class="summary-label">総テスト実行数</div>
      </div>
      <div class="summary-card success">
        <div class="summary-value">${formattedSummary.passedTests}</div>
        <div class="summary-label">成功</div>
      </div>
      <div class="summary-card ${formattedSummary.failedTests > 0 ? 'error' : ''}">
        <div class="summary-value">${formattedSummary.failedTests}</div>
        <div class="summary-label">失敗</div>
      </div>
      <div class="summary-card ${formattedSummary.successRate >= 90 ? 'success' : formattedSummary.successRate >= 70 ? 'warning' : 'error'}">
        <div class="summary-value">${formattedSummary.successRate}%</div>
        <div class="summary-label">成功率</div>
      </div>
      <div class="summary-card ${formattedSummary.finalCoverage >= 80 ? 'success' : formattedSummary.finalCoverage >= 60 ? 'warning' : 'error'}">
        <div class="summary-value">${formattedSummary.finalCoverage}%</div>
        <div class="summary-label">最終カバレッジ</div>
      </div>
    </div>

    ${formattedIterations.length > 0 ? '<h2>📋 イテレーション別結果</h2>' : ''}
    ${formattedIterations.map(iter => `
    <div class="iteration ${iter.status}">
      <div class="iteration-header">
        <div class="iteration-title">イテレーション${iter.iterationNumber}</div>
        <div class="iteration-status status-${iter.status}">
          ${iter.status === 'success' ? '✓ 成功' : '⚠ 一部失敗'}
        </div>
      </div>
      <div class="iteration-stats">
        <div class="stat-item">
          <div class="stat-label">実行時間</div>
          <div class="stat-value">${iter.durationFormatted}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">テスト数</div>
          <div class="stat-value">${iter.testsExecuted}件</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">成功/失敗</div>
          <div class="stat-value">${iter.testsPassed}/${iter.testsFailed}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">カバレッジ</div>
          <div class="stat-value">
            <span class="coverage-badge ${iter.coverage >= 70 ? 'coverage-high' : iter.coverage >= 40 ? 'coverage-medium' : 'coverage-low'}">
              ${iter.coverage}%
            </span>
          </div>
        </div>
        ${iter.healerActions > 0 ? `
        <div class="stat-item">
          <div class="stat-label">Healer活動</div>
          <div class="stat-value">${iter.healerActions}件</div>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}

    <div class="footer">
      <p>Generated by Othello - Playwright E2E Test Automation Tool</p>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * 全フォーマットのレポートを保存（JSON, Markdown, HTML）
   * @param {Object} reportData - レポートデータ
   * @param {string} sessionId - セッションID
   * @returns {Promise<Object>} 保存されたファイルパス
   */
  async saveAllReports(reportData, sessionId) {
    const outputDir = this.config.config.paths?.reports || this.config.config.outputDir || './reports';
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `othello-report-${sessionId || timestamp}`;
    
    // JSON形式で保存
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(reportData, null, 2), 'utf8');
    
    // Markdown形式で保存
    const mdPath = path.join(outputDir, `${baseName}.md`);
    const markdown = this.generateMarkdown(reportData);
    await fs.writeFile(mdPath, markdown, 'utf8');
    
    // HTML形式で保存
    const htmlPath = path.join(outputDir, `${baseName}.html`);
    const html = await this.generateHTML(reportData);
    await fs.writeFile(htmlPath, html, 'utf8');
    
    return {
      json: jsonPath,
      markdown: mdPath,
      html: htmlPath
    };
  }

  /**
   * Markdown形式のレポートを生成
   * @param {Object} reportData - レポートデータ
   * @returns {string} Markdown形式のレポート
   */
  generateMarkdown(reportData) {
    const { sessionId, startTime, endTime, totalDuration, iterations, coverage, executionResults } = reportData;
    
    let md = `# Othello Test Report\n\n`;
    md += `**Session ID:** ${sessionId}\n`;
    md += `**Start Time:** ${new Date(startTime).toLocaleString()}\n`;
    md += `**End Time:** ${new Date(endTime).toLocaleString()}\n`;
    md += `**Duration:** ${Math.round(totalDuration / 1000)}s\n\n`;
    
    md += `## Summary\n\n`;
    md += `- **Iterations:** ${iterations}\n`;
    md += `- **Coverage:** ${coverage?.percentage?.toFixed(2) || 0}% (${coverage?.covered || 0}/${coverage?.total || 0} aspects)\n`;
    md += `- **Tests Passed:** ${executionResults.filter(r => r.success).length}\n`;
    md += `- **Tests Failed:** ${executionResults.filter(r => !r.success).length}\n`;
    md += `- **Auto-Healed:** ${executionResults.filter(r => r.healed).length}\n\n`;
    
    md += `## Test Results\n\n`;
    executionResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      md += `### ${index + 1}. ${result.test_case_id} ${status}\n\n`;
      md += `- **Aspect:** ${result.aspect_no}\n`;
      md += `- **Duration:** ${result.duration_ms}ms\n`;
      if (result.healed) {
        md += `- **Auto-Healed:** Yes (${result.heal_method})\n`;
      }
      if (result.error) {
        md += `- **Error:** ${result.error}\n`;
      }
      md += `\n`;
    });
    
    return md;
  }
}

module.exports = Reporter;
