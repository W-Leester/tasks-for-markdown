#!/usr/bin/env node
// Writes dist/latest.json next to the packaged .vsix for the internal update check (FR-10.15).
// Usage: node scripts/make-latest.mjs [vsix-path-or-url] [notes]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const vsix = process.argv[2] ?? `${pkg.name}-${pkg.version}.vsix`;
const notes = process.argv[3] ?? '';
mkdirSync('dist', { recursive: true });
writeFileSync('dist/latest.json', JSON.stringify({ version: pkg.version, vsix, notes }, null, 2) + '\n');
console.log(`dist/latest.json -> ${pkg.version} (${vsix})`);
