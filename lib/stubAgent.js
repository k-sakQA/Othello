async function sampleRun({ iteration, url, browser }) {
  // simulate agent generating and executing tests
  const now = new Date();
  const tests = [
    { name: 'ログイン機能のテスト', result: 'success', inputs: ['testuser01', 'Pass1234'] },
    { name: 'ダッシュボード表示のテスト', result: 'success', inputs: [] }
  ];

  const res = {
    execution_id: `iteration-${iteration}_${now.toISOString().replace(/[:.]/g, '-')}`,
    iteration,
    target_url: url,
    browser,
    start_time: now.toISOString(),
    end_time: new Date(Date.now() + 1000).toISOString(),
    duration_seconds: 1,
    status: 'success',
    tests_generated_by_planner: tests.map(t => t.name),
    tests_executed: tests.length,
    tests_passed: tests.filter(t => t.result === 'success').length,
    tests_failed: tests.filter(t => t.result !== 'success').length,
    playwright_agent_results: {
      planner_suggestions: tests.map(t => t.name),
      generated_tests: tests,
      healer_actions: []
    },
    // coverage summary stub
    untested_elements: iteration >= 2 ? [] : [
      { type: 'element', page: 'ダッシュボード', element: 'エクスポートボタン', selector: '#export-btn' }
    ]
  };
  return res;
}

module.exports = { sampleRun };
