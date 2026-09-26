import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/tasksmd.cjs',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  minify: true,
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
});
