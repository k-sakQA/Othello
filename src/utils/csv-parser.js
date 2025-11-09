/**
 * CSV Parser Utility
 * 
 * シンプルなCSVパーサー（疎結合、依存なし）
 * t-wadaスタイル: 外部依存ゼロ、純粋関数、テスタビリティ重視
 * 
 * @module csv-parser
 */

/**
 * CSV文字列をオブジェクト配列にパースする（RFC 4180対応）
 * 
 * 特徴:
 * - ヘッダー行をキーとして使用
 * - クォート内のカンマ・改行を正しく処理
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
  if (!csvContent) {
    return [];
  }

  const normalized = csvContent.replace(/^\uFEFF/, '');
  if (normalized.trim() === '') {
    return [];
  }

  const rows = tokenizeCSV(normalized);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  if (rows.length === 1) {
    return []; // ヘッダーのみ
  }

  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.every(value => value === '')) {
      continue; // 空行は無視
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    result.push(row);
  }

  return result;
}

/**
 * CSV全体をRFC 4180準拠でトークン化する
 * 
 * @private
 * @param {string} content - 正規化済みCSV文字列
 * @returns {Array<Array<string>>} 行列
 */
function tokenizeCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // エスケープされたクォートをスキップ
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = '';

      if (currentRow.length && !currentRow.every(value => value === '')) {
        rows.push(currentRow);
      }
      currentRow = [];

      if (char === '\r' && nextChar === '\n') {
        i++; // CRLFの\nをスキップ
      }
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
  }
  if (currentRow.length && !currentRow.every(value => value === '')) {
    rows.push(currentRow);
  }

  return rows;
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
