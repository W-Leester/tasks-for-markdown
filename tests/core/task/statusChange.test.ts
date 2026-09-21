import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates/dayjs';
import { DateField, type RecurrenceSettings, StatusRegistry, StatusType, applyStatusChange, parseTaskLine } from '../../../src/core/task';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-21');
const opts = { today, setDoneDate: true, setCancelledDate: true };
const parse = (line: string) => parseTaskLine(line, { statusRegistry: reg })!;

describe('applyStatusChange', () => {
  it('todo -> done adds ✅ today', () => {
    const r = applyStatusChange(parse('- [ ] a 📅 2026-09-25'), reg.bySymbol('x'), opts);
    expect(r.task.status.symbol).toBe('x');
    expect(r.task.done!.format()).toBe('2026-09-21');
    expect(r.task.due!.format()).toBe('2026-09-25');
    expect(r.newTasks).toEqual([]);
  });

  it('done -> todo removes ✅ even when setDoneDate is off', () => {
    const r = applyStatusChange(parse('- [x] a ✅ 2026-09-20'), reg.bySymbol(' '), { ...opts, setDoneDate: false });
    expect(r.task.done).toBeNull();
  });

  it('does not add ✅ when setDoneDate is off', () => {
    expect(applyStatusChange(parse('- [ ] a'), reg.bySymbol('x'), { ...opts, setDoneDate: false }).task.done).toBeNull();
  });

  it('keeps an existing ✅ when moving between two DONE-typed symbols', () => {
    const custom = new StatusRegistry([
      { symbol: 'x', name: 'Done', nextSymbol: ' ', type: StatusType.DONE },
      { symbol: 'X', name: 'Checked', nextSymbol: ' ', type: StatusType.DONE },
    ]);
    const task = parseTaskLine('- [x] a ✅ 2026-01-01', { statusRegistry: custom })!;
    expect(applyStatusChange(task, custom.bySymbol('X'), opts).task.done!.format()).toBe('2026-01-01');
  });

  it('cancelled adds ❌ and clears ✅; back to todo clears ❌', () => {
    const cancelled = applyStatusChange(parse('- [x] a ✅ 2026-09-20'), reg.bySymbol('-'), opts).task;
    expect(cancelled.done).toBeNull();
    expect(cancelled.cancelled!.format()).toBe('2026-09-21');
    const back = applyStatusChange(cancelled, reg.bySymbol(' '), opts).task;
    expect(back.cancelled).toBeNull();
  });

  it('in progress has no date side effects', () => {
    const r = applyStatusChange(parse('- [ ] a'), reg.bySymbol('/'), opts).task;
    expect(r.done).toBeNull();
    expect(r.cancelled).toBeNull();
    expect(r.status.type).toBe(StatusType.IN_PROGRESS);
  });

  it('done date uses the injected clock', () => {
    const r = applyStatusChange(parse('- [ ] a'), reg.bySymbol('x'), { ...opts, today: dayjs('2030-02-03') }).task;
    expect(r.done!.isSame(DateField.parse('2030-02-03'))).toBe(true);
  });
});

describe('applyStatusChange with recurrence', () => {
  const rs: RecurrenceSettings = { todoStatus: reg.bySymbol(' '), setCreatedDate: false, idHandling: 'keep', copyDependsOn: true, removeScheduledDateOnRecurrence: false };
  const done = (line: string, extra: Partial<RecurrenceSettings> = {}) => applyStatusChange(parse(line), reg.bySymbol('x'), { ...opts, recurrence: { ...rs, ...extra } });

  it('spawns the next instance above with shifted dates and keeps id / depends on', () => {
    const r = done('- [ ] weekly 🆔 abc ⛔ x1 ⏫ 🔁 every week 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25 ^blk');
    expect(r.task.isDone).toBe(true);
    expect(r.deleteOriginal).toBe(false);
    expect(r.newTasks).toHaveLength(1);
    const n = r.newTasks[0]!;
    expect(n.status.symbol).toBe(' ');
    expect(n.done).toBeNull();
    expect([n.start!.format(), n.scheduled!.format(), n.due!.format()]).toEqual(['2026-09-27', '2026-09-29', '2026-10-02']);
    expect(n.id).toBe('abc');
    expect(n.dependsOn).toEqual(['x1']);
    expect(n.priority).toBe(parse('- [ ] a ⏫').priority);
    expect(n.recurrenceText).toBe('every week');
    expect(n.blockLink).toBeNull();
  });

  it('when done bases the next instance on today', () => {
    const n = done('- [ ] a 🔁 every 3 days when done 📅 2026-09-01').newTasks[0]!;
    expect(n.due!.format()).toBe('2026-09-24');
  });

  it('id handling new / remove and dependsOn copy off', () => {
    expect(done('- [ ] a 🆔 abc 🔁 every day 📅 2026-09-25', { idHandling: 'new', generateId: () => 'zzz999' }).newTasks[0]!.id).toBe('zzz999');
    expect(done('- [ ] a 🆔 abc 🔁 every day 📅 2026-09-25', { idHandling: 'remove' }).newTasks[0]!.id).toBeNull();
    expect(done('- [ ] a ⛔ q 🔁 every day 📅 2026-09-25', { copyDependsOn: false }).newTasks[0]!.dependsOn).toEqual([]);
  });

  it('sets created date on the new instance when enabled', () => {
    expect(done('- [ ] a ➕ 2020-01-01 🔁 every day 📅 2026-09-25', { setCreatedDate: true }).newTasks[0]!.created!.format()).toBe('2026-09-21');
    expect(done('- [ ] a ➕ 2020-01-01 🔁 every day 📅 2026-09-25').newTasks[0]!.created).toBeNull();
  });

  it('🏁 delete removes the original', () => {
    const r = done('- [ ] a 🔁 every day 🏁 delete 📅 2026-09-25');
    expect(r.deleteOriginal).toBe(true);
    expect(r.newTasks).toHaveLength(1);
  });

  it('no new instance without a date, with an invalid reference date, or an invalid rule', () => {
    expect(done('- [ ] a 🔁 every day').newTasks).toEqual([]);
    expect(done('- [ ] a 🔁 every day 📅 2026-13-40').newTasks).toEqual([]);
    expect(done('- [ ] a 🔁 every blah 📅 2026-09-25').newTasks).toEqual([]);
  });

  it('does not recur when re-completing an already done task or when cancelling', () => {
    expect(applyStatusChange(parse('- [x] a 🔁 every day 📅 2026-09-25 ✅ 2026-09-20'), reg.bySymbol('x'), { ...opts, recurrence: rs }).newTasks).toEqual([]);
    expect(applyStatusChange(parse('- [ ] a 🔁 every day 📅 2026-09-25'), reg.bySymbol('-'), { ...opts, recurrence: rs }).newTasks).toEqual([]);
  });

  it('drops the scheduled date when the setting is on and other dates exist', () => {
    const n = done('- [ ] a 🔁 every week 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25', { removeScheduledDateOnRecurrence: true }).newTasks[0]!;
    expect(n.scheduled).toBeNull();
    expect(n.due!.format()).toBe('2026-10-02');
  });
});
