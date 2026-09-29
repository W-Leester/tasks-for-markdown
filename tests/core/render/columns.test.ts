import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { TaskIndex } from '../../../src/core/index';
import { Query } from '../../../src/core/query';
import { renderColumns, stripTags } from '../../../src/core/render';
import { StatusRegistry, parseTaskLine } from '../../../src/core/task';
import { tasksMarkdownItPlugin } from '../../../src/preview/markdownItPlugin';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-29');
const parse = (l: string) => parseTaskLine(l, { statusRegistry: reg })!;

describe('column layout (M12)', () => {
  it('splits fields into due / tags / recurrence / more cells, always emitting all four', () => {
    const c = renderColumns(parse('- [ ] write report #work #proj ⏫ 🔁 every week 🆔 r1 ⏳ 2026-09-30 📅 2026-10-02'), null, { today, fieldStyle: 'plain' });
    expect(c.afterDescription).toContain('⏫');
    const cells = [...c.cells.matchAll(/<span class="tfm-col tfm-col-(\w+)"[^>]*>(.*?)<\/span>(?=<span class="tfm-col|$)/gs)].map((m) => [m[1], m[2]]);
    expect(cells.map((x) => x[0])).toEqual(['due', 'tags', 'recur', 'more']);
    expect(cells[0]![1]).toContain('2026-10-02');
    expect(cells[1]![1]).toContain('#work');
    expect(cells[1]![1]).toContain('#proj');
    expect(cells[2]![1]).toContain('every week');
    expect(cells[3]![1]).toContain('r1');
    expect(cells[3]![1]).toContain('2026-09-30');
    expect(cells[3]![1]).not.toContain('2026-10-02');
    const empty = renderColumns(parse('- [ ] plain'), null, { today });
    expect(empty.cells.match(/tfm-col tfm-col-/g)).toHaveLength(4); // empty cells keep the grid aligned
    expect(empty.afterDescription).toBe('');
  });

  it('stripTags removes tags anywhere in the text', () => {
    expect(stripTags('call #bob about #work stuff').trim()).toBe('call about stuff');
  });

  it('the preview plugin emits column cells and drops tags from the description text when columns is on', () => {
    const md = new MarkdownIt();
    const index = new TaskIndex();
    tasksMarkdownItPlugin(md, {
      getStatusRegistry: () => reg,
      runQuery: (text, source) => Query.parse(text, source).run({ index, today, allowFunctions: false, source }),
      parseQuery: (text, source) => Query.parse(text, source),
      renderOptions: () => ({ today, fieldStyle: 'plain', columns: true }),
      sourceFromEnv: () => undefined,
      globalFilter: () => undefined,
      enabled: () => true,
    });
    const html = md.render('- [ ] weekly **sync** #work ⏫ 🔁 every week 📅 2026-10-01');
    expect(html).toMatch(/<span class="tfm-desc">weekly <strong>sync<\/strong><\/span>|<span class="tfm-desc">weekly <strong>sync<\/strong> <span class="tfm-col-pri">/);
    expect(html).not.toMatch(/tfm-desc">[^<]*#work/);
    expect(html).toContain('tfm-col tfm-col-due');
    expect(html).toContain('tfm-col tfm-col-tags');
    expect(html).toMatch(/tfm-col-tags"[^>]*><span class="tfm-tag">#work<\/span>/);
  });
});
