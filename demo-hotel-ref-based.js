/**
 * ホテル予約フォーム自動入力デモ（Refベース・三層構造）
 * 
 * 🎯 三層構造:
 * 🧠 AI層（Claude/このスクリプト）: snapshotを理解してrefを判断
 * 🧩 MCP層（Playwright MCP）: refベースの操作を通訳
 * 🌐 Playwright層: 実際のブラウザ操作
 * 
 * ✅ 制約:
 * - querySelector禁止
 * - 全てrefベースで操作
 * - MCPは通訳のみ、判断はAI層が行う
 */

const PlaywrightAgent = require('./src/playwright-agent');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log('🏨 ホテル予約フォーム自動入力デモ（Refベース・三層構造）\n');
  console.log('='.repeat(60));
  console.log('🎯 三層構造を維持:');
  console.log('   🧠 AI層: snapshot解析 → ref特定');
  console.log('   🧩 MCP層: ref → Playwright API変換');
  console.log('   🌐 Playwright層: 実際のブラウザ操作');
  console.log('='.repeat(60) + '\n');

  const mockConfig = {
    config: {
      default_browser: 'chromium',
      timeout_seconds: 300,
      playwright_agent: { mock_mode: false }
    }
  };

  const agent = new PlaywrightAgent(mockConfig, { mockMode: false });

  try {
    // ========================================
    // Phase 1: 初期化とページアクセス
    // ========================================
    console.log('📡 Phase 1: セッション初期化とページアクセス\n');
    
    await agent.initializeSession();
    console.log('✅ MCP層: セッション確立\n');

    const url = 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html?plan-id=0';
    const navResult = await agent.executeInstruction({
      type: 'navigate',
      url: url,
      description: 'Navigate to hotel reservation form'
    });
    
    if (!navResult.success) {
      throw new Error(`🌐 Playwright層エラー: ${navResult.error}`);
    }
    console.log('✅ Playwright層: ページロード完了\n');

    // ページ読み込み待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ========================================
    // Phase 2: 🧠 AI層 - ページ構造の理解
    // ========================================
    console.log('📸 Phase 2: 🧠 AI層 - ページ構造を理解\n');
    
    // MCPStdioClientを直接使用してsnapshotを取得
    const snapshotResult = await agent.mcpClient.snapshot();
    
    if (!snapshotResult.success) {
      throw new Error(`Snapshot取得失敗: ${snapshotResult.error}`);
    }

    console.log('✅ 🧩 MCP層: Snapshotデータ取得完了');
    
    // snapshotをファイルに保存（AI層が解析できるように）
    const logsDir = path.join(__dirname, 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    const snapshotPath = path.join(logsDir, 'hotel-form-snapshot.txt');
    await fs.writeFile(snapshotPath, snapshotResult.content, 'utf-8');
    console.log(`✅ 🧠 AI層: Snapshot解析用ファイル作成: ${snapshotPath}`);
    
    // 🧠 AI層: Snapshotからrefを抽出して理解
    console.log('\n🧠 AI層: Snapshotを解析してrefを特定中...\n');
    
    // Snapshotの内容を解析（sectionsから構造を理解）
    const pageSnapshot = snapshotResult.sections.get('Page Snapshot');
    if (!pageSnapshot) {
      throw new Error('Page Snapshotが見つかりません');
    }

    console.log('📋 ページ構造（抜粋）:');
    const lines = pageSnapshot.split('\n').slice(0, 50);
    lines.forEach(line => {
      if (line.includes('[ref=')) {
        console.log('   ' + line.trim());
      }
    });
    console.log('   ...\n');

    // 🧠 AI層の判断: Snapshotから必要なrefを抽出
    console.log('🧠 AI層: 入力フィールドのrefを特定します...\n');
    
    // 簡易的なref抽出（実際はもっと高度な解析が必要）
    const extractRef = (snapshot, keyword) => {
      const lines = snapshot.split('\n');
      for (const line of lines) {
        if (line.includes(keyword) && line.includes('[ref=')) {
          const match = line.match(/\[ref=([^\]]+)\]/);
          if (match) return match[1];
        }
      }
      return null;
    };

    // ========================================
    // Phase 3: 🧠 AI層 - Refベースの操作計画
    // ========================================
    console.log('📝 Phase 3: 🧠 AI層 - 操作計画を立てる\n');

    // 🧠 AI層の思考プロセス
    console.log('🧠 思考: "スナップショットから必要なフィールドを特定しよう"');
    console.log('🧠 思考: "各フィールドのrefを見つけて、MCPに操作を依頼しよう"');
    console.log('🧠 思考: "直接selectorは使わず、refのみで操作する"\n');

    // スクリーンショットで現在の状態を確認
    const initialScreenshot = await agent.mcpClient.screenshot('logs/hotel-form-ref-initial.png');
    console.log('✅ 📸 初期画面スクリーンショット保存\n');

    // ========================================
    // Phase 4: 🧩 MCP層経由でフォーム入力
    // ========================================
    console.log('🖊️  Phase 4: 🧩 MCP層経由でrefベース入力\n');

    console.log('⚠️  注意: 現在のPlaywright MCPはrefベースの操作が必要です');
    console.log('⚠️  Snapshotからrefを解析して操作する必要があります\n');

    // 実際の入力値を準備（AI層の判断）
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const reserveDate = tomorrow.toISOString().split('T')[0];

    const inputData = {
      reserve_date: reserveDate,
      reserve_term: '2',
      head_count: '2',
      username: '山田太郎',
      contact: 'test@example.com',
      tel: '090-1234-5678'
    };

    console.log('🧠 AI層の判断: 以下のデータで入力を試みます:');
    Object.entries(inputData).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log();

    // ========================================
    // Phase 5: 現状の限界と次のステップ
    // ========================================
    console.log('='.repeat(60));
    console.log('📊 実行結果と課題\n');
    
    console.log('✅ 成功した三層構造の実践:');
    console.log('   1. 🧠 AI層: Snapshotを取得・解析');
    console.log('   2. 🧩 MCP層: browser_snapshot APIで構造取得');
    console.log('   3. 🌐 Playwright層: 実際のDOM情報を返却');
    console.log();

    console.log('⚠️  現在の課題:');
    console.log('   - Playwright MCPのbrowser_type/browser_clickはrefベース');
    console.log('   - Snapshotから正しいrefを自動抽出する必要がある');
    console.log('   - 🧠 AI層がSnapshotを深く理解してrefを特定する必要がある');
    console.log();

    console.log('🎯 次に必要な実装（AutoPlaywrightループ）:');
    console.log('   1. Snapshot解析エンジン（refを自動抽出）');
    console.log('   2. LLM統合（Claudeがsnapshotを理解してrefを判断）');
    console.log('   3. 自己修復ループ（失敗時に再試行）');
    console.log();

    console.log('💡 三層構造は維持されています:');
    console.log('   🧠 AI層: 判断と計画');
    console.log('   🧩 MCP層: 通訳と中継');
    console.log('   🌐 Playwright層: 実行');
    console.log('='.repeat(60));

    // スクリーンショット保存
    await agent.mcpClient.screenshot('logs/hotel-form-ref-final.png');
    console.log('\n✅ 最終スクリーンショット保存完了');

    // Snapshotファイルの場所を表示
    console.log(`\n📁 生成されたファイル:`);
    console.log(`   - ${snapshotPath}`);
    console.log(`   - logs/hotel-form-ref-initial.png`);
    console.log(`   - logs/hotel-form-ref-final.png`);
    console.log(`\n💡 Snapshotファイルを確認して、refを特定してください`);

  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error('詳細:', error.stack);
    process.exit(1);
  } finally {
    console.log('\n🧹 セッションをクローズ中...');
    await agent.closeSession();
    console.log('✅ セッションクローズ完了');
  }
}

main().then(() => {
  console.log('\n✨ デモ終了');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
