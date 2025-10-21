/**
 * Othello 永続化機能のテスト
 * 
 * テスト対象:
 * - saveExecutionHistory()
 * - loadExecutionHistory()
 */

const Othello = require('../src/playwright-agent');
const fs = require('fs').promises;
const path = require('path');

describe('Othello - 永続化機能', () => {
  let othello;
  let testHistoryFile;

  beforeEach(() => {
    const mockConfig = {
      config: {
        default_browser: 'chromium',
        timeout_seconds: 300,
        playwright_agent: {
          mock_mode: true
        }
      },
      mcp: {
        serverCommand: 'npx',
        serverArgs: ['-y', '@playwright/mcp']
      }
    };

    testHistoryFile = path.join(__dirname, 'test-history', `history-${Date.now()}.json`);

    othello = new Othello(mockConfig, {
      mockMode: true,
      debugMode: false
    });
  });

  afterEach(async () => {
    // テストファイルを削除
    try {
      await fs.unlink(testHistoryFile);
    } catch (err) {
      // ファイルが存在しない場合は無視
    }

    // テストディレクトリを削除
    try {
      await fs.rmdir(path.join(__dirname, 'test-history'));
    } catch (err) {
      // ディレクトリが空でない場合は無視
    }
  });

  describe('saveExecutionHistory()', () => {
    test('実行履歴をJSON形式でファイルに保存する', async () => {
      // ディレクトリを作成
      await fs.mkdir(path.dirname(testHistoryFile), { recursive: true });

      // テストデータを作成
      await othello.logExecution('info', 'action1', { value: 'A' });
      await othello.logExecution('info', 'action2', { value: 'B' });

      // 保存
      await othello.saveExecutionHistory(testHistoryFile);

      // ファイルが存在することを確認
      const fileExists = await fs.access(testHistoryFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // ファイル内容を確認
      const content = await fs.readFile(testHistoryFile, 'utf-8');
      const savedData = JSON.parse(content);

      expect(savedData.sessionId).toBe(othello.sessionId);
      expect(savedData.savedAt).toBeDefined();
      expect(savedData.totalEntries).toBe(2);
      expect(savedData.history).toHaveLength(2);
      expect(savedData.history[0].action).toBe('action1');
      expect(savedData.history[1].action).toBe('action2');
    });

    test('空の履歴も保存できる', async () => {
      await fs.mkdir(path.dirname(testHistoryFile), { recursive: true });

      await othello.saveExecutionHistory(testHistoryFile);

      const content = await fs.readFile(testHistoryFile, 'utf-8');
      const savedData = JSON.parse(content);

      expect(savedData.totalEntries).toBe(0);
      expect(savedData.history).toHaveLength(0);
    });

    test('保存時にエラーが発生した場合、エラーをthrowする', async () => {
      // 書き込み権限のないパス（Windowsでは'CON:'などの予約デバイス名）
      const invalidPath = 'CON:/invalid/history.json';

      await expect(othello.saveExecutionHistory(invalidPath))
        .rejects
        .toThrow();
    });
  });

  describe('loadExecutionHistory()', () => {
    test('ファイルから実行履歴を読み込む（置き換えモード）', async () => {
      await fs.mkdir(path.dirname(testHistoryFile), { recursive: true });

      // 履歴を作成して保存
      await othello.logExecution('info', 'original1', { value: 'X' });
      await othello.logExecution('info', 'original2', { value: 'Y' });
      await othello.saveExecutionHistory(testHistoryFile);

      // 新しいインスタンスを作成
      const othello2 = new Othello({
        config: {
          default_browser: 'chromium',
          timeout_seconds: 300,
          playwright_agent: { mock_mode: true }
        },
        mcp: { serverCommand: 'npx', serverArgs: ['-y', '@playwright/mcp'] }
      }, {
        mockMode: true
      });

      // いくつか履歴を追加
      await othello2.logExecution('info', 'new1', { value: 'A' });

      // 置き換えモードで読み込み
      const loadedData = await othello2.loadExecutionHistory(testHistoryFile, false);

      expect(loadedData.totalEntries).toBe(2);
      expect(loadedData.sessionId).toBe(othello.sessionId); // 元のセッションID

      // 現在の履歴を確認（置き換えられている）
      const currentHistory = othello2.getExecutionHistory();
      expect(currentHistory).toHaveLength(3); // 元の2件 + loadの記録1件
      expect(currentHistory[0].action).toBe('original1');
      expect(currentHistory[1].action).toBe('original2');
    });

    test('ファイルから実行履歴を読み込む（追加モード）', async () => {
      await fs.mkdir(path.dirname(testHistoryFile), { recursive: true });

      // 履歴を作成して保存
      await othello.logExecution('info', 'saved1', { value: 'X' });
      await othello.logExecution('info', 'saved2', { value: 'Y' });
      await othello.saveExecutionHistory(testHistoryFile);

      // 新しいインスタンスを作成
      const othello2 = new Othello({
        config: {
          default_browser: 'chromium',
          timeout_seconds: 300,
          playwright_agent: { mock_mode: true }
        },
        mcp: { serverCommand: 'npx', serverArgs: ['-y', '@playwright/mcp'] }
      }, {
        mockMode: true
      });

      // いくつか履歴を追加
      await othello2.logExecution('info', 'new1', { value: 'A' });
      await othello2.logExecution('info', 'new2', { value: 'B' });

      // 追加モードで読み込み
      const loadedData = await othello2.loadExecutionHistory(testHistoryFile, true);

      expect(loadedData.totalEntries).toBe(2);

      // 現在の履歴を確認（追加されている）
      const currentHistory = othello2.getExecutionHistory();
      expect(currentHistory).toHaveLength(5); // 新規2件 + 保存2件 + loadの記録1件
      expect(currentHistory[0].action).toBe('new1');
      expect(currentHistory[1].action).toBe('new2');
      expect(currentHistory[2].action).toBe('saved1');
      expect(currentHistory[3].action).toBe('saved2');
    });

    test('存在しないファイルを読み込もうとするとエラーをthrowする', async () => {
      const nonExistentFile = path.join(__dirname, 'non-existent.json');

      await expect(othello.loadExecutionHistory(nonExistentFile))
        .rejects
        .toThrow();
    });

    test('不正なJSONファイルを読み込もうとするとエラーをthrowする', async () => {
      await fs.mkdir(path.dirname(testHistoryFile), { recursive: true });
      await fs.writeFile(testHistoryFile, 'invalid json content', 'utf-8');

      await expect(othello.loadExecutionHistory(testHistoryFile))
        .rejects
        .toThrow();
    });
  });

  describe('セッションを跨いだ履歴管理', () => {
    test('複数セッションの履歴を結合できる', async () => {
      await fs.mkdir(path.dirname(testHistoryFile), { recursive: true });

      // セッション1
      const session1 = new Othello({
        config: {
          default_browser: 'chromium',
          timeout_seconds: 300,
          playwright_agent: { mock_mode: true }
        },
        mcp: { serverCommand: 'npx', serverArgs: ['-y', '@playwright/mcp'] }
      }, {
        mockMode: true
      });

      await session1.logExecution('info', 'session1-action1', {});
      await session1.logExecution('info', 'session1-action2', {});
      await session1.saveExecutionHistory(testHistoryFile);

      // セッション2
      const session2 = new Othello({
        config: {
          default_browser: 'chromium',
          timeout_seconds: 300,
          playwright_agent: { mock_mode: true }
        },
        mcp: { serverCommand: 'npx', serverArgs: ['-y', '@playwright/mcp'] }
      }, {
        mockMode: true
      });

      await session2.logExecution('info', 'session2-action1', {});
      await session2.loadExecutionHistory(testHistoryFile, true);

      const mergedHistory = session2.getExecutionHistory();
      
      // session2の新規1件 + session1の2件 + loadの記録1件 = 4件
      expect(mergedHistory.length).toBeGreaterThanOrEqual(3);

      // 異なるセッションIDが含まれていることを確認
      const sessionIds = new Set(mergedHistory.map(entry => entry.sessionId));
      expect(sessionIds.size).toBe(2); // 2つの異なるセッションID
    });
  });
});
