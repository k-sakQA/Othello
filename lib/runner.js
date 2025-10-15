const fs = require('fs');
const path = require('path');
const { sampleRun } = require('./stubAgent');
const { writeJsonLog } = require('./logger');
const { writeCsvResults } = require('./csv');

async function runIterations(opts) {
  const { url, maxIterations, browser, autoApprove, outDir } = opts;
  for (let i = 1; i <= maxIterations; i++) {
    console.log(`イテレーション ${i} を開始します (url=${url}, browser=${browser})`);
    const res = await sampleRun({ iteration: i, url, browser });

    // write JSON log
    const logName = `iteration_${i}_${Date.now()}.json`;
    const logPath = path.join(outDir, 'logs');
    if (!fs.existsSync(logPath)) fs.mkdirSync(logPath, { recursive: true });
    await writeJsonLog(path.join(logPath, logName), res);

    // write CSV summary
    const resultsPath = path.join(outDir, 'results');
    if (!fs.existsSync(resultsPath)) fs.mkdirSync(resultsPath, { recursive: true });
    await writeCsvResults(path.join(resultsPath, `test-results_${Date.now()}.csv`), res);

    console.log(`イテレーション ${i} 完了: tests=${res.tests_executed}, passed=${res.tests_passed}`);

    // simple stop condition
    if (res.untested_elements && res.untested_elements.length === 0) {
      console.log('未テスト箇所がありません。処理を終了します。');
      break;
    }

    if (!autoApprove) {
      // wait for user input
      const ans = await promptYesNo('次のイテレーションを実行しますか？ (y/n): ');
      if (!ans) {
        console.log('ユーザーにより中断されました。');
        break;
      }
    }
  }
}

function promptYesNo(message) {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data) => {
      const s = data.toString().trim().toLowerCase();
      resolve(s === 'y' || s === 'yes');
    });
  });
}

module.exports = { runIterations };
