import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '*.mjs', '.vscode-test/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // src/core must stay free of the vscode API so it can be unit tested with vitest
    // and reused outside the extension host (e.g. a future MCP server).
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'vscode', message: 'src/core must not depend on the vscode module.' }],
          patterns: [
            { group: ['../index/*', '../../index/*', '../services/*', '../../services/*', '../editor/*', '../../editor/*', '../views/*', '../../views/*', '../webviews/*', '../../webviews/*', '../preview/*', '../../preview/*'], message: 'src/core must not import from upper layers.' },
          ],
        },
      ],
    },
  },
);
