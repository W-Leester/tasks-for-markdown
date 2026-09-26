import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/tasksmd.cjs',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  minify: true,
  banner: { js: '#!/usr/bin/env node' },
  define: { __TASKSMD_VERSION__: JSON.stringify(JSON.parse(readFileSync('package.json', 'utf8')).version) },
  logLevel: 'info',
});
