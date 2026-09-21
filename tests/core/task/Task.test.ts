import { describe, expect, it } from 'vitest';
import { DateField, Priority, StatusRegistry, Task } from '../../../src/core/task';

const reg = StatusRegistry.default();

describe('Task', () => {
  it('is immutable and derives tags from the description', () => {
    const t = Task.blank('do it #a').with({ priority: Priority.High });
    expect(t.tags).toEqual(['#a']);
    expect(Object.isFrozen(t)).toBe(true);
    expect(() => {
      (t as { description: string }).description = 'x';
    }).toThrow();
  });

  it('with() returns a new task and keeps the rest', () => {
    const a = Task.blank('a', reg.bySymbol(' ')).with({ due: DateField.parse('2026-09-25') });
    const b = a.with({ status: reg.bySymbol('x') });
    expect(a.isDone).toBe(false);
    expect(b.isDone).toBe(true);
    expect(b.due!.format()).toBe('2026-09-25');
    expect(b.description).toBe('a');
  });

  it('status helpers follow the status type', () => {
    expect(Task.blank('', reg.bySymbol('-')).isCancelled).toBe(true);
    expect(Task.blank('', reg.bySymbol('-')).isCompleted).toBe(true);
    expect(Task.blank('', reg.bySymbol('/')).isCompleted).toBe(false);
  });

  it('happens() picks the earliest valid of start/scheduled/due', () => {
    const t = Task.blank().with({
      start: DateField.parse('2026-09-20'),
      scheduled: DateField.parse('bad'),
      due: DateField.parse('2026-09-18'),
    });
    expect(t.happens()!.format()).toBe('2026-09-18');
    expect(Task.blank().happens()).toBeNull();
  });
});
