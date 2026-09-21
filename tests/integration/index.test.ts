import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { FixtureGuard, fixtureUri, getApi, sleep, waitFor } from './helpers';

suite('index', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('scans the fixture workspace, honouring exclude and .gitignore', async () => {
    const api = await getApi();
    const paths = api.index.fileKeys().map((k) => vscode.workspace.asRelativePath(vscode.Uri.parse(k)));
    assert.ok(paths.includes('notes/week-38.md'), paths.join(','));
    assert.ok(paths.includes('notes/project-a.md'));
    assert.ok(!paths.some((p) => p.startsWith('ignored/')), 'gitignored file indexed');
    assert.ok(!paths.some((p) => p.includes('node_modules')), 'node_modules indexed');
  });

  test('parses tasks with location and skips code blocks', async () => {
    const api = await getApi();
    const week = api.index.file(fixtureUri('notes/week-38.md').toString())!;
    const descs = week.tasks.map((t) => t.description);
    assert.deepEqual(descs, [
      'Write report #work',
      'Tidy meeting notes',
      'Prepare deployment',
      'child task',
      'In progress item',
      'Buy milk',
      'Cancelled thing',
    ]);
    assert.equal(week.tasks[0]!.location.heading, 'Work');
    assert.equal(week.tasks[5]!.location.heading, 'Personal');
    assert.equal(week.tasks[3]!.location.depth, 1);
    assert.deepEqual(week.frontmatterTags, ['#weekly']);
    assert.equal(week.tasks[0]!.location.path, 'notes/week-38.md');
  });

  test('picks up unsaved edits in an open document', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/project-a.md'));
    const editor = await vscode.window.showTextDocument(doc);
    const before = api.index.file(doc.uri.toString())!.tasks.length;
    await editor.edit((eb) => eb.insert(new vscode.Position(doc.lineCount, 0), '\n- [ ] typed but unsaved'));
    await waitFor(() => api.index.file(doc.uri.toString())!.tasks.length === before + 1, 3000, 'index to pick up edit');
    const last = api.index.file(doc.uri.toString())!.tasks.at(-1)!;
    assert.equal(last.description, 'typed but unsaved');
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    await waitFor(() => api.index.file(doc.uri.toString())!.tasks.length === before, 3000, 'index to revert after close');
  });

  test('reacts to files created and deleted on disk', async () => {
    const api = await getApi();
    const uri = fixtureUri('notes/temp-created.md');
    fs.writeFileSync(uri.fsPath, '- [ ] created on disk\n');
    try {
      await waitFor(() => api.index.file(uri.toString()) !== undefined, 5000, 'new file indexed');
      assert.equal(api.index.file(uri.toString())!.tasks[0]!.description, 'created on disk');
    } finally {
      fs.unlinkSync(uri.fsPath);
    }
    await waitFor(() => api.index.file(uri.toString()) === undefined, 5000, 'deleted file removed');
    await sleep(100);
  });
});

suite('tree view', () => {
  test('commands from the sidebar are registered and the view container exists', async () => {
    await getApi();
    const cmds = await vscode.commands.getCommands(true);
    for (const id of ['tasksmd.toggleDone', 'tasksmd.markDone', 'tasksmd.markCancelled', 'tasksmd.reopen', 'tasksmd.tree.groupBy', 'tasksmd.tree.filter', 'tasksmd.openSidebar']) {
      assert.ok(cmds.includes(id), `missing command ${id}`);
    }
    await vscode.commands.executeCommand('tasksmd.openSidebar');
  });

  test('markDone / reopen from a task argument', async () => {
    const api = await getApi();
    const guard = new FixtureGuard();
    guard.protect('notes/project-a.md');
    try {
      const uri = fixtureUri('notes/project-a.md');
      let task = api.index.file(uri.toString())!.tasks.find((t) => t.description === 'Budget proposal')!;
      await vscode.commands.executeCommand('tasksmd.markDone', task);
      task = api.index.taskAt(uri.toString(), task.location.line)!;
      assert.equal(task.isDone, true);
      assert.ok(task.done, 'done date set');
      await vscode.commands.executeCommand('tasksmd.reopen', task);
      task = api.index.taskAt(uri.toString(), task.location.line)!;
      assert.equal(task.isDone, false);
      assert.equal(task.done, null);
      await vscode.commands.executeCommand('tasksmd.markCancelled', task);
      task = api.index.taskAt(uri.toString(), task.location.line)!;
      assert.equal(task.isCancelled, true);
    } finally {
      await guard.restore();
    }
  });
});
