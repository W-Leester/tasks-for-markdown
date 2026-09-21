import { describe, expect, it } from 'vitest';
import { planArchive, renderArchiveBlock } from '../../../src/core/archive';
import { dayjs } from '../../../src/core/dates';
import { parseFile } from '../../../src/core/file';
import { StatusRegistry } from '../../../src/core/task';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-21');
const text = [
  '# Notes',
  '## Work',
  '- [x] old done ✅ 2026-08-01',
  '  - [ ] child of old',
  '    note line under child',
  '- [x] recent done ✅ 2026-09-20',
  '- [-] old cancelled ❌ 2026-07-01',
  '- [ ] open parent',
  '  - [x] old child done ✅ 2026-08-02',
  '- [x] undated done',
  '',
  '## Later',
  '- [ ] keep',
].join('\n');
const lines = text.split('\n');
const file = { path: 'notes/a.md', lines, tasks: parseFile(text, { path: 'notes/a.md', statusRegistry: reg }).tasks };

describe('planArchive', () => {
  it('selects completed tasks older than afterDays and carries their descendants', () => {
    const plan = planArchive([file], { today, afterDays: 30 });
    expect(plan.entries).toHaveLength(1);
    const e = plan.entries[0]!;
    expect(e.tasks.map((t) => t.description)).toEqual(['old done', 'old cancelled', 'old child done']);
    expect(e.lines).toEqual([2, 3, 4, 6, 8]);
    expect(plan.totalTasks).toBe(3);
  });
  it('afterDays = 0 archives every completed task including undated ones', () => {
    const plan = planArchive([file], { today, afterDays: 0 });
    expect(plan.entries[0]!.tasks.map((t) => t.description)).toEqual(['old done', 'recent done', 'old cancelled', 'old child done', 'undated done']);
  });
  it('returns no entry for files without candidates', () => {
    expect(planArchive([{ path: 'x.md', lines: ['- [ ] a'], tasks: parseFile('- [ ] a', { path: 'x.md', statusRegistry: reg }).tasks }], { today, afterDays: 30 }).entries).toEqual([]);
  });
});

describe('renderArchiveBlock', () => {
  it('groups by heading with wiki links and dedents blocks', () => {
    const plan = planArchive([file], { today, afterDays: 30 });
    const out = renderArchiveBlock(plan, [file], { today, linkStyle: 'wiki' });
    expect(out).toBe([
      '## 2026-09-21',
      '',
      '[[notes/a#Work]]',
      '- [x] old done ✅ 2026-08-01',
      '  - [ ] child of old',
      '    note line under child',
      '- [-] old cancelled ❌ 2026-07-01',
      '- [x] old child done ✅ 2026-08-02',
      '',
    ].join('\n'));
  });
  it('markdown link style', () => {
    const plan = planArchive([file], { today, afterDays: 30 });
    const out = renderArchiveBlock(plan, [file], { today, linkStyle: 'markdown', linkPrefix: '../' });
    expect(out).toContain('[notes/a.md › Work](../notes/a.md#work)');
  });
});

describe('planArchive select', () => {
  it('lets the caller deselect roots while descendants still follow their root', () => {
    const plan = planArchive([file], { today, afterDays: 30, select: (t) => t.description !== 'old cancelled' });
    expect(plan.entries[0]!.tasks.map((t) => t.description)).toEqual(['old done', 'old child done']);
    expect(plan.entries[0]!.lines).toEqual([2, 3, 4, 8]);
  });
});
