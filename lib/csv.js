const fs = require('fs');

async function writeCsvResults(filePath, res) {
  // CSV with BOM for Excel
  const bom = '\uFEFF';
  const headers = ['No', 'テスト概要', '実行結果', '入力値1', '入力値2', '入力値3', '備考'];
  const lines = [headers.join(',')];
  let idx = 1;
  for (const t of (res.playwright_agent_results.generated_tests || [])) {
    const cols = [
      `${res.iteration}-${idx}`,
      `"${t.name.replace(/"/g, '""')}"`,
      t.result === 'success' ? '成功' : '失敗',
      ...(t.inputs || []).slice(0,3).map(v => `"${v}"`)
    ];
    while (cols.length < headers.length) cols.push('');
    lines.push(cols.join(','));
    idx++;
  }
  return fs.promises.writeFile(filePath, bom + lines.join('\n'), 'utf8');
}

module.exports = { writeCsvResults };
