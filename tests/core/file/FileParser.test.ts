import { describe, expect, it } from 'vitest';
import { parseFile } from '../../../src/core/file';
import { StatusRegistry } from '../../../src/core/task';

const statusRegistry = StatusRegistry.default();
const parse = (text: string, globalFilter?: string) => parseFile(text, { path: 'notes/a.md', statusRegistry, globalFilter });
const descs = (text: string) => parse(text).tasks.map((t) => t.description);

describe('parseFile — exclusions', () => {
  it('skips fenced code blocks (``` and ~~~, longer fences, indented fences)', () => {
    const text = [
      '- [ ] before',
      '```',
      '- [ ] in backticks',
      '```',
      '~~~md',
      '- [ ] in tildes',
      '~~~',
      '````',
      '```',
      '- [ ] nested fence still inside',
      '```',
      '````',
      '- list',
      '  ```',
      '  - [ ] inside indented fence',
      '  ```',
      '- [ ] after',
    ].join('\n');
    expect(descs(text)).toEqual(['before', 'after']);
  });

  it('skips front matter and reads its tags', () => {
    const text = ['---', 'title: x', 'tags: [work, "proj/a"]', '---', '- [ ] one'].join('\n');
    const r = parse(text);
    expect(r.frontmatterTags).toEqual(['#work', '#proj/a']);
    expect(r.tasks[0]!.location.frontmatterTags).toEqual(['#work', '#proj/a']);
    expect(descs(text)).toEqual(['one']);
  });

  it.each([
    ['tags: a, b', ['#a', '#b']],
    ['tags: a b', ['#a', '#b']],
    ['tags:\n  - a\n  - "#b"', ['#a', '#b']],
    ['tag: solo', ['#solo']],
    ['tags: []', []],
  ])('front matter %j -> %j', (fm, expected) => {
    expect(parse(`---\n${fm}\n---\n- [ ] t`).frontmatterTags).toEqual(expected);
  });

  it('does not treat a --- later in the file as front matter', () => {
    const text = ['- [ ] a', '---', 'tags: [x]', '---', '- [ ] b'].join('\n');
    expect(descs(text)).toEqual(['a', 'b']);
    expect(parse(text).frontmatterTags).toEqual([]);
  });

  it('skips multi-line html comments but keeps single-line ones', () => {
    const text = ['<!--', '- [ ] hidden', '-->', '- [ ] shown <!-- note -->', '<!-- start', '- [ ] hidden 2', 'end -->', '- [ ] last'].join('\n');
    expect(descs(text)).toEqual(['shown <!-- note -->', 'last']);
  });

  it('applies the global filter', () => {
    expect(descs('- [ ] #task a\n- [ ] b')).toEqual(['#task a', 'b']);
    expect(parse('- [ ] #task a\n- [ ] b', '#task').tasks.map((t) => t.description)).toEqual(['#task a']);
  });

  it('handles CRLF files', () => {
    expect(descs('- [ ] a\r\n- [ ] b\r\n')).toEqual(['a', 'b']);
  });
});

describe('parseFile — location', () => {
  it('records path, line and nearest preceding heading of any level', () => {
    const text = ['# Top', '- [ ] a', '## Sub', '- [ ] b', 'text', '- [ ] c', '### Deep #', '- [ ] d'].join('\n');
    const r = parse(text);
    expect(r.tasks.map((t) => [t.location.line, t.location.heading])).toEqual([
      [1, 'Top'],
      [3, 'Sub'],
      [5, 'Sub'],
      [7, 'Deep'],
    ]);
    expect(r.tasks[0]!.location.path).toBe('notes/a.md');
    expect(r.headings.map((h) => [h.level, h.text])).toEqual([[1, 'Top'], [2, 'Sub'], [3, 'Deep']]);
    expect(descs('- [ ] no heading')).toEqual(['no heading']);
    expect(parse('- [ ] no heading').tasks[0]!.location.heading).toBeNull();
  });

  it('computes depth and parent for nested items (spaces, tabs, non-task parents)', () => {
    const text = ['- [ ] root', '  - [ ] child', '    - [ ] grandchild', '\t- [ ] tab child', '- plain parent', '  - [ ] under plain', '- [ ] root 2'].join('\n');
    const r = parse(text);
    expect(r.tasks.map((t) => [t.description, t.location.depth, t.location.parentLine])).toEqual([
      ['root', 0, null],
      ['child', 1, 0],
      ['grandchild', 2, 1],
      ['tab child', 2, 1], // a tab counts as 4 columns, so it is a sibling of grandchild
      ['under plain', 1, 4],
      ['root 2', 0, null],
    ]);
  });

  it('a heading or paragraph ends the list nesting; blank lines do not', () => {
    const text = ['- [ ] a', '  - [ ] b', '', '  - [ ] c', '# H', '  - [ ] d', 'para', '  - [ ] e'].join('\n');
    const r = parse(text);
    expect(r.tasks.map((t) => [t.description, t.location.depth])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 1],
      ['d', 0],
      ['e', 0],
    ]);
  });
});
