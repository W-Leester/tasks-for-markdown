import { describe, expect, it } from 'vitest';
import { Query } from '../../../src/core/query';
import { indexFrom, today } from './Query.test';

const index = indexFrom({
  'work/report.md': [
    '# Reports',
    '- [ ] write report #work ⏫ 🆔 rep 📅 2026-09-25',
    '- [/] review draft #work #proj/a 🔼 ⏳ 2026-09-21',
    '- [x] tidy notes ✅ 2026-09-20',
    '- [-] dropped idea ❌ 2026-09-19',
    '## Later',
    '- [ ] plan q4 🔽 🛫 2026-10-01 📅 2026-10-15',
    '  - [ ] sub item of plan',
  ].join('\n'),
  'home/chores.md': [
    '- [ ] buy milk 🔁 every week 📅 2026-09-19',
    '- [ ] fix bike ⛔ rep',
    '- [ ] bad date 📅 2026-13-40',
    '- [ ] nothing here',
  ].join('\n'),
});
const run = (text: string, allowFunctions = false) => {
  const q = Query.parse(text);
  if (q.errors.length) throw new Error(q.errors.map((e) => e.message).join('; '));
  const r = q.run({ index, today, allowFunctions });
  // These tests check *which* tasks match, so present them in file order regardless of sorting.
  const all = index.all();
  return [...r.root.tasks].sort((a, b) => all.indexOf(a) - all.indexOf(b)).map((t) => t.description);
};
const errorOf = (text: string) => Query.parse(text).errors[0]?.message;

describe('status filters', () => {
  it('done / not done follow status types', () => {
    expect(run('done')).toEqual(['tidy notes', 'dropped idea']);
    expect(run('not done')).toHaveLength(8);
  });
  it('status.type / status.name / status.symbol', () => {
    expect(run('status.type is IN_PROGRESS')).toEqual(['review draft #work #proj/a']);
    expect(run('status.type is not TODO')).toHaveLength(3);
    expect(run('status.name includes progress')).toEqual(['review draft #work #proj/a']);
    expect(run('status.symbol includes -')).toEqual(['dropped idea']);
    expect(errorOf('status.type is WEIRD')).toContain('Unknown status type');
  });
});

describe('date filters', () => {
  it('single-date comparisons with natural language', () => {
    expect(run('due on 2026-09-25')).toEqual(['write report #work']);
    expect(run('due before today')).toEqual(['buy milk']);
    expect(run('due after today')).toEqual(['write report #work', 'plan q4']);
    expect(run('due on or before 2026-09-25')).toEqual(['write report #work', 'buy milk']);
    expect(run('due date on or after next friday')).toEqual(['write report #work', 'plan q4']);
    expect(run('scheduled on today')).toEqual(['review draft #work #proj/a']);
    expect(run('done before 2026-09-21')).toEqual(['tidy notes']);
    expect(run('cancelled on 2026-09-19')).toEqual(['dropped idea']);
    expect(run('start after this week')).toEqual(['plan q4']);
  });
  it('ranges', () => {
    expect(run('due this week')).toEqual(['write report #work']);
    expect(run('due in this week')).toEqual(['write report #work']);
    expect(run('due before this week')).toEqual(['buy milk']);
    expect(run('due after this week')).toEqual(['plan q4']);
    expect(run('due in or before 2026-W39')).toEqual(['write report #work', 'buy milk']);
    expect(run('due 2026-10')).toEqual(['plan q4']);
    expect(run('due in 2026-Q4')).toEqual(['plan q4']);
    expect(run('due 2026-09-19 2026-09-25')).toEqual(['write report #work', 'buy milk']);
  });
  it('happens uses the earliest of start/scheduled/due', () => {
    expect(run('happens before 2026-09-22')).toEqual(['review draft #work #proj/a', 'buy milk']);
    expect(run('happens after 2026-09-30')).toEqual(['plan q4']);
  });
  it('has / no / invalid', () => {
    expect(run('has due date')).toHaveLength(4); // invalid dates still count as present
    expect(run('no due date').length).toBe(10 - 4);
    expect(run('due date is invalid')).toEqual(['bad date']);
    expect(run('has start date')).toEqual(['plan q4']);
  });
  it('rejects gibberish dates', () => {
    expect(errorOf('due before whenever')).toContain('do not understand');
  });
});

describe('priority filters', () => {
  it('is / above / below / not', () => {
    expect(run('priority is high')).toEqual(['write report #work']);
    expect(run('priority is above medium')).toEqual(['write report #work']);
    expect(run('priority above none')).toEqual(['write report #work', 'review draft #work #proj/a']);
    expect(run('priority is below none')).toEqual(['plan q4']);
    expect(run('priority is not none')).toHaveLength(3);
    expect(run('priority is normal')).toHaveLength(7);
  });
});

describe('recurrence, dependency and structure filters', () => {
  it('recurring', () => {
    expect(run('is recurring')).toEqual(['buy milk']);
    expect(run('is not recurring')).toHaveLength(9);
    expect(run('recurrence includes week')).toEqual(['buy milk']);
  });
  it('blocked / blocking / ids', () => {
    expect(run('is blocked')).toEqual(['fix bike']);
    expect(run('is blocking')).toEqual(['write report #work']);
    expect(run('is not blocked')).toHaveLength(9);
    expect(run('has id')).toEqual(['write report #work']);
    expect(run('has depends on')).toEqual(['fix bike']);
    expect(run('no id').length).toBe(9);
    expect(run('id includes rep')).toEqual(['write report #work']);
  });
  it('exclude sub-items and tags presence', () => {
    expect(run('exclude sub-items')).toHaveLength(9);
    expect(run('has tags')).toEqual(['write report #work', 'review draft #work #proj/a']);
    expect(run('no tags')).toHaveLength(8);
  });
});

describe('text filters', () => {
  it('description includes / does not include (case-insensitive)', () => {
    expect(run('description includes REPORT')).toEqual(['write report #work']);
    expect(run('description does not include e')).toEqual(['plan q4', 'buy milk']);
  });
  it('regex with flags and error handling', () => {
    expect(run('description regex matches /^(write|plan)/i')).toEqual(['write report #work', 'plan q4']);
    expect(run('description regex does not match /e/')).toEqual(['plan q4', 'buy milk']);
    expect(errorOf('description regex matches notaregex')).toContain('/pattern/flags');
    expect(errorOf('description regex matches /(a+)+$/')).toContain('nested quantifiers');
  });
  it('heading, path, folder, filename, root', () => {
    expect(run('heading includes later')).toEqual(['plan q4', 'sub item of plan']);
    expect(run('heading does not include reports')).toHaveLength(6);
    expect(run('path includes home/')).toHaveLength(4);
    expect(run('folder includes work/')).toHaveLength(6);
    expect(run('filename includes chores.md')).toHaveLength(4);
    expect(run('root includes home/')).toHaveLength(4);
    expect(run('path regex matches /report\\.md$/')).toHaveLength(6);
  });
  it('tags', () => {
    expect(run('tags include #work')).toEqual(['write report #work', 'review draft #work #proj/a']);
    expect(run('tag includes proj')).toEqual(['review draft #work #proj/a']);
    expect(run('tags do not include #work')).toHaveLength(8);
    expect(run('tags regex matches /^#proj\\//')).toEqual(['review draft #work #proj/a']);
  });
});

describe('boolean combinations', () => {
  it('AND / OR / NOT / XOR with precedence and nesting', () => {
    expect(run('(priority is high) OR (priority is medium)')).toEqual(['write report #work', 'review draft #work #proj/a']);
    expect(run('(not done) AND (has due date)')).toEqual(['write report #work', 'plan q4', 'buy milk', 'bad date']);
    expect(run('NOT (has due date)')).toHaveLength(6);
    expect(run('due 2026-09-25')).toEqual(['write report #work']);
    expect(run('(has due date) AND NOT (priority is high)')).toEqual(['plan q4', 'buy milk', 'bad date']);
    expect(run('(done) OR NOT (has due date)')).toHaveLength(6);
    expect(run('(tags include #work) XOR (priority is high)')).toEqual(['review draft #work #proj/a']);
    expect(run('((priority is high) OR (priority is low)) AND (has due date)')).toEqual(['write report #work', 'plan q4']);
    expect(run('(has due date) AND (is recurring) OR (priority is low)')).toEqual(['plan q4', 'buy milk']);
  });
  it('explains dates with ordinal days, like Obsidian', () => {
    const q = Query.parse('due on 2026-10-04');
    expect(q.filters[0]!.explain).toContain('2026-10-04 (Sunday 4th October 2026)');
  });
  it('explains boolean structure', () => {
    const q = Query.parse('(priority is high) OR NOT (has due date)');
    expect(q.filters[0]!.explain).toBe('(priority is high) OR (NOT (has due date))');
  });
  it('reports errors inside operands and unbalanced parentheses', () => {
    expect(errorOf('(priority is high) OR (banana)')).toContain('Could not interpret');
    expect(errorOf('((priority is high) OR (done)')).toContain('Unbalanced');
  });
});

describe('multiple lines are ANDed', () => {
  it('combines filters', () => {
    expect(run('not done\nhas due date\npriority is above none')).toEqual(['write report #work']);
  });
});
