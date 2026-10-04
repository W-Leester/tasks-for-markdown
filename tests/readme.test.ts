import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** README.md is the English page shown on the marketplaces and npm; Korean lives in README.ko.md (M22). */
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/u;
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)\)/g;

describe('README', () => {
  const en = readFileSync('README.md', 'utf8');
  const ko = readFileSync('README.ko.md', 'utf8');

  it('README.md has no Korean text', () => {
    const lines = en.split('\n').map((l, i) => `${i + 1}: ${l}`).filter((l) => HANGUL.test(l));
    expect(lines).toEqual([]);
  });

  it('every local image in both READMEs exists', () => {
    for (const text of [en, ko]) {
      const local = [...text.matchAll(IMAGE_RE)].map((m) => m[1]!).filter((src) => !/^https?:/.test(src));
      expect(local.filter((src) => !existsSync(src))).toEqual([]);
    }
  });

  it('settings tables list every tasksmd.* setting', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { contributes: { configuration: { properties: Record<string, unknown> } | { properties: Record<string, unknown> }[] } };
    const keys = [pkg.contributes.configuration].flat().flatMap((c) => Object.keys(c.properties)).map((k) => k.replace(/^tasksmd\./, ''));
    for (const [text, heading] of [[en, '## Settings'], [ko, '## 설정']] as const) {
      const start = text.indexOf(heading);
      const table = text.slice(start, text.indexOf('\n## ', start + 1));
      const rows = table.split('\n').filter((l) => l.startsWith('|')).map((l) => l.split('|')[1]!);
      // A row names settings as `a.b`, `a.b / c` (same prefix), or `a.*`.
      const listed = (k: string) => rows.some((cell) => {
        if (cell.includes(`\`${k}\``)) return true;
        const prefix = k.includes('.') ? k.slice(0, k.indexOf('.')) : '';
        if (prefix && cell.includes(`\`${prefix}.*\``)) return true;
        return !!prefix && cell.includes(`\`${prefix}.`) && cell.includes(`\`${k.slice(prefix.length + 1)}\``);
      });
      expect(keys.filter((k) => !listed(k)), heading).toEqual([]);
    }
  });

  it('links the website (one address for all languages) and each other', () => {
    for (const text of [en, ko]) expect(text).toContain('https://hastycapybara.com/apps/tasksmd/');
    expect(`${en}${ko}`).not.toMatch(/hastycapybara\.com\/(?:en|ko)\//);
    expect(en).toContain('[Korean README](README.ko.md)');
    expect(ko).toContain('[README](README.md)'); // README alone reads as the English one
  });
});
