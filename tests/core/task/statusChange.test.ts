import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates/dayjs';
import { DateField, StatusRegistry, StatusType, applyStatusChange, parseTaskLine } from '../../../src/core/task';

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
