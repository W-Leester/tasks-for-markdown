import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import { Query } from '../../../src/core/query';
import { StatusRegistry } from '../../../src/core/task';

export const reg = StatusRegistry.default();
export const today = dayjs('2026-09-21');
export function indexFrom(files: Record<string, string>): TaskIndex {
  const idx = new TaskIndex();
  for (const [path, text] of Object.entries(files)) {
    const r = parseFile(text, { path, statusRegistry: reg });
    idx.setFile({ key: path, path, tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags }, true);
  }
  return idx;
}
const ctx = (index: TaskIndex) => ({ index, today, allowFunctions: false });

describe('Query skeleton', () => {
  const index = indexFrom({ 'a.md': '- [ ] one\n- [ ] two\n- [ ] three' });

  it('an empty query matches everything', () => {
    const q = Query.parse('');
    const r = q.run(ctx(index));
    expect(r.errors).toEqual([]);
    expect(r.matched).toBe(3);
    expect(r.root.tasks.map((t) => t.description)).toEqual(['one', 'two', 'three']);
    expect(r.explain).toContain('No filters supplied');
  });

  it('reports unknown instructions with line numbers and matches nothing', () => {
    const q = Query.parse('# comment\nnonsense here\nlimit 1');
    expect(q.errors).toEqual([{ line: 2, text: 'nonsense here', message: 'Unknown instruction' }]);
    expect(q.run(ctx(index)).matched).toBe(0);
    expect(q.explain()).toContain('Error on line 2');
  });

  it('parses limits and layout instructions', () => {
    const q = Query.parse('limit 2\nlimit groups to 3\nshort mode\nhide priority\nshow due date\nexplain\nhide nested backlink');
    expect(q.errors).toEqual([]);
    expect(q.limit).toBe(2);
    expect(q.groupLimit).toBe(3);
    expect(q.layout.shortMode).toBe(true);
    expect(q.layout.hidden.has('priority')).toBe(true);
    expect(q.layout.explain).toBe(true);
    expect(q.layout.hideNestedBacklink).toBe(true);
    expect(q.run(ctx(index)).shown).toBe(2);
  });

  it('rejects unknown layout elements', () => {
    const q = Query.parse('hide banana');
    expect(q.errors[0]!.message).toContain('Unknown layout element');
  });
});
