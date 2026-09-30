import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import type { TasksApi } from '../../src/api/types';
import { fixtureUri, getApi, getExports, waitFor } from './helpers';

suite('task notes (M13)', () => {
  const FILE = 'notes-test.md';
  let internal: Awaited<ReturnType<typeof getApi>>;
  let api: TasksApi;
  const uri = () => fixtureUri(FILE);
  const read = () => fs.readFileSync(uri().fsPath, 'utf8');
  // Through the document (it stays open after edits), so disk, editor and index agree.
  const write = async (text: string) => {
    if (!fs.existsSync(uri().fsPath)) fs.writeFileSync(uri().fsPath, '', 'utf8');
    const doc = await vscode.workspace.openTextDocument(uri());
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri(), new vscode.Range(0, 0, doc.lineCount, 0), text);
    await vscode.workspace.applyEdit(edit);
    await doc.save();
    await internal.indexService.indexText(uri(), doc.getText());
  };
  const taskAt = (line: number) => internal.index.taskAt(uri().toString(), line)!;

  suiteSetup(async () => {
    internal = await getApi();
    await internal.settings.update('api.writePolicy', 'allow', vscode.ConfigurationTarget.Workspace);
    api = (await getExports()).getAPI(1, { extensionId: 'test.notes' });
  });
  suiteTeardown(async () => {
    await internal.settings.update('api.writePolicy', undefined, vscode.ConfigurationTarget.Workspace);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    if (fs.existsSync(uri().fsPath)) fs.unlinkSync(uri().fsPath);
    internal.index.removeFile(uri().toString());
  });

  test('addNote: after existing notes (and their sub-items), else right under the task; indexed as notes', async () => {
    await write(['# N', '- [ ] a 📅 2026-10-01', '  - old', '    - deeper', '  - [ ] sub 📅 2026-10-01', '- [ ] b 📅 2026-10-01', ''].join('\n'));
    const at = await internal.editService.addNote(taskAt(1), 'new note');
    assert.strictEqual(at, 4);
    await internal.editService.addNote(taskAt(6), '  b의 메모  ');
    await waitFor(() => read().includes('b의 메모'));
    assert.strictEqual(read(), ['# N', '- [ ] a 📅 2026-10-01', '  - old', '    - deeper', '  - new note', '  - [ ] sub 📅 2026-10-01', '- [ ] b 📅 2026-10-01', '  - b의 메모', ''].join('\n'));
    assert.deepStrictEqual(taskAt(1).location.notes?.map((n) => n.text), ['old', 'new note']);
    assert.deepStrictEqual(taskAt(6).location.notes?.map((n) => n.text), ['b의 메모']);
  });

  test('addNote refuses a stale task line', async () => {
    await write('- [ ] a 📅 2026-10-01\n');
    const task = taskAt(0);
    const doc = await vscode.workspace.openTextDocument(uri());
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri(), doc.lineAt(0).range, '- [ ] changed 📅 2026-10-01');
    await vscode.workspace.applyEdit(edit);
    await doc.save();
    await assert.rejects(internal.editService.addNote(task, 'x'), /changed since it was indexed/);
  });

  test('update with notes: rewrite in place, add, remove (with sub-items); sub-tasks untouched; one undo stop', async () => {
    await write(['- [ ] a 📅 2026-10-01', '  * one', '  - [ ] sub 📅 2026-10-01', '  * two', '    - under two', '- [ ] b 📅 2026-10-01'].join('\n'));
    await internal.editService.update(taskAt(0), { priority: '1' as never }, ['ONE']);
    await waitFor(() => read().includes('ONE'));
    assert.strictEqual(read(), ['- [ ] a ⏫ 📅 2026-10-01', '  * ONE', '  - [ ] sub 📅 2026-10-01', '- [ ] b 📅 2026-10-01'].join('\n'));
    await internal.editService.setNotes(taskAt(0), ['ONE', 'three', '']);
    await waitFor(() => read().includes('three'));
    assert.strictEqual(read(), ['- [ ] a ⏫ 📅 2026-10-01', '  * ONE', '  * three', '  - [ ] sub 📅 2026-10-01', '- [ ] b 📅 2026-10-01'].join('\n'));
    await internal.editService.setNotes(taskAt(4), []); // no notes → no-op
    await internal.editService.setNotes(taskAt(0), []);
    await waitFor(() => !read().includes('three'));
    assert.strictEqual(read(), ['- [ ] a ⏫ 📅 2026-10-01', '  - [ ] sub 📅 2026-10-01', '- [ ] b 📅 2026-10-01'].join('\n'));
  });

  test('public API: create and update with notes; notes on the returned TaskDto', async () => {
    await write('# API\n');
    const created = await api.edit.create({ description: 'with notes', due: '2026-10-03', notes: ['first', 'second'] }, { path: FILE });
    assert.deepStrictEqual(created.notes.map((n) => n.text), ['first', 'second']);
    const updated = await api.edit.update({ path: FILE, line: created.line }, { notes: ['only'] });
    assert.deepStrictEqual(updated.notes.map((n) => n.text), ['only']);
    await assert.rejects(api.edit.update({ path: FILE, line: created.line }, { notes: 'x' as never }), (e: { code: string }) => e.code === 'INVALID_ARGUMENT');
    // M17: addNote (also through batch and the command surface)
    const withNote = await api.edit.addNote({ path: FILE, line: created.line }, 'appended');
    assert.deepStrictEqual(withNote.notes.map((n) => n.text), ['only', 'appended']);
    const batched = await api.edit.batch([{ op: 'addNote', ref: { path: FILE, line: created.line }, text: 'batched' }]);
    assert.deepStrictEqual(batched.results[0]!.notes.map((n) => n.text), ['only', 'appended', 'batched']);
    const viaCommand = await vscode.commands.executeCommand<{ notes: { text: string }[] }>('tasksmd.api.edit.addNote', { ref: { path: FILE, line: created.line }, text: 'command' });
    assert.strictEqual(viaCommand.notes.at(-1)!.text, 'command');
    await assert.rejects(api.edit.addNote({ path: FILE, line: created.line }, '  '), (e: { code: string }) => e.code === 'INVALID_ARGUMENT');
  });

  test('M17: info / features / version, onDidChangeStatus, isBlocking', async () => {
    const info = await api.info();
    assert.strictEqual(info.apiVersion, 1);
    assert.match(info.extensionVersion, /^\d+\.\d+\.\d+$/);
    assert.strictEqual(api.extensionVersion, info.extensionVersion);
    for (const f of ['tree', 'notes', 'notes.add', 'info', 'events.status', 'isBlocking'] as const) assert.ok(api.features.includes(f), f);
    assert.strictEqual(typeof info.settings.requireDueDate, 'boolean');
    const viaCommand = await vscode.commands.executeCommand<{ features: string[] }>('tasksmd.api.info');
    assert.deepStrictEqual(viaCommand.features, info.features);

    await write(['- [ ] first 🆔 dep1 📅 2026-10-01', '- [ ] second ⛔ dep1 📅 2026-10-02', ''].join('\n'));
    const first = await api.query.get({ path: FILE, line: 0 });
    const second = await api.query.get({ path: FILE, line: 1 });
    assert.strictEqual(first!.isBlocking, true);
    assert.strictEqual(first!.isBlocked, false);
    assert.strictEqual(second!.isBlocked, true);
    assert.strictEqual(second!.isBlocking, false);

    const seen: { before: string; after: string }[] = [];
    const sub = api.events.onDidChangeStatus((e) => seen.push({ before: e.before.status.symbol, after: e.after.status.symbol }));
    await api.edit.setStatus({ path: FILE, line: 1 }, '/');
    await api.edit.setStatus({ path: FILE, line: 1 }, '-');
    await api.edit.setStatus({ path: FILE, line: 1 }, '-'); // no change → no event
    sub.dispose();
    await api.edit.setStatus({ path: FILE, line: 1 }, ' ');
    assert.deepStrictEqual(seen, [{ before: ' ', after: '/' }, { before: '/', after: '-' }]);
  });
});
