import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'dist/tests/tests/integration/**/*.test.js',
  workspaceFolder: 'tests/fixtures/workspace',
  mocha: { ui: 'tdd', timeout: 20000 },
  launchArgs: ['--disable-extensions'],
});
