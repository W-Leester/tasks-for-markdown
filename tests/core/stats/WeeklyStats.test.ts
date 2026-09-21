import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { parseFile } from '../../../src/core/file';
import { computeWeeklyStats } from '../../../src/core/stats';
import { StatusRegistry } from '../../../src/core/task';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-21'); // Monday, ISO week 39
const text = [
  '- [x] done this week ✅ 2026-09-21 #work',
  '- [x] done last week ✅ 2026-09-17 #work',
  '- [-] cancelled two weeks ago ❌ 2026-09-08',
  '- [ ] created last week ➕ 2026-09-15 📅 2026-09-18',
  '- [ ] old open ➕ 2026-01-01',
  '- [x] undated done',
  '- [ ] overdue this week 📅 2026-09-19',
].join('\n');
const tasks = parseFile(text, { path: 'proj/a.md', statusRegistry: reg }).tasks;

describe('computeWeeklyStats', () => {
  it('buckets by ISO week with the current week last', () => {
    const s = computeWeeklyStats(tasks, { today, weeks: 3 });
    expect(s.weeks.map((w) => w.label)).toEqual(['W37', 'W38', 'W39']);
    expect(s.weeks[2]!.current).toBe(true);
    expect(s.weeks[2]!.start).toBe('2026-09-21');
    expect(s.weeks[1]!.start).toBe('2026-09-14');
  });
  it('counts completed / created / overdue / remaining', () => {
    const s = computeWeeklyStats(tasks, { today, weeks: 3 });
    const [w37, w38, w39] = s.weeks;
    expect([w37!.completed, w38!.completed, w39!.completed]).toEqual([1, 1, 1]);
    expect(w38!.created).toBe(1);
    expect(w38!.overdue).toBe(2); // due 09-18 and 09-19 (still open, in the past)
    // remaining at end of W38: created last week + old open + overdue-this-week (undated created -> counts) + done this week (not yet done) + undated done? (undated done has no doneAt -> stillOpen false)
    expect(w38!.remaining).toBe(4);
    expect(s.totalOpen).toBe(3);
    expect(s.excluded).toBe(2); // undated done, overdue-this-week (no created date)
  });
  it('filters by tag and folder and lists options', () => {
    const s = computeWeeklyStats(tasks, { today, weeks: 3, tag: '#work' });
    expect(s.weeks.map((w) => w.completed)).toEqual([0, 1, 1]);
    expect(s.tags).toEqual(['#work']);
    expect(s.folders).toEqual(['proj/']);
    expect(computeWeeklyStats(tasks, { today, weeks: 1, folder: 'other/' }).totalOpen).toBe(0);
  });
});
