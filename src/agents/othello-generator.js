/**
 * @file Othello-Generator
 * @description テストケースをPlaywright MCP命令に変換するエージェント（Phase 9版）
 */

class OthelloGenerator {
  constructor({ llm, config }) {
    this.llm = llm;
    this.config = config || {};
  }

  /**
   * テストケースからMCP命令を生成
   * @param {Object} options - オプション
   * @param {Array} options.testCases - テストケース配列
   * @param {Object} options.snapshot - ページSnapshot
   * @param {string} options.url - 対象URL
   * @returns {Array} MCP命令配列
   */
  async generate(options) {
    const { testCases, snapshot, url } = options;

    if (!testCases || !Array.isArray(testCases)) {
      throw new Error('testCases is required and must be an array');
    }

    if (!snapshot) {
      throw new Error('snapshot is required');
    }

    if (!url) {
      throw new Error('url is required');
    }

    const allInstructions = [];

    for (const testCase of testCases) {
      const prompt = this.buildGenerationPrompt({
        testCase,
        snapshot,
        url
      });

      const response = await this.llm.chat({
        messages: [
          { 
            role: 'system', 
            content: `あなたはテスト自動化の専門家です。テストケースをPlaywright MCP命令に変換してください。

**JSON出力の厳格なルール:**
1. 必ず有効なJSON構文で出力してください
2. 末尾カンマは絶対に禁止です
3. 文字列は必ずダブルクォート(")で囲んでください
4. コメント(//, /*)は禁止です
5. 改行は\\nでエスケープしてください
6. プロパティ名も必ずダブルクォートで囲んでください
7. JSON以外のテキスト（説明文など）は出力しないでください` 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        maxTokens: 3000
      });

      const parsed = this.parseGenerationResponse(response.content);
      
      // 命令の検証
      for (const result of parsed) {
        if (!this.validateInstructions(result.instructions)) {
          console.warn(`Invalid instructions for ${result.test_case_id}`);
        }
      }

      allInstructions.push(...parsed);
    }

    return allInstructions;
  }

  /**
   * プロンプトを構築
   * @param {Object} options - プロンプト構築オプション
   * @returns {string} プロンプト文字列
   */
  buildGenerationPrompt({ testCase, snapshot, url }) {
    const snapshotFormatted = this.formatSnapshotForPrompt(snapshot);

    return `あなたはテスト自動化の専門家です。

【対象URL】
${url}

【テストケース】
ID: ${testCase.test_case_id || testCase.case_id}
タイトル: ${testCase.title || 'N/A'}
優先度: ${testCase.priority || 'P2'}
観点番号: ${testCase.aspect_no || 'N/A'}

【テスト手順】
${testCase.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

【期待結果】
${testCase.expected_results.map((result, i) => `${i + 1}. ${result}`).join('\n')}

【ページSnapshot（要素情報）】
${snapshotFormatted}

【Snapshotの読み方】
- textbox "宿泊日 必須" [ref=e16] → 宿泊日入力欄、refは"e16"
- textbox "氏名 必須" [ref=e48] → 氏名入力欄、refは"e48"
- button "予約内容を確認する" [ref=e59] → 確認ボタン、refは"e59"
- checkbox "朝食バイキング" [ref=e35] → チェックボックス、refは"e35"
- combobox "確認のご連絡 必須" [ref=e52] → ドロップダウン、refは"e52"

【タスク】
上記のテストケースを、Playwright MCP命令シーケンスに変換してください。
必ず Snapshot に記載されている ref を使用してください。

【使用可能なMCP命令タイプ】
- navigate: ページ遷移
- fill: テキスト入力
- click: クリック  
- wait: 待機

注意: verify系の命令(verify_text_visible, verify_element_visible)は現在サポートされていません。
検証は期待値を満たす操作(fill, click)の成功で代替してください。

【重要: refの使い方】
必ず Page Snapshot に記載されている [ref=eXX] の値を使用してください。
例: [ref=e16] → "ref": "e16"
例: [ref=e48] → "ref": "e48"  
例: [ref=e59] → "ref": "e59"

自分で ref を作成しないでください（reserve-button, input[name='...'] などは不可）。
必ず Snapshot に表示されている ref の値を使用してください。

【出力形式】
JSON配列で出力してください：

\`\`\`json
[
  {
    "test_case_id": "${testCase.test_case_id || testCase.case_id}",
    "aspect_no": ${testCase.aspect_no || 0},
    "instructions": [
      {
        "type": "navigate",
        "url": "${url}",
        "description": "ページを開く"
      },
      {
        "type": "fill",
        "ref": "e16",
        "value": "2025/12/01",
        "description": "宿泊日を入力"
      },
      {
        "type": "fill",
        "ref": "e48",
        "value": "山田太郎",
        "description": "氏名を入力"
      },
      {
        "type": "click",
        "ref": "e59",
        "description": "予約内容を確認するボタンをクリック"
      }
    ]
  }
]
\`\`\`

**重要な制約:**
- 必ず有効なJSON構文で出力してください（末尾カンマ禁止、コメント禁止）
- 文字列は必ずダブルクォート(")で囲んでください
- description内の改行は\\nでエスケープしてください
- refはSnapshot内に存在するもの（e16, e22, e48, e52, e59など）のみ使用してください
- 各命令にはdescriptionを必ず含めてください
- テスト手順と期待結果を忠実に反映してください
`;
  }

  /**
   * JSON文字列を修復
   * @param {string} jsonStr - 壊れている可能性のあるJSON（コードブロック除去済み）
   * @returns {string} 修復されたJSON
   */
  repairJSON(jsonStr) {
    // 末尾カンマを削除
    jsonStr = jsonStr.replace(/,\s*(\]|\})/g, '$1');
    // シングルクォートをダブルクォートに
    jsonStr = jsonStr.replace(/'/g, '"');
    // コメントを削除 (// ... または /* ... */)
    jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
    jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');
    return jsonStr.trim();
  }

  /**
   * LLMレスポンスを解析
   * @param {string} content - LLMレスポンス
   * @returns {Array} パースされた命令配列
   */
  parseGenerationResponse(content) {
    // Markdownコードブロックから抽出
    let jsonStr = content.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      // JSON修復を試みる
      console.warn(`JSON parse failed, attempting repair: ${error.message}`);
      console.warn('Original JSON:', jsonStr.substring(0, 200));
      try {
        const repairedJson = this.repairJSON(jsonStr);
        console.warn('Repaired JSON:', repairedJson.substring(0, 200));
        const parsed = JSON.parse(repairedJson);
        console.log('✅ JSON successfully repaired');
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (repairError) {
        console.error('Failed JSON:', jsonStr.substring(0, 500));
        throw new Error(`Failed to parse LLM response even after repair: ${repairError.message}`);
      }
    }
  }

  /**
   * 壊れたJSONを修復する
   * @param {string} jsonText - JSONテキスト
   * @returns {string} 修復されたJSONテキスト
   */
  repairJSON(jsonText) {
    // コメントを削除
    jsonText = jsonText.replace(/\/\/.*$/gm, '');
    jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');

    // 末尾のカンマを削除
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');

    // 引用符のエスケープ問題を修正
    jsonText = jsonText.replace(/\\'/g, "'");

    // 改行を適切にエスケープ
    jsonText = jsonText.replace(/\n(?=.*"[^"]*$)/g, '\\n');

    return jsonText.trim();
  }

  /**
   * Snapshotから要素リストを抽出
   * @param {Object} snapshot - Snapshot オブジェクト
   * @param {Array} elements - 累積用配列（再帰用）
   * @returns {Array} 要素配列
   */
  extractSnapshotElements(snapshot, elements = []) {
    if (!snapshot || typeof snapshot !== 'object') {
      return elements;
    }

    // 現在のノードを追加
    if (snapshot.role) {
      elements.push({
        role: snapshot.role,
        name: snapshot.name,
        ref: snapshot.ref
      });
    }

    // 子要素を再帰的に処理
    if (Array.isArray(snapshot.children)) {
      for (const child of snapshot.children) {
        this.extractSnapshotElements(child, elements);
      }
    }

    return elements;
  }

  /**
   * 命令の検証
   * @param {Array} instructions - 命令配列
   * @returns {boolean} 検証結果
   */
  validateInstructions(instructions) {
    if (!Array.isArray(instructions)) {
      return false;
    }

    if (instructions.length === 0) {
      return true;
    }

    const validTypes = [
      'navigate', 'fill', 'click', 'select_option',
      'verify_text_visible', 'verify_element_visible', 'wait_for'
    ];

    for (const instruction of instructions) {
      // type チェック
      if (!instruction.type || !validTypes.includes(instruction.type)) {
        return false;
      }

      // description チェック
      if (!instruction.description) {
        return false;
      }

      // type 固有の必須フィールドチェック
      switch (instruction.type) {
        case 'navigate':
          if (!instruction.url) return false;
          break;
        case 'fill':
          if (!instruction.value) return false;
          if (!instruction.ref && !instruction.selector) return false;
          break;
        case 'click':
          if (!instruction.ref && !instruction.selector) return false;
          break;
        case 'select_option':
          if (!instruction.values || !Array.isArray(instruction.values)) return false;
          if (!instruction.ref && !instruction.selector) return false;
          break;
        case 'verify_text_visible':
          if (!instruction.text && !instruction.ref && !instruction.selector) return false;
          break;
        case 'verify_element_visible':
          if (!instruction.role && !instruction.accessibleName && !instruction.ref && !instruction.selector) return false;
          break;
        case 'wait_for':
          if (!instruction.text && !instruction.textGone && !instruction.time && !instruction.selector) return false;
          break;
      }
    }

    return true;
  }

  /**
   * Snapshotを読みやすい形式にフォーマット
   * @param {Object} snapshot - Snapshot オブジェクト
   * @param {number} depth - インデント深度
   * @returns {string} フォーマットされた文字列
   */
  formatSnapshotForPrompt(snapshot, depth = 0) {
    if (!snapshot || typeof snapshot !== 'object') {
      return '';
    }

    const indent = '  '.repeat(depth);
    let result = '';

    // 現在のノード
    if (snapshot.role) {
      const name = snapshot.name ? ` "${snapshot.name}"` : '';
      const ref = snapshot.ref ? ` [${snapshot.ref}]` : '';
      result += `${indent}- ${snapshot.role}${name}${ref}\n`;
    }

    // 子要素を再帰的に処理
    if (Array.isArray(snapshot.children)) {
      for (const child of snapshot.children) {
        result += this.formatSnapshotForPrompt(child, depth + 1);
      }
    }

    return result;
  }
}

module.exports = OthelloGenerator;
