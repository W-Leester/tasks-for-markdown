import * as esbuild from 'esbuild';

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

/** Script injected into the built-in Markdown preview webview. */
/** @type {esbuild.BuildOptions} */
const previewConfig = {
  entryPoints: ['src/preview/previewScript.ts'],
  bundle: true,
  outfile: 'dist/preview.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

if (watch) {
  const ctxs = await Promise.all([esbuild.context(extensionConfig), esbuild.context(previewConfig)]);
  await Promise.all(ctxs.map((c) => c.watch()));
} else {
  await Promise.all([esbuild.build(extensionConfig), esbuild.build(previewConfig)]);
}
