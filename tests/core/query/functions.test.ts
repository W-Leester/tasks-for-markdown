import { describe, expect, it } from 'vitest';
import { Query } from '../../../src/core/query';
import { indexFrom, today } from './Query.test';

const index = indexFrom({
  'work/report.md': ['- [ ] write report #work ⏫ 📅 2026-09-25', '- [x] tidy notes ✅ 2026-09-20', '- [ ] plan q4 🔽 📅 2026-10-15'].join('\n'),
  'home/chores.md': ['- [ ] buy milk 🔁 every week 📅 2026-09-19', '- [ ] free'].join('\n'),
});
const run = (text: string, allowFunctions = true) => Query.parse(text).run({ index, today, allowFunctions });
const names = (text: string) => run(text).root.tasks.map((t) => t.description);

describe('by function', () => {
  it('filter by function with the task API', () => {
    expect(names('filter by function task.priorityNumber < 3')).toEqual(['write report #work']);
    expect(names('filter by function task.due.date && task.due.date.month() === 8')).toEqual(['write report #work', 'buy milk']);
    expect(names('filter by function task.due.formatAsDate() === "2026-10-15"')).toEqual(['plan q4']);
    expect(names("filter by function task.file.folder === 'home/'")).toEqual(['buy milk', 'free']);
    expect(names("filter by function task.tags.includes('#work')")).toEqual(['write report #work']);
    expect(names('filter by function task.isDone')).toEqual(['tidy notes']);
    expect(names('filter by function task.due.category.name === "Overdue"')).toEqual(['buy milk']);
  });
  it('supports statement bodies with return', () => {
    expect(names('filter by function const d = task.description; return d.startsWith("p");')).toEqual(['plan q4']);
  });
  it('sort by function and group by function', () => {
    expect(names('sort by function task.description.length')).toEqual(['free', 'plan q4', 'buy milk', 'tidy notes', 'write report #work']);
    expect(names('sort by function task.description.length reverse')[0]).toBe('write report #work');
    const g = run('group by function task.due.category.groupText').root;
    expect(g.children.map((c) => c.name)).toEqual(['%%1%% Overdue', '%%3%% Future', '%%4%% Undated']);
    const g2 = run('group by function task.file.root').root;
    expect(g2.children.map((c) => c.name)).toEqual(['home/', 'work/']);
  });
  it('is gated by allowFunctions', () => {
    const r = run('filter by function true', false);
    expect(r.root.tasks).toEqual([]);
    expect(r.runtimeErrors[0]).toContain('disabled');
  });
  it('compile errors are parse errors; runtime errors are reported and exclude the task', () => {
    expect(Query.parse('filter by function task.description ===').errors[0]!.message).toContain('Cannot compile');
    const r = run('filter by function task.nope.deeper');
    expect(r.root.tasks).toEqual([]);
    expect(r.runtimeErrors.length).toBeGreaterThan(0);
  });
  it('the task object is frozen', () => {
    const r = run('filter by function (() => { try { task.description = "x"; } catch { return true; } return task.description !== "x"; })()');
    expect(r.root.tasks.length).toBe(5);
  });
});
