import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import { Query } from '../../../src/core/query';
import { StatusRegistry } from '../../../src/core/task';
import { tasksMarkdownItPlugin } from '../../../src/preview/markdownItPlugin';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-21');
const index = new TaskIndex();
const notes = ['# Notes', '- [ ] write report ⏫ 📅 2026-09-19', '- [x] done thing ✅ 2026-09-20', '- [ ] plain'].join('\n');
{
  const r = parseFile(notes, { path: 'notes/a.md', statusRegistry: reg });
  index.setFile({ key: 'notes/a.md', path: 'notes/a.md', tasks: r.tasks, headings: r.headings, frontmatterTags: [] }, true);
}
let enabled = true;
const md = new MarkdownIt();
tasksMarkdownItPlugin(md, {
  getStatusRegistry: () => reg,
  runQuery: (text, source) => Query.parse(text, source).run({ index, today, allowFunctions: false, source }),
  parseQuery: (text, source) => Query.parse(text, source),
  renderOptions: () => ({ today, link: (t) => `${t.location.path}#L${t.location.line + 1}` }),
  sourceFromEnv: (env) => (env as { path?: string })?.path ? { path: (env as { path: string }).path } : undefined,
  globalFilter: () => undefined,
  enabled: () => enabled,
});

describe('markdown-it plugin — task lines', () => {
  it('renders a checkbox, keeps the description markup and moves fields into badges', () => {
    const html = md.render('- [ ] write **report** #work ⏫ 📅 2026-09-19');
    expect(html).toContain('<li class="tfm-task tfm-status-open"');
    expect(html).toContain('<input type="checkbox" class="tfm-check" disabled');
    expect(html).toContain('write <strong>report</strong> #work');
    expect(html).not.toContain('>[ ] write'); // prefix replaced by the checkbox
    expect(html).toContain('tfm-badge tfm-pri-high');
    expect(html).toContain('tfm-badge tfm-due tfm-overdue');
    expect(html).toContain('2026-09-19 · overdue 2 days');
    expect(html).toContain('data-tfm-line="0"');
  });
  it('marks done and cancelled items, leaves plain list items alone', () => {
    const html = md.render('- [x] done ✅ 2026-09-20\n- [-] gone ❌ 2026-09-20\n- plain item\n- [ ]');
    expect(html).toContain('tfm-status-done');
    expect(html).toContain('tfm-status-cancelled');
    expect(html).toContain('checked');
    expect(html).toContain('<li>plain item</li>');
    expect((html.match(/tfm-check/g) ?? []).length).toBe(3);
  });
  it('handles nested lists and numbered items', () => {
    const html = md.render('1. [ ] first 📅 2026-10-01\n   - [/] child');
    expect((html.match(/tfm-task/g) ?? []).length).toBe(2);
    expect(html).toContain('data-symbol="/"');
  });
  it('does nothing when disabled', () => {
    enabled = false;
    try {
      expect(md.render('- [ ] a 📅 2026-10-01')).toContain('[ ] a 📅 2026-10-01');
    } finally {
      enabled = true;
    }
  });
});

describe('markdown-it plugin — ```tasks blocks', () => {
  it('renders query results with groups, badges, links and a count', () => {
    const html = md.render('```tasks\nnot done\ngroup by filename\n```', { path: 'notes/b.md' });
    expect(html).toContain('<div class="tfm-query-block"');
    expect(html).toContain('<h4 class="tfm-group tfm-group-0">a<span class="tfm-count">2</span></h4>');
    expect(html).toContain('write report');
    expect(html).not.toContain('done thing');
    expect(html).toContain('href="notes/a.md#L2"');
    expect(html).toContain('2 of 2 tasks');
  });
  it('shows errors and explain', () => {
    expect(md.render('```tasks\nbanana\n```')).toContain('Line 1: Unknown instruction');
    expect(md.render('```tasks\nnot done\nexplain\n```')).toContain('<details class="tfm-explain"');
  });
  it('respects hide/short mode and leaves other fences untouched', () => {
    const html = md.render('```tasks\nnot done\nhide priority\nshort mode\nhide task count\n```');
    expect(html).not.toContain('tfm-pri-high');
    expect(html).not.toContain('tfm-task-count');
    expect(html).toContain('📅</span>'); // short mode: icon only
    expect(md.render('```js\nconst x = 1;\n```')).toContain('<pre><code class="language-js">');
  });
  it('renders an empty result message', () => {
    expect(md.render('```tasks\ndescription includes nothing-here\n```')).toContain('No tasks match this query.');
  });
});
