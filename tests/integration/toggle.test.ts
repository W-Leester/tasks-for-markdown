import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { FixtureGuard, fixtureUri, getApi, sleep } from './helpers';

const today = () => new Date().toISOString().slice(0, 10);

suite('toggle', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  // Undo cannot be driven from the headless runner (the 'undo' command needs a focused editor
  // widget), so it is covered by the manual checklist; the edit goes through WorkspaceEdit.
  test('toggles the task under the cursor and adds a done date', async () => {
    const api = await getApi();
    guard.protect('notes/week-38.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/week-38.md'));
    const editor = await vscode.window.showTextDocument(doc);
    const line = 6; // - [ ] Write report #work ⏫ 📅 2026-09-25
    assert.equal(doc.lineAt(line).text, '- [ ] Write report #work ⏫ 📅 2026-09-25');
    editor.selection = new vscode.Selection(line, 0, line, 0);
    await sleep(50);

    await vscode.commands.executeCommand('tasksmd.toggleDone');
    assert.equal(doc.lineAt(line).text, `- [x] Write report #work ⏫ 📅 2026-09-25 ✅ ${today()}`);
    const indexed = api.index.taskAt(doc.uri.toString(), line)!;
    assert.equal(indexed.isDone, true);
  });

  test('done -> todo removes the done date; cancelled gets ❌', async () => {
    await getApi();
    guard.protect('notes/week-38.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/week-38.md'));
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(7, 0, 7, 0); // - [x] Tidy meeting notes ✅ 2026-09-21
    await sleep(50);
    await vscode.commands.executeCommand('tasksmd.toggleDone');
    assert.equal(doc.lineAt(7).text, '- [ ] Tidy meeting notes');

    editor.selection = new vscode.Selection(14, 0, 14, 0); // - [-] Cancelled thing ❌ 2026-09-20
    await sleep(50);
    await vscode.commands.executeCommand('tasksmd.toggleDone');
    assert.equal(doc.lineAt(14).text, '- [ ] Cancelled thing');
  });

  test('toggles every task line in a multi-line selection', async () => {
    await getApi();
    guard.protect('notes/project-a.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/project-a.md'));
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(2, 0, 4, 5); // three tasks
    await sleep(50);
    await vscode.commands.executeCommand('tasksmd.toggleDone');
    for (const l of [2, 3, 4]) assert.ok(doc.lineAt(l).text.startsWith('- [x] '), doc.lineAt(l).text);
    assert.ok(doc.lineAt(5).text.startsWith('* [ ] '), 'line outside selection untouched');
  });

  test('toggling a task from the index writes and saves a file that is not open', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    const uri = fixtureUri('notes/project-a.md');
    const task = api.index.file(uri.toString())!.tasks.find((t) => t.description === 'Star marker task')!;
    await api.editService.toggle(task);
    const onDisk = fs.readFileSync(uri.fsPath, 'utf8').split('\n')[task.location.line]!;
    assert.equal(onDisk, `* [x] Star marker task ✅ ${today()}`);
    const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
    assert.ok(!doc || !doc.isDirty, 'document left dirty');
  });

  test('refuses to write over a line that changed since indexing', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    const task = api.index.file(uri.toString())!.tasks.find((t) => t.description === 'Numbered task')!;
    const stale = task.with({ originalMarkdown: '1. [ ] Numbered task (stale copy)' });
    await assert.rejects(() => api.editService.toggle(stale), /changed since it was indexed/);
    assert.equal(fs.readFileSync(uri.fsPath, 'utf8').split('\n')[task.location.line], '1. [ ] Numbered task');
  });
});

suite('edit service', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('update() rewrites fields in canonical order', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    const task = api.index.file(uri.toString())!.tasks.find((t) => t.description === 'Review contract')!;
    const { DateField, Priority } = await import('../../src/core/task');
    await api.editService.update(task, { priority: Priority.Highest, due: DateField.parse('2026-10-01'), scheduled: DateField.parse('2026-09-28') });
    const line = fs.readFileSync(uri.fsPath, 'utf8').split('\n')[task.location.line];
    assert.equal(line, '- [ ] Review contract 🔺 ⏳ 2026-09-28 📅 2026-10-01');
  });

  test('insertNewTask() replaces a blank line or inserts after a non-blank one', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    const { Task } = await import('../../src/core/task');
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
    // line 1 is blank in the fixture
    const l1 = await api.editService.insertNewTask(uri, 1, Task.blank('inserted on blank'));
    assert.equal(l1, 1);
    assert.equal(doc.lineAt(1).text, '- [ ] inserted on blank');
    const l2 = await api.editService.insertNewTask(uri, 0, Task.blank('after heading'));
    assert.equal(l2, 1);
    assert.equal(doc.lineAt(1).text, '- [ ] after heading');
    assert.equal(doc.lineAt(2).text, '- [ ] inserted on blank');
  });
});
