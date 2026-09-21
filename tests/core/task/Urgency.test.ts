/** Expected values ported from Obsidian Tasks tests/Task/Urgency.test.ts (MIT). */
import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { DateField, Priority, Task, urgency } from '../../../src/core/task';

const today = dayjs('2022-10-31T09:00:00');
const rel = (days: number) => DateField.fromDate(today.add(days, 'day'));
const low = () => Task.blank('t').with({ priority: Priority.Low });
const close = (t: Task, expected: number) => expect(urgency(t, today)).toBeCloseTo(expected, 5);

describe('urgency', () => {
  it('priority component', () => {
    close(Task.blank('t').with({ priority: Priority.Highest }), 9.0);
    close(Task.blank('t').with({ priority: Priority.High }), 6.0);
    close(Task.blank('t').with({ priority: Priority.Medium }), 3.9);
    close(Task.blank('t').with({ priority: Priority.None }), 1.95);
    close(Task.blank('t').with({ priority: Priority.Low }), 0.0);
    close(Task.blank('t').with({ priority: Priority.Lowest }), -1.8);
  });

  it('due date component', () => {
    close(low().with({ due: rel(-200) }), 12.0);
    close(low().with({ due: rel(-8) }), 12.0);
    close(low().with({ due: rel(-7) }), 12.0);
    close(low().with({ due: rel(0) }), 8.8);
    close(low().with({ due: rel(1) }), 8.34286);
    close(low().with({ due: rel(6) }), 6.05714);
    close(low().with({ due: rel(13) }), 2.85714);
    close(low().with({ due: rel(14) }), 2.4);
    close(low().with({ due: rel(15) }), 2.4);
    close(low().with({ due: rel(200) }), 2.4);
    close(low(), 0.0);
  });

  it('is independent of the time of day', () => {
    const t = Task.blank('t').with({ priority: Priority.Low, due: DateField.parse('2023-06-26') });
    for (const time of ['00:01', '06:00', '11:59', '12:00', '19:00', '23:59']) {
      expect(urgency(t, dayjs(`2023-06-26T${time}:00`))).toBe(8.8);
    }
  });

  it('scheduled and start components', () => {
    close(low().with({ scheduled: rel(0) }), 5.0);
    close(low().with({ scheduled: rel(-3) }), 5.0);
    close(low().with({ scheduled: rel(1) }), 0.0);
    close(low().with({ start: rel(0) }), 0.0);
    close(low().with({ start: rel(1) }), -3.0);
  });

  it('ignores invalid dates', () => {
    close(low().with({ due: DateField.parse('2022-13-40') }), 0.0);
  });
});
