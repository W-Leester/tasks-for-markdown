/**
 * Cases ported from Obsidian Tasks (MIT, Copyright (c) 2021 Martin Schenck and Clare Macrae):
 *   tests/TaskSerializer/DefaultTaskSerializer.test.ts
 *   tests/TaskSerializer/DataviewTaskSerializer.test.ts
 * They pin behaviour we must keep identical so files are interchangeable with the plugin.
 */
import { describe, expect, it } from 'vitest';
import { Priority, StatusRegistry, parseTaskLine, serializeTaskBody, Task, DateField } from '../../../src/core/task';

const statusRegistry = StatusRegistry.default();
/** Obsidian's serializer tests work on the body after `- [ ] `; we do the same. */
const deserialize = (body: string) => parseTaskLine(`- [ ] ${body}`, { statusRegistry })!;
const hasVS16 = (s: string) => /️/u.test(s);

describe('DefaultTaskSerializer (emoji) — deserialize', () => {
  it('parses an empty string', () => {
    const t = deserialize('');
    expect(t.description).toBe('');
    expect(t.priority).toBe(Priority.None);
  });

  it.each([
    ['start', '🛫'],
    ['created', '➕'],
    ['scheduled', '⏳'],
    ['due', '📅'],
    ['done', '✅'],
    ['cancelled', '❌'],
  ] as const)('parses a %s date', (field, symbol) => {
    expect(deserialize(`${symbol} 2021-06-20`)[field]!.format()).toBe('2021-06-20');
  });

  it('parses a scheduledDate with non-standard emoji', () => {
    expect(deserialize('⌛ 2021-06-20').scheduled!.format()).toBe('2021-06-20');
  });

  it('parses a scheduledDate with Variation Selector (issue #3179)', () => {
    const input = '⏳️ 2024-11-18';
    expect(hasVS16(input)).toBe(true);
    expect(deserialize(input).scheduled!.format()).toBe('2024-11-18');
  });

  it('parses dueDate with non-standard emoji', () => {
    expect(deserialize('📆 2021-06-20').due!.format()).toBe('2021-06-20');
    expect(deserialize('🗓 2021-06-20').due!.format()).toBe('2021-06-20');
  });

  it('parses every priority', () => {
    expect(deserialize('🔺').priority).toBe(Priority.Highest);
    expect(deserialize('⏫').priority).toBe(Priority.High);
    expect(deserialize('🔼').priority).toBe(Priority.Medium);
    expect(deserialize('').priority).toBe(Priority.None);
    expect(deserialize('🔽').priority).toBe(Priority.Low);
    expect(deserialize('⏬').priority).toBe(Priority.Lowest);
  });

  it('parses a high priority with Variant Selector 16 (issue #2273)', () => {
    const line = '⏫️';
    expect(hasVS16(line)).toBe(true);
    expect(deserialize(line).priority).toBe(Priority.High);
  });

  it('parses a recurrence', () => {
    expect(deserialize('🔁 every day').recurrenceText).toBe('every day');
  });

  it('parses onCompletion, case-insensitive, with multiple spaces', () => {
    expect(deserialize('🏁 Delete').onCompletion).toBe('delete');
    expect(deserialize('🏁  Keep').onCompletion).toBe('keep');
  });

  it('parses depends on', () => {
    expect(deserialize('⛔ F12345').dependsOn).toEqual(['F12345']);
    expect(deserialize('⛔️ F12345').dependsOn).toEqual(['F12345']); // with VS16 (issue #2693)
    expect(deserialize('⛔ 123456,abC123').dependsOn).toEqual(['123456', 'abC123']);
    expect(deserialize('⛔ ab , CD ,  EF  ,    GK').dependsOn).toEqual(['ab', 'CD', 'EF', 'GK']);
  });

  it('parses ids', () => {
    expect(deserialize('🆔 pqrd0f').id).toBe('pqrd0f');
    expect(deserialize('🆔 Abcd0f').id).toBe('Abcd0f');
    expect(deserialize('🆔 Abcd0f-').id).toBe('Abcd0f-');
    expect(deserialize('🆔 Ab_cd0f').id).toBe('Ab_cd0f');
  });

  it('does not parse an id with an asterisk, so it stays in the description', () => {
    const t = deserialize('🆔 A*bcd0f');
    expect(t.id).toBeNull();
    expect(t.description).toBe('🆔 A*bcd0f');
  });

  it('parses a description containing only tags without adding whitespace', () => {
    const t = deserialize('#hello #world #task');
    expect(t.description).toBe('#hello #world #task');
    expect(t.tags).toEqual(['#hello', '#world', '#task']);
  });
});

describe('DefaultTaskSerializer (emoji) — serialize', () => {
  const blank = () => Task.blank('', statusRegistry.bySymbol(' '));
  const body = (t: Task) => serializeTaskBody(t, 'emoji');

  it('serializes an empty task as the empty string', () => {
    expect(body(blank())).toBe('');
  });

  it.each([
    ['start', '🛫'],
    ['created', '➕'],
    ['scheduled', '⏳'],
    ['due', '📅'],
    ['done', '✅'],
  ] as const)('serializes a %s date', (field, symbol) => {
    expect(body(blank().with({ [field]: DateField.parse('2021-06-20') }))).toBe(`${symbol} 2021-06-20`);
  });

  it('serializes priorities', () => {
    expect(body(blank().with({ priority: Priority.Highest }))).toBe('🔺');
    expect(body(blank().with({ priority: Priority.Lowest }))).toBe('⏬');
    expect(body(blank().with({ priority: Priority.None }))).toBe('');
  });

  it('serializes recurrence, onCompletion, dependsOn, id and tags', () => {
    expect(body(blank().with({ recurrenceText: 'every day' }))).toBe('🔁 every day');
    expect(body(blank().with({ onCompletion: 'delete' }))).toBe('🏁 delete');
    expect(body(blank().with({ dependsOn: ['123456', 'abc123'] }))).toBe('⛔ 123456,abc123');
    expect(body(blank().with({ id: 'abcdef' }))).toBe('🆔 abcdef');
    expect(body(blank().with({ description: '#hello #world #task' }))).toBe('#hello #world #task');
  });

  it('serializes a fully populated task in Obsidian layout order', () => {
    const t = blank().with({
      description: 'Do exercises #todo #health',
      id: 'abcdef',
      dependsOn: ['123456', 'abc123'],
      priority: Priority.Medium,
      recurrenceText: 'every day when done',
      onCompletion: 'delete',
      created: DateField.parse('2023-07-01'),
      start: DateField.parse('2023-07-02'),
      scheduled: DateField.parse('2023-07-03'),
      due: DateField.parse('2023-07-04'),
      done: DateField.parse('2023-07-05'),
      cancelled: DateField.parse('2023-07-06'),
    });
    expect(body(t)).toBe(
      'Do exercises #todo #health 🆔 abcdef ⛔ 123456,abc123 🔼 🔁 every day when done 🏁 delete ➕ 2023-07-01 🛫 2023-07-02 ⏳ 2023-07-03 📅 2023-07-04 ❌ 2023-07-06 ✅ 2023-07-05',
    );
  });
});

describe('DataviewTaskSerializer — deserialize', () => {
  it.each(['created', 'start', 'scheduled', 'due', 'completion', 'cancelled'])('parses [%s:: date]', (key) => {
    const t = deserialize(`[${key}:: 2021-06-20]`);
    const field = key === 'completion' ? 'done' : (key as 'created');
    expect(t[field]!.format()).toBe('2021-06-20');
  });

  it('parses priority, recurrence, onCompletion', () => {
    expect(deserialize('[priority:: high]').priority).toBe(Priority.High);
    expect(deserialize('[repeat:: every day]').recurrenceText).toBe('every day');
    expect(deserialize('[onCompletion:: delete]').onCompletion).toBe('delete');
  });

  it('parses dependsOn variants and is case-sensitive about the key', () => {
    expect(deserialize('[dependsOn:: F12345]').dependsOn).toEqual(['F12345']);
    expect(deserialize('[dependsOn:: 123456,abC123]').dependsOn).toEqual(['123456', 'abC123']);
    expect(deserialize('[dependsOn:: ab , CD ,  EF  ,    GK]').dependsOn).toEqual(['ab', 'CD', 'EF', 'GK']);
    const t = deserialize('[dependson:: F12345]');
    expect(t.dependsOn).toEqual([]);
    expect(t.description).toBe('[dependson:: F12345]');
  });

  it('parses ids and rejects an asterisk', () => {
    expect(deserialize('[id:: pqrd0f]').id).toBe('pqrd0f');
    expect(deserialize('[id:: Ab_cd0f-]').id).toBe('Ab_cd0f-');
    const t = deserialize('[id:: A*bcd0f]');
    expect(t.id).toBeNull();
    expect(t.description).toBe('[id:: A*bcd0f]');
  });

  it('parses a task with multiple fields and tags mixed in', () => {
    const t = deserialize(
      'Wobble [priority::high] #tag1 [completion:: 2024-09-04] #tag2  [due::2025-10-05] #tag3 [scheduled::2022-07-02] #tag4 [start::2023-08-03] #tag5  [repeat::every day]  #tag6 #tag7 #tag8 #tag9 #tag10',
    );
    expect(t.description).toBe('Wobble #tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10');
    expect(t.due!.format()).toBe('2025-10-05');
    expect(t.done!.format()).toBe('2024-09-04');
    expect(t.start!.format()).toBe('2023-08-03');
    expect(t.scheduled!.format()).toBe('2022-07-02');
    expect(t.priority).toBe(Priority.High);
    expect(t.recurrenceText).toBe('every day');
    expect(t.tags).toEqual(['#tag1', '#tag2', '#tag3', '#tag4', '#tag5', '#tag6', '#tag7', '#tag8', '#tag9', '#tag10']);
  });

  describe('whitespace within an inline field', () => {
    it.each([
      ['due::', '2021-06-20'],
      ['repeat::', 'every day'],
      ['priority::', 'high'],
    ])('%s %s', (symbol, value) => {
      const variants = [
        `[${symbol}${value}]`,
        `[${symbol} ${value}]`,
        `[${symbol}               ${value}]`,
        `[ ${symbol}${value}]`,
        `[      ${symbol}${value}]`,
        `[${symbol}${value} ]`,
        `[${symbol}${value}     ]`,
        `[ ${symbol}${value} ]`,
        `[     ${symbol}${value}     ]`,
        `[     ${symbol}     ${value}     ]`,
      ];
      for (const v of variants) {
        const t = deserialize(v);
        expect(t.description, v).toBe('');
        if (symbol === 'due::') expect(t.due!.format()).toBe(value);
        if (symbol === 'repeat::') expect(t.recurrenceText).toBe(value);
        if (symbol === 'priority::') expect(t.priority).toBe(Priority.High);
      }
    });
  });

  it('recognizes inline fields surrounded by square brackets or parens', () => {
    for (const body of ['Some task that is [due::2021-08-22] [priority:: high]', 'Some task that is (due::2021-08-22) (priority:: high)']) {
      const t = deserialize(body);
      expect(t.priority).toBe(Priority.High);
      expect(t.due!.format()).toBe('2021-08-22');
      expect(t.description).toBe('Some task that is');
    }
  });

  it('does not recognize mismatched pairs or unbracketed fields', () => {
    const a = deserialize('Some task that is [due::2021-08-22) (priority:: high]');
    expect(a.description).toBe('Some task that is [due::2021-08-22) (priority:: high]');
    expect(a.due).toBeNull();
    const b = deserialize('Some task - due value not found by dataview - due:: 2021-08-22');
    expect(b.description).toBe('Some task - due value not found by dataview - due:: 2021-08-22');
    expect(b.due).toBeNull();
  });

  it('recognizes comma separated inline fields (issue #1913 workaround)', () => {
    const t = deserialize('Some task that is [due::2021-08-22], [priority::high]       , (start::2021-08-19)');
    expect(t.priority).toBe(Priority.High);
    expect(t.due!.format()).toBe('2021-08-22');
    expect(t.start!.format()).toBe('2021-08-19');
    expect(t.description).toBe('Some task that is');
  });

  it('does not recognize fields positioned inside the description (known Obsidian limitation)', () => {
    const t = deserialize('Some task that is [due::2021-08-02] and is [priority::high]');
    expect(t.priority).toBe(Priority.High);
    expect(t.due).toBeNull();
    expect(t.description).toBe('Some task that is [due::2021-08-02] and is');
  });
});

describe('DataviewTaskSerializer — serialize', () => {
  it('serializes a fully populated task in Obsidian layout order (single-spaced)', () => {
    const t = Task.blank('Do exercises #todo #health', statusRegistry.bySymbol(' ')).with({
      id: 'abcdef',
      dependsOn: ['123456', 'abc123'],
      priority: Priority.Medium,
      recurrenceText: 'every day when done',
      onCompletion: 'delete',
      created: DateField.parse('2023-07-01'),
      start: DateField.parse('2023-07-02'),
      scheduled: DateField.parse('2023-07-03'),
      due: DateField.parse('2023-07-04'),
      done: DateField.parse('2023-07-05'),
      cancelled: DateField.parse('2023-07-06'),
    });
    expect(serializeTaskBody(t, 'dataview')).toBe(
      'Do exercises #todo #health [id:: abcdef] [dependsOn:: 123456,abc123] [priority:: medium] [repeat:: every day when done] [onCompletion:: delete] [created:: 2023-07-01] [start:: 2023-07-02] [scheduled:: 2023-07-03] [due:: 2023-07-04] [cancelled:: 2023-07-06] [completion:: 2023-07-05]',
    );
  });
});
