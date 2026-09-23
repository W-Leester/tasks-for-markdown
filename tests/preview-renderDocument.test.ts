import { describe, expect, it } from 'vitest';
import { dayjs } from '../src/core/dates';
import { parseFile } from '../src/core/file';
import { TaskIndex } from '../src/core/index';
import { Query } from '../src/core/query';
import { StatusRegistry } from '../src/core/task';
import type { PluginDeps } from '../src/preview/markdownItPlugin';
import { renderDocumentHtml } from '../src/preview/renderDocument';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-22');
const index = new TaskIndex();
const r = parseFile('- [ ] indexed task 📅 2026-09-30\n', { path: 'notes/a.md', statusRegistry: reg });
index.setFile({ key: 'file:///w/notes/a.md', path: 'notes/a.md', tasks: r.tasks, headings: r.headings, frontmatterTags: [] }, true);
const deps: PluginDeps = {
  getStatusRegistry: () => reg,
  runQuery: (text, source) => Query.parse(text, source).run({ index, today, allowFunctions: false, source }),
  parseQuery: (text, source) => Query.parse(text, source),
  renderOptions: () => ({ today, link: (t) => `${t.location.path}#L${t.location.line + 1}` }),
  sourceFromEnv: () => undefined,
  globalFilter: () => undefined,
  enabled: () => true,
};

describe('renderDocumentHtml (rendered view)', () => {
  const note = ['---', 'tags: [x]', 'title: T', '---', '# Title', '', '- [ ] first task 📅 2026-09-23', '', '```tasks', 'not done', '```', '', '![pic](img/a.png) ![web](https://x/y.png)'].join('\n');

  it('blanks front matter but keeps line numbers, makes checkboxes clickable, renders query results', () => {
    const html = renderDocumentHtml(note, deps);
    expect(html).not.toContain('tags: [x]');
    expect(html).not.toContain('rv-frontmatter');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('data-tfm-line="6"'); // the task is on line 6 (0-based) of the original text
    expect(html).toContain('class="tfm-check"');
    expect(html).not.toContain('class="tfm-check" disabled');
    expect(html).toContain('tfm-query-block');
    expect(html).toContain('indexed task');
    expect(html).toContain('data-tfm-path="notes/a.md" data-tfm-line="0"');
  });

  it('shows front matter as a key/value block when asked, without changing task line numbers', () => {
    const html = renderDocumentHtml(note, deps, { frontMatter: true });
    expect(html).toContain('<div class="rv-frontmatter"><div><span class="k">tags</span>: [x]</div><div><span class="k">title</span>: T</div></div>');
    expect(html).toContain('data-tfm-line="6"');
  });

  it('plain field style renders fields like the source line, overdue still marked', () => {
    const html = renderDocumentHtml('- [ ] a ⏫ 🔁 every week 📅 2026-09-20\n', { ...deps, renderOptions: () => ({ today, fieldStyle: 'plain' }) });
    expect(html).toContain('<span class="tfm-fields"><span class="tfm-field tfm-pri-high" title="high">⏫</span> <span class="tfm-field tfm-recur">🔁 every week</span> <span class="tfm-field tfm-due tfm-overdue" title="due: 2026-09-20 (overdue 2 days)">📅 2026-09-20</span></span>');
    expect(html).not.toContain('tfm-badge');
  });

  it('resolves relative images only', () => {
    const html = renderDocumentHtml(note, deps, { resolveImage: (src) => `https://webview/${src}` });
    expect(html).toContain('src="https://webview/img/a.png"');
    expect(html).toContain('src="https://x/y.png"');
  });

  it('escapes raw HTML in the note', () => {
    const html = renderDocumentHtml('<script>alert(1)</script>\n\n- [ ] a', deps);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
