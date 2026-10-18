import { describe, expect, it } from 'vitest';
import { insertAfterTask, newTaskLine } from '../../../src/core/file/insertAfterTask';

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
