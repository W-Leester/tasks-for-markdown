import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMcpServer } from '../packages/cli/src/mcp';

let root: string;
let client: Client;
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const body = (r.content as { type: string; text: string }[])[0]!.text;
  return { isError: r.isError === true, data: body.startsWith('{') || body.startsWith('[') ? JSON.parse(body) : body };
};

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'tasksmd-mcp-'));
  fs.mkdirSync(path.join(root, 'notes'));
  fs.mkdirSync(path.join(root, '.tasks', 'queries'), { recursive: true });
  fs.writeFileSync(path.join(root, 'notes', 'todo.md'), '- [ ] write report #work ⏫ 📅 2026-09-25\n- [ ] weekly sync 🔁 every week 📅 2026-09-26\n');
  fs.writeFileSync(path.join(root, '.tasks', 'queries', 'Overdue.md'), '# Overdue\n\n```tasks\nnot done\ndue before today\n```\n');
  const server = createMcpServer({ root, today: '2026-09-26', version: 'test' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(clientTransport);
});
afterEach(async () => {
  await client.close();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('MCP server', () => {
  it('lists the tools and serves the syntax resource', async () => {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(['tasks_create', 'tasks_explain_query', 'tasks_get', 'tasks_list_saved_queries', 'tasks_postpone', 'tasks_query', 'tasks_remove', 'tasks_set_status', 'tasks_syntax_reference', 'tasks_update']);
    const res = await client.readResource({ uri: 'tasks://syntax' });
    expect((res.contents[0] as { text: string }).text).toContain('Query language');
  });

  it('query, saved queries and explain', async () => {
    const q = await call('tasks_query', { query: 'not done\nsort by due' });
    expect(q.isError).toBe(false);
    expect(q.data.matched).toBe(2);
    expect(q.data.tasks[0]).toMatchObject({ path: 'notes/todo.md', line: 0, description: 'write report #work' });
    const saved = await call('tasks_list_saved_queries');
    expect(saved.data).toEqual([{ id: '.tasks/queries/Overdue.md', name: 'Overdue', query: 'not done\ndue before today', source: 'file' }]);
    const bad = await call('tasks_query', { query: 'nonsense' });
    expect(bad.isError).toBe(true);
    expect(bad.data.error.code).toBe('INVALID_QUERY');
    const ex = await call('tasks_explain_query', { query: 'priority is high' });
    expect(ex.data.errors).toEqual([]);
  });

  it('create → update → set_status (recurrence) → postpone → remove, with STALE_LINE', async () => {
    const created = await call('tasks_create', { file: 'notes/todo.md', description: 'call bob #work', due: '2026-10-01', priority: '1' });
    expect(created.isError).toBe(false);
    expect(created.data).toMatchObject({ line: 2, due: '2026-10-01', priority: '1' });
    expect(read('notes/todo.md')).toContain('- [ ] call bob #work ⏫ 📅 2026-10-01\n');

    const stale = await call('tasks_set_status', { path: 'notes/todo.md', line: 1, expectedText: '- [ ] something else', symbol: 'x' });
    expect(stale.isError).toBe(true);
    expect(stale.data.error.code).toBe('STALE_LINE');

    const done = await call('tasks_set_status', { path: 'notes/todo.md', line: 1, expectedText: '- [ ] weekly sync 🔁 every week 📅 2026-09-26', symbol: 'x' });
    expect(done.isError).toBe(false);
    const lines = read('notes/todo.md').split('\n');
    expect(lines[1]).toBe('- [ ] weekly sync 🔁 every week 📅 2026-10-03');
    expect(lines[2]).toBe('- [x] weekly sync 🔁 every week 📅 2026-09-26 ✅ 2026-09-26');

    const upd = await call('tasks_update', { path: 'notes/todo.md', line: 0, due: '2026-10-10', priority: '3' });
    expect(upd.data.originalMarkdown).toBe('- [ ] write report #work 📅 2026-10-10');
    const pp = await call('tasks_postpone', { path: 'notes/todo.md', line: 0, to: 'in 2 weeks' });
    expect(pp.data.due).toBe('2026-10-10');
    const pp2 = await call('tasks_postpone', { path: 'notes/todo.md', line: 0, to: '2026-10-20' });
    expect(pp2.data.due).toBe('2026-10-20');
    const got = await call('tasks_get', { path: 'notes/todo.md', line: 0 });
    expect(got.data.due).toBe('2026-10-20');
    const rm = await call('tasks_remove', { path: 'notes/todo.md', line: 0 });
    expect(rm.data).toEqual({ ok: true });
    expect(read('notes/todo.md')).not.toContain('write report');
    const missing = await call('tasks_get', { path: 'notes/todo.md', line: 40 });
    expect(missing.data.error.code).toBe('NOT_FOUND');
  });
});
