const { parseCSV, parseTestViewpoints } = require('../../src/utils/csv-parser');

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV with headers', () => {
      const csv = `Name,Age,City
Alice,30,Tokyo
Bob,25,Osaka`;

      const result = parseCSV(csv);

      expect(result).toEqual([
        { Name: 'Alice', Age: '30', City: 'Tokyo' },
        { Name: 'Bob', Age: '25', City: 'Osaka' }
      ]);
    });

    it('should handle empty CSV', () => {
      const csv = '';
      const result = parseCSV(csv);
      expect(result).toEqual([]);
    });

    it('should handle CSV with only headers', () => {
      const csv = 'Name,Age,City';
      const result = parseCSV(csv);
      expect(result).toEqual([]);
    });

    it('should handle CSV with quoted values', () => {
      const csv = `Name,Description
"Alice","Hello, World"
"Bob","Test"`;

      const result = parseCSV(csv);

      expect(result).toEqual([
        { Name: 'Alice', Description: 'Hello, World' },
        { Name: 'Bob', Description: 'Test' }
      ]);
    });

    it('should trim whitespace from values', () => {
      const csv = `Name , Age , City
 Alice , 30 , Tokyo `;

      const result = parseCSV(csv);

      expect(result).toEqual([
        { Name: 'Alice', Age: '30', City: 'Tokyo' }
      ]);
    });

    it('should handle multiline CSV', () => {
      const csv = `A,B\nC,D\nE,F`;
      const result = parseCSV(csv);

      expect(result).toEqual([
        { A: 'C', B: 'D' },
        { A: 'E', B: 'F' }
      ]);
    });
  });

  describe('parseTestViewpoints', () => {
    it('should parse test viewpoint list CSV', () => {
      const csv = `No,品質特性,テストタイプ中分類,テストタイプ小分類,テスト観点
1,-,表示（UI）,レイアウト/文言,アイテムの配置/表示サイズは？
2,-,表示（UI）,エラー表示（正常系）,エラーメッセージはある？`;

      const result = parseTestViewpoints(csv);

      expect(result).toEqual([
        {
          aspect_no: 1,
          quality_characteristic: '-',
          test_type_major: '表示（UI）',
          test_type_minor: 'レイアウト/文言',
          test_aspect: 'アイテムの配置/表示サイズは？'
        },
        {
          aspect_no: 2,
          quality_characteristic: '-',
          test_type_major: '表示（UI）',
          test_type_minor: 'エラー表示（正常系）',
          test_aspect: 'エラーメッセージはある？'
        }
      ]);
    });

    it('should handle invalid aspect numbers', () => {
      const csv = `No,品質特性,テストタイプ中分類,テストタイプ小分類,テスト観点
invalid,-,表示（UI）,レイアウト,テスト`;

      const result = parseTestViewpoints(csv);

      expect(result[0].aspect_no).toBe(1); // フォールバックでindex+1
    });

    it('should handle missing columns', () => {
      const csv = `No,品質特性
1,-`;

      const result = parseTestViewpoints(csv);

      expect(result).toEqual([
        {
          aspect_no: 1,
          quality_characteristic: '-',
          test_type_major: '',
          test_type_minor: '',
          test_aspect: ''
        }
      ]);
    });

    it('should handle empty CSV', () => {
      const csv = '';
      const result = parseTestViewpoints(csv);
      expect(result).toEqual([]);
    });
  });
});
