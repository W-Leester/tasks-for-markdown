import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// Webview component tests: Svelte 5 in jsdom with a fake acquireVsCodeApi().
export default defineConfig({
  plugins: [svelte({ compilerOptions: { css: 'injected' } })],
  resolve: { conditions: ['svelte', 'browser'] },
  test: {
    include: ['tests/webviews/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['tests/webviews/setup.ts'],
  },
});
