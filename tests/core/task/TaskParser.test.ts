import { describe, expect, it } from 'vitest';
import { Priority, StatusRegistry, StatusType, isTaskLine, parseTaskLine } from '../../../src/core/task';

const statusRegistry = StatusRegistry.default();
const parse = (line: string, globalFilter?: string) => parseTaskLine(line, { statusRegistry, globalFilter });

describe('task line recognition', () => {
  it.each([
    ['- [ ] todo', true],
    ['* [x] done', true],
    ['+ [/] doing', true],
    ['1. [ ] numbered', true],
    ['2) [ ] paren', true],
    ['  - [ ] indented', true],
    ['\t- [-] tab indented', true],
    ['- [ ]', true],
    ['- [ ] ', true],
    ['- [] no space in brackets', false],
    ['- [xx] two chars', false],
    ['-[ ] no space after marker', false],
    ['[ ] no marker', false],
    ['- plain list item', false],
    ['- [ ]no space after bracket', false],
    ['## heading', false],
  ])('%j -> %s', (line, expected) => {
    expect(isTaskLine(line)).toBe(expected);
    expect(parse(line) !== null).toBe(expected);
  });
});

describe('structure', () => {
  it('keeps indentation, marker, symbol and original line', () => {
    const t = parse('    * [/] doing it')!;
    expect(t.indentation).toBe('    ');
    expect(t.listMarker).toBe('*');
    expect(t.status.symbol).toBe('/');
    expect(t.status.type).toBe(StatusType.IN_PROGRESS);
    expect(t.description).toBe('doing it');
    expect(t.originalMarkdown).toBe('    * [/] doing it');
  });

  it('handles an empty description', () => {
    expect(parse('- [ ]')!.description).toBe('');
    expect(parse('- [ ] 📅 2026-01-01')!.description).toBe('');
  });

  it('unknown status symbols become TODO placeholders', () => {
    const t = parse('- [?] question')!;
    expect(t.status.type).toBe(StatusType.TODO);
    expect(t.status.symbol).toBe('?');
  });
});

describe('emoji fields', () => {
  const line =
    '- [ ] 보고서 작성 #work ⏫ 🔁 every week when done 🏁 delete 🆔 a1b2c3 ⛔ x1,y2 ➕ 2026-09-15 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25 ✅ 2026-09-26 ❌ 2026-09-27 ^blk1';

  it('parses every field', () => {
    const t = parse(line)!;
    expect(t.description).toBe('보고서 작성 #work');
    expect(t.tags).toEqual(['#work']);
    expect(t.priority).toBe(Priority.High);
    expect(t.recurrenceText).toBe('every week when done');
    expect(t.onCompletion).toBe('delete');
    expect(t.id).toBe('a1b2c3');
    expect(t.dependsOn).toEqual(['x1', 'y2']);
    expect(t.created!.format()).toBe('2026-09-15');
    expect(t.start!.format()).toBe('2026-09-20');
    expect(t.scheduled!.format()).toBe('2026-09-22');
    expect(t.due!.format()).toBe('2026-09-25');
    expect(t.done!.format()).toBe('2026-09-26');
    expect(t.cancelled!.format()).toBe('2026-09-27');
    expect(t.blockLink).toBe('blk1');
  });

  it('accepts fields in any order', () => {
    const t = parse('- [x] shuffled ✅ 2026-09-26 📅 2026-09-25 🆔 abc ⏬ 🔁 every day')!;
    expect(t.description).toBe('shuffled');
    expect(t.priority).toBe(Priority.Lowest);
    expect(t.recurrenceText).toBe('every day');
    expect(t.id).toBe('abc');
    expect(t.due!.format()).toBe('2026-09-25');
    expect(t.done!.format()).toBe('2026-09-26');
  });

  it('accepts alternate emoji and variation selectors', () => {
    const t = parse('- [ ] alt ⌛ 2026-01-02 📆 2026-01-03 🗓️ 2026-01-04')!;
    expect(t.scheduled!.format()).toBe('2026-01-02');
    // last write wins for the same field when duplicated
    expect(t.due!.format()).toBe('2026-01-03');
  });

  it('all priority emoji', () => {
    expect(parse('- [ ] a 🔺')!.priority).toBe(Priority.Highest);
    expect(parse('- [ ] a ⏫')!.priority).toBe(Priority.High);
    expect(parse('- [ ] a 🔼')!.priority).toBe(Priority.Medium);
    expect(parse('- [ ] a 🔽')!.priority).toBe(Priority.Low);
    expect(parse('- [ ] a ⏬')!.priority).toBe(Priority.Lowest);
    expect(parse('- [ ] a')!.priority).toBe(Priority.None);
  });

  it('keeps invalid dates as invalid fields', () => {
    const t = parse('- [ ] bad 📅 2026-13-40')!;
    expect(t.description).toBe('bad');
    expect(t.due!.valid).toBe(false);
    expect(t.due!.raw).toBe('2026-13-40');
  });

  it('leaves non-date text after a date emoji in the description', () => {
    const t = parse('- [ ] due 📅 tomorrow')!;
    expect(t.due).toBeNull();
    expect(t.description).toBe('due 📅 tomorrow');
  });

  it('moves trailing tags back into the description', () => {
    const t = parse('- [ ] write 📅 2026-09-25 #work #proj/a')!;
    expect(t.due!.format()).toBe('2026-09-25');
    expect(t.description).toBe('write #work #proj/a');
    expect(t.tags).toEqual(['#work', '#proj/a']);
  });

  it('a description that is only a tag still works', () => {
    const t = parse('- [ ] #task 📅 2026-09-25')!;
    expect(t.description).toBe('#task');
    expect(t.due!.format()).toBe('2026-09-25');
  });

  it('preserves inline markdown in the description', () => {
    const t = parse('- [ ] see [[Note]] and **bold** `code` [link](http://x.io/#a) 📅 2026-09-25')!;
    expect(t.description).toBe('see [[Note]] and **bold** `code` [link](http://x.io/#a)');
    expect(t.tags).toEqual([]);
  });
});

describe('dataview fields', () => {
  it('parses bracket fields', () => {
    const t = parse(
      '- [ ] dv [priority:: high] [repeat:: every week] [onCompletion:: keep] [id:: q1] [dependsOn:: a, b] [created:: 2026-09-15] [start:: 2026-09-20] [scheduled:: 2026-09-22] [due:: 2026-09-25] [completion:: 2026-09-26] [cancelled:: 2026-09-27]',
    )!;
    expect(t.description).toBe('dv');
    expect(t.priority).toBe(Priority.High);
    expect(t.recurrenceText).toBe('every week');
    expect(t.onCompletion).toBe('keep');
    expect(t.id).toBe('q1');
    expect(t.dependsOn).toEqual(['a', 'b']);
    expect(t.created!.format()).toBe('2026-09-15');
    expect(t.start!.format()).toBe('2026-09-20');
    expect(t.scheduled!.format()).toBe('2026-09-22');
    expect(t.due!.format()).toBe('2026-09-25');
    expect(t.done!.format()).toBe('2026-09-26');
    expect(t.cancelled!.format()).toBe('2026-09-27');
  });

  it('accepts parentheses and mixed formats on one line', () => {
    const t = parse('- [ ] mixed 📅 2026-09-25 (priority:: Lowest) 🆔 z9')!;
    expect(t.due!.format()).toBe('2026-09-25');
    expect(t.priority).toBe(Priority.Lowest);
    expect(t.id).toBe('z9');
    expect(t.description).toBe('mixed');
  });

  it('does not treat unrelated bracket text as a field', () => {
    const t = parse('- [ ] keep [note:: something] [due:: soon]')!;
    expect(t.due).toBeNull();
    expect(t.description).toBe('keep [note:: something] [due:: soon]');
  });
});

describe('global filter', () => {
  it('rejects lines without the filter and keeps the description intact', () => {
    expect(parse('- [ ] no filter here', '#task')).toBeNull();
    const t = parse('- [ ] #task with filter 📅 2026-09-25', '#task')!;
    expect(t.description).toBe('#task with filter');
  });
});

describe('robustness', () => {
  it('handles CRLF and trailing whitespace', () => {
    const t = parse('- [ ] crlf 📅 2026-09-25   \r')!;
    expect(t.due!.format()).toBe('2026-09-25');
    expect(t.description).toBe('crlf');
  });

  it('does not loop forever on many fields', () => {
    const many = '- [ ] x ' + '🆔 a '.repeat(30);
    expect(() => parse(many)).not.toThrow();
  });
});
