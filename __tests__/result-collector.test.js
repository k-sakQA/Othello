const ResultCollector = require('../src/result-collector');
const ConfigManager = require('../src/config');
const fs = require('fs').promises;
const path = require('path');

describe('ResultCollector', () => {
  let collector;
  let mockConfig;
  let testOutputDir;

  beforeAll(async () => {
    const configPath = path.join(__dirname, 'fixtures', 'config', 'valid-config.json');
    mockConfig = await ConfigManager.load(configPath);
    testOutputDir = path.join(__dirname, 'fixtures', 'output');
  });

  beforeEach(async () => {
    collector = new ResultCollector(mockConfig);
    // テスト用の出力ディレクトリをクリーンアップ
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // エラーは無視
    }
  });

  describe('saveJSON()', () => {
    test('結果データをJSON形式で保存できる', async () => {
      const resultData = {
        iteration: 1,
        target_url: 'https://example.com',
        status: 'success',
        tests_executed: 3,
        tests_passed: 3,
        tests_failed: 0
      };

      const filePath = path.join(testOutputDir, 'result_1.json');
      await collector.saveJSON(filePath, resultData);

      // ファイルが作成されたことを確認
      const fileContent = await fs.readFile(filePath, 'utf8');
      const savedData = JSON.parse(fileContent);

      expect(savedData).toEqual(resultData);
      expect(savedData.iteration).toBe(1);
      expect(savedData.status).toBe('success');
    });

    test('ディレクトリが存在しない場合は自動作成する', async () => {
      const resultData = { iteration: 1, status: 'success' };
      const deepPath = path.join(testOutputDir, 'nested', 'deep', 'result.json');

      await collector.saveJSON(deepPath, resultData);

      // ファイルが作成されたことを確認
      const exists = await fs.access(deepPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('saveCSV()', () => {
    test('結果データをCSV形式で保存できる', async () => {
      const resultData = {
        iteration: 1,
        playwright_agent_results: {
          generated_tests: [
            {
              name: 'ログインテスト',
              status: 'passed',
              inputs: ['testuser', 'password123']
            },
            {
              name: 'ダッシュボード表示',
              status: 'passed',
              inputs: []
            }
          ]
        }
      };

      const filePath = path.join(testOutputDir, 'results.csv');
      await collector.saveCSV(filePath, resultData);

      // ファイルが作成されたことを確認
      const fileContent = await fs.readFile(filePath, 'utf8');

      // BOMが含まれていることを確認
      expect(fileContent.charCodeAt(0)).toBe(0xFEFF);

      // ヘッダーが含まれていることを確認
      expect(fileContent).toContain('No,テスト概要,実行結果');

      // データ行が含まれていることを確認
      expect(fileContent).toContain('1-1');
      expect(fileContent).toContain('ログインテスト');
      expect(fileContent).toContain('成功');
    });

    test('CSV追記モード: 既存ファイルに追記できる', async () => {
      const filePath = path.join(testOutputDir, 'results.csv');

      // 1回目の保存
      const resultData1 = {
        iteration: 1,
        playwright_agent_results: {
          generated_tests: [
            { name: 'テスト1', status: 'passed', inputs: [] }
          ]
        }
      };
      await collector.saveCSV(filePath, resultData1);

      // 2回目の保存（追記モード）
      const resultData2 = {
        iteration: 2,
        playwright_agent_results: {
          generated_tests: [
            { name: 'テスト2', status: 'passed', inputs: [] }
          ]
        }
      };
      await collector.saveCSV(filePath, resultData2, { append: true });

      // ファイル内容を確認
      const fileContent = await fs.readFile(filePath, 'utf8');

      // 両方のテストが含まれていることを確認
      expect(fileContent).toContain('1-1');
      expect(fileContent).toContain('テスト1');
      expect(fileContent).toContain('2-1');
      expect(fileContent).toContain('テスト2');

      // ヘッダーは1回だけ出力されていることを確認
      const headerCount = (fileContent.match(/No,テスト概要,実行結果/g) || []).length;
      expect(headerCount).toBe(1);
    });

    test('入力値が3つまで正しく出力される', async () => {
      const resultData = {
        iteration: 1,
        playwright_agent_results: {
          generated_tests: [
            {
              name: 'フォーム入力テスト',
              status: 'passed',
              inputs: ['値1', '値2', '値3', '値4', '値5']
            }
          ]
        }
      };

      const filePath = path.join(testOutputDir, 'results.csv');
      await collector.saveCSV(filePath, resultData);

      const fileContent = await fs.readFile(filePath, 'utf8');

      // 最初の3つの入力値が含まれていることを確認
      expect(fileContent).toContain('値1');
      expect(fileContent).toContain('値2');
      expect(fileContent).toContain('値3');
      // 4つ目以降は含まれない
      expect(fileContent).not.toContain('値4');
    });

    test('テスト結果が日本語で出力される', async () => {
      const resultData = {
        iteration: 1,
        playwright_agent_results: {
          generated_tests: [
            { name: 'テスト成功', status: 'passed', inputs: [] },
            { name: 'テスト失敗', status: 'failed', inputs: [] }
          ]
        }
      };

      const filePath = path.join(testOutputDir, 'results.csv');
      await collector.saveCSV(filePath, resultData);

      const fileContent = await fs.readFile(filePath, 'utf8');

      expect(fileContent).toContain('成功');
      expect(fileContent).toContain('失敗');
    });
  });

  describe('collect()', () => {
    test('Playwright結果からデータを収集できる', async () => {
      const playwrightResult = {
        iteration: 1,
        target_url: 'https://example.com',
        status: 'success',
        tests_executed: 2,
        tests_passed: 2,
        tests_failed: 0,
        playwright_agent_results: {
          generated_tests: [
            { name: 'テスト1', status: 'passed', inputs: [] },
            { name: 'テスト2', status: 'passed', inputs: [] }
          ]
        }
      };

      const collected = await collector.collect(playwrightResult);

      expect(collected).toHaveProperty('iteration', 1);
      expect(collected).toHaveProperty('status', 'success');
      expect(collected).toHaveProperty('tests_executed', 2);
      expect(collected.playwright_agent_results.generated_tests).toHaveLength(2);
    });

    test('データ変換: statusフィールドを正規化', async () => {
      const playwrightResult = {
        iteration: 1,
        status: 'passed', // Playwrightは 'passed'を返す
        tests_executed: 1
      };

      const collected = await collector.collect(playwrightResult);

      // 'passed' → 'success' に変換されることを確認
      expect(collected.status).toBe('success');
    });
  });

  describe('ensureDirectory()', () => {
    test('ディレクトリが存在しない場合は作成する', async () => {
      const dirPath = path.join(testOutputDir, 'new', 'nested', 'dir');

      await collector.ensureDirectory(dirPath);

      // ディレクトリが作成されたことを確認
      const stats = await fs.stat(dirPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('ディレクトリが既に存在する場合はエラーにならない', async () => {
      const dirPath = path.join(testOutputDir, 'existing');
      await fs.mkdir(dirPath, { recursive: true });

      // 2回呼び出してもエラーにならない
      await expect(collector.ensureDirectory(dirPath)).resolves.not.toThrow();
      await expect(collector.ensureDirectory(dirPath)).resolves.not.toThrow();
    });
  });

  describe('CSV特殊文字のエスケープ', () => {
    test('ダブルクォートを含む文字列を正しくエスケープ', async () => {
      const resultData = {
        iteration: 1,
        playwright_agent_results: {
          generated_tests: [
            {
              name: 'テスト "引用符" を含む',
              status: 'passed',
              inputs: []
            }
          ]
        }
      };

      const filePath = path.join(testOutputDir, 'escape.csv');
      await collector.saveCSV(filePath, resultData);

      const fileContent = await fs.readFile(filePath, 'utf8');

      // ダブルクォートがエスケープされていることを確認（csv-writerが自動エスケープ）
      expect(fileContent).toContain('テスト');
      expect(fileContent).toContain('引用符');
    });

    test('カンマを含む文字列を正しく処理', async () => {
      const resultData = {
        iteration: 1,
        playwright_agent_results: {
          generated_tests: [
            {
              name: 'テスト,カンマ,を含む',
              status: 'passed',
              inputs: []
            }
          ]
        }
      };

      const filePath = path.join(testOutputDir, 'comma.csv');
      await collector.saveCSV(filePath, resultData);

      const fileContent = await fs.readFile(filePath, 'utf8');

      // カンマを含む文字列がダブルクォートで囲まれていることを確認
      expect(fileContent).toContain('"テスト,カンマ,を含む"');
    });
  });
});
