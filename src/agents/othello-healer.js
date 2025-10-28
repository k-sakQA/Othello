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

    return `あなたはテスト自動化の専門家です。失敗したテストケースを分析してください。

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
以下を判定してください：

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
   - insert_instruction: 命令を挿入
   - add_wait: 待機を追加

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

注意事項：
- Snapshotを参照して、実際の要素構造を確認してください
- ref が利用可能な場合は優先してください
- セレクタの信頼性を考慮してください（ref > data-testid > role/name > CSS）
`;
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
