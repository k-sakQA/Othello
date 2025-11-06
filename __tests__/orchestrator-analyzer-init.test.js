/**
 * Orchestrator - Analyzer Initialization Tests (TDD)
 * 対話モードでのAnalyzer初期化を検証
 */

const Orchestrator = require('../src/orchestrator');
const OthelloAnalyzer = require('../src/agents/othello-analyzer');

describe('Orchestrator - Analyzer Initialization (TDD)', () => {
  it('コンストラクタ直後はanalyzerがnullである', () => {
    const orchestrator = new Orchestrator({
      url: 'https://example.com',
      interactive: true
    });

    // 初期状態ではanalyzerはnull
    expect(orchestrator.analyzer).toBeNull();
  });

  it('interactive=trueの場合、initializeAgents()でanalyzerが初期化される', () => {
    const orchestrator = new Orchestrator({
      url: 'https://example.com',
      interactive: true
    });

    // 初期状態ではanalyzerはnull
    expect(orchestrator.analyzer).toBeNull();
    
    // initializeAgents()を呼び出す（これから実装する）
    // 実装後は以下がtrueになる:
    // orchestrator.initializeAgents();
    // expect(orchestrator.analyzer).not.toBeNull();
    // expect(orchestrator.analyzer).toBeInstanceOf(OthelloAnalyzer);
    
    // 【RED PHASE】現在はinitializeAgents()が存在しないか、analyzerを初期化しない
    expect(typeof orchestrator.initializeAgents === 'undefined' || 
           orchestrator.analyzer === null).toBe(true);
  });

  it('interactive=falseの場合、initializeAgents()でもanalyzerは初期化されない', () => {
    const orchestrator = new Orchestrator({
      url: 'https://example.com',
      interactive: false
    });

    // initializeAgents()を実装後、interactive=falseの場合はanalyzerを初期化しない
    // 【RED PHASE】現在はinitializeAgents()が存在しないか、analyzerを初期化しない
    expect(orchestrator.analyzer).toBeNull();
  });
});

