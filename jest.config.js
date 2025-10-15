module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '!**/__tests__/fixtures/**'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/',  // Playwrightのテストディレクトリを除外
    '/test-results/',
    '/playwright-report/'
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  verbose: true
};
