import MarkdownIt from 'markdown-it';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import { Query } from '../../../src/core/query';
import { StatusRegistry } from '../../../src/core/task';
import { tasksMarkdownItPlugin } from '../../../src/preview/markdownItPlugin';

const reg = StatusRegistry.default();
const today = dayjs('2026-09-22');

/** Renders the shipped example notes end to end — the preview goes blank if the plugin throws. */
describe('example notes render without throwing', () => {
  const index = new TaskIndex();
  const files = ['샘플-태스크.md', '쿼리-예시.md'].map((name) => {
    const path = `examples/${name}`;
    const text = readFileSync(join(__dirname, '..', '..', '..', path), 'utf8');
    const r = parseFile(text, { path, statusRegistry: reg });
    index.setFile({ key: path, path, tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags }, true);
    return { path, text };
  });
  const md = new MarkdownIt();
  tasksMarkdownItPlugin(md, {
    getStatusRegistry: () => reg,
    runQuery: (text, source) => Query.parse(text, source).run({ index, today, allowFunctions: false, source }),
    parseQuery: (text, source) => Query.parse(text, source),
    renderOptions: () => ({ today, link: (t) => `${t.location.path}#L${t.location.line + 1}`, t: (s, ...a) => s.replace(/\{(\d+)\}/g, (_, i) => String(a[Number(i)])) }),
    sourceFromEnv: (env) => (env as { path?: string })?.path ? { path: (env as { path: string }).path } : undefined,
    globalFilter: () => undefined,
    enabled: () => true,
  });
  for (const f of files) {
    it(f.path, () => {
      const html = md.render(f.text, { path: f.path });
      expect(html.length).toBeGreaterThan(100);
      if (f.path.includes('샘플')) expect((html.match(/tfm-task/g) ?? []).length).toBeGreaterThan(20);
    });
  }
});
