import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { FixtureGuard, findTask, fixtureUri, getApi, sleep, waitFor } from './helpers';

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
    editor.selection = new vscode.Selection(2, 0, 4, 5); // three tasks; line 2 is recurring
    await sleep(50);
    await vscode.commands.executeCommand('tasksmd.toggleDone');
    // Bottom-up processing: the recurring task's next instance is inserted above it (line 2),
    // pushing the completed original to line 3; the other two follow.
    assert.ok(doc.lineAt(2).text.startsWith('- [ ] Collect weekly data'), doc.lineAt(2).text);
    for (const l of [3, 4, 5]) assert.ok(doc.lineAt(l).text.startsWith('- [x] '), doc.lineAt(l).text);
    assert.ok(doc.lineAt(6).text.startsWith('* [ ] '), 'line outside selection untouched');
  });

  test('toggling a task from the index writes and saves a file that is not open', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    const uri = fixtureUri('notes/project-a.md');
    const task = await findTask(api, 'notes/project-a.md', 'Star marker task');
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
    const task = await findTask(api, 'notes/project-a.md', 'Numbered task');
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
    const task = await findTask(api, 'notes/project-a.md', 'Review contract');
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

suite('recurrence', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('completing a recurring task inserts the next instance above it', async () => {
    const api = await getApi();
    guard.protect('notes/week-38.md');
    const uri = fixtureUri('notes/week-38.md');
    const task = await findTask(api, 'notes/week-38.md', 'Buy milk'); // 🔁 every week 📅 2026-09-22
    await api.editService.toggle(task);
    const lines = fs.readFileSync(uri.fsPath, 'utf8').split('\n');
    assert.equal(lines[task.location.line], '- [ ] Buy milk 🔁 every week 📅 2026-09-29');
    assert.equal(lines[task.location.line + 1], `- [x] Buy milk 🔁 every week 📅 2026-09-22 ✅ ${today()}`);
    const indexed = api.index.file(uri.toString())!.tasks.filter((t) => t.description === 'Buy milk');
    assert.equal(indexed.length, 2);
  });

  test('insert position below and 🏁 delete', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    await api.settings.update('recurrence.insertPosition', 'below', vscode.ConfigurationTarget.Workspace);
    try {
      let task = await findTask(api, 'notes/project-a.md', 'Collect weekly data'); // 🆔 a1b2c3 🔁 every week 📅 2026-09-24
      await api.editService.toggle(task);
      let lines = fs.readFileSync(uri.fsPath, 'utf8').split('\n');
      assert.equal(lines[task.location.line], `- [x] Collect weekly data 🆔 a1b2c3 🔁 every week 📅 2026-09-24 ✅ ${today()}`);
      assert.equal(lines[task.location.line + 1], '- [ ] Collect weekly data 🆔 a1b2c3 🔁 every week 📅 2026-10-01');

      // 🏁 delete: original disappears, only the next instance remains
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);
      await editor.edit((eb) => eb.insert(new vscode.Position(doc.lineCount, 0), '\n- [ ] disposable 🔁 every day 🏁 delete 📅 2026-09-25'));
      await doc.save();
      task = await findTask(api, 'notes/project-a.md', 'disposable');
      await api.editService.toggle(task);
      lines = doc.getText().split('\n');
      assert.equal(lines[task.location.line], '- [ ] disposable 🔁 every day 🏁 delete 📅 2026-09-26');
      assert.equal(lines.filter((l) => l.includes('disposable')).length, 1);
    } finally {
      await api.settings.update('recurrence.insertPosition', undefined, vscode.ConfigurationTarget.Workspace);
    }
  });
});

suite('custom statuses', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('tasksmd.statuses drives toggling and done dates by type', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    const its = [
      { symbol: ' ', name: 'Unchecked', nextSymbol: '/', type: 'TODO' },
      { symbol: '/', name: 'Half Done', nextSymbol: 'X', type: 'IN_PROGRESS' },
      { symbol: 'X', name: 'Checked', nextSymbol: ' ', type: 'DONE' },
    ];
    await api.settings.update('statuses', its as import('../../src/core/task').StatusConfig[], vscode.ConfigurationTarget.Workspace);
    try {
      await waitFor(() => api.index.state === 'ready', 5000, 'rescan');
      let task = await findTask(api, 'notes/project-a.md', 'Numbered task');
      await api.editService.toggle(task); // ' ' -> '/'
      let line = fs.readFileSync(uri.fsPath, 'utf8').split('\n')[task.location.line];
      assert.equal(line, '1. [/] Numbered task');
      task = api.index.taskAt(uri.toString(), task.location.line)!;
      await api.editService.toggle(task); // '/' -> 'X' (DONE) gains ✅
      line = fs.readFileSync(uri.fsPath, 'utf8').split('\n')[task.location.line];
      assert.equal(line, `1. [X] Numbered task ✅ ${today()}`);
    } finally {
      await api.settings.update('statuses', undefined, vscode.ConfigurationTarget.Workspace);
      await waitFor(() => api.index.state === 'ready', 5000, 'rescan back');
    }
  });
});
