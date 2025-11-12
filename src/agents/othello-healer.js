/**
 * @file Othello-Healer
 * @description 失敗したテストケースを分析し、自動修復するエージェント（Phase 9版）
 */

class OthelloHealer {
  constructor({ llm, config }) {
    this.llm = llm;
    this.config = config || {};
  }

  /**
   * 失敗したテストケースを分析
   * @param {Object} failureData - 失敗情報
   * @param {string} failureData.test_case_id - テストケースID
   * @param {Array} failureData.instructions - 実行した命令
   * @param {Object} failureData.error - エラー情報
   * @param {Object} failureData.snapshot - 失敗時のSnapshot
   * @returns {Object} 分析結果
   */
  async analyze(failureData) {
    // バリデーション
    if (!failureData.test_case_id) {
      throw new Error('test_case_id is required');
    }
    if (!failureData.instructions || !Array.isArray(failureData.instructions)) {
      throw new Error('instructions is required and must be an array');
    }
    if (!failureData.error) {
      throw new Error('error is required');
    }

    // プロンプト構築
    const prompt = this.buildAnalysisPrompt(failureData);

    // LLMで分析
    const response = await this.llm.chat({
      messages: [
        {
          role: 'system',
          content: 'あなたはテスト自動化とデバッグの専門家です。失敗したテストを分析し、バグかテストスクリプトの問題かを判定してください。'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // より決定的な判定
      maxTokens: 2000
    });

    // レスポンス解析
    const analysis = this.parseAnalysisResponse(response.content);

    return analysis;
  }

  /**
   * 失敗したテストケースを修復
   * @param {Object} failureData - 失敗情報
   * @returns {Object} 修復結果
   */
  async heal(failureData) {
    // まずヒューリスティックで解決可能か確認
    const heuristicResult = this.applyHeuristicRules(failureData);
    if (heuristicResult) {
      const fixedInstructions = this.applyFix(
        failureData.instructions,
        heuristicResult.fix
      );

      const changes = this.extractChanges(
        failureData.instructions,
        fixedInstructions,
        heuristicResult.fix
      );

      return {
        success: true,
        is_bug: false,
        fixed_instructions: fixedInstructions,
        changes,
        root_cause: heuristicResult.root_cause,
        confidence: heuristicResult.confidence || 0.7,
        heuristic_rule: heuristicResult.rule
      };
    }

    // まず分析
    const analysis = await this.analyze(failureData);

    // バグの場合は修復せずにバグレポートを返す
    if (analysis.is_bug) {
      return {
        success: false,
        is_bug: true,
        bug_report: analysis.bug_report,
        root_cause: analysis.root_cause
      };
    }

    // テストスクリプトの問題の場合は修正を適用
    const fixedInstructions = this.applyFix(
      failureData.instructions,
      analysis.suggested_fix
    );

    // 変更内容を記録
    const changes = this.extractChanges(
      failureData.instructions,
      fixedInstructions,
      analysis.suggested_fix
    );

    return {
      success: true,
      is_bug: false,
      fixed_instructions: fixedInstructions,
      changes,
      root_cause: analysis.root_cause,
      confidence: analysis.confidence
    };
  }

  /**
   * 分析用プロンプトを構築
   * @param {Object} failureData - 失敗情報
   * @returns {string} プロンプト
   */
  buildAnalysisPrompt(failureData) {
    const instructionsText = failureData.instructions
      .map((inst, i) => `${i + 1}. [${inst.type}] ${inst.description || 'N/A'}\n   selector: ${inst.selector || inst.ref || 'N/A'}\n   value: ${inst.value || 'N/A'}`)
      .join('\n');

    const snapshotText = this.formatSnapshotForPrompt(failureData.snapshot);

    return `あなたはWeb E2Eテスト自動化の専門家です。失敗したテストケースを分析し、根本原因を特定してください。

【一般的なE2Eテストエラーパターン】
1. **UI干渉エラー** ("intercepts pointer events", "not clickable")
   - 原因: モーダル、ドロップダウン、オーバーレイ、ツールチップなどが要素を覆っている
   - 解決: 干渉要素を閉じる操作を挿入（Escape、背景クリック、×ボタン）

2. **タイミングエラー** ("timeout", "detached", "not visible")
   - 原因: 非同期処理、アニメーション、動的DOM更新
   - 解決: 適切な待機を挿入、または要素が安定するまで待つ

3. **セレクタエラー** ("not found", "multiple elements")
   - 原因: セレクタが不正確、要素のIDやクラスが変更された
   - 解決: Snapshotから正しいref/selectorを特定して更新

4. **スクロールエラー** ("not in viewport")
   - 原因: 要素が表示範囲外
   - 解決: スクロール操作を挿入

5. **状態エラー** ("disabled", "readonly")
   - 原因: フォームバリデーション、依存フィールド未入力
   - 解決: 前提条件となる操作を挿入

【テストケースID】
${failureData.test_case_id}

【実行した命令】
${instructionsText}

【エラー情報】
メッセージ: ${failureData.error.message || 'N/A'}
スタック: ${failureData.error.stack || 'N/A'}

【失敗時のページSnapshot】
${snapshotText}

【タスク】
上記のエラーパターンを参考に、以下を判定してください：

1. **is_bug**: これは実際のバグか、テストスクリプトの問題か
   - true: アプリケーションのバグ
   - false: テストスクリプトの問題（セレクタミス、タイミング問題など）

2. **root_cause**: 失敗の根本原因

3. **suggested_fix**: テストスクリプトの問題の場合、修正方法
   以下のいずれか：
   - update_selector: セレクタを更新
   - update_multiple: 複数の命令を更新
   - add_ref: ref を追加
   - remove_instruction: 命令を削除
   - insert_instruction: 命令を挿入（例: datepickerを閉じる、待機を追加）
   - add_wait: 待機を追加
   
   **一般的なUI干渉パターンの検出と修正**
   以下のようなエラーの場合、UI要素が邪魔している可能性：
   - "intercepts pointer events" → オーバーレイ、モーダル、ドロップダウンなどが要素を覆っている
   - "not visible" → スクロールが必要、または他の要素に隠されている
   - "detached from document" → 動的DOM更新でタイミング問題
   
   修正アプローチ（ケースバイケースでLLMが判断）：
   - オーバーレイの場合: Escapeキー、背景クリック、明示的な閉じる操作
   - スクロールの場合: スクロール操作を挿入
   - タイミングの場合: 適切な待機を挿入
   - DOMの場合: セレクタを更新、または要素が安定するまで待機
   
   **重要: 命令フォーマット**
   新しい命令を挿入/追加する場合、以下の形式を厳守してください：
   - type: 命令タイプ（click, type, wait等）
   - ref: Snapshotから取得した要素のref（例: e16, e35）※refがない場合はtype='wait'を使用
   - description: 命令の説明
   
   Snapshotで要素を探す方法：
   - "- button \"ログイン\":" → このbuttonのrefは次の行の"ref: eXX"を確認
   - "- textbox \"メールアドレス\":" → このtextboxのrefを確認
   - 背景クリックなど、特定の要素がない場合は wait 命令を使用

4. **bug_report**: バグの場合、バグレポート

【出力形式】
JSON形式で出力してください：

\`\`\`json
{
  "is_bug": false,
  "bug_type": null,
  "root_cause": "セレクタが間違っている。実際の要素は...",
  "suggested_fix": {
    "type": "update_selector",
    "instruction_index": 0,
    "old_selector": "button#submit",
    "new_selector": "button[type='submit']",
    "ref": "e1"
  },
  "confidence": 0.95
}
\`\`\`

または（バグの場合）：

\`\`\`json
{
  "is_bug": true,
  "bug_type": "validation_error",
  "root_cause": "アプリケーションが有効な入力を拒否している",
  "suggested_fix": null,
  "confidence": 0.98,
  "bug_report": {
    "title": "Valid input rejected",
    "severity": "high",
    "steps_to_reproduce": ["...", "..."],
    "expected": "...",
    "actual": "..."
  }
}
\`\`\`

または（UI干渉問題の場合の例 - waitを使用）：

\`\`\`json
{
  "is_bug": false,
  "bug_type": null,
  "root_cause": "datepickerが開いたままで背後の要素がクリックできない",
  "suggested_fix": {
    "type": "insert_instruction",
    "instruction_index": 2,
    "new_instruction": {
      "type": "wait",
      "duration": 1000,
      "description": "datepickerが消えるまで待機（自動的に閉じるまで）"
    }
  },
  "confidence": 0.90
}
\`\`\`

または（UI干渉問題の場合の例 - Escapeキーを使用）：

\`\`\`json
{
  "is_bug": false,
  "bug_type": null,
  "root_cause": "モーダルダイアログが開いたままで背後の要素がクリックできない",
  "suggested_fix": {
    "type": "insert_instruction",
    "instruction_index": 2,
    "new_instruction": {
      "type": "press_key",
      "key": "Escape",
      "description": "Escapeキーでモーダルを閉じる"
    }
  },
  "confidence": 0.90
}
\`\`\`

または（タイミング問題の場合の例）：

\`\`\`json
{
  "is_bug": false,
  "bug_type": null,
  "root_cause": "非同期処理中で要素がまだ表示されていない",
  "suggested_fix": {
    "type": "add_wait",
    "instruction_index": 3,
    "wait_time": 2,
    "description": "要素が表示されるまで待機"
  },
  "confidence": 0.85
}
\`\`\`

または（セレクタ問題の場合の例）：

\`\`\`json
{
  "is_bug": false,
  "bug_type": null,
  "root_cause": "要素のrefが間違っている。Snapshotによると正しいrefはe48",
  "suggested_fix": {
    "type": "update_selector",
    "instruction_index": 1,
    "old_selector": "input[name='name']",
    "new_selector": "textbox",
    "ref": "e48"
  },
  "confidence": 0.95
}
\`\`\`

注意事項：
- Snapshotを参照して、実際の要素構造を確認してください
- ref が利用可能な場合は優先してください
- セレクタの信頼性を考慮してください（ref > data-testid > role/name > CSS）
`;
  }

  /**
   * ルールベースの修復を試みる
   * @param {Object} failureData
   * @returns {Object|null}
   */
  applyHeuristicRules(failureData) {
    const rules = [this.replaceFillOnSelectRule.bind(this)];

    for (const rule of rules) {
      const result = rule(failureData);
      if (result) {
        return result;
      }
    }

    return null;
  }

  /**
   * selectタグにfillを使っている場合の修復ルール
   * @param {Object} failureData
   * @returns {Object|null}
   */
  replaceFillOnSelectRule(failureData) {
    if (!failureData || !Array.isArray(failureData.instructions) || !failureData.error) {
      return null;
    }

    const message = (failureData.error.message || '').toLowerCase();
    const notInputOrTextarea = message.includes('element is not an <input') || message.includes('textarea');
    const containsSelectTag = message.includes('<select') || message.includes('&lt;select');
    const locatorFillError = message.includes('locator.fill');

    if (!(notInputOrTextarea && containsSelectTag && locatorFillError)) {
      return null;
    }

    const targetIndex =
      failureData.error.instruction_index !== undefined
        ? failureData.error.instruction_index
        : failureData.instructions.findIndex(inst => inst.type === 'fill');

    if (targetIndex === -1) {
      return null;
    }

    const targetInstruction = failureData.instructions[targetIndex];
    if (!targetInstruction || targetInstruction.type !== 'fill') {
      return null;
    }

    const optionValue = targetInstruction.value || targetInstruction.text;
    if (!optionValue) {
      return null;
    }

    return {
      rule: 'select_fill_to_select_option',
      root_cause: 'select要素にfillを使用していたためPlaywrightが失敗しました。selectOptionに切り替える必要があります。',
      confidence: 0.75,
      fix: {
        type: 'convert_select_fill',
        instruction_index: targetIndex,
        values: Array.isArray(optionValue) ? optionValue : [optionValue],
        selector: targetInstruction.selector,
        ref: targetInstruction.ref
      }
    };
  }

  /**
   * LLMレスポンスを解析
   * @param {string} content - LLMレスポンス
   * @returns {Object} 解析結果
   */
  parseAnalysisResponse(content) {
    // Markdownコードブロックから抽出
    const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (error) {
        throw new Error(`Failed to parse LLM response (code block): ${error.message}`);
      }
    }

    // 直接JSONをパース
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error.message}`);
    }
  }

  /**
   * 修正を適用
   * @param {Array} instructions - 元の命令配列
   * @param {Object} fix - 修正情報
   * @returns {Array} 修正後の命令配列
   */
  applyFix(instructions, fix) {
    if (!fix) {
      return instructions;
    }

    // ディープコピー
    const updated = JSON.parse(JSON.stringify(instructions));

    switch (fix.type) {
      case 'update_selector':
        if (fix.instruction_index !== undefined) {
          updated[fix.instruction_index].selector = fix.new_selector;
          if (fix.ref) {
            updated[fix.instruction_index].ref = fix.ref;
          }
        }
        break;

      case 'update_multiple':
        if (fix.changes && Array.isArray(fix.changes)) {
          for (const change of fix.changes) {
            if (change.instruction_index !== undefined) {
              if (change.new_selector) {
                updated[change.instruction_index].selector = change.new_selector;
              }
              if (change.new_ref) {
                updated[change.instruction_index].ref = change.new_ref;
              }
              if (change.new_value) {
                updated[change.instruction_index].value = change.new_value;
              }
            }
          }
        }
        break;

      case 'add_ref':
        if (fix.instruction_index !== undefined && fix.ref) {
          updated[fix.instruction_index].ref = fix.ref;
        }
        break;

      case 'remove_instruction':
        if (fix.instruction_index !== undefined) {
          updated.splice(fix.instruction_index, 1);
        }
        break;

      case 'insert_instruction':
        if (fix.instruction_index !== undefined && fix.new_instruction) {
          updated.splice(fix.instruction_index, 0, fix.new_instruction);
        }
        break;

      case 'add_wait':
        if (fix.instruction_index !== undefined) {
          const waitInstruction = {
            type: 'wait_for',
            time: fix.wait_time || 1,
            description: fix.description || '待機を追加'
          };
          updated.splice(fix.instruction_index, 0, waitInstruction);
        }
        break;

      case 'convert_select_fill':
        if (fix.instruction_index !== undefined) {
          const instruction = updated[fix.instruction_index];
          if (instruction) {
            instruction.type = 'select_option';
            const values = Array.isArray(fix.values)
              ? fix.values
              : fix.values
                ? [fix.values]
                : instruction.value
                  ? [instruction.value]
                  : [];
            instruction.values = values;
            delete instruction.value;
          }
        }
        break;

      default:
        throw new Error(`Unknown fix type: ${fix.type}`);
    }

    return updated;
  }

  /**
   * 変更内容を抽出
   * @param {Array} original - 元の命令
   * @param {Array} fixed - 修正後の命令
   * @param {Object} fix - 修正情報
   * @returns {Array} 変更リスト
   */
  extractChanges(original, fixed, fix) {
    const changes = [];

    if (!fix) {
      return changes;
    }

    switch (fix.type) {
      case 'update_selector':
        changes.push({
          type: 'update_selector',
          instruction_index: fix.instruction_index,
          old_value: fix.old_selector || original[fix.instruction_index]?.selector,
          new_value: fix.new_selector
        });
        break;

      case 'update_multiple':
        if (fix.changes) {
          fix.changes.forEach(change => {
            changes.push({
              type: 'update',
              instruction_index: change.instruction_index,
              field: change.new_selector ? 'selector' : 'other',
              old_value: original[change.instruction_index]?.selector,
              new_value: change.new_selector || change.new_ref || change.new_value
            });
          });
        }
        break;

      case 'add_ref':
        changes.push({
          type: 'add_ref',
          instruction_index: fix.instruction_index,
          new_value: fix.ref
        });
        break;

      case 'remove_instruction':
        changes.push({
          type: 'remove',
          instruction_index: fix.instruction_index,
          removed: original[fix.instruction_index]
        });
        break;

      case 'insert_instruction':
        changes.push({
          type: 'insert',
          instruction_index: fix.instruction_index,
          inserted: fix.new_instruction
        });
        break;

      case 'add_wait':
        changes.push({
          type: 'add_wait',
          instruction_index: fix.instruction_index,
          wait_time: fix.wait_time || 1
        });
        break;

      case 'convert_select_fill':
        changes.push({
          type: 'convert_select_fill',
          instruction_index: fix.instruction_index,
          new_type: 'select_option',
          values: fix.values
        });
        break;
    }

    return changes;
  }

  /**
   * Snapshotをプロンプト用にフォーマット
   * @param {Object} snapshot - Snapshot オブジェクト
   * @param {number} depth - インデント深度
   * @returns {string} フォーマット済み文字列
   */
  formatSnapshotForPrompt(snapshot, depth = 0) {
    if (!snapshot || typeof snapshot !== 'object') {
      return 'N/A';
    }

    const indent = '  '.repeat(depth);
    let result = '';

    if (snapshot.role) {
      const name = snapshot.name ? ` "${snapshot.name}"` : '';
      const ref = snapshot.ref ? ` [${snapshot.ref}]` : '';
      result += `${indent}- ${snapshot.role}${name}${ref}\n`;
    }

    if (Array.isArray(snapshot.children)) {
      for (const child of snapshot.children) {
        result += this.formatSnapshotForPrompt(child, depth + 1);
      }
    }

    return result;
  }
}

module.exports = OthelloHealer;
