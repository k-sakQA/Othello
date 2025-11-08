/**
 * @file Othello-Executor
 * @description Generator生成のMCP命令を実行するエージェント（Phase 9版）
 */

class OthelloExecutor {
  constructor({ playwrightMCP, artifactStorage = null, config = {} }) {
    this.playwrightMCP = playwrightMCP;
    this.artifactStorage = artifactStorage;
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
   * @param {string} snapshot - 使用するSnapshot（オプション。Healer修復時に最新Snapshotを渡す）
   * @returns {Object} 実行結果
   */
  async execute(testCase, snapshot = null) {
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
            
            // スクリーンショットを撮影して保存
            await this.captureScreenshotOnError(
              testCase.test_case_id,
              result.executed_instructions - 1,
              instruction.type,
              instructionResult.error || 'Instruction execution failed'
            );
            
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
          
          // スクリーンショットを撮影して保存
          await this.captureScreenshotOnError(
            testCase.test_case_id,
            result.executed_instructions - 1,
            instruction.type,
            error.message
          );
          
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
      'press_key',
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
        case 'wait':
          othelloInstruction.duration = instruction.duration || instruction.time || 1000;
          break;
        case 'wait_for':
          othelloInstruction.selector = instruction.ref || instruction.selector;
          othelloInstruction.timeout = instruction.timeout;
          break;
        case 'press_key':
          othelloInstruction.key = instruction.key;
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
   * エラー時のスクリーンショットを撮影して保存
   * @param {string} testCaseId - テストケースID
   * @param {number} instructionIndex - 命令のインデックス
   * @param {string} instructionType - 命令のタイプ
   * @param {string} errorMessage - エラーメッセージ
   */
  async captureScreenshotOnError(testCaseId, instructionIndex, instructionType, errorMessage) {
    // artifactStorageがない場合は何もしない
    if (!this.artifactStorage) {
      return;
    }

    try {
      const iteration = this.config.iteration || 1;
      const timestamp = Date.now();
      const stepName = `error-instruction-${instructionIndex}-${timestamp}`;
      
      // ディレクトリを作成
      await this.artifactStorage.ensureScreenshotDir(iteration, testCaseId);
      
      // スクリーンショットパスを取得
      const screenshotPath = this.artifactStorage.getScreenshotPath(iteration, testCaseId, stepName);
      
      // スクリーンショットを撮影（絶対パスで保存）
      const fs = require('fs');
      const path = require('path');
      const absolutePath = path.resolve(screenshotPath);
      
      // 親ディレクトリが存在することを確認
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      console.log(`\n📸 Attempting to capture screenshot for ${testCaseId}...`);
      console.log(`   Path: ${absolutePath}`);
      
      const screenshotResult = await this.playwrightMCP.screenshot(absolutePath);
      
      // スクリーンショットが成功したか確認
      if (!screenshotResult || !screenshotResult.success) {
        console.error(`\n❌ ========================================`);
        console.error(`   Screenshot capture FAILED for ${testCaseId}`);
        console.error(`   Result:`, JSON.stringify(screenshotResult, null, 2));
        console.error(`========================================\n`);
      } else {
        console.log(`✅ Screenshot saved successfully: ${absolutePath}\n`);
      }
      
      // メタデータを保存
      await this.artifactStorage.saveScreenshotMetadata(iteration, testCaseId, {
        type: 'error',
        instruction_index: instructionIndex,
        instruction_type: instructionType,
        error_message: errorMessage,
        screenshot_path: screenshotPath,
        screenshot_success: screenshotResult?.success || false,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // スクリーンショット撮影のエラーは無視（テスト実行を妨げない）
      console.warn('❌ Failed to capture screenshot:', error.message);
      console.warn('   Error details:', error);
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
