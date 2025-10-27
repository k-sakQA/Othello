/**
 * CSV パース テストスクリプト
 */

const path = require('path');
const fs = require('fs').promises;
const { parseCSV } = require('../src/utils/csv-parser');

async function testCSVParse() {
  const csvPath = path.resolve(__dirname, '../config/test-ViewpointList-simple.csv');
  const csvContent = await fs.readFile(csvPath, 'utf-8');
  
  console.log('📄 CSV ファイル読み込み\n');
  console.log('最初の200文字:');
  console.log(csvContent.substring(0, 200));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const rows = parseCSV(csvContent);
  
  console.log(`📊 パース結果: ${rows.length}行\n`);
  
  if (rows.length > 0) {
    console.log('【ヘッダー（1行目のキー）】');
    console.log(Object.keys(rows[0]));
    console.log('\n【最初の3行のデータ】');
    rows.slice(0, 3).forEach((row, index) => {
      console.log(`\n--- 行 ${index + 1} ---`);
      console.log(JSON.stringify(row, null, 2));
    });
  }
}

testCSVParse().catch(console.error);
