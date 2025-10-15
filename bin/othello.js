#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const { parseArgs } = require('../lib/args');
const { runIterations } = require('../lib/runner');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error('エラー: --url オプションが必要です');
    process.exit(1);
  }

  const outDir = path.resolve(args.output || './reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  await runIterations({
    url: args.url,
    maxIterations: args.maxIterations || 10,
    browser: args.browser || 'chromium',
    autoApprove: !!args.autoApprove,
    outDir
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
