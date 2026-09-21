/**
 * Synthetic 5,000-file / 50,000-task index; run with `BENCH=1 pnpm vitest run tests/perf` to see
 * timings. Without BENCH the suite only asserts loose upper bounds so CI stays fast and green.
 */
import { describe, expect, it } from 'vitest';
import { dayjs } from '../../src/core/dates';
import { parseFile } from '../../src/core/file';
import { TaskIndex } from '../../src/core/index';
import { Query } from '../../src/core/query';
import { StatusRegistry } from '../../src/core/task';

const BENCH = !!process.env.BENCH;
const FILES = BENCH ? 5000 : 500;
const TASKS_PER_FILE = 10;
const reg = StatusRegistry.default();
const today = dayjs('2026-09-21');

function synth(): TaskIndex {
  const idx = new TaskIndex();
  const words = ['report', 'meeting', 'deploy', 'review', 'budget', 'design', 'email', 'call'];
  let n = 0;
  for (let f = 0; f < FILES; f++) {
    const lines = [`# File ${f}`, '## Section A'];
    for (let t = 0; t < TASKS_PER_FILE; t++, n++) {
      const w = words[n % words.length];
      const due = n % 3 === 0 ? ` 📅 2026-${String(9 + (n % 3)).padStart(2, '0')}-${String(1 + (n % 27)).padStart(2, '0')}` : '';
      const pri = n % 5 === 0 ? ' ⏫' : n % 7 === 0 ? ' 🔽' : '';
      const tag = n % 4 === 0 ? ' #work' : '';
      const status = n % 6 === 0 ? 'x' : n % 11 === 0 ? '/' : ' ';
      lines.push(`- [${status}] ${w} task ${n}${tag}${pri}${due}${n % 6 === 0 ? ' ✅ 2026-09-10' : ''}`);
    }
    const path = `folder${f % 20}/file-${f}.md`;
    const r = parseFile(lines.join('\n'), { path, statusRegistry: reg });
    idx.setFile({ key: path, path, tasks: r.tasks, headings: r.headings, frontmatterTags: [] }, true);
  }
  return idx;
}

describe('query performance', () => {
  const t0 = performance.now();
  const index = synth();
  const buildMs = performance.now() - t0;
  const ctx = { index, today, allowFunctions: true };
  const queries: Record<string, string> = {
    'not done': 'not done',
    'due this week': 'not done\ndue before next week\nsort by urgency',
    'boolean + tags': '(tags include #work) OR (priority is high)\nsort by due',
    'group by folder/due': 'not done\ngroup by folder\ngroup by due',
    'regex': 'description regex matches /^(report|deploy)/',
    'function filter': 'filter by function task.priorityNumber < 3 && task.due.isValid',
  };
  it(`builds ${index.taskCount()} tasks in ${buildMs.toFixed(0)}ms`, () => {
    expect(index.taskCount()).toBe(FILES * TASKS_PER_FILE);
  });
  for (const [name, text] of Object.entries(queries)) {
    it(`runs "${name}"`, () => {
      const q = Query.parse(text);
      expect(q.errors).toEqual([]);
      const start = performance.now();
      const r = q.run(ctx);
      const ms = performance.now() - start;
      if (BENCH) console.log(`${name.padEnd(22)} ${ms.toFixed(1).padStart(7)}ms  matched=${r.matched}`);
      expect(ms).toBeLessThan(BENCH ? 1000 : 2000);
    });
  }
});
