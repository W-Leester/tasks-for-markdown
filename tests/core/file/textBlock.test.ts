import { describe, expect, it } from 'vitest';
import { blockLines, blockText } from '../../../src/core/file/textBlock';

describe('block text (M39)', () => {
  it('takes the first line’s indent off every line and puts it back', () => {
    const lines = ['  - 항목', '    - 하위', '', '    이어진 글'];
    const b = blockText(lines);
    expect(b).toEqual({ indent: '  ', text: '- 항목\n  - 하위\n\n  이어진 글' });
    expect(blockLines(b.indent, b.text)).toEqual(lines);
    expect(blockLines('  ', '- 고친 항목\n  - 새 하위')).toEqual(['  - 고친 항목', '    - 새 하위']);
  });

  it('keeps a paragraph, a heading, a table and a code block as written; CRLF lines lose the \\r', () => {
    expect(blockText(['# 제목\r'])).toEqual({ indent: '', text: '# 제목' });
    expect(blockText(['| a | b |', '|---|---|', '| 1 | 2 |'])).toEqual({ indent: '', text: '| a | b |\n|---|---|\n| 1 | 2 |' });
    expect(blockText(['```js', '  let x = 1;', '```']).text).toBe('```js\n  let x = 1;\n```');
  });

  it('a lazy line indented less than the first keeps its text; blank lines are written empty', () => {
    expect(blockText(['    a', 'b']).text).toBe('a\nb');
    expect(blockLines('  ', 'a\n   \nb')).toEqual(['  a', '', '  b']);
  });
});
