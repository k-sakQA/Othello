/**
 * Othello エラーリカバリー機能のテスト（TDD）
 * 
 * テスト対象:
 * - 自動再試行（maxRetries）
 * - 指数バックオフ
 * - セッション再接続
 * - 失敗時のスナップショット自動保存
 */

const Othello = require('../src/playwright-agent');
const fs = require('fs').promises;
const path = require('path');

describe('Othello - エラーリカバリー機能（TDD）', () => {
  let othello;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
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
  });

  describe('自動再試行機能', () => {
    test('maxRetriesオプションでリトライ回数を設定できる', () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        maxRetries: 3
      });

      expect(othello.maxRetries).toBe(3);
    });

    test('maxRetriesのデフォルト値は0（リトライなし）', () => {
      othello = new Othello(mockConfig, {
        mockMode: true
      });

      expect(othello.maxRetries).toBe(0);
    });

    test('一時的なエラーが発生した場合、指定回数まで自動再試行する', async () => {
      let attemptCount = 0;
      
      othello = new Othello(mockConfig, {
        mockMode: true,
        maxRetries: 3
      });

      // モック関数：最初の2回は失敗、3回目で成功
      othello.simulateMockAction = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary network error');
        }
        return { success: true, data: 'Success on attempt 3' };
      };

      const result = await othello.executeWithRetry(() => othello.simulateMockAction());

      expect(attemptCount).toBe(3); // 3回試行
      expect(result.success).toBe(true);
      expect(result.data).toBe('Success on attempt 3');
    });

    test('最大リトライ回数を超えたらエラーをthrowする', async () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        maxRetries: 2
      });

      // 常に失敗するモック関数
      const alwaysFail = async () => {
        throw new Error('Persistent error');
      };

      await expect(othello.executeWithRetry(alwaysFail))
        .rejects
        .toThrow('Persistent error');
    });

    test('リトライ回数を実行履歴に記録する', async () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        maxRetries: 3,
        logFile: null
      });

      let attemptCount = 0;
      const retryableAction = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Retry needed');
        }
        return { success: true };
      };

      await othello.executeWithRetry(retryableAction, 'testAction');

      const history = othello.getExecutionHistory();
      const retryLog = history.find(entry => entry.action === 'executeWithRetry' && entry.level === 'info');
      
      expect(retryLog).toBeDefined();
      expect(retryLog.data).toBeDefined();
      expect(retryLog.data.attempts).toBe(2);
      expect(retryLog.data.maxRetries).toBe(3);
    });
  });

  describe('指数バックオフ', () => {
    test('リトライ時に待機時間が指数的に増加する', async () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        maxRetries: 3,
        retryDelay: 100, // 初期遅延: 100ms
        backoffMultiplier: 2 // 2倍ずつ増加
      });

      const timestamps = [];
      let attemptCount = 0;

      const action = async () => {
        timestamps.push(Date.now());
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Retry');
        }
        return { success: true };
      };

      await othello.executeWithRetry(action);

      // 待機時間を計算
      const delay1 = timestamps[1] - timestamps[0]; // 1回目の待機: 約100ms
      const delay2 = timestamps[2] - timestamps[1]; // 2回目の待機: 約200ms

      // 許容誤差: ±50ms
      expect(delay1).toBeGreaterThanOrEqual(50);
      expect(delay1).toBeLessThan(150);
      expect(delay2).toBeGreaterThanOrEqual(150);
      expect(delay2).toBeLessThan(250);
    });

    test('最大待機時間（maxRetryDelay）を超えない', async () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        maxRetries: 5,
        retryDelay: 100,
        backoffMultiplier: 2,
        maxRetryDelay: 500 // 最大500ms
      });

      const timestamps = [];
      let attemptCount = 0;

      const action = async () => {
        timestamps.push(Date.now());
        attemptCount++;
        if (attemptCount < 5) {
          throw new Error('Retry');
        }
        return { success: true };
      };

      await othello.executeWithRetry(action);

      // 4回目の待機（100 * 2^3 = 800ms → 500msに制限される）
      const delay4 = timestamps[4] - timestamps[3];
      expect(delay4).toBeLessThan(550); // 最大500ms + 許容誤差
    });
  });

  describe('セッション再接続', () => {
    test('autoReconnectオプションが設定できる', () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        autoReconnect: true
      });

      expect(othello.autoReconnect).toBe(true);
    });

    test('autoReconnectのデフォルト値はtrue', () => {
      othello = new Othello(mockConfig, {
        mockMode: true
      });

      expect(othello.autoReconnect).toBe(true);
    });

    test('セッション切断エラーを判定できる', () => {
      othello = new Othello(mockConfig, {
        mockMode: true
      });

      const disconnectError = new Error('Session closed');
      const normalError = new Error('Element not found');

      expect(othello.isSessionDisconnected(disconnectError)).toBe(true);
      expect(othello.isSessionDisconnected(normalError)).toBe(false);
    });
  });

  describe('失敗時のスナップショット自動保存', () => {
    let snapshotDir;

    beforeEach(() => {
      snapshotDir = path.join(__dirname, 'test-snapshots');
    });

    afterEach(async () => {
      // テストスナップショットを削除
      try {
        const files = await fs.readdir(snapshotDir);
        for (const file of files) {
          await fs.unlink(path.join(snapshotDir, file));
        }
        await fs.rmdir(snapshotDir);
      } catch (err) {
        // ディレクトリが存在しない場合は無視
      }
    });

    test('失敗時にスナップショットを自動保存する', async () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        saveSnapshotOnFailure: true,
        snapshotDir: snapshotDir
      });

      // 失敗をシミュレート
      try {
        await othello.executeInstruction({
          type: 'click',
          selector: '#nonexistent-element',
          description: 'Click non-existent element'
        });
      } catch (error) {
        // エラーは想定内
      }

      // スナップショットファイルが作成されているか確認
      const dirExists = await fs.access(snapshotDir)
        .then(() => true)
        .catch(() => false);
      
      expect(dirExists).toBe(true);
      
      const files = await fs.readdir(snapshotDir);
      const snapshotFiles = files.filter(f => f.endsWith('.json'));
      
      expect(snapshotFiles.length).toBeGreaterThan(0);

      // スナップショット内容を確認
      const snapshotContent = await fs.readFile(
        path.join(snapshotDir, snapshotFiles[0]),
        'utf-8'
      );
      const snapshot = JSON.parse(snapshotContent);

      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.error).toBeDefined();
      expect(snapshot.instruction).toMatchObject({
        type: 'click',
        selector: '#nonexistent-element'
      });
      expect(snapshot.sessionId).toBe(othello.sessionId);
    });

    test('成功時はスナップショットを保存しない', async () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        saveSnapshotOnFailure: true,
        snapshotDir: snapshotDir
      });

      // 成功するアクション
      await othello.executeInstruction({
        type: 'navigate',
        url: 'https://example.com',
        description: 'Navigate to example'
      });

      // スナップショットディレクトリが存在しないことを確認
      const dirExists = await fs.access(snapshotDir)
        .then(() => true)
        .catch(() => false);

      expect(dirExists).toBe(false);
    });

    test('スナップショット保存時にエラーが発生しても元のエラーを維持する', async () => {
      othello = new Othello(mockConfig, {
        mockMode: true,
        saveSnapshotOnFailure: true,
        snapshotDir: '/invalid/path/snapshots' // 無効なパス
      });

      // モックモードで失敗をシミュレート
      const result = await othello.executeInstruction({
        type: 'click',
        selector: '#nonexistent-element', // モックモードで失敗するセレクタ
        description: 'Test'
      });

      // モックモードでは失敗が返される
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('統合テスト: エラーリカバリー全体', () => {
    test('リトライ + バックオフ + スナップショット保存の連携', async () => {
      const snapshotDir = path.join(__dirname, 'test-snapshots-integration');
      
      othello = new Othello(mockConfig, {
        mockMode: true,
        maxRetries: 3,
        retryDelay: 50,
        backoffMultiplier: 2,
        saveSnapshotOnFailure: true,
        snapshotDir: snapshotDir
      });

      let attemptCount = 0;

      // モック: 3回失敗後に成功
      othello.executeInstruction = async function(instruction) {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Temporary failure (attempt ${attemptCount})`);
        }
        return {
          success: true,
          instruction: instruction.description,
          type: instruction.type
        };
      };

      const result = await othello.executeWithRetry(() =>
        othello.executeInstruction({
          type: 'click',
          selector: '#test-element'
        })
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);

      // クリーンアップ
      try {
        const files = await fs.readdir(snapshotDir);
        for (const file of files) {
          await fs.unlink(path.join(snapshotDir, file));
        }
        await fs.rmdir(snapshotDir);
      } catch (err) {
        // 無視
      }
    });
  });
});
