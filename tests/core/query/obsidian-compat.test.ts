/**
 * Query-compatibility cases ported from Obsidian Tasks (tests/Query/Filter/*.test.ts, MIT —
 * see NOTICE.md). Each case is "filter line + task line (+ location) → matches?" so that a
 * behaviour change in our engine that diverges from Obsidian shows up here first.
 */
import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import { Query } from '../../../src/core/query';
import { StatusRegistry } from '../../../src/core/task';

const reg = StatusRegistry.default();
const today = dayjs('2023-03-06'); // the date several Obsidian tests pin with fake timers

interface Where { path?: string; heading?: string | null }

/** Does `filter` match the single task on `line`? */
function matches(filter: string, line: string, where: Where = {}): boolean {
  const path = where.path ?? 'file.md';
  const text = (where.heading ? `# ${where.heading}\n\n` : '') + line;
  const r = parseFile(text, { path, statusRegistry: reg });
  const index = new TaskIndex();
  index.setFile({ key: path, path, tasks: r.tasks, headings: r.headings, frontmatterTags: [] }, true);
  expect(r.tasks.length, `task line should parse: ${line}`).toBe(1);
  const q = Query.parse(filter, { path });
  expect(q.errors, `filter should parse: ${filter}`).toEqual([]);
  return q.run({ index, today, allowFunctions: false }).matched === 1;
}
const due = (d: string | null) => `- [ ] my description${d ? ` 📅 ${d}` : ''}`;
const created = (d: string | null) => `- [ ] my description${d ? ` ➕ ${d}` : ''}`;
const done = (d: string | null) => `- [x] my description${d ? ` ✅ ${d}` : ''}`;
const cancelled = (d: string | null) => `- [-] my description${d ? ` ❌ ${d}` : ''}`;

/** it.each-style table: [filter, task line, expected, where?] */
type Case = [string, string, boolean, Where?];
function table(name: string, cases: Case[]) {
  describe(name, () => {
    it.each(cases)('%s ⟶ "%s" = %s', (filter, line, expected, where) => {
      expect(matches(filter, line, where)).toBe(expected);
    });
  });
}

table('due date (DueDateField.test.ts)', [
  ['due before 2022-04-20', due(null), false], ['due before 2022-04-20', due('2022-04-15'), true], ['due before 2022-04-20', due('2022-04-20'), false], ['due before 2022-04-20', due('2022-04-25'), false],
  ['due on or before 2023-08-01', due(null), false], ['due on or before 2023-08-01', due('2023-07-31'), true], ['due on or before 2023-08-01', due('2023-08-01'), true], ['due on or before 2023-08-01', due('2023-08-02'), false],
  ['due on or after 2022-02-01', due(null), false], ['due on or after 2022-02-01', due('2022-01-31'), false], ['due on or after 2022-02-01', due('2022-02-01'), true], ['due on or after 2022-02-01', due('2022-02-02'), true],
  ['due before 2022-04-20 2022-04-24', due('2022-04-19'), true], ['due before 2022-04-20 2022-04-24', due('2022-04-20'), false], ['due before 2022-04-20 2022-04-24', due('2022-04-24'), false], ['due before 2022-04-20 2022-04-24', due('2022-04-25'), false],
  ['due on or before 2021-07-10 2021-10-04', due('2021-07-09'), true], ['due on or before 2021-07-10 2021-10-04', due('2021-10-04'), true], ['due on or before 2021-07-10 2021-10-04', due('2021-10-05'), false],
  ['due on 2022-04-20 2022-04-24', due(null), false], ['due on 2022-04-20 2022-04-24', due('2022-04-19'), false], ['due on 2022-04-20 2022-04-24', due('2022-04-20'), true], ['due on 2022-04-20 2022-04-24', due('2022-04-24'), true], ['due on 2022-04-20 2022-04-24', due('2022-04-25'), false],
  ['due on or after 2023-03-10 2023-04-01', due('2023-03-09'), false], ['due on or after 2023-03-10 2023-04-01', due('2023-03-10'), true], ['due on or after 2023-03-10 2023-04-01', due('2023-04-02'), true],
  ['due after 2022-04-20 2022-04-24', due('2022-04-24'), false], ['due after 2022-04-20 2022-04-24', due('2022-04-25'), true],
  ['due in 2022-04-20 2022-04-24', due('2022-04-19'), false], ['due in 2022-04-20 2022-04-24', due('2022-04-20'), true], ['due in 2022-04-20 2022-04-24', due('2022-04-24'), true], ['due in 2022-04-20 2022-04-24', due('2022-04-25'), false],
  ['due 2022-04-20 2022-04-24', due('2022-04-20'), true], ['due 2022-04-20 2022-04-24', due('2022-04-25'), false],
  ['due 2022', due(null), false], ['due 2022', due('2021-12-31'), false], ['due 2022', due('2022-01-01'), true], ['due 2022', due('2022-12-31'), true], ['due 2022', due('2023-01-01'), false],
  ['due 2017-Q3', due('2017-06-30'), false], ['due 2017-Q3', due('2017-07-01'), true], ['due 2017-Q3', due('2017-09-30'), true], ['due 2017-Q3', due('2017-10-01'), false],
  ['due 2020-03', due('2020-02-28'), false], ['due 2020-03', due('2020-03-01'), true], ['due 2020-03', due('2020-03-31'), true], ['due 2020-03', due('2020-04-01'), false],
  ['due 2023-W09', due('2023-02-26'), false], ['due 2023-W09', due('2023-02-27'), true], ['due 2023-W09', due('2023-03-05'), true], ['due 2023-W09', due('2023-03-06'), false],
  ['due date is invalid', due(null), false], ['due date is invalid', due('2022-04-15'), false], ['due date is invalid', due('2022-02-30'), true], ['due date is invalid', due('2022-00-01'), true], ['due date is invalid', due('2022-13-01'), true],
  // "due in two weeks" with today = 2023-03-06 → 2023-03-20
  ['due in two weeks', due('2023-03-20'), true], ['due in two weeks', due('2023-03-19'), false],
  ['due before 2022-04-24 2022-04-20', due('2022-04-19'), true], // reversed range is normalised
]);

table('created / done / cancelled dates', [
  ['created before 2022-04-20', created(null), false], ['created before 2022-04-20', created('2022-04-15'), true], ['created before 2022-04-20', created('2022-04-20'), false],
  ['created date is invalid', created('2022-02-30'), true], ['created date is invalid', created('2022-04-15'), false],
  ['has done date', done(null), false], ['has done date', done('2022-04-15'), true], ['no done date', done(null), true], ['no done date', done('2022-04-15'), false],
  ['done before 2023-01-02', done('2023-01-01'), true], ['done on 2024-01-02', done('2024-01-02'), true], ['done 2024-01-02', done('2024-01-03'), false],
  ['has cancelled date', cancelled(null), false], ['has cancelled date', cancelled('2022-04-15'), true], ['no cancelled date', cancelled(null), true],
  ['cancelled before 2023-01-02', cancelled('2023-01-01'), true], ['cancelled 2024-01-02', cancelled('2024-01-02'), true],
]);

table('happens date (HappensDateField.test.ts)', [
  ['has happens date', '- [ ] x', false], ['has happens date', '- [ ] x ⏳ 2022-04-15', true], ['has happens date', '- [ ] x 🛫 2022-04-15', true], ['has happens date', '- [ ] x 📅 2022-04-15', true], ['has happens date', '- [x] x ✅ 2022-04-15', false],
  ['no happens date', '- [ ] x', true], ['no happens date', '- [ ] x ⏳ 2022-04-15', false], ['no happens date', '- [x] x ✅ 2022-04-15', true],
  ['happens before 2023-01-02', '- [ ] x 🛫 2023-01-01 📅 2023-02-01', true], // earliest of the three counts
  ['happens on 2024-01-02', '- [ ] x ⏳ 2024-01-02', true],
]);

table('priority (PriorityField.test.ts)', [
  ['priority is highest', '- [ ] x 🔺', true], ['priority is highest', '- [ ] x ⏫', false],
  ['priority is high', '- [ ] x ⏫', true], ['priority is high', '- [ ] x 🔼', false],
  ['priority is medium', '- [ ] x 🔼', true], ['priority is none', '- [ ] x', true], ['priority is none', '- [ ] x 🔽', false],
  ['priority is low', '- [ ] x 🔽', true], ['priority is lowest', '- [ ] x ⏬', true], ['priority is lowest', '- [ ] x 🔽', false],
  ['priority above none', '- [ ] x ⏬', false], ['priority above none', '- [ ] x 🔽', false], ['priority above none', '- [ ] x', false], ['priority above none', '- [ ] x 🔼', true], ['priority above none', '- [ ] x ⏫', true], ['priority above none', '- [ ] x 🔺', true],
  ['priority below none', '- [ ] x ⏬', true], ['priority below none', '- [ ] x 🔽', true], ['priority below none', '- [ ] x', false],
  ['priority is not high', '- [ ] x ⏫', false], ['priority is not high', '- [ ] x', true],
  ['priority high', '- [ ] x ⏫', true], // implicit "is"
]);

table('status (StatusField / StatusTypeField)', [
  ['done', '- [ ] Todo', false], ['done', '- [x] Done', true], ['done', '- [/] In progress', false], ['done', '- [-] Cancelled', true],
  ['not done', '- [ ] Todo', true], ['not done', '- [x] Done', false], ['not done', '- [/] In progress', true], ['not done', '- [-] Cancelled', false], ['NOT done', '- [ ] Todo', true],
  ['status.type is IN_PROGRESS', '- [/] In progress', true], ['status.type is IN_PROGRESS', '- [ ] Todo', false],
  ['status.type is not IN_PROGRESS', '- [/] In progress', false], ['status.type is not IN_PROGRESS', '- [ ] Todo', true],
  ['status.type is in_progress', '- [/] In progress', true], // case-insensitive type
]);

table('recurring (RecurringField.test.ts)', [
  ['is recurring', '- [ ] non-recurring task', false], ['is recurring', '- [ ] recurring 🔁 every day 📅 2022-06-17', true],
  ['is not recurring', '- [ ] non-recurring task', true], ['is not recurring', '- [ ] recurring 🔁 every day 📅 2022-06-17', false], ['is NOT recurring', '- [ ] non-recurring task', true],
]);

table('description (DescriptionField.test.ts)', [
  ['description includes task', '- [ ] #task this includes the word as a tag', true], ['description includes task', '- [ ] #task this does: task', true], ['description includes task', '- [ ] nothing here', false],
  ['description regex matches /^task/', '- [ ] this does not start with the pattern', false], ['description regex matches /^task/', '- [ ] task does start with the pattern', true],
  ['description regex does not match /^task/', '- [ ] this does not start with the pattern', true], ['description regex does not match /^task/', '- [ ] task does start with the pattern', false],
  ['description regex matches /\\d\\d:\\d\\d/', '- [ ] Do me at 23:59', true], ['description regex matches /\\d\\d:\\d\\d/', '- [ ] Do me at 99:99', true],
  ['description regex matches /[012][0-9]:[0-5][0-9]/', '- [ ] Do me at 23:59', true], ['description regex matches /[012][0-9]:[0-5][0-9]/', '- [ ] Do me at 99:99', false],
  ['description regex matches /#t\\s/i', '- [ ] #t Do stuff', true], ['description regex matches /#t\\s/i', '- [ ] Do #t stuff', true], ['description regex matches /#t\\s/i', '- [ ] Do stuff #t', false], ['description regex matches /#t\\s/i', '- [ ] #t/b Do stuff', false], ['description regex matches /#t\\s/i', '- [ ] Do stuff #t/b', false],
  ['description regex matches /#t$/i', '- [ ] Do stuff #t', true], ['description regex matches /#t$/i', '- [ ] #t Do stuff', false], ['description regex matches /#t$/i', '- [ ] Do stuff #t/b', false],
  ['(description regex matches /#t\\s/i) OR (description regex matches /#t$/i)', '- [ ] #t Do stuff', true], ['(description regex matches /#t\\s/i) OR (description regex matches /#t$/i)', '- [ ] Do stuff #t', true], ['(description regex matches /#t\\s/i) OR (description regex matches /#t$/i)', '- [ ] Do #t/b stuff', false],
  ['description regex matches /#tag\\/subtag[0-9]\\/subsubtag[0-9]/i', '- [ ] Do stuff #tag/subtag3/subsubtag5', true], ['description regex matches /#tag\\/subtag[0-9]\\/subsubtag[0-9]/i', '- [ ] Do stuff #tag', false],
  ['description regex matches /waiting|waits|wartet/i', '- [ ] Do stuff waiting', true], ['description regex matches /waiting|waits|wartet/i', '- [ ] Do stuff wartet', true], ['description regex matches /waiting|waits|wartet/i', '- [ ] Do stuff', false],
]);

table('tags (TagsField.test.ts)', [
  ['has tag', '- [ ] stuff #one', true], ['has tags', '- [ ] stuff #one #two', true], ['has tags', '- [ ] no tag here', false],
  ['no tag', '- [ ] stuff #one', false], ['no tags', '- [ ] no tag here', true],
  ['tags include #home', '- [ ] stuff #home', true], ['tags include #home', '- [ ] stuff #location/home', false],
  ['tags include home', '- [ ] stuff #home', true], ['tags include home', '- [ ] stuff #location/home', true],
  ['tag regex matches /#t$/i', '- [ ] #t Do stuff', true], ['tag regex matches /#t$/i', '- [ ] Do stuff #t', true], ['tag regex matches /#t$/i', '- [ ] #t/b Do stuff', false], ['tag regex matches /#t$/i', '- [ ] Do stuff #t/b', false],
  ['tags regex matches /#tag\\/subtag[0-9]\\/subsubtag[0-9]/i', '- [ ] a #tag/subtag3/subsubtag5', true], ['tags regex matches /#tag\\/subtag[0-9]\\/subsubtag[0-9]/i', '- [ ] b #tag/subtag3/Subsubtag9', true],
  ['tags regex does not match /#HOME/', '- [ ] stuff #work', true], ['tags regex does not match /#HOME/', '- [ ] stuff #home', true], ['tags regex does not match /#HOME/', '- [ ] stuff #HOME', false], ['tags regex does not match /#HOME/', '- [ ] stuff #work #HOME', false],
]);

table('path / folder / filename / heading', [
  ['path includes some/path', '- [ ] x', true, { path: 'some/path/file.md' }], ['path includes some/path', '- [ ] x', true, { path: 'SoMe/PaTh/file.md' }], ['path includes some/path', '- [ ] x', false, { path: 'other/path/file.md' }],
  ['path does not include some/path', '- [ ] x', false, { path: 'some/path/file.md' }], ['path does not include some/path', '- [ ] x', true, { path: 'other/path/file.md' }],
  ['path regex matches /w.bble/', '- [ ] x', true, { path: 'some/path/wibble.md' }], ['path regex matches /w.bble/', '- [ ] x', true, { path: 'some/path/wobble.md' }], ['path regex matches /w.bble/', '- [ ] x', false, { path: 'some/path/WobblE.md' }], ['path regex matches /w.bble/', '- [ ] x', false, { path: 'other/path/file.md' }],
  ['path regex matches /w.bble/i', '- [ ] x', true, { path: 'some/path/WobblE.md' }],
  ['path regex does not match /w.bble/', '- [ ] x', false, { path: 'some/path/wibble.md' }], ['path regex does not match /w.bble/', '- [ ] x', true, { path: 'some/path/WobblE.md' }], ['path regex does not match /w.bble/', '- [ ] x', true, { path: 'other/path/file.md' }],
  ['path regex matches /a/b/c/d/', '- [ ] x', true, { path: 'a/b/c/d/e.md' }], ['path regex matches /a/b/c/d/', '- [ ] x', false, { path: 'a/b.md' }], // unescaped slashes in the query are fine
  ['folder includes search_text', '- [ ] x', true, { path: 'some/SeArch_Text/some file name.md' }], ['folder includes search_text', '- [ ] x', false, { path: 'other/folder/search_text.md' }],
  ['filename includes search_text', '- [ ] x', true, { path: 'some/path/SeArch_Text.md' }], ['filename includes search_text', '- [ ] x', false, { path: 'other/search_text/file.md' }],
  ['filename does not include search_text', '- [ ] x', true, { path: 'other/search_text/file.md' }], ['filename does not include search_text', '- [ ] x', false, { path: 'SoMe/PaTh/SeArcH_Text.md' }],
  ['filename regex matches /w.bble/', '- [ ] x', true, { path: 'some/path/wibble.md' }], ['filename regex matches /w.bble/', '- [ ] x', false, { path: 'some/wibble/filename.md' }],
  ['filename regex does not match /w.bble/', '- [ ] x', true, { path: 'some/wobble/path name.md' }], ['filename regex does not match /w.bble/', '- [ ] x', false, { path: 'some/path/wibble.md' }],
  ['heading includes Interesting Heading', '- [ ] x', false, { heading: null }], ['heading includes Interesting Heading', '- [ ] x', true, { heading: 'An InteResting HeaDing' }], ['heading includes Interesting Heading', '- [ ] x', false, { heading: 'Other Heading' }],
  ['heading does not include Interesting Heading', '- [ ] x', true, { heading: null }], ['heading does not include Interesting Heading', '- [ ] x', false, { heading: 'SoMe InteResting HeaDing' }], ['heading does not include Interesting Heading', '- [ ] x', true, { heading: 'Other Heading' }],
  ['heading regex matches /[Ii]nteresting Head.ng/', '- [ ] x', true, { heading: 'Interesting Heading' }], ['heading regex matches /[Ii]nteresting Head.ng/', '- [ ] x', false, { heading: null }], ['heading regex matches /[Ii]nteresting Head.ng/', '- [ ] x', false, { heading: 'SoMe InteResting HeaDing' }],
  ['heading regex does not match /[Ii]nteresting Head.ng/i', '- [ ] x', true, { heading: null }], ['heading regex does not match /[Ii]nteresting Head.ng/i', '- [ ] x', false, { heading: 'Interesting Heading' }], ['heading regex does not match /[Ii]nteresting Head.ng/i', '- [ ] x', false, { heading: 'SoMe InteResting HeaDing' }],
]);

table('id / depends on (IdField, DependsOnField)', [
  ['has id', '- [ ] x', false], ['has id', '- [ ] x 🆔 abcdef', true], ['no id', '- [ ] x', true], ['no id', '- [ ] x 🆔 abcdef', false],
  ['id includes DEF', '- [ ] x', false], ['id includes DEF', '- [ ] x 🆔 abcdef', true],
  ['id does not include def', '- [ ] x', true], ['id does not include def', '- [ ] x 🆔 abcdef', false],
  ['id regex matches /\\d/', '- [ ] x', false], ['id regex matches /\\d/', '- [ ] x 🆔 a1', true], ['id regex matches /\\d/', '- [ ] x 🆔 bc', false],
  ['id regex does not match /\\d/', '- [ ] x', true], ['id regex does not match /\\d/', '- [ ] x 🆔 a1', false], ['id regex does not match /\\d/', '- [ ] x 🆔 bc', true],
  ['has depends on', '- [ ] x', false], ['has depends on', '- [ ] x ⛔ abcdef', true], ['no depends on', '- [ ] x', true], ['no depends on', '- [ ] x ⛔ abcdef', false],
]);

const bool = (f: string): Case[] => [
  [f, '- [ ] neither', false], [f, '- [ ] d1', false], [f, '- [ ] d2', false], [f, '- [ ] d1 d2', true],
];
table('boolean combinations (BooleanField.test.ts)', [
  ...bool('(description includes d1) AND (description includes d2)'),
  ...bool('(description includes d1)AND(description includes d2)'),
  ...bool('[description includes d1] AND [description includes d2]'),
  ...bool('{description includes d1} AND {description includes d2}'),
  ...bool('"description includes d1" AND "description includes d2"'),
  ['(description includes d1) OR (description includes d2)', '- [ ] neither', false], ['(description includes d1) OR (description includes d2)', '- [ ] d1', true], ['(description includes d1) OR (description includes d2)', '- [ ] d2', true], ['(description includes d1) OR (description includes d2)', '- [ ] d1 d2', true],
  ['(description includes d1) XOR (description includes d2)', '- [ ] neither', false], ['(description includes d1) XOR (description includes d2)', '- [ ] d1', true], ['(description includes d1) XOR (description includes d2)', '- [ ] d2', true], ['(description includes d1) XOR (description includes d2)', '- [ ] d1 d2', false],
  ['NOT (description includes d1)', '- [ ] nothing', true], ['NOT (description includes d1)', '- [ ] d1', false],
  ['(description includes d1) AND NOT (description includes d2)', '- [ ] neither', false], ['(description includes d1) AND NOT (description includes d2)', '- [ ] d1', true], ['(description includes d1) AND NOT (description includes d2)', '- [ ] d2', false], ['(description includes d1) AND NOT (description includes d2)', '- [ ] d1 d2', false],
  ['(description includes d1) OR NOT (description includes d2)', '- [ ] neither', true], ['(description includes d1) OR NOT (description includes d2)', '- [ ] d1', true], ['(description includes d1) OR NOT (description includes d2)', '- [ ] d2', false], ['(description includes d1) OR NOT (description includes d2)', '- [ ] d1 d2', true],
  [' (description includes #context/location1) OR (description includes #context/location2 ) OR (  description includes #context/location3 ) OR   (  description includes #context/location4 )', '- [ ] none', false],
  [' (description includes #context/location1) OR (description includes #context/location2 ) OR (  description includes #context/location3 ) OR   (  description includes #context/location4 )', '- [ ] xxx #context/location3', true],
  ['(not done) AND (is recurring)', '- [ ] x 🔁 every day 📅 2022-06-17', true], ['(not done) AND (is recurring)', '- [x] x 🔁 every day 📅 2022-06-17', false],
]);
