import { describe, expect, it } from 'vitest';
import { expandPlaceholders, tokenize } from '../../../src/core/query';

describe('tokenize', () => {
  it('splits lines, drops blanks and # comments, trims', () => {
    expect(tokenize('not done\n\n# a comment\n  due today  \n')).toEqual([
      { line: 1, text: 'not done' },
      { line: 4, text: 'due today' },
    ]);
  });
  it('joins continuation lines and keeps the first line number', () => {
    expect(tokenize('a\n(due today) OR \\\n  (due tomorrow)\nb')).toEqual([
      { line: 1, text: 'a' },
      { line: 2, text: '(due today) OR (due tomorrow)' },
      { line: 4, text: 'b' },
    ]);
  });
  it('handles CRLF and a trailing continuation', () => {
    expect(tokenize('x\r\ny \\')).toEqual([
      { line: 1, text: 'x' },
      { line: 2, text: 'y' },
    ]);
  });
  it('expands query.file placeholders', () => {
    const src = { path: 'notes/2026/week-38.md' };
    expect(expandPlaceholders('path includes {{query.file.path}}', src)).toBe('path includes notes/2026/week-38.md');
    expect(expandPlaceholders('folder includes {{ query.file.folder }}', src)).toBe('folder includes notes/2026/');
    expect(expandPlaceholders('filename includes {{query.file.filename}}', src)).toBe('filename includes week-38.md');
    expect(expandPlaceholders('{{query.file.filenameWithoutExtension}} {{query.file.root}}', src)).toBe('week-38 notes/');
    expect(expandPlaceholders('{{unknown.thing}}', src)).toBe('{{unknown.thing}}');
    expect(expandPlaceholders('{{query.file.folder}}', { path: 'top.md' })).toBe('/');
  });
});
