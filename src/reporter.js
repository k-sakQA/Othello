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
   * 実行結果からサマリーを生成
   * @param {Object} results - 実行結果オブジェクト（executionResultsフィールドを含む）
   * @param {number} iterations - イテレーション数
   * @returns {Object} サマリー
   */
  createSummaryFromResults(results, iterations) {
    // null/undefined対応
    if (!results) {
      return {
        total_iterations: iterations || 0,
        total_tests: 0,
        tests_passed: 0,
        tests_failed: 0,
        success_rate: 0,
        coverage_percentage: 0,
        covered_aspects: [],
        executionResults: []
      };
    }

    // executionResultsフィールドを取得（配列またはオブジェクト対応）
    const executionResults = results.executionResults || [];
    const totalTests = executionResults.length;
    
    // successフラグでカウント（success === true を成功とする）
    const passed = executionResults.filter(r => r.success === true).length;
    const failed = totalTests - passed;
    
    // 成功率を計算
    const successRate = totalTests > 0 ? Math.round((passed / totalTests) * 100 * 100) / 100 : 0;
    
    // カバレッジ情報を取得
    const coverage = results.coverage || {};
    const coveragePercentage = coverage.percentage || 0;
    const coveredAspects = coverage.covered_aspects || [];
    
    return {
      total_iterations: iterations || 1,
      total_tests: totalTests,
      tests_passed: passed,
      tests_failed: failed,
      success_rate: successRate,
      coverage_percentage: coveragePercentage,
      covered_aspects: coveredAspects,
      executionResults: executionResults // テスト詳細を保持
    };
  }

  /**
   * サマリーデータをフォーマット
   * @param {Object} summary - サマリーデータ
   * @returns {Object} フォーマット済みサマリー
   */
  formatSummary(summary) {
    const totalTests = summary.total_tests || 0;
    const passedTests = summary.tests_passed || summary.passed || 0;
    const failedTests = summary.tests_failed || summary.failed || 0;
    
    // 成功率を計算（ゼロ除算を回避）
    const successRate = summary.success_rate !== undefined 
      ? summary.success_rate 
      : (totalTests > 0 ? Math.round((passedTests / totalTests) * 100 * 100) / 100 : 0);

    return {
      totalIterations: summary.total_iterations || 0,
      totalTests,
      passedTests,
      failedTests,
      successRate: Math.round(successRate * 100) / 100,
      finalCoverage: summary.final_coverage || summary.coverage || 0
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
    // summaryがない場合はdataオブジェクト全体から生成（executionResults, coverageを含む）
    const summary = data.summary
      ? { ...data.summary }
      : this.createSummaryFromResults(data, data.iterations || 1);

    // executionResultsがsummaryに含まれていない/不足している場合は、生データから補完
    if ((!summary.executionResults || summary.executionResults.length === 0) && Array.isArray(data.executionResults)) {
      summary.executionResults = data.executionResults;
    }

    // テスト数・成功/失敗数も不足していれば補完
    if (summary.executionResults && (!summary.total_tests || summary.total_tests === 0)) {
      summary.total_tests = summary.executionResults.length;
    }
    if (summary.executionResults && summary.tests_passed === undefined) {
      summary.tests_passed = summary.executionResults.filter(r => r && r.success === true).length;
    }
    if (summary.executionResults && summary.tests_failed === undefined) {
      summary.tests_failed = summary.executionResults.length - summary.tests_passed;
    }

    const formattedSummary = this.formatSummary(summary);
    const executionResults = summary.executionResults || data.executionResults || [];
    // iterationsが数値の場合は空配列、配列の場合はそのまま使用
    const iterationsArray = Array.isArray(data.iterations) ? data.iterations : [];
    const formattedIterations = iterationsArray.map(iter => 
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

    ${executionResults && executionResults.length > 0 ? `
    <h2>📝 テスト詳細</h2>
    ${executionResults.map(result => `
    <div class="iteration ${result.success ? 'success' : 'partial'}" style="margin-bottom: 15px;">
      <div class="iteration-header">
        <div class="iteration-title">${result.test_case_id || 'N/A'}</div>
        <div class="iteration-status status-${result.success ? 'success' : 'partial'}">
          ${result.success ? '✓ 成功' : '✗ 失敗'}
        </div>
      </div>
      ${result.test_case ? `
      <div style="padding: 10px; background: white; border-radius: 5px; margin-top: 10px;">
        <div style="margin-bottom: 10px;">
          <strong>テストタイプ:</strong> ${result.test_case.test_type || 'N/A'} | 
          <strong>観点番号:</strong> ${result.test_case.aspect_no || 'N/A'}
        </div>
        <div style="margin-bottom: 10px;">
          <strong>説明:</strong> ${result.test_case.description || '説明なし'}
        </div>
        ${result.test_case.steps && result.test_case.steps.length > 0 ? `
        <div style="margin-bottom: 10px;">
          <strong>手順:</strong>
          <ol style="margin-left: 20px; margin-top: 5px;">
            ${result.test_case.steps.map(step => {
              // stepが文字列の場合とオブジェクトの場合の両方に対応
              if (typeof step === 'string') {
                return `<li>${step}</li>`;
              } else {
                return `<li>${step.action || ''} ${step.target ? `- ${step.target}` : ''} ${step.value ? `(値: ${step.value})` : ''}</li>`;
              }
            }).join('')}
          </ol>
        </div>
        ` : ''}
        ${result.test_case.expected_results && result.test_case.expected_results.length > 0 ? `
        <div style="margin-bottom: 10px;">
          <strong>期待結果:</strong>
          <ul style="margin-left: 20px; margin-top: 5px;">
            ${result.test_case.expected_results.map(exp => `<li>${exp}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : '<div style="padding: 10px; background: white; border-radius: 5px; margin-top: 10px; color: #7f8c8d;">テスト内容の詳細情報がありません</div>'}
      ${result.error ? `
      <div style="padding: 10px; background: #f8d7da; border-radius: 5px; margin-top: 10px; color: #721c24;">
        <strong>エラー:</strong>
        <pre style="white-space: pre-wrap; margin-top: 8px;">${this.escapeHtml(
          this.formatErrorMessage(result.error)
        )}</pre>
      </div>
      ` : ''}
      <div style="padding: 5px 10px; font-size: 0.9em; color: #7f8c8d;">
        実行時間: ${result.duration_ms || 0}ms
      </div>
    </div>
    `).join('')}
    ` : ''}

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
    // reportDataのバリデーション
    if (!reportData) {
      console.error('[Reporter] reportData is undefined');
      reportData = {};
    }

    // ConfigManagerからconfig取得
    const config = this.config.getConfig ? this.config.getConfig() : this.config;
    const outputDir = config.paths?.reports || config.outputDir || './reports';
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
    // デフォルト値でフォールバック
    const { 
      sessionId = 'unknown', 
      startTime = Date.now(), 
      endTime = Date.now(), 
      totalDuration = 0, 
      iterations = 0, 
      coverage = {}, 
      executionResults = [] 
    } = reportData || {};
    
    let md = `# Othello Test Report\n\n`;
    md += `**Session ID:** ${sessionId}\n`;
    md += `**Start Time:** ${new Date(startTime).toLocaleString()}\n`;
    md += `**End Time:** ${new Date(endTime).toLocaleString()}\n`;
    md += `**Duration:** ${Math.round(totalDuration / 1000)}s\n\n`;
    
    md += `## Summary\n\n`;
    md += `**Iterations:** ${iterations}\n\n`;
    md += `**Coverage:** ${coverage?.percentage?.toFixed(2) || 0}% (${coverage?.covered || 0}/${coverage?.total || 0} aspects)\n\n`;
    md += `**Tests Passed:** ${executionResults.filter(r => r.success || r.status === 'passed').length}\n\n`;
    md += `**Tests Failed:** ${executionResults.filter(r => !r.success && r.status !== 'passed').length}\n\n`;
    md += `**Auto-Healed:** ${executionResults.filter(r => r.autoHealed || r.healed).length}\n\n`;
    
    md += `## Test Results\n\n`;
    executionResults.forEach((result, index) => {
      const status = (result.success || result.status === 'passed') ? '✅' : '❌';
      md += `### ${index + 1}. ${result.testCaseId || result.test_case_id || `Test-${index + 1}`} ${status}\n\n`;
      md += `**Aspect:** ${result.aspectNo || result.aspect_no || 'N/A'}\n\n`;
      md += `**Duration:** ${result.durationMs || result.duration_ms || 0}ms\n\n`;
      if (result.autoHealed || result.healed) {
        md += `**Auto-Healed:** Yes${result.healMethod || result.heal_method ? ` (${result.healMethod || result.heal_method})` : ''}\n\n`;
      }
      if (result.error) {
        md += `**Error:** ${result.error}\n\n`;
      }
    });
    
    return md;
  }

  formatErrorMessage(error) {
    if (!error) {
      return '-';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object') {
      if (error.message) {
        return error.message;
      }
      try {
        return JSON.stringify(error, null, 2);
      } catch (e) {
        return String(error);
      }
    }
    return String(error);
  }

  escapeHtml(text) {
    if (text === null || text === undefined) {
      return '';
    }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = Reporter;
