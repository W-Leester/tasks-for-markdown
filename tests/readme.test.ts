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

  it('links the website in both languages', () => {
    expect(en).toContain('https://hastycapybara.com/en/apps/tasksmd/');
    expect(ko).toContain('https://hastycapybara.com/ko/apps/tasksmd/');
  });
});
