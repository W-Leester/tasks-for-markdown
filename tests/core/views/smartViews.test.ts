import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates/dayjs';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import { StatusRegistry, StatusType } from '../../../src/core/task';
import { groupTasks, isBlocked, runSmartView } from '../../../src/core/views';

const statusRegistry = StatusRegistry.default();
const today = dayjs('2026-09-21');

function indexOf(files: Record<string, string>): TaskIndex {
  const idx = new TaskIndex();
  for (const [path, text] of Object.entries(files)) {
    const r = parseFile(text, { path, statusRegistry });
    idx.setFile({ key: path, path, tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags }, true);
  }
  return idx;
}

const idx = indexOf({
  'a.md': [
    '# A',
    '- [ ] overdue 📅 2026-09-19',
    '- [ ] due today 📅 2026-09-21',
    '- [ ] scheduled today ⏳ 2026-09-21',
    '- [ ] tomorrow 📅 2026-09-22',
    '- [ ] friday 📅 2026-09-25',
    '- [ ] in 7 days 📅 2026-09-28',
    '- [ ] in 8 days 📅 2026-09-29',
    '- [ ] no dates #tag1',
    '- [/] doing ⏫',
    '- [x] done recently ✅ 2026-09-01',
    '- [x] done long ago ✅ 2026-08-01',
    '- [-] cancelled recently ❌ 2026-09-20',
    '- [x] done undated',
  ].join('\n'),
  'b.md': ['- [ ] blocked ⛔ dep1 📅 2026-09-30', '- [ ] blocker 🆔 dep1', '- [ ] free ⛔ dep2 #tag1 #tag2', '- [x] finished dep 🆔 dep2 ✅ 2026-09-10'].join('\n'),
});
const names = (ids: Parameters<typeof runSmartView>[0]) => runSmartView(ids, { index: idx, today }).map((t) => t.description);

describe('smart views', () => {
  it('today = happens on or before today, not completed', () => {
    expect(names('today')).toEqual(['overdue', 'due today', 'scheduled today']);
  });
  it('upcoming = happens within the next 7 days', () => {
    expect(names('upcoming')).toEqual(['tomorrow', 'friday', 'in 7 days']);
  });
  it('overdue = due before today', () => {
    expect(names('overdue')).toEqual(['overdue']);
  });
  it('in progress by status type', () => {
    expect(names('inProgress')).toEqual(['doing']);
  });
  it('blocked = depends on an unfinished task', () => {
    expect(names('blocked')).toEqual(['blocked']);
    expect(isBlocked(idx.all().find((t) => t.description === 'free #tag1 #tag2')!, idx)).toBe(false);
  });
  it('open = everything not completed, in Obsidian default order (status.type, urgency, …)', () => {
    expect(names('open')).toEqual([
      'doing', // IN_PROGRESS sorts before TODO
      'overdue',
      'due today',
      'tomorrow',
      'friday',
      'in 7 days',
      'in 8 days',
      'scheduled today', // scheduled today (+5) outranks a due date 9 days out
      'blocked',
      'no dates #tag1',
      'blocker',
      'free #tag1 #tag2',
    ]);
  });
  it('doneRecent = completed within 30 days by done/cancelled date', () => {
    expect(names('doneRecent')).toEqual(['done recently', 'finished dep', 'cancelled recently']); // DONE before CANCELLED
  });
});

describe('groupTasks', () => {
  const open = runSmartView('open', { index: idx, today });
  it('by file keeps order and sorts groups by path', () => {
    const g = groupTasks(open, 'file', today);
    expect(g.map((x) => [x.id, x.tasks.length])).toEqual([
      ['a.md', 9],
      ['b.md', 3],
    ]);
  });
  it('by due buckets in fixed order', () => {
    const g = groupTasks(open, 'due', today);
    expect(g.map((x) => x.id)).toEqual(['Overdue', 'Today', 'Tomorrow', 'This week', 'Next week', 'No due date']);
    expect(g.find((x) => x.id === 'This week')!.tasks.map((t) => t.description)).toEqual(['friday']);
    expect(g.find((x) => x.id === 'Next week')!.tasks.map((t) => t.description)).toEqual(['in 7 days', 'in 8 days', 'blocked']);
  });
  it('by tag puts a task in every tag and untagged last', () => {
    const g = groupTasks(open, 'tag', today);
    expect(g.map((x) => x.id)).toEqual(['#tag1', '#tag2', '(no tag)']);
    expect(g[0]!.tasks.map((t) => t.description)).toEqual(['no dates #tag1', 'free #tag1 #tag2']);
  });
  it('by heading and by status', () => {
    expect(groupTasks(open, 'heading', today).map((x) => x.id)).toEqual(['A', '(no heading)']);
    expect(groupTasks(open, 'status', today).map((x) => x.label)).toEqual(['In Progress', 'Todo']);
  });
  it('none returns a single group', () => {
    expect(groupTasks(open, 'none', today)).toHaveLength(1);
  });
});

describe('NON_TASK statuses', () => {
  it('are excluded from every smart view', () => {
    const reg = new StatusRegistry([
      { symbol: ' ', name: 'Todo', nextSymbol: 'x', type: StatusType.TODO },
      { symbol: 'x', name: 'Done', nextSymbol: ' ', type: StatusType.DONE },
      { symbol: '~', name: 'Decorative', nextSymbol: '~', type: StatusType.NON_TASK },
    ]);
    const i = new TaskIndex();
    const r = parseFile('- [~] not a task 📅 2026-09-19\n- [ ] real 📅 2026-09-19', { path: 'n.md', statusRegistry: reg });
    i.setFile({ key: 'n.md', path: 'n.md', tasks: r.tasks, headings: r.headings, frontmatterTags: [] }, true);
    for (const id of ['today', 'overdue', 'open'] as const) {
      expect(runSmartView(id, { index: i, today }).map((t) => t.description)).toEqual(['real']);
    }
  });
});
