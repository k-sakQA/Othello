const fs = require('fs');
const path = require('path');

describe('Playwright MFA authentication bootstrap', () => {
  const repoRoot = path.resolve(__dirname, '..');

  test('login_setup script exists and captures authenticated state after manual login', () => {
    const scriptPath = path.join(repoRoot, 'scripts', 'login_setup.ts');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/from\s+"@playwright\/test"/);
    expect(content).toMatch(/headless:\s*false/);
    expect(content).toMatch(/const\s+LOGIN_URL/);
    expect(content).toMatch(/const\s+DASHBOARD_URL_PATTERN/);
    expect(content).toMatch(/const\s+AUTH_STATE_PATH/);
    expect(content).toMatch(/page\.goto\(LOGIN_URL\)/);
    expect(content).toMatch(/waitForURL\(DASHBOARD_URL_PATTERN/);
    expect(content).toMatch(/storageState\({\s*path:\s*AUTH_STATE_PATH\s*}\)/);
  });

  test('Playwright config reuses stored authentication state', () => {
    const configPath = path.join(repoRoot, 'playwright.config.js');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = require(configPath);
    expect(config.use).toBeDefined();
    expect(config.use.storageState).toBe('auth.json');
  });

  test('package.json exposes login setup runner and keeps Playwright tests runnable', () => {
    const packageJsonPath = path.join(repoRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(pkg.scripts['login:setup']).toBe('ts-node scripts/login_setup.ts');
    expect(pkg.scripts.test).toBeDefined();
  });

  test('auth.json is excluded from version control', () => {
    const gitignorePath = path.join(repoRoot, '.gitignore');
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');

    expect(gitignore.includes('auth.json')).toBe(true);
  });
});
