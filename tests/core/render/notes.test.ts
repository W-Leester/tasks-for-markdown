import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import { Query } from '../../../src/core/query';
import { renderQueryResult } from '../../../src/core/render';
import { StatusRegistry } from '../../../src/core/task';
import type { PluginDeps } from '../../../src/preview/markdownItPlugin';
import { renderDocumentHtml } from '../../../src/preview/renderDocument';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-29');
const text = ['- [ ] 계약서 검토 📅 2026-09-26', '  - 3조 <위약금> 확인', '  - 회신 대기', '  - [ ] 메일 보내기', '- [ ] 메모 없음'].join('\n');
const index = new TaskIndex();
const r = parseFile(text, { path: 'notes/a.md', statusRegistry: reg });
index.setFile({ key: 'file:///w/notes/a.md', path: 'notes/a.md', tasks: r.tasks, headings: r.headings, frontmatterTags: [] }, true);
const run = (q: string) => Query.parse(q).run({ index, today, allowFunctions: false });

describe('notes in query results (M13)', () => {
  for (const columns of [false, true]) {
    it(`shows 💬 N with an expandable, escaped note list (columns=${columns})`, () => {
      const q = Query.parse('not done\nhide tree');
      const html = renderQueryResult(run('not done\nhide tree'), q.layout, '', { today, columns });
      expect(html.match(/class="tfm-notes"/g)).toHaveLength(1);
      expect(html).toContain('<summary title="3조 &lt;위약금&gt; 확인\n회신 대기" aria-label="2 notes">💬 2</summary>');
      expect(html).toContain('<li>3조 &lt;위약금&gt; 확인</li><li>회신 대기</li>');
      // After the backlink so an opened list doesn't push it down; in columns mode still inside the description cell.
      const row = html.slice(html.indexOf('계약서 검토'));
      expect(row.indexOf('tfm-notes')).toBeGreaterThan(row.indexOf('tfm-backlink'));
      if (columns) expect(row.indexOf('tfm-notes')).toBeLessThan(row.indexOf('tfm-col-due'));
    });
  }
});

describe('notes in the rendered note (M13)', () => {
  const deps: PluginDeps = {
    getStatusRegistry: () => reg,
    runQuery: (q, source) => Query.parse(q, source).run({ index, today, allowFunctions: false, source }),
    parseQuery: (q, source) => Query.parse(q, source),
    renderOptions: () => ({ today }),
    sourceFromEnv: () => undefined,
    globalFilter: () => undefined,
    enabled: () => true,
  };
  it('marks plain bullets directly under a task as tfm-note, not sub-tasks or bullets under plain items', () => {
    const html = renderDocumentHtml(`${text}\n\n- 일반 목록\n  - 일반 하위`, deps);
    expect(html.match(/tfm-note/g)).toHaveLength(2);
    expect(html).toMatch(/<li class="tfm-note">3조 &lt;위약금&gt; 확인<\/li>/);
    expect(html).not.toMatch(/tfm-note">일반 하위/);
  });
});

describe('query block key (M15)', () => {
  it('is stable across whitespace/CRLF and line moves, differs by query text, and is on the block', async () => {
    const { queryKey } = await import('../../../src/preview/markdownItPlugin');
    expect(queryKey('not done\nsort by due\n')).toBe(queryKey('  not done\r\nsort by due'));
    expect(queryKey('not done')).not.toBe(queryKey('done'));
    const deps: PluginDeps = {
      getStatusRegistry: () => reg,
      runQuery: (q, source) => Query.parse(q, source).run({ index, today, allowFunctions: false, source }),
      parseQuery: (q, source) => Query.parse(q, source),
      renderOptions: () => ({ today }),
      sourceFromEnv: () => undefined,
      globalFilter: () => undefined,
      enabled: () => true,
    };
    const a = renderDocumentHtml('```tasks\nnot done\n```', deps);
    const b = renderDocumentHtml('# moved\n\ntext\n\n```tasks\nnot done\n```', deps);
    const key = (html: string) => /data-tfm-query-key="([^"]+)"/.exec(html)?.[1];
    expect(key(a)).toBe(queryKey('not done'));
    expect(key(b)).toBe(key(a));
  });
});
