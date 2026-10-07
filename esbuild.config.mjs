import * as esbuild from 'esbuild';
import esbuildSvelte from 'esbuild-svelte';
import { readdirSync, existsSync, readFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

/** @type {esbuild.BuildOptions} */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

/** One Svelte app per folder under src/webviews that has a main.ts. */
const apps = readdirSync('src/webviews', { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`src/webviews/${d.name}/main.ts`))
  .map((d) => d.name);

/** @type {esbuild.BuildOptions} */
const webviewConfig = {
  entryPoints: Object.fromEntries(apps.map((a) => [a, `src/webviews/${a}/main.ts`])),
  bundle: true,
  outdir: 'dist/webviews',
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  conditions: ['svelte', 'browser'],
  // accesskey is intentional (Obsidian-style shortcuts, configurable), so silence that a11y warning.
  plugins: [esbuildSvelte({ compilerOptions: { css: 'external' }, filterWarnings: (w) => w.code !== 'a11y_accesskey' })],
};

/**
 * The CLI / MCP server, bundled into the extension (M21, design.md 7.16) so AI agents and the
 * terminal command work without npm: the extension runs it on the editor's own Node. Same options
 * as packages/cli/build.mjs (the npm package).
 * @type {esbuild.BuildOptions}
 */
const cliConfig = {
  entryPoints: ['packages/cli/src/main.ts'],
  bundle: true,
  outfile: 'dist/tasksmd.cjs',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  minify: true,
  banner: { js: '#!/usr/bin/env node' },
  define: { __TASKSMD_VERSION__: JSON.stringify(JSON.parse(readFileSync('packages/cli/package.json', 'utf8')).version) },
  logLevel: 'info',
};

if (watch) {
  const ctxs = await Promise.all([esbuild.context(extensionConfig), esbuild.context(webviewConfig), esbuild.context(cliConfig)]);
  await Promise.all(ctxs.map((c) => c.watch()));
} else {
  await Promise.all([esbuild.build(extensionConfig), esbuild.build(webviewConfig), esbuild.build(cliConfig)]);
}
