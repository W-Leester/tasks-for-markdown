import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every user-facing string passed to vscode.l10n.t / webview t() must have a Korean translation. */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|svelte)$/.test(name)) out.push(p);
  }
  return out;
}

const KEY_RE = /\b(?:vscode\.l10n\.t|l10n\.t|\bt)\(\s*'((?:[^'\\]|\\.)*)'/g;
const files = walk(join(__dirname, '..', 'src'));
const keys = new Set<string>();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(KEY_RE)) {
    const key = m[1]!.replace(/\\'/g, "'");
    // Skip dynamic-looking keys (template pieces) and l10n-neutral tokens.
    if (key.length === 0) continue;
    keys.add(key);
  }
}
const ko = JSON.parse(readFileSync(join(__dirname, '..', 'l10n', 'bundle.l10n.ko.json'), 'utf8')) as Record<string, string>;

describe('l10n coverage', () => {
  it('found a reasonable number of keys', () => {
    expect(keys.size).toBeGreaterThan(100);
  });
  it('every key has a Korean translation', () => {
    const missing = [...keys].filter((k) => !(k in ko)).sort();
    expect(missing, `missing ko translations:\n${missing.join('\n')}`).toEqual([]);
  });
  it('placeholders match between key and translation', () => {
    const bad = Object.entries(ko).filter(([k, v]) => {
      const a = [...k.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',');
      const b = [...v.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',');
      return a !== b;
    });
    expect(bad).toEqual([]);
  });
});
