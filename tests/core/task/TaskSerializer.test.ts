import { describe, expect, it } from 'vitest';
import { DateField, Priority, StatusRegistry, Task, parseTaskLine, serializeTask } from '../../../src/core/task';

const statusRegistry = StatusRegistry.default();
const parse = (line: string) => parseTaskLine(line, { statusRegistry })!;

const CANONICAL_EMOJI =
  '- [ ] 보고서 작성 #work ⏫ 🔁 every week when done 🏁 delete 🆔 a1b2c3 ⛔ x1,y2 ➕ 2026-09-15 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25 ✅ 2026-09-26 ❌ 2026-09-27 ^blk1';
const CANONICAL_DATAVIEW =
  '- [ ] 보고서 작성 #work [priority:: high] [repeat:: every week when done] [onCompletion:: delete] [id:: a1b2c3] [dependsOn:: x1,y2] [created:: 2026-09-15] [start:: 2026-09-20] [scheduled:: 2026-09-22] [due:: 2026-09-25] [completion:: 2026-09-26] [cancelled:: 2026-09-27] ^blk1';

describe('serializeTask', () => {
  it('round-trips a canonical emoji line exactly', () => {
    expect(serializeTask(parse(CANONICAL_EMOJI), 'emoji')).toBe(CANONICAL_EMOJI);
  });

  it('round-trips a canonical dataview line exactly', () => {
    expect(serializeTask(parse(CANONICAL_DATAVIEW), 'dataview')).toBe(CANONICAL_DATAVIEW);
  });

  it('converts between formats', () => {
    expect(serializeTask(parse(CANONICAL_EMOJI), 'dataview')).toBe(CANONICAL_DATAVIEW);
    expect(serializeTask(parse(CANONICAL_DATAVIEW), 'emoji')).toBe(CANONICAL_EMOJI);
  });

  it('normalises field order and spacing', () => {
    const messy = '  * [x]   shuffled   ✅ 2026-09-26  📅 2026-09-25 🆔 abc ⏬  🔁 every day';
    expect(serializeTask(parse(messy))).toBe('  * [x] shuffled ⏬ 🔁 every day 🆔 abc 📅 2026-09-25 ✅ 2026-09-26');
  });

  it('always writes square brackets for dataview even when read from parentheses', () => {
    expect(serializeTask(parse('- [ ] p (due:: 2026-09-25) (priority:: low)'), 'dataview')).toBe(
      '- [ ] p [priority:: low] [due:: 2026-09-25]',
    );
  });

  it('omits priority none and empty fields', () => {
    expect(serializeTask(Task.blank('plain', statusRegistry.bySymbol(' ')))).toBe('- [ ] plain');
    expect(serializeTask(Task.blank('plain').with({ priority: Priority.None }), 'dataview')).toBe('- [ ] plain');
  });

  it('handles an empty description with and without fields', () => {
    expect(serializeTask(Task.blank('', statusRegistry.bySymbol(' ')))).toBe('- [ ]');
    expect(serializeTask(Task.blank('').with({ due: DateField.parse('2026-09-25') }))).toBe('- [ ] 📅 2026-09-25');
    expect(serializeTask(parse('- [ ] ^only'))).toBe('- [ ] ^only');
  });

  it('writes invalid dates back verbatim', () => {
    expect(serializeTask(parse('- [ ] bad 📅 2026-13-40'))).toBe('- [ ] bad 📅 2026-13-40');
  });

  it('keeps trailing tags inside the description, before the fields', () => {
    expect(serializeTask(parse('- [ ] write 📅 2026-09-25 #work'))).toBe('- [ ] write #work 📅 2026-09-25');
  });

  it('preserves numbered markers, tabs and custom status symbols', () => {
    expect(serializeTask(parse('\t3) [?] odd'))).toBe('\t3) [?] odd');
  });

  it('is stable: serialize(parse(serialize(x))) == serialize(x)', () => {
    for (const line of [CANONICAL_EMOJI, CANONICAL_DATAVIEW, '- [ ] a 🔁 every 2 weeks 📅 2026-09-25 #t', '- [-] c ❌ 2026-01-01']) {
      const once = serializeTask(parse(line));
      expect(serializeTask(parse(once))).toBe(once);
    }
  });
});
