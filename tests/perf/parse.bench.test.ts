/** Parser throughput on a synthetic 5,000-file / 50,000-task workspace. `BENCH=1` prints timings. */
import { describe, expect, it } from 'vitest';
import { parseFile } from '../../src/core/file';
import { TaskIndex } from '../../src/core/index';
import { StatusRegistry } from '../../src/core/task';

const BENCH = !!process.env.BENCH;
const FILES = BENCH ? 5000 : 300;
const reg = StatusRegistry.default();

function fileText(f: number): string {
  const lines = ['---', 'tags: [note]', '---', `# File ${f}`, '', 'Some paragraph text that is not a task.', '', '## Tasks'];
  for (let t = 0; t < 10; t++) {
    const n = f * 10 + t;
    lines.push(`- [${n % 5 === 0 ? 'x' : ' '}] task ${n} with some words #tag${n % 7} ${n % 3 ? '⏫ ' : ''}📅 2026-${String(1 + (n % 12)).padStart(2, '0')}-${String(1 + (n % 28)).padStart(2, '0')}${n % 5 === 0 ? ' ✅ 2026-09-01' : ''}`);
    if (t % 4 === 0) lines.push('  - [ ] sub item of the above 🔁 every week');
  }
  lines.push('', '```', '- [ ] not a task', '```');
  return lines.join('\n');
}

describe('parse performance', () => {
  it(`parses ${FILES} files`, () => {
    const texts = Array.from({ length: FILES }, (_, f) => fileText(f));
    const idx = new TaskIndex();
    const t0 = performance.now();
    texts.forEach((text, f) => {
      const path = `f${f % 50}/file-${f}.md`;
      const r = parseFile(text, { path, statusRegistry: reg });
      idx.setFile({ key: path, path, tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags }, true);
    });
    const ms = performance.now() - t0;
    const tasks = idx.taskCount();
    if (BENCH) console.log(`parsed ${FILES} files / ${tasks} tasks in ${ms.toFixed(0)}ms (${(ms / FILES).toFixed(3)}ms per file)`);
    expect(tasks).toBe(FILES * 13 - FILES * 0); // 10 tasks + 3 sub items per file
    expect(ms / FILES).toBeLessThan(BENCH ? 2 : 5);
    // single-file re-index (the incremental path) must be far under the 50ms target
    const t1 = performance.now();
    const r = parseFile(texts[0]!, { path: 'x.md', statusRegistry: reg });
    idx.setFile({ key: 'x.md', path: 'x.md', tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags });
    const single = performance.now() - t1;
    if (BENCH) console.log(`single file re-index: ${single.toFixed(2)}ms`);
    expect(single).toBeLessThan(50);
  });
});
