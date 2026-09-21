import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration tests need a real VS Code (pnpm test:integration).
    exclude: ['tests/integration/**', 'node_modules/**'],
  },
});
