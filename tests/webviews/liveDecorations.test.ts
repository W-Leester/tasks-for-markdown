import { describe, expect, it } from 'vitest';
import { ensureSyntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorSelection, EditorState } from '@codemirror/state';
import { activeLines, findBlocks, findQueryBlocks, type LiveDeco, liveDecos } from '../../src/webviews/live/decorations';

const state = (text: string, cursor = 0) => {
  const s = EditorState.create({ doc: text, selection: EditorSelection.cursor(cursor), extensions: [markdown({ base: markdownLanguage })] });
  ensureSyntaxTree(s, s.doc.length, 5000);
  return s;
};
/** Decorations as readable strings: `hide:"## "`, `task:x@2`… */
const show = (s: EditorState, ds: LiveDeco[]) => ds.map((d) => {
  const text = 'to' in d ? JSON.stringify(s.doc.sliceString(d.from, d.to)) : '';
  if (d.kind === 'line') return `line:${d.cls}@${s.doc.lineAt(d.from).number}`;
  if (d.kind === 'task') return `task:${d.checked ? 'x' : ' '}@${d.line}`;
  if (d.kind === 'actions') return `actions@${d.line}${d.dated ? ' dated' : ''}`;
  if (d.kind === 'mark') return `mark:${d.cls}:${text}${d.href !== undefined ? `->${d.href}` : ''}`;
  return `${d.kind}:${text}`;
});

describe('live view decorations (M40)', () => {
  it('hides heading, emphasis, code and strike marks off the cursor line; shows them on it', () => {
    const text = '## 제목\n\n**굵게** *기울임* `코드` ~~취소~~\n';
    const s = state(text);
    expect(show(s, liveDecos(s, new Set()))).toEqual([
      'line:cm-lv-h2@1', 'hide:"## "',
      'hide:"**"', 'hide:"**"', 'hide:"*"', 'hide:"*"', 'mark:cm-lv-code:"`코드`"', 'hide:"`"', 'hide:"`"', 'hide:"~~"', 'hide:"~~"',
    ]);
    // The cursor on line 3: its marks show; the heading's are still hidden.
    const on = show(s, liveDecos(s, new Set([3])));
    expect(on).toEqual(['line:cm-lv-h2@1', 'hide:"## "', 'mark:cm-lv-code:"`코드`"']);
  });

  it('tasks become checkboxes (with their bullet), plain bullets •, numbers stay', () => {
    const s = state('- [ ] 할 일 📅 2026-11-05\n- [x] 끝남\n- 그냥\n1. 하나\n');
    expect(show(s, liveDecos(s, new Set()))).toEqual(['task: @0', 'actions@0 dated', 'task:x@1', 'actions@1', 'bullet:"-"']);
    // On the cursor's line the task is written out, and its buttons stay.
    expect(show(s, liveDecos(s, new Set([1])))).toEqual(['actions@0 dated', 'task:x@1', 'actions@1', 'bullet:"-"']);
    expect(liveDecos(s, new Set())[0]).toMatchObject({ from: 0, to: 6 }); // "- [ ] " in one
  });

  it('a plain bullet right under a task is a note (💬); one under a plain item is a bullet', () => {
    const s = state('- [ ] 할 일\n  - 메모\n- 그냥\n  - 하위\n');
    const bullets = liveDecos(s, new Set()).filter((d) => d.kind === 'bullet').map((d) => `${s.doc.lineAt(d.from).number}:${'note' in d && d.note ? 'note' : 'bullet'}`);
    expect(bullets).toEqual(['2:note', '3:bullet', '4:bullet']);
  });

  it('links show only their text, carrying the address; bare URLs are links too', () => {
    const s = state('[문서](docs/a.md#제목 "t") 와 https://example.com\n');
    expect(show(s, liveDecos(s, new Set()))).toEqual(['hide:"["', 'mark:cm-lv-link:"문서"->docs/a.md#제목', 'hide:"](docs/a.md#제목 \\"t\\")"', 'mark:cm-lv-link:"https://example.com"->https://example.com']);
  });

  it('quotes, code blocks, tables and rules style their lines; a rule is hidden off the cursor line', () => {
    const s = state('> 인용\n> 둘\n\n```js\nx\n```\n\n| a |\n|---|\n\n---\n');
    expect(show(s, liveDecos(s, new Set()))).toEqual([
      'line:cm-lv-quote@1', 'line:cm-lv-quote@2', 'hide:"> "', 'hide:"> "',
      'line:cm-lv-codeblock@4', 'line:cm-lv-codeblock@5', 'line:cm-lv-codeblock@6', 'line:cm-lv-markline@4', 'hide:"```js"', 'line:cm-lv-markline@6', 'hide:"```"',
      'line:cm-lv-table@8', 'line:cm-lv-table@9',
      'line:cm-lv-hr@11', 'hide:"---"',
    ]);
  });

  it('active lines are those a selection touches, none when the editor is not focused', () => {
    const s = EditorState.create({ doc: 'a\nb\nc\nd', selection: EditorSelection.range(2, 5) });
    expect([...activeLines(s, true)]).toEqual([2, 3]);
    expect(activeLines(s, false).size).toBe(0);
  });

  it('finds ```tasks blocks (whole lines, the source between the fences); other fences and unclosed ones are not', () => {
    const s = state('a\n```tasks\nnot done\ndue today\n```\n```js\nx\n```\n~~~~tasks\n~~~\n~~~~\n```tasks\nopen');
    const blocks = findQueryBlocks(s).map((b) => ({ text: s.doc.sliceString(b.from, b.to), source: b.source, body: s.doc.lineAt(b.body).number }));
    expect(blocks).toEqual([
      { text: '```tasks\nnot done\ndue today\n```', source: 'not done\ndue today', body: 3 },
      { text: '~~~~tasks\n~~~\n~~~~', source: '~~~', body: 10 },
    ]);
  });

  it('an image off the cursor line is shown as the image (M40 F); on the cursor line it stays as written', () => {
    const s = state('글\n\n![그림 하나](<img/a b.png>) 끝\n');
    const ds = liveDecos(s, new Set());
    const img = ds.find((d) => d.kind === 'image');
    expect(img).toMatchObject({ kind: 'image', src: 'img/a b.png', alt: '그림 하나' });
    expect(s.doc.sliceString(img!.from, img!.to)).toBe('![그림 하나](<img/a b.png>)');
    expect(liveDecos(s, new Set([3])).some((d) => d.kind === 'image')).toBe(false);
  });

  it('findBlocks: whole-line runs equal to a block source; overlaps keep the first', () => {
    const lines = ['x', '| a |', '|---|', '| 1 |', '', '| a |', '|---|', '| 1 |', 'y'];
    expect(findBlocks(lines, ['| a |\n|---|\n| 1 |'])).toEqual([
      { first: 2, last: 4, source: '| a |\n|---|\n| 1 |' },
      { first: 6, last: 8, source: '| a |\n|---|\n| 1 |' },
    ]);
    expect(findBlocks(lines, ['| a |\n|---|\n| 2 |'])).toEqual([]);
    expect(findBlocks(['a', 'b', 'c'], ['a\nb\nc', 'b'])).toEqual([{ first: 1, last: 3, source: 'a\nb\nc' }]);
  });

  it('any one character in the box is a task, not a link; notes go by it too (11-04)', () => {
    const s = state('- [/] going 📅 2026-12-03\n  - its note\n- [-] dropped\n- [x](http://a.b) a link');
    const ds = liveDecos(s, new Set());
    expect(ds.filter((d) => d.kind === 'task').map((d) => [s.doc.lineAt(d.from).number, 'checked' in d && d.checked])).toEqual([[1, false], [3, true]]);
    expect(ds.filter((d) => d.kind === 'actions').length).toBe(2);
    expect(ds.some((d) => d.kind === 'bullet' && d.note)).toBe(true);
    // On the cursor's line the box reads as written, not as a link.
    expect(liveDecos(s, new Set([1])).some((d) => d.kind === 'mark' && d.cls === 'cm-lv-nolink' && d.from === 2)).toBe(true);
  });

  it('nested items: their spaces become a margin; a numbered item under a task is a note', () => {
    const s = state('- [ ] parent\n  - [ ] child\n    - [ ] grandchild\n  1. numbered note');
    const ds = liveDecos(s, new Set());
    expect(ds.filter((d) => d.kind === 'indent').map((d) => [s.doc.lineAt(d.from).number, 'depth' in d && d.depth])).toEqual([[2, 1], [3, 2], [4, 1]]);
    expect(ds.some((d) => d.kind === 'bullet' && d.note && s.doc.lineAt(d.from).number === 4)).toBe(true);
  });

  it('an empty task still gets its box', () => {
    const s = state('- [ ] \n- [ ]');
    expect(liveDecos(s, new Set()).filter((d) => d.kind === 'task').map((d) => [d.from, d.to])).toEqual([[0, 6], [7, 12]]);
  });

  it('marks hidden: autolink brackets, a hard break, a setext underline, fence lines off the cursor', () => {
    const s = state('<https://a.b> x\\\ny\n\nTitle\n---\n\n~~~\ncode\n~~~');
    const hidden = liveDecos(s, new Set()).filter((d) => d.kind === 'hide').map((d) => s.doc.sliceString(d.from, d.to));
    expect(hidden).toEqual(['<', '>', '\\', '---', '~~~', '~~~']);
    // The cursor anywhere in the block: all of it as written.
    expect(liveDecos(s, new Set([8])).filter((d) => d.kind === 'hide').map((d) => s.doc.sliceString(d.from, d.to))).toEqual(['<', '>', '\\', '---']);
  });

  it('[text] is a link only when the note defines it; a footnote mark stays text', () => {
    const s = state('[a][ref] and [ref] and [none] and [^1]\n\n[ref]: https://a.b\n[^1]: note');
    const ds = liveDecos(s, new Set());
    expect(ds.filter((d) => d.kind === 'mark' && d.cls === 'cm-lv-link' && d.href === 'https://a.b' && s.doc.lineAt(d.from).number === 1).map((d) => s.doc.sliceString(d.from, d.to))).toEqual(['a', 'ref']);
    expect(ds.filter((d) => d.kind === 'mark' && d.cls === 'cm-lv-nolink').map((d) => s.doc.sliceString(d.from, d.to))).toEqual(['[none]', '[^1]']);
  });
});
