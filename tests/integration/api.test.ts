import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import type { TasksApi } from '../../src/api/types';
import { fixtureUri, getApi, getExports, waitFor } from './helpers';

suite('public API (getAPI(1))', () => {
  const FILE = 'api-test.md';
  let api: TasksApi;
  let internal: Awaited<ReturnType<typeof getApi>>;

  suiteSetup(async () => {
    internal = await getApi();
    await internal.settings.update('api.writePolicy', 'allow', vscode.ConfigurationTarget.Workspace);
    api = (await getExports()).getAPI(1, { extensionId: 'test.caller' });
  });
  suiteTeardown(async () => {
    await internal.settings.update('api.writePolicy', undefined, vscode.ConfigurationTarget.Workspace);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    const uri = fixtureUri(FILE);
    if (fs.existsSync(uri.fsPath)) fs.unlinkSync(uri.fsPath);
    internal.index.removeFile(uri.toString());
  });

  test('version check and read-only calls', async () => {
    assert.strictEqual(api.version, 1);
    const ex = await getExports();
    assert.throws(() => ex.getAPI(2 as never), (e: { code: string }) => e.code === 'INVALID_ARGUMENT');
    const explained = await api.query.explain('not done\nsort by urgency');
    assert.strictEqual(explained.errors.length, 0);
    assert.ok(explained.explain.length > 0);
    const bad = await api.query.explain('nonsense instruction');
    assert.strictEqual(bad.errors.length, 1);
    await assert.rejects(api.query.run('nonsense instruction'), (e: { code: string }) => e.code === 'INVALID_QUERY');
    const all = await api.query.list();
    assert.ok(all.length > 5);
    const some = await api.query.list({ paths: ['notes/week-38.md'] });
    assert.ok(some.length > 0 && some.every((t) => t.path === 'notes/week-38.md'));
    const saved = await api.query.saved();
    assert.ok(Array.isArray(saved));
    assert.strictEqual(await api.query.get({ path: 'notes/week-38.md', line: 9999 }), null);
  });

  test('create → get → update → setStatus (recurring) → postpone → batch → remove, with STALE_LINE and events', async () => {
    const completed: string[] = [];
    const sub = api.events.onDidCompleteTask((e) => completed.push(e.task.description + (e.next ? ` +next ${e.next.due}` : '')));
    const changed: string[][] = [];
    const sub2 = api.events.onDidChangeTasks((e) => changed.push(e.paths));
    try {
      const created = await api.edit.create({ description: 'api task', due: '2026-10-01', priority: '1', tags: ['work'], recurrence: 'every week' }, { path: FILE });
      assert.strictEqual(created.path, FILE);
      assert.strictEqual(created.description, 'api task #work');
      assert.strictEqual(created.due, '2026-10-01');
      assert.strictEqual(created.priority, '1');
      assert.ok(created.originalMarkdown.includes('🔁 every week'));

      const got = await api.query.get({ path: FILE, line: created.line });
      assert.strictEqual(got?.description, 'api task #work');

      const r = await api.query.run('path includes api-test\nnot done');
      assert.strictEqual(r.matched, 1);
      assert.strictEqual(r.tasks[0]!.line, created.line);

      const updated = await api.edit.update({ path: FILE, line: created.line, expectedText: created.originalMarkdown }, { due: '2026-10-03', description: 'api task edited #work' });
      assert.strictEqual(updated.due, '2026-10-03');
      assert.strictEqual(updated.description, 'api task edited #work');

      await assert.rejects(api.edit.setStatus({ path: FILE, line: updated.line, expectedText: created.originalMarkdown }, 'x'), (e: { code: string }) => e.code === 'STALE_LINE');
      await assert.rejects(api.edit.setStatus({ path: FILE, line: updated.line }, '?'), (e: { code: string }) => e.code === 'INVALID_ARGUMENT');
      await assert.rejects(api.edit.setStatus({ path: FILE, line: 500 }, 'x'), (e: { code: string }) => e.code === 'NOT_FOUND');

      const done = await api.edit.setStatus({ path: FILE, line: updated.line, expectedText: updated.originalMarkdown }, 'x');
      assert.ok(done.isCompleted);
      await waitFor(() => completed.length === 1, 3000, 'onDidCompleteTask');
      assert.ok(completed[0]!.startsWith('api task edited #work +next 2026-10-10'), completed[0]);

      // The recurrence wrote the next occurrence above the done line (insertPosition default 'above').
      const list = await api.query.list({ paths: [FILE] });
      assert.strictEqual(list.length, 2);
      const next = list.find((t) => !t.isCompleted)!;
      const postponed = await api.edit.postpone({ path: FILE, line: next.line }, '2026-10-20');
      assert.strictEqual(postponed.due, '2026-10-20');

      const batch = await api.edit.batch([
        { op: 'create', input: { description: 'batch one' }, target: { path: FILE } },
        { op: 'create', input: { description: 'batch two', due: '2026-11-01' }, target: { path: FILE } },
        { op: 'toggle', ref: { path: FILE, line: postponed.line } },
      ]);
      assert.strictEqual(batch.results.length, 3);
      assert.ok(batch.results[2]!.isCompleted);
      await assert.rejects(api.edit.batch([{ op: 'remove', ref: { path: FILE, line: 999 } }]), (e: { code: string; details: { index: number } }) => e.code === 'NOT_FOUND' && e.details.index === 0);

      const before = (await api.query.list({ paths: [FILE] })).length;
      const one = (await api.query.list({ paths: [FILE] })).find((t) => t.description === 'batch one')!;
      await api.edit.remove({ path: FILE, line: one.line, expectedText: one.originalMarkdown });
      assert.strictEqual((await api.query.list({ paths: [FILE] })).length, before - 1);
      assert.ok(changed.some((paths) => paths.includes(FILE)), 'onDidChangeTasks fired for the file');
    } finally {
      sub.dispose();
      sub2.dispose();
    }
  });

  test('write policy deny and the command surface', async () => {
    await internal.settings.update('api.writePolicy', 'deny', vscode.ConfigurationTarget.Workspace);
    try {
      await assert.rejects(api.edit.create({ description: 'blocked' }, { path: FILE }), (e: { code: string }) => e.code === 'DENIED');
      const viaCommand = (await vscode.commands.executeCommand('tasksmd.api.edit.create', { input: { description: 'blocked' }, target: { path: FILE } })) as { error: { code: string } };
      assert.strictEqual(viaCommand.error.code, 'DENIED');
    } finally {
      await internal.settings.update('api.writePolicy', 'allow', vscode.ConfigurationTarget.Workspace);
    }
    const r = (await vscode.commands.executeCommand('tasksmd.api.query.run', { query: 'path includes week-38', limit: 2 })) as { shown: number; tasks: unknown[] };
    assert.strictEqual(r.tasks.length, 2);
    assert.strictEqual(r.shown, 2);
    const saved = (await vscode.commands.executeCommand('tasksmd.api.query.saved')) as unknown[];
    assert.ok(Array.isArray(saved));
  });
});
