/**
 * Planner - Test Case ID Field Mapping Tests (TDD)
 * Plannerがcase_idをtest_case_idに変換し、Reporter/Orchestratorが期待する形式で出力することを検証
 */

const OthelloPlanner = require('../src/agents/othello-planner');

describe('Planner - Test Case ID Field Mapping (TDD)', () => {
  let planner;

  beforeEach(() => {
    // LLMのモック
    const mockLLM = {
      chat: jest.fn().mockResolvedValue({
        content: JSON.stringify([
          {
            aspect_no: 1,
            test_type: "表示（UI）",
            test_category: "レイアウト/文言",
            target_function: "予約フォーム",
            specifications: ["日付入力フィールド", "送信ボタン"],
            target_bugs: ["表示崩れ", "文言誤り"],
            priority: "P0",
            test_cases: [
              {
                case_id: "TC001",
                title: "予約フォームの表示テスト",
                steps: ["ページにアクセス", "フォームを確認"],
                expected_results: ["フォームが正しく表示される"]
              }
            ]
          }
        ])
      })
    };

    planner = new OthelloPlanner({
      llm: mockLLM,
      config: {}
    });
  });

  describe('extractTestCases() のフィールド名変換', () => {
    it('case_idをtest_case_idに変換する', () => {
      const mockAnalysis = [
        {
          aspect_no: 1,
          test_type: "表示（UI）",
          test_cases: [
            {
              case_id: "TC001",  // LLMからの出力
              title: "テスト1",
              steps: ["ステップ1"],
              expected_results: ["期待結果1"]
            }
          ]
        }
      ];

      const result = planner.extractTestCases(mockAnalysis);

      // test_case_idフィールドが存在する
      expect(result[0]).toHaveProperty('test_case_id');
      expect(result[0].test_case_id).toBe('TC001');
      
      // 【RED PHASE】現在はcase_idがそのまま残っており、test_case_idに変換されていない
    });

    it('titleをdescriptionに変換する（Reporterが期待する形式）', () => {
      const mockAnalysis = [
        {
          aspect_no: 1,
          test_type: "表示（UI）",
          test_cases: [
            {
              case_id: "TC001",
              title: "予約フォームの表示テスト",  // LLMからの出力
              steps: ["ステップ1"],
              expected_results: ["期待結果1"]
            }
          ]
        }
      ];

      const result = planner.extractTestCases(mockAnalysis);

      // descriptionフィールドが存在する
      expect(result[0]).toHaveProperty('description');
      expect(result[0].description).toBe('予約フォームの表示テスト');
      
      // 【RED PHASE】現在はtitleがそのまま残っており、descriptionに変換されていない
    });

    it('全ての必須フィールドが正しくマッピングされる', () => {
      const mockAnalysis = [
        {
          aspect_no: 2,
          test_type: "機能",
          test_cases: [
            {
              case_id: "TC002",
              title: "送信機能のテスト",
              steps: ["フォーム入力", "送信ボタンクリック"],
              expected_results: ["送信成功", "確認画面表示"]
            }
          ]
        }
      ];

      const result = planner.extractTestCases(mockAnalysis);

      // Orchestrator/Reporterが期待する形式
      expect(result[0]).toEqual(expect.objectContaining({
        test_case_id: 'TC002',
        description: '送信機能のテスト',
        steps: ['フォーム入力', '送信ボタンクリック'],
        expected_results: ['送信成功', '確認画面表示'],
        aspect_no: 2,
        test_type: '機能'
      }));
      
      // 【RED PHASE】現在はcase_idとtitleが残っており、期待する形式と異なる
    });

    it('複数のテストケースでも正しく変換される', () => {
      const mockAnalysis = [
        {
          aspect_no: 1,
          test_type: "表示（UI）",
          test_cases: [
            {
              case_id: "TC001",
              title: "テスト1",
              steps: ["ステップ1"],
              expected_results: ["期待結果1"]
            },
            {
              case_id: "TC002",
              title: "テスト2",
              steps: ["ステップ2"],
              expected_results: ["期待結果2"]
            }
          ]
        }
      ];

      const result = planner.extractTestCases(mockAnalysis);

      expect(result).toHaveLength(2);
      expect(result[0].test_case_id).toBe('TC001');
      expect(result[0].description).toBe('テスト1');
      expect(result[1].test_case_id).toBe('TC002');
      expect(result[1].description).toBe('テスト2');
      
      // 【RED PHASE】現在は変換されていない
    });
  });
});
