import { describe, expect, it } from 'vitest';
import { Query, buildTaskTree, type TreeNode } from '../../../src/core/query';
import { renderQueryResult } from '../../../src/core/render';
import { indexFrom, today } from './Query.test';

const index = indexFrom({
  'plan.md': [
    '- [ ] trip 📅 2026-10-10',          // 0
    '  - [ ] flights 📅 2026-10-05',      // 1
    '  - [ ] hotel',                      // 2
    '    - [ ] compare prices 📅 2026-10-03', // 3
    '- [ ] groceries 📅 2026-09-22',      // 4
    '- plain bullet',                     // 5
    '  - [ ] under a bullet 📅 2026-09-23', // 6
  ].join('\n'),
});
const run = (text: string, showTree?: boolean) => Query.parse(text).run({ index, today, allowFunctions: false, showTree });
const shape = (nodes: TreeNode[]): unknown[] => nodes.map((n) => [n.task.description, n.matched, ...(n.children.length ? [shape(n.children)] : [])]);

describe('tree display (M11)', () => {
  it('nests sub-tasks under a matching parent and adds non-matching children as context', () => {
    const r = run('not done\nsort by description', true);
    expect(shape(r.root.tree!)).toEqual([
      ['groceries', true],
      ['trip', true, [['flights', true], ['hotel', true, [['compare prices', true]]]]],
      ['under a bullet', true], // a plain-bullet parent ends the chain
    ]);
  });

  it('a filter that matches only some children keeps the rest as faded context', () => {
    const r = run('has due date\nsort by due', true);
    // trip matches; its children come along (hotel as context), compare prices also matched
    const trip = r.root.tree!.find((n) => n.task.description === 'trip')!;
    expect(shape([trip])).toEqual([['trip', true, [['flights', true], ['hotel', false, [['compare prices', true]]]]]]);
    // matched children never also appear as roots
    expect(r.root.tree!.map((n) => n.task.description)).toEqual(['groceries', 'under a bullet', 'trip']);
    expect(r.matched).toBe(5);
  });

  it('a matching child whose parent is not in the result is a root', () => {
    const r = run('description includes compare', true);
    expect(shape(r.root.tree!)).toEqual([['compare prices', true]]);
  });

  it('hide tree / show tree override the default; without either the default applies', () => {
    expect(run('not done', false).root.tree).toBeUndefined();
    expect(run('not done\nshow tree', false).root.tree).toBeDefined();
    expect(run('not done\nhide tree', true).root.tree).toBeUndefined();
    expect(run('not done').root.tree).toBeUndefined(); // no ctx default → off (library default)
  });

  it('works per group', () => {
    const r = run('not done\ngroup by filename', true);
    expect(r.root.children[0]!.tree!.length).toBe(3);
    expect(r.root.tree).toBeUndefined();
  });

  it('includeContext false lifts matched grandchildren over an unmatched child', () => {
    const tasks = index.all().filter((t) => ['trip', 'compare prices'].includes(t.description));
    expect(shape(buildTaskTree(tasks, index, { includeContext: false }))).toEqual([['trip', true, [['compare prices', true]]]]);
  });

  it('HTML nests child rows inside the parent row, fades context rows and drops their backlink', () => {
    const q = Query.parse('has due date\nsort by due');
    const r = q.run({ index, today, allowFunctions: false, showTree: true });
    const html = renderQueryResult(r, q.layout, '', { today, link: (t) => `${t.location.path}#L${t.location.line + 1}` });
    expect(html).toContain('<ul class="tfm-list tfm-tree">');
    expect(html).toMatch(/data-tfm-line="0">.*<ul class="tfm-list tfm-subtree">.*data-tfm-line="1"/s);
    expect(html).toContain('tfm-context" data-tfm-path="plan.md" data-tfm-line="2"');
    // the root row has a backlink, the nested rows do not
    const flights = html.slice(html.indexOf('data-tfm-line="1"'), html.indexOf('data-tfm-line="2"'));
    expect(flights).not.toContain('tfm-backlink');
    expect(html).toContain('5 of 5 tasks');
  });
});
