import { describe, expect, it } from 'vitest';
import { Query, type GroupNode } from '../../../src/core/query';
import { indexFrom, today } from './Query.test';

const index = indexFrom({
  'work/report.md': [
    '# Reports',
    '- [ ] write report #work ⏫ 📅 2026-09-25',
    '- [/] review draft #work #proj/a 🔼 ⏳ 2026-09-21',
    '- [x] tidy notes ✅ 2026-09-20',
    '## Later',
    '- [ ] plan q4 🔽 📅 2026-10-15',
  ].join('\n'),
  'home/chores.md': ['- [ ] buy milk 🔁 every week 📅 2026-09-19', '- [ ] Zebra task', '- [ ] apple task'].join('\n'),
});
const names = (text: string) => {
  const q = Query.parse(text);
  if (q.errors.length) throw new Error(q.errors.map((e) => e.message).join('; '));
  return q.run({ index, today, allowFunctions: false }).root.tasks.map((t) => t.description);
};
const groups = (text: string): GroupNode => {
  const q = Query.parse(text);
  if (q.errors.length) throw new Error(q.errors.map((e) => e.message).join('; '));
  return q.run({ index, today, allowFunctions: false }).root;
};

describe('sorting', () => {
  it('default order: status.type, urgency, due, priority, path', () => {
    expect(names('')).toEqual(['review draft #work #proj/a', 'write report #work', 'buy milk', 'plan q4', 'Zebra task', 'apple task', 'tidy notes']);
  });
  it('sort by due (missing last) and reverse', () => {
    expect(names('sort by due')).toEqual(['buy milk', 'write report #work', 'plan q4', 'review draft #work #proj/a', 'Zebra task', 'apple task', 'tidy notes']);
    expect(names('sort by due reverse').slice(-3)).toEqual(['plan q4', 'write report #work', 'buy milk']); // reverse also flips the 'missing last' rule
  });
  it('sort by description ignores case and leading markdown', () => {
    expect(names('sort by description')).toEqual(['apple task', 'buy milk', 'plan q4', 'review draft #work #proj/a', 'tidy notes', 'write report #work', 'Zebra task']);
  });
  it('sort by priority, status.type, path, happens, urgency', () => {
    expect(names('sort by priority')[0]).toBe('write report #work');
    expect(names('sort by status.type').at(-1)).toBe('tidy notes');
    expect(names('sort by path')[0]).toBe('buy milk');
    expect(names('sort by happens')[0]).toBe('buy milk');
    expect(names('sort by urgency')[0]).toBe('write report #work');
  });
  it('multiple sort lines stack in order', () => {
    expect(names('sort by status.type\nsort by description').slice(0, 2)).toEqual(['review draft #work #proj/a', 'apple task']);
  });
  it('random is stable for the same query', () => {
    expect(names('sort by random')).toEqual(names('sort by random'));
  });
  it('rejects unknown fields', () => {
    expect(Query.parse('sort by banana').errors[0]!.message).toContain('Unknown sort field');
  });
});

describe('grouping', () => {
  it('group by due produces dated headings with "No due date" last-ish (sorted by name)', () => {
    const g = groups('group by due');
    expect(g.children.map((c) => c.name)).toEqual(['2026-09-19 Saturday', '2026-09-25 Friday', '2026-10-15 Thursday', 'No due date']);
    expect(g.count).toBe(7);
    expect(g.children[0]!.tasks.map((t) => t.description)).toEqual(['buy milk']);
  });
  it('group by tags puts a task in each tag group', () => {
    const g = groups('group by tags');
    expect(g.children.map((c) => [c.name, c.count])).toEqual([
      ['#proj/a', 1],
      ['#work', 2],
      ['(No tags)', 5],
    ]);
  });
  it('group by priority / status.type / folder / filename / heading / backlink', () => {
    expect(groups('group by priority').children.map((c) => c.name)).toEqual(['Priority 1: High', 'Priority 2: Medium', 'Priority 3: None', 'Priority 4: Low']);
    expect(groups('group by status.type').children.map((c) => c.name)).toEqual(['1 IN_PROGRESS', '2 TODO', '4 DONE']);
    expect(groups('group by folder').children.map((c) => c.name)).toEqual(['home/', 'work/']);
    expect(groups('group by filename').children.map((c) => c.name)).toEqual(['chores', 'report']);
    expect(groups('group by heading').children.map((c) => c.name)).toEqual(['Later', 'Reports', '(No heading)']);
    expect(groups('group by backlink').children.map((c) => c.name)).toEqual(['chores', 'report > Later', 'report > Reports']);
  });
  it('nested groups and reverse', () => {
    const g = groups('group by folder\ngroup by status.type reverse');
    expect(g.children[0]!.name).toBe('home/');
    expect(g.children[1]!.children.map((c) => c.name)).toEqual(['4 DONE', '2 TODO', '1 IN_PROGRESS']);
    expect(g.children[1]!.count).toBe(4);
  });
  it('limit groups', () => {
    expect(groups('group by folder\nlimit groups 1').children.map((c) => c.name)).toEqual(['home/']);
  });
  it('rejects unknown group fields', () => {
    expect(Query.parse('group by banana').errors[0]!.message).toContain('Unknown group field');
  });
});

describe('explain', () => {
  it('lists filters, sort order and limits', () => {
    const e = Query.parse('not done\ndue before next week\nsort by priority\ngroup by folder\nlimit 5').explain();
    expect(e).toContain('status type is TODO, IN_PROGRESS or ON_HOLD');
    expect(e).toContain('due date is before');
    expect(e).toContain('sort by priority');
    expect(e).toContain('sort by status.type'); // defaults appended
    expect(e).toContain('group by folder');
    expect(e).toContain('At most 5 tasks');
  });
});
