/**
 * Orchestrator 対話機能のテスト (TDD)
 */

const Orchestrator = require('../src/orchestrator');
const Analyzer = require('../src/analyzer');

describe('Orchestrator - 対話機能', () => {
  let orchestrator;
  
  beforeEach(() => {
    orchestrator = new Orchestrator({
      url: 'https://example.com',
      maxIterations: 5,
      coverageTarget: 80,
      interactive: true // 対話モード有効
    });
  });

  describe('showRecommendations', () => {
    test('推奨テストを表示できる', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        },
        {
          priority: 'High',
          title: '観点2のテスト',
          reason: '未カバー観点: 観点2',
          aspectId: 2
        }
      ];

      // showRecommendationsメソッドが存在することを確認
      expect(typeof orchestrator.showRecommendations).toBe('function');
      
      // 推奨テストを表示（実際には出力のみ）
      const result = await orchestrator.showRecommendations(recommendations);
      
      // 何も返さないか、voidを返す
      expect(result).toBeUndefined();
    });

    test('推奨テストが空の場合、メッセージを表示', async () => {
      const recommendations = [];
      
      const result = await orchestrator.showRecommendations(recommendations);
      expect(result).toBeUndefined();
    });
  });

  describe('promptUser', () => {
    test('ユーザー入力を受け付ける', async () => {
      // モック入力を設定
      const mockInput = '1';
      orchestrator._mockUserInput = mockInput;
      
      expect(typeof orchestrator.promptUser).toBe('function');
      
      const input = await orchestrator.promptUser('番号を選択してください: ');
      expect(input).toBe(mockInput);
    });

    test('Enterキーを受け付ける', async () => {
      orchestrator._mockUserInput = '';
      
      const input = await orchestrator.promptUser('番号を選択してください: ');
      expect(input).toBe('');
    });
  });

  describe('handleUserSelection', () => {
    test('番号選択時、該当する推奨テストを返す', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        },
        {
          priority: 'High',
          title: '観点2のテスト',
          reason: '未カバー観点: 観点2',
          aspectId: 2
        }
      ];

      expect(typeof orchestrator.handleUserSelection).toBe('function');
      
      const result = await orchestrator.handleUserSelection('1', recommendations);
      
      expect(result).toEqual({
        type: 'specific',
        recommendation: recommendations[0]
      });
    });

    test('0を選択時、終了を返す', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        }
      ];
      
      const result = await orchestrator.handleUserSelection('0', recommendations);
      
      expect(result).toEqual({ type: 'exit' });
    });

    test('Enterキー時、続行を返す', async () => {
      const recommendations = [];
      
      const result = await orchestrator.handleUserSelection('', recommendations);
      
      expect(result).toEqual({ type: 'continue' });
    });

    test('無効な番号時、nullを返す', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        }
      ];
      
      const result = await orchestrator.handleUserSelection('99', recommendations);
      
      expect(result).toBeNull();
    });
  });

  describe('waitForUserAction', () => {
    test('推奨テストを表示してユーザー入力を待つ', async () => {
      const recommendations = [
        {
          priority: 'High',
          title: '観点1のテスト',
          reason: '未カバー観点: 観点1',
          aspectId: 1
        }
      ];

      // モック入力
      orchestrator._mockUserInput = '1';
      
      expect(typeof orchestrator.waitForUserAction).toBe('function');
      
      const result = await orchestrator.waitForUserAction(recommendations);
      
      expect(result).toEqual({
        type: 'specific',
        recommendation: recommendations[0]
      });
    });
  });
});
