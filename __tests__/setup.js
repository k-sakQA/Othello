/**
 * Jest setup file
 * テスト実行前に必要なフィクスチャファイルを作成
 */

const fs = require('fs');
const path = require('path');

// fixtures/config ディレクトリを作成
const fixturesConfigDir = path.join(__dirname, 'fixtures', 'config');
if (!fs.existsSync(fixturesConfigDir)) {
  fs.mkdirSync(fixturesConfigDir, { recursive: true });
}

// valid-config.json を作成
const validConfig = {
  "default_browser": "chromium",
  "timeout_seconds": 60,
  "max_iterations": 10,
  "screenshot_on_error": true,
  "paths": {
    "logs": "./logs",
    "results": "./results",
    "test_instructions": "./test-instructions",
    "reports": "./reports",
    "screenshots": "./screenshots"
  },
  "target_systems": [
    {
      "name": "test-app",
      "url": "https://example.com",
      "credentials": {
        "username_env": "TEST_USERNAME",
        "password_env": "TEST_PASSWORD"
      }
    }
  ],
  "playwright_agent": {
    "vscode_workspace": "/test/workspace",
    "planner_settings": {
      "max_test_scenarios": 10,
      "focus_on_edge_cases": true
    },
    "healer_settings": {
      "max_retry_attempts": 3,
      "auto_heal": true
    }
  },
  "claude_api": {
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 4096,
    "temperature": 0.7
  },
  "coverage_threshold": {
    "target_percentage": 80,
    "stop_if_no_improvement": true
  }
};

const configPath = path.join(fixturesConfigDir, 'valid-config.json');
fs.writeFileSync(configPath, JSON.stringify(validConfig, null, 2));

console.log(`✓ Created test fixture: ${configPath}`);
