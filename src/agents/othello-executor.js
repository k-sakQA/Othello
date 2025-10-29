/**
 * @file Othello-Executor
 * @description Generator生成のMCP命令を実行するエージェント（Phase 9版）
 */

class OthelloExecutor {
  constructor({ playwrightMCP, config = {} }) {
    this.playwrightMCP = playwrightMCP;
    this.config = {
      timeout: config.timeout || 30000,
      headless: config.headless !== undefined ? config.headless : true,
      ...config
    };
  }

  /**
   * MCP命令セットを実行
   * @param {Object} testCase - テストケース
   * @param {string} testCase.test_case_id - テストケースID
   * @param {Array} testCase.instructions - MCP命令配列
   * @returns {Object} 実行結果
   */
  async execute(testCase) {
    // バリデーション
    if (!testCase.test_case_id) {
      throw new Error('test_case_id is required');
    }
    if (!testCase.instructions || !Array.isArray(testCase.instructions)) {
      throw new Error('instructions is required and must be an array');
    }

    const startTime = Date.now();
    const result = {
      test_case_id: testCase.test_case_id,
      success: true,
      executed_instructions: 0,
      failed_instructions: 0,
      instructions_results: [],
      timestamp: new Date().toISOString()
    };

    try {
      // 各命令を順次実行
      for (const instruction of testCase.instructions) {
        try {
          const instructionResult = await this.executeInstruction(instruction);
          result.instructions_results.push(instructionResult);
          result.executed_instructions++;

          // 失敗した場合は後続の命令を実行せず終了
          if (!instructionResult.success) {
            result.success = false;
            result.failed_instructions++;
            
            // 失敗時のスナップショットを取得
            result.snapshot = await this.captureSnapshot();
            result.error = {
              message: instructionResult.error || 'Instruction execution failed',
              instruction_index: result.executed_instructions - 1,
              instruction_type: instruction.type
            };
            break;
          }
        } catch (error) {
          result.success = false;
          result.executed_instructions++;
          result.failed_instructions++;
          result.error = {
            message: error.message,
            instruction_index: result.executed_instructions - 1,
            instruction_type: instruction.type
          };
          
          // 失敗時のスナップショットを取得
          result.snapshot = await this.captureSnapshot();
          
          result.instructions_results.push({
            success: false,
            instruction_type: instruction.type,
            error: error.message
          });
          
          break; // エラー発生時は後続の命令を実行しない
        }
      }

      result.duration_ms = Date.now() - startTime;
      return result;

    } catch (error) {
      result.success = false;
      result.error = {
        message: error.message,
        type: 'execution_error'
      };
      result.duration_ms = Date.now() - startTime;
      return result;
    }
  }

  /**
   * 単一のMCP命令を実行
   * @param {Object} instruction - MCP命令
   * @returns {Object} 実行結果
   */
  async executeInstruction(instruction) {
    const startTime = Date.now();

    // 命令タイプのバリデーション
    const supportedTypes = [
      'navigate',
      'click',
      'fill',
      'wait',
      'screenshot'
    ];

    if (!supportedTypes.includes(instruction.type)) {
      throw new Error(`Unsupported instruction type: ${instruction.type}`);
    }

    try {
      // Othello形式の命令に変換
      const othelloInstruction = {
        type: instruction.type,
        description: instruction.description || instruction.type
      };

      // 命令タイプに応じてパラメータを追加
      switch (instruction.type) {
        case 'navigate':
          othelloInstruction.url = instruction.url;
          break;
        case 'click':
          othelloInstruction.selector = instruction.ref || instruction.selector;
          break;
        case 'fill':
          othelloInstruction.selector = instruction.ref || instruction.selector;
          othelloInstruction.value = instruction.value || instruction.text;
          break;
        case 'verify_text_visible':
          othelloInstruction.text = instruction.text;
          break;
        case 'verify_element_visible':
          othelloInstruction.role = instruction.role || 'generic';
          othelloInstruction.accessibleName = instruction.accessibleName || instruction.text || '';
          break;
        case 'wait_for':
          othelloInstruction.selector = instruction.ref || instruction.selector;
          othelloInstruction.timeout = instruction.timeout;
          break;
        case 'screenshot':
          othelloInstruction.path = instruction.path;
          break;
      }

      // Othelloのexecuteインstrunctionを呼び出し
      const mcpResult = await this.playwrightMCP.executeInstruction(othelloInstruction);

      return {
        success: mcpResult.success,
        instruction_type: instruction.type,
        description: instruction.description,
        duration_ms: Date.now() - startTime,
        mcp_result: mcpResult,
        error: mcpResult.error
      };

    } catch (error) {
      throw error; // executeメソッドでキャッチされる
    }
  }

  /**
   * MCP引数を構築
   * @param {Object} instruction - MCP命令
   * @returns {Object} MCP引数
   */
  buildMCPArguments(instruction) {
    const intent = instruction.description || instruction.type;

    switch (instruction.type) {
      case 'navigate':
        return {
          url: instruction.url,
          intent
        };

      case 'click':
        return {
          element: intent,
          ref: instruction.ref || instruction.selector,
          intent
        };

      case 'fill':
        return {
          element: intent,
          ref: instruction.ref || instruction.selector,
          text: instruction.value,
          intent
        };

      case 'verify_text_visible':
        return {
          text: instruction.text,
          intent
        };

      case 'verify_element_visible':
        return {
          role: instruction.role,
          accessibleName: instruction.accessibleName || instruction.accessible_name,
          intent
        };

      case 'wait_for':
        return {
          time: instruction.time || instruction.duration,
          intent
        };

      case 'screenshot':
        return {
          filename: instruction.path || instruction.filename,
          intent
        };

      default:
        return { intent };
    }
  }

  /**
   * 失敗時のスナップショットを取得
   * @returns {Object|null} スナップショット
   */
  async captureSnapshot() {
    try {
      if (this.playwrightMCP.snapshot) {
        return await this.playwrightMCP.snapshot();
      }
      return null;
    } catch (error) {
      console.warn('Failed to capture snapshot:', error.message);
      return null;
    }
  }
}

module.exports = OthelloExecutor;
