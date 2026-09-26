import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run } from '../packages/cli/src/main';
import { parseJsonc } from '../packages/cli/src/config';

let root: string;
let out: string[];
let err: string[];
const io = () => ({ cwd: root, out: (l: string) => out.push(l), err: (l: string) => err.push(l) });
const cli = (...args: string[]) => run([...args, '--today', '2026-09-26'], io());
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'tasksmd-cli-'));
  out = [];
  err = [];
  fs.mkdirSync(path.join(root, 'notes'));
  fs.mkdirSync(path.join(root, 'drafts'));
  fs.mkdirSync(path.join(root, 'node_modules', 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(root, 'notes', 'todo.md'), ['# Todo', '', '- [ ] write report #work ⏫ 📅 2026-09-25', '- [ ] weekly sync 🔁 every week 📅 2026-09-26', '- [x] old thing ✅ 2026-09-01', ''].join('\n'));
  fs.writeFileSync(path.join(root, 'drafts', 'ignored.md'), '- [ ] should not be indexed\n');
  fs.writeFileSync(path.join(root, 'node_modules', 'pkg', 'README.md'), '- [ ] vendored\n');
  fs.writeFileSync(path.join(root, '.gitignore'), 'drafts/\n');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('tasksmd CLI', () => {
  it('query: scans the folder (gitignore, node_modules excluded) and prints markdown or json', async () => {
    expect(await cli('query', 'not done\\nsort by due', '--md')).toBe(0);
    expect(out[0]).toContain('write report');
    expect(out[0]).toContain('(notes/todo.md:3)');
    expect(out.join('\n')).not.toContain('should not be indexed');
    expect(out.join('\n')).not.toContain('vendored');
    expect(out.at(-1)).toBe('2 of 2 tasks');
    out = [];
    expect(await cli('query', 'done', '--json')).toBe(0);
    const r = JSON.parse(out.join('\n')) as { matched: number; tasks: { description: string; path: string; line: number }[] };
    expect(r.matched).toBe(1);
    expect(r.tasks[0]).toMatchObject({ description: 'old thing', path: 'notes/todo.md', line: 4 });
  });

  it('query: parse errors exit 1 with a code', async () => {
    expect(await cli('query', 'nonsense here', '--json')).toBe(1);
    expect(JSON.parse(out.join('\n'))).toMatchObject({ error: { code: 'INVALID_QUERY' } });
    expect(await cli('explain', 'not done', '--md')).toBe(0);
    expect(out.join('\n')).toMatch(/not done/i);
  });

  it('add / done (recurrence) / set / postpone / remove edit the file like the editor', async () => {
    expect(await cli('add', 'call bob #work 📅 2026-10-01', '--file', 'notes/todo.md', '--json')).toBe(0);
    const added = JSON.parse(out.join('\n')) as { line: number; originalMarkdown: string };
    expect(added.line).toBe(5);
    expect(read('notes/todo.md')).toContain('- [ ] call bob #work 📅 2026-10-01\n');
    out = [];

    // done on the recurring task writes ✅ and inserts the next occurrence above (default insertPosition)
    expect(await cli('done', 'notes/todo.md:4', '--expect', '- [ ] weekly sync 🔁 every week 📅 2026-09-26', '--json')).toBe(0);
    const text = read('notes/todo.md').split('\n');
    expect(text[3]).toBe('- [ ] weekly sync 🔁 every week 📅 2026-10-03');
    expect(text[4]).toBe('- [x] weekly sync 🔁 every week 📅 2026-09-26 ✅ 2026-09-26');
    out = [];

    // stale expectation is refused
    expect(await cli('done', 'notes/todo.md:3', '--expect', '- [ ] something else', '--json')).toBe(1);
    expect(JSON.parse(out.join('\n'))).toMatchObject({ error: { code: 'STALE_LINE' } });
    out = [];

    expect(await cli('set', 'notes/todo.md:3', '--due', '2026-10-10', '--priority', '3', '--json')).toBe(0);
    expect(read('notes/todo.md').split('\n')[2]).toBe('- [ ] write report #work 📅 2026-10-10');
    out = [];
    expect(await cli('postpone', 'notes/todo.md:3', 'next monday', '--json')).toBe(0);
    expect(read('notes/todo.md').split('\n')[2]).toBe('- [ ] write report #work 📅 2026-09-28');
    out = [];
    expect(await cli('set', 'notes/todo.md:3', '--due', 'bad', '--json')).toBe(2);
    out = [];
    expect(await cli('remove', 'notes/todo.md:3', '--json')).toBe(0);
    expect(read('notes/todo.md')).not.toContain('write report');
    out = [];
    expect(await cli('remove', 'notes/todo.md:99', '--json')).toBe(1);
    expect(JSON.parse(out.join('\n'))).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('honours .vscode/settings.json (setCreatedDate, insertPosition, globalFilter)', async () => {
    fs.mkdirSync(path.join(root, '.vscode'));
    fs.writeFileSync(path.join(root, '.vscode', 'settings.json'), '{\n  // comment\n  "tasksmd.setCreatedDate": true,\n  "tasksmd.recurrence.insertPosition": "below", /* x */\n  "tasksmd.globalFilter": "#task",\n}\n');
    expect(parseJsonc('{"a": 1, // c\n "b": [1,2,],}')).toEqual({ a: 1, b: [1, 2] });
    expect(await cli('add', '#task new one', '--file', 'notes/todo.md', '--json')).toBe(0);
    expect(read('notes/todo.md')).toContain('- [ ] #task new one ➕ 2026-09-26');
    out = [];
    // global filter: tasks without #task are not tasks any more
    expect(await cli('query', 'not done', '--json')).toBe(0);
    const r = JSON.parse(out.join('\n')) as { tasks: { description: string }[] };
    expect(r.tasks.map((t) => t.description)).toEqual(['#task new one']); // the global filter stays in the description, as in Obsidian
  });

  it('help and unknown command', async () => {
    expect(await cli('--help')).toBe(2);
    expect(out[0]).toContain('Usage');
    out = [];
    expect(await cli('frobnicate', '--md')).toBe(2);
    expect(err[0]).toContain('Unknown command');
  });
});
