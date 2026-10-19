import { describe, expect, it } from 'vitest';
import { insertAfterTask, insertUnderTask, newTaskLine, placeTaskLine } from '../../../src/core/file/insertAfterTask';

describe('insertAfterTask (M27)', () => {
  it('goes right below a plain task, same bullet and depth', () => {
    expect(insertAfterTask(['# h', '- [ ] a', '- [ ] b'], 1)).toEqual({ after: 1, prefix: '- [ ] ' });
    expect(insertAfterTask(['* [x] done'], 0)).toEqual({ after: 0, prefix: '* [ ] ' });
    expect(insertAfterTask(['  - [ ] nested'], 0)).toEqual({ after: 0, prefix: '  - [ ] ' });
    expect(insertAfterTask(['\t- [/] tab'], 0)).toEqual({ after: 0, prefix: '\t- [ ] ' });
  });

  it('skips the task\'s notes and nested items, stopping at a sibling, a dedent or a blank line', () => {
    const lines = ['- [ ] parent', '  - a note', '  - [ ] child', '    - deeper', '- [ ] sibling'];
    expect(insertAfterTask(lines, 0)!.after).toBe(3);
    expect(insertAfterTask(lines, 2)).toEqual({ after: 3, prefix: '  - [ ] ' });
    expect(insertAfterTask(['- [ ] a', '  - note', '', '  indented after blank'], 0)!.after).toBe(1);
    expect(insertAfterTask(['- [ ] last', '  - note'], 0)!.after).toBe(1);
  });

  it('numbers the next item of an ordered list', () => {
    expect(insertAfterTask(['1. [ ] one', '2. [ ] two'], 0)!.prefix).toBe('2. [ ] ');
    expect(insertAfterTask(['9) [x] nine'], 0)!.prefix).toBe('10) [ ] ');
  });

  it('is undefined on a line that is not a task', () => {
    expect(insertAfterTask(['- plain bullet'], 0)).toBeUndefined();
    expect(insertAfterTask(['text'], 0)).toBeUndefined();
    expect(insertAfterTask([], 3)).toBeUndefined();
  });

  it('builds the line from what was typed', () => {
    const at = { after: 0, prefix: '  - [ ] ' };
    expect(newTaskLine(at, 'Write report 📅 2026-10-20')).toBe('  - [ ] Write report 📅 2026-10-20');
    expect(newTaskLine(at, '  - [x] already a task  ')).toBe('  - [x] already a task');
    expect(newTaskLine(at, 'two\nlines')).toBe('  - [ ] two lines');
    expect(newTaskLine({ after: 0, prefix: '- [ ] ' }, '보고서 작성 #업무')).toBe('- [ ] 보고서 작성 #업무');
  });
});

describe('insertUnderTask (M32): as the last subtask', () => {
  const doc = ['- [ ] 보고서 작성', '  - 메모: 3장까지', '  - [ ] 자료 조사', '    - 출처 정리', '- [ ] 발표 준비'];

  it('goes after the whole block, at the depth and with the bullet of the existing children', () => {
    expect(insertUnderTask(doc, 0)).toEqual({ after: 3, prefix: '  - [ ] ' });
    expect(insertUnderTask(['* [ ] a', '    * note'], 0)).toEqual({ after: 1, prefix: '    * [ ] ' });
  });

  it('without children: one level deeper than the task, under its text', () => {
    expect(insertUnderTask(['- [ ] a', '- [ ] b'], 0)).toEqual({ after: 0, prefix: '  - [ ] ' });
    expect(insertUnderTask(['  - [ ] nested'], 0)).toEqual({ after: 0, prefix: '    - [ ] ' });
    expect(insertUnderTask(['1. [ ] one'], 0)).toEqual({ after: 0, prefix: '   - [ ] ' });
    expect(insertUnderTask(['\t- [ ] tab'], 0)).toEqual({ after: 0, prefix: '\t\t- [ ] ' });
  });

  it('numbers after the last numbered child', () => {
    expect(insertUnderTask(['- [ ] a', '  1. [ ] x', '  2. [ ] y', '- [ ] b'], 0)).toEqual({ after: 2, prefix: '  3. [ ] ' });
  });

  it('is undefined on a line that is not a task', () => {
    expect(insertUnderTask(['- plain'], 0)).toBeUndefined();
  });
});

describe('placeTaskLine (M32)', () => {
  it('puts a written task line at the place, keeping its status and text', () => {
    expect(placeTaskLine({ after: 3, prefix: '  - [ ] ' }, '- [ ] 후속 📅 2026-10-26')).toBe('  - [ ] 후속 📅 2026-10-26');
    expect(placeTaskLine({ after: 0, prefix: '3. [ ] ' }, '- [/] doing')).toBe('3. [/] doing');
    expect(placeTaskLine({ after: 0, prefix: '\t* [ ] ' }, '  - [x] done ✅ 2026-10-19')).toBe('\t* [x] done ✅ 2026-10-19');
  });
});

