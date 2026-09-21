import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // core/ must stay free of the vscode module so it can be unit tested directly.
  },
});
