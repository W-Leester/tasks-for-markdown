import { describe, expect, it } from 'vitest';
import { quoteLines, quoteText } from '../../../src/core/file/quoteBlock';

describe('quoteText / quoteLines (M38)', () => {
  it('strips one ">" and its space per line; blank quote lines become empty lines', () => {
    expect(quoteText(['> 답변:', '>', '>'])).toEqual({ indent: '', text: '답변:\n\n' });
    expect(quoteText(['>no space', '>  two spaces'])).toEqual({ indent: '', text: 'no space\n two spaces' });
  });

  it('keeps an inner quote one level down, takes CRLF off, brings lazy lines in', () => {
    expect(quoteText(['> outer', '> > inner'])!.text).toBe('outer\n> inner');
    expect(quoteText(['> a\r', '> b\r'])!.text).toBe('a\nb');
    expect(quoteText(['> first', 'lazy line'])!.text).toBe('first\nlazy line');
  });

  it('keeps the indentation of a quote inside a list item', () => {
    expect(quoteText(['  > note', '  > more'])).toEqual({ indent: '  ', text: 'note\nmore' });
    expect(quoteLines('  ', 'note\n\nmore')).toEqual(['  > note', '  >', '  > more']);
  });

  it('is null when the first line is not a quote line', () => {
    expect(quoteText(['- > on a bullet'])).toBeNull();
    expect(quoteText(['text'])).toBeNull();
    expect(quoteText([])).toBeNull();
  });

  it('writes "> " before each line, ">" for blank ones, and one ">" for nothing', () => {
    expect(quoteLines('', '답변: 동의합니다\n\n')).toEqual(['> 답변: 동의합니다', '>', '>']);
    expect(quoteLines('', '')).toEqual(['>']);
    expect(quoteLines('', 'a\r\nb')).toEqual(['> a', '> b']);
  });

  it('round-trips what it reads', () => {
    for (const lines of [['> 답변:', '>', '>'], ['> **굵게** 글', '> > 안쪽'], ['\t> tab']]) {
      const q = quoteText(lines)!;
      expect(quoteLines(q.indent, q.text)).toEqual(lines);
    }
  });
});
