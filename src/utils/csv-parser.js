/**
 * CSV Parser Utility
 * 
 * シンプルなCSVパーサー（疎結合、依存なし）
 * t-wadaスタイル: 外部依存ゼロ、純粋関数、テスタビリティ重視
 * 
 * @module csv-parser
 */

/**
 * CSV文字列をオブジェクト配列にパースする
 * 
 * 特徴:
 * - ヘッダー行をキーとして使用
 * - クォート内のカンマを正しく処理
 * - 空白文字を自動トリム
 * - 空のCSVは空配列を返す
 * 
 * @param {string} csvContent - CSV文字列
 * @returns {Array<Object>} パース済みオブジェクト配列
 * 
 * @example
 * const csv = 'Name,Age\nAlice,30';
 * const result = parseCSV(csv);
 * // => [{ Name: 'Alice', Age: '30' }]
 */
function parseCSV(csvContent) {
  if (!csvContent || csvContent.trim() === '') {
    return [];
  }

  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return [];
  }

  // ヘッダー行を解析
  const headers = parseLine(lines[0]);
  
  if (lines.length === 1) {
    return []; // ヘッダーのみ
  }

  // データ行を解析
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    result.push(row);
  }

  return result;
}

/**
 * CSV行を値配列にパースする（クォート対応）
 * 
 * RFC 4180準拠:
 * - ダブルクォートで囲まれた値内のカンマを無視
 * - エスケープされたクォート（""）を処理
 * 
 * @private
 * @param {string} line - CSV行
 * @returns {Array<string>} 値配列
 */
function parseLine(line) {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // エスケープされたクォート
        currentValue += '"';
        i++; // 次の文字をスキップ
      } else {
        // クォートの開始/終了
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // カンマ区切り
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // 最後の値を追加
  values.push(currentValue.trim());

  return values;
}

/**
 * テスト観点リストCSVをパースする（ドメイン特化）
 * 
 * config/test-ViewpointList.csv形式に対応:
 * - No列を aspect_no に変換（数値）
 * - 日本語列名を英語プロパティに変換
 * - 無効なNo値は行番号で補完
 * 
 * @param {string} csvContent - テスト観点リストCSV文字列
 * @returns {Array<Object>} テスト観点オブジェクト配列
 * 
 * @example
 * const csv = 'No,品質特性,テストタイプ中分類,テストタイプ小分類,テスト観点\n1,-,表示（UI）,レイアウト,配置は？';
 * const aspects = parseTestViewpoints(csv);
 * // => [{ aspect_no: 1, quality_characteristic: '-', test_type_major: '表示（UI）', ... }]
 */
function parseTestViewpoints(csvContent) {
  const rows = parseCSV(csvContent);

  return rows.map((row, index) => {
    const aspectNo = parseInt(row['No'], 10);
    
    return {
      aspect_no: isNaN(aspectNo) ? index + 1 : aspectNo,
      quality_characteristic: row['品質特性'] || '',
      test_type_major: row['テストタイプ中分類'] || '',
      test_type_minor: row['テストタイプ小分類'] || '',
      test_aspect: row['テスト観点'] || ''
    };
  });
}

module.exports = {
  parseCSV,
  parseTestViewpoints
};
