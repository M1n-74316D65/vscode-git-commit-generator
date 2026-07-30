const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({
  files: 'out/test/**/*.test.js',
  version: process.env.VSCODE_TEST_VERSION || 'stable',
  workspaceFolder: '.',
  mocha: {
    timeout: 20000,
  },
});
