import { describe, expect, it } from 'vitest';
import { StatusRegistry, hasTaskFields, listGroups, parseTaskLine } from '../../../src/core/task';

const reg = StatusRegistry.default();
const parse = (l: string) => parseTaskLine(l, { statusRegistry: reg })!;

describe('plain checklists vs task lists (11-02)', () => {
  it('hasTaskFields: dates, priority, recurrence, id, dependency, on completion count; tags and text do not', () => {
    expect(hasTaskFields(parse('- [ ] Answer: a'))).toBe(false);
    expect(hasTaskFields(parse('- [ ] call #home'))).toBe(false);
    expect(hasTaskFields(parse('- [x] done thing'))).toBe(false);
    for (const l of ['- [ ] a 📅 2026-10-01', '- [ ] a ⏳ 2026-10-01', '- [ ] a ➕ 2026-10-01', '- [x] a ✅ 2026-10-01', '- [ ] a ⏫', '- [ ] a 🔽', '- [ ] a 🔁 every day', '- [ ] a 🆔 x1', '- [ ] a ⛔ x1', '- [ ] a 🏁 delete']) {
      expect(hasTaskFields(parse(l)), l).toBe(true);
    }
  });

  it('listGroups: one group per top-level list; blank lines inside a list, text and headings end it; code is outside', () => {
    const lines = [
      '# Q', //            0
      '- [ ] a', //        1
      '  - note', //       2
      '', //               3
      '- [ ] b', //        4
      '', //               5
      'text', //           6
      '- [ ] c', //        7
      '#### Q2', //        8
      '1. [ ] d', //       9
      '```', //            10
      '- [ ] in code', //  11
      '```', //            12
      '- [ ] e', //        13
    ];
    const g = listGroups(lines);
    expect(g[0]).toBe(-1);
    expect(g[1]).toBe(g[2]);
    expect(g[3]).toBe(g[1]);
    expect(g[4]).toBe(g[1]);
    expect(g[5]).toBe(-1);
    expect(g[6]).toBe(-1);
    expect(g[7]).not.toBe(g[1]);
    expect(g[7]).toBeGreaterThanOrEqual(0);
    expect(g[8]).toBe(-1);
    expect(g[9]).not.toBe(g[7]);
    expect(g[11]).toBe(-1);
    expect(g[13]).toBeGreaterThan(g[9]!);
  });

  it('another kind of mark starts a new list, as in Markdown', () => {
    expect(listGroups(['- a', '- b', '', '* c', '+ d', '1. e', '2. f', '3) g'])).toEqual([0, 0, 0, 1, 2, 3, 3, 4]);
  });
});
