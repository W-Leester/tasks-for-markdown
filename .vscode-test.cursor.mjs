import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  // Same suite as .vscode-test.mjs but executed inside the locally installed Cursor.
  files: 'dist/tests/tests/integration/**/*.test.js',
  workspaceFolder: 'tests/fixtures/workspace',
  mocha: { ui: 'tdd', timeout: 20000 },
  launchArgs: ['--disable-extensions'],
  useInstallation: { fromPath: '/Applications/Cursor.app/Contents/MacOS/Cursor' },
});
