/**
 * Othello ログ機能のテスト
 * 
 * テスト対象:
 * - logExecution()
 * - getExecutionHistory()
 * - clearExecutionHistory()
 * - ログファイル出力
 * - デバッグモード
 */

const Othello = require('../src/playwright-agent');
const fs = require('fs').promises;
const path = require('path');

describe('Othello - ログ機能', () => {
  let othello;
  let testLogFile;

  beforeEach(() => {
    // テスト用の設定
    const mockConfig = {
      config: {
        default_browser: 'chromium',
        timeout_seconds: 300,
        playwright_agent: {
          mock_mode: true // テストではモックモードを使用
        }
      },
      mcp: {
        serverCommand: 'npx',
        serverArgs: ['-y', '@playwright/mcp']
      }
    };

    testLogFile = path.join(__dirname, 'test-logs', `test-${Date.now()}.log`);

    othello = new Othello(mockConfig, {
      mockMode: true,
      logFile: testLogFile,
      debugMode: false
    });
  });

  afterEach(async () => {
    // テストログファイルを削除
    try {
      await fs.unlink(testLogFile);
    } catch (err) {
      // ファイルが存在しない場合は無視
    }

    // ログディレクトリを削除
    try {
      await fs.rmdir(path.join(__dirname, 'test-logs'));
    } catch (err) {
      // ディレクトリが空でない場合は無視
    }
  });

  describe('logExecution()', () => {
    test('ログエントリを executionHistory に追加する', async () => {
      await othello.logExecution('info', 'testAction', { test: 'data' });

      const history = othello.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        level: 'info',
        action: 'testAction',
        data: { test: 'data' }
      });
    });

    test('セッションIDがログエントリに含まれる', async () => {
      await othello.logExecution('info', 'testAction', {});

      const history = othello.getExecutionHistory();
      expect(history[0].sessionId).toBe(othello.sessionId);
      expect(history[0].sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    test('タイムスタンプがISO 8601形式である', async () => {
      await othello.logExecution('info', 'testAction', {});

      const history = othello.getExecutionHistory();
      expect(history[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('複数のログエントリを順番に記録する', async () => {
      await othello.logExecution('info', 'action1', { order: 1 });
      await othello.logExecution('warn', 'action2', { order: 2 });
      await othello.logExecution('error', 'action3', { order: 3 });

      const history = othello.getExecutionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].data.order).toBe(1);
      expect(history[1].data.order).toBe(2);
      expect(history[2].data.order).toBe(3);
    });

    test('ログファイルが指定されている場合、ファイルに出力する', async () => {
      // ディレクトリを作成
      await fs.mkdir(path.dirname(testLogFile), { recursive: true });

      await othello.logExecution('info', 'fileTest', { message: 'test' });

      // ファイルが存在することを確認
      const fileExists = await fs.access(testLogFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // ファイル内容を確認
      const content = await fs.readFile(testLogFile, 'utf-8');
      const logEntry = JSON.parse(content.trim());
      expect(logEntry.action).toBe('fileTest');
      expect(logEntry.data.message).toBe('test');
    });
  });

  describe('getExecutionHistory()', () => {
    beforeEach(async () => {
      // テストデータを準備
      await othello.logExecution('info', 'action1', { value: 'A' });
      await othello.logExecution('warn', 'action2', { value: 'B' });
      await othello.logExecution('error', 'action3', { value: 'C' });
      await othello.logExecution('info', 'action1', { value: 'D' });
    });

    test('フィルターなしで全履歴を取得する', () => {
      const history = othello.getExecutionHistory();
      expect(history).toHaveLength(4);
    });

    test('levelでフィルターする', () => {
      const infoLogs = othello.getExecutionHistory({ level: 'info' });
      expect(infoLogs).toHaveLength(2);
      expect(infoLogs.every(log => log.level === 'info')).toBe(true);

      const errorLogs = othello.getExecutionHistory({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
    });

    test('actionでフィルターする', () => {
      const action1Logs = othello.getExecutionHistory({ action: 'action1' });
      expect(action1Logs).toHaveLength(2);
      expect(action1Logs.every(log => log.action === 'action1')).toBe(true);
    });

    test('複数の条件でフィルターする', () => {
      const filtered = othello.getExecutionHistory({
        level: 'info',
        action: 'action1'
      });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(log => log.level === 'info' && log.action === 'action1')).toBe(true);
    });

    test('sinceでフィルターする（特定時刻以降のログ）', async () => {
      const midpoint = new Date().toISOString();
      
      // 短い待機
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await othello.logExecution('info', 'newAction', { value: 'E' });

      const recentLogs = othello.getExecutionHistory({ since: midpoint });
      expect(recentLogs.length).toBeGreaterThanOrEqual(1);
      expect(recentLogs[recentLogs.length - 1].data.value).toBe('E');
    });
  });

  describe('clearExecutionHistory()', () => {
    test('履歴をクリアする', async () => {
      await othello.logExecution('info', 'action1', {});
      await othello.logExecution('info', 'action2', {});
      expect(othello.getExecutionHistory()).toHaveLength(2);

      othello.clearExecutionHistory();
      expect(othello.getExecutionHistory()).toHaveLength(0);
    });
  });

  describe('デバッグモード', () => {
    test('エラーログにスタックトレースが含まれる', async () => {
      const debugOthello = new Othello({
        config: {
          default_browser: 'chromium',
          timeout_seconds: 300,
          playwright_agent: { mock_mode: true }
        },
        mcp: { serverCommand: 'npx', serverArgs: ['-y', '@playwright/mcp'] }
      }, {
        mockMode: true,
        debugMode: true
      });

      await debugOthello.logExecution('error', 'errorAction', { message: 'error' });

      const history = debugOthello.getExecutionHistory();
      expect(history[0].stackTrace).toBeDefined();
      expect(history[0].stackTrace).toContain('Error');
    });

    test('info/warnログにはスタックトレースが含まれない', async () => {
      const debugOthello = new Othello({
        config: {
          default_browser: 'chromium',
          timeout_seconds: 300,
          playwright_agent: { mock_mode: true }
        },
        mcp: { serverCommand: 'npx', serverArgs: ['-y', '@playwright/mcp'] }
      }, {
        mockMode: true,
        debugMode: true
      });

      await debugOthello.logExecution('info', 'infoAction', {});
      await debugOthello.logExecution('warn', 'warnAction', {});

      const history = debugOthello.getExecutionHistory();
      expect(history[0].stackTrace).toBeUndefined();
      expect(history[1].stackTrace).toBeUndefined();
    });
  });
});
