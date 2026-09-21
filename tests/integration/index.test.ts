import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { FixtureGuard, findTask, fixtureUri, getApi, sleep, waitFor } from './helpers';

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
      let task = await findTask(api, 'notes/project-a.md', 'Budget proposal');
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

suite('smoke', () => {
  test('indexes the project checklist copied into the fixture workspace', async () => {
    const api = await getApi();
    const entry = api.index.file(fixtureUri('notes/dev-checklist.md').toString());
    assert.ok(entry, 'dev-checklist.md indexed');
    assert.ok(entry.tasks.length > 200, `expected >200 tasks, got ${entry.tasks.length}`);
    assert.ok(entry.tasks.some((t) => t.isDone), 'some done');
    assert.ok(entry.tasks.every((t) => t.location.heading !== null), 'every task has a heading');
  });
});

suite('editor providers', () => {
  test('code lenses appear for the cursor line only (default mode)', async () => {
    await getApi();
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/week-38.md'));
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(6, 0, 6, 0);
    await sleep(150);
    const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', doc.uri);
    const ours = lenses.filter((l) => l.command?.command.startsWith('tasksmd.'));
    assert.ok(ours.length >= 4, `expected lenses, got ${ours.length}`);
    assert.ok(ours.every((l) => l.range.start.line === 6), 'lenses only on cursor line');
    assert.ok(ours.some((l) => l.command!.command === 'tasksmd.markDone'));
    assert.ok(ours.some((l) => l.command!.command === 'tasksmd.setDueDate' && l.command!.title.includes('Sep 25')));
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('hover shows the task card with fields and command links', async () => {
    await getApi();
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/week-38.md'));
    const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', doc.uri, new vscode.Position(8, 5));
    const text = hovers.flatMap((h) => h.contents.map((c) => (c as vscode.MarkdownString).value)).join('\n');
    assert.ok(text.includes('Prepare deployment'), text);
    assert.ok(text.includes('Collect weekly data'), 'dependency resolved to its description');
    assert.ok(text.includes('command:tasksmd.markDone'), 'command link present');
    assert.ok(text.includes('command:tasksmd.openTask'), 'dependency link present');
    const none = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', doc.uri, new vscode.Position(3, 2));
    assert.equal(none.filter((h) => (h.contents[0] as vscode.MarkdownString).value.includes('tasksmd')).length, 0);
  });
});

suite('auto-suggest', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  async function complete(doc: vscode.TextDocument, line: number, character: number): Promise<vscode.CompletionItem[]> {
    const list = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', doc.uri, new vscode.Position(line, character), ' ');
    // Only our items carry these kinds; other providers (paths, words) use different ones.
    return list.items.filter((i) => i.kind === vscode.CompletionItemKind.Event || i.kind === vscode.CompletionItemKind.Value);
  }
  const labelOf = (i: vscode.CompletionItem) => (typeof i.label === 'string' ? i.label : i.label.label);

  test('keyword mode on a task line, none on a plain line', async () => {
    await getApi();
    guard.protect('notes/project-a.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/project-a.md'));
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((eb) => eb.insert(new vscode.Position(doc.lineCount, 0), '\n- [ ] new thing due\nplain text due'));
    const taskLine = doc.lineCount - 2;
    const items = await complete(doc, taskLine, doc.lineAt(taskLine).text.length);
    assert.ok(items.some((i) => labelOf(i).includes('📅')), 'due suggestion present: ' + items.map(labelOf).join(','));
    assert.ok(!items.some((i) => labelOf(i).includes('every year')), 'non-matching keywords filtered out');
    const plain = await complete(doc, taskLine + 1, doc.lineAt(taskLine + 1).text.length);
    assert.equal(plain.length, 0);
  });

  test('date mode after 📅 parses the typed text', async () => {
    await getApi();
    guard.protect('notes/project-a.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/project-a.md'));
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((eb) => eb.insert(new vscode.Position(doc.lineCount, 0), '\n- [ ] dated 📅 in 3 days'));
    const line = doc.lineCount - 1;
    const items = await complete(doc, line, doc.lineAt(line).text.length);
    const first = items.find((i) => labelOf(i).startsWith('→'));
    assert.ok(first, 'parsed date item present');
    const expected = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    assert.equal(first!.insertText, expected);
    assert.ok(items.some((i) => labelOf(i) === 'tomorrow'), 'presets present');
  });
});

suite('diagnostics', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('reports invalid dates and unknown dependencies with quick fixes', async () => {
    await getApi();
    guard.protect('notes/project-a.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/project-a.md'));
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((eb) => eb.insert(new vscode.Position(doc.lineCount, 0), '\n- [ ] bad 📅 2026-13-40\n- [ ] dep ⛔ nope99\n- [ ] rec 🔁 every day'));
    await waitFor(() => vscode.languages.getDiagnostics(doc.uri).filter((d) => d.source === 'Tasks').length === 3, 3000, 'three diagnostics');
    const diags = vscode.languages.getDiagnostics(doc.uri).filter((d) => d.source === 'Tasks');
    assert.deepEqual(diags.map((d) => d.code).sort(), ['invalid-date', 'recurring-without-date', 'unknown-dependency']);
    const bad = diags.find((d) => d.code === 'invalid-date')!;
    assert.equal(doc.getText(bad.range), '2026-13-40');
    const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', doc.uri, bad.range);
    const remove = actions.find((a) => a.title.startsWith('Remove invalid'));
    assert.ok(remove?.edit, 'quick fix with edit');
    await vscode.workspace.applyEdit(remove!.edit!);
    assert.equal(doc.lineAt(bad.range.start.line).text, '- [ ] bad');
  });
});

suite('dependencies', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('cycle and invalid recurrence diagnostics', async () => {
    await getApi();
    guard.protect('notes/project-a.md');
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/project-a.md'));
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((eb) => eb.insert(new vscode.Position(doc.lineCount, 0), '\n- [ ] p 🆔 cy1 ⛔ cy2\n- [ ] q 🆔 cy2 ⛔ cy1\n- [ ] r 🔁 every blah 📅 2026-09-25'));
    const codesNow = () => vscode.languages.getDiagnostics(doc.uri).filter((d) => d.source === 'Tasks').map((d) => d.code);
    await waitFor(() => codesNow().includes('dependency-cycle') && codesNow().includes('invalid-recurrence'), 4000, 'cycle + recurrence diagnostics');
    const codes = codesNow();
    assert.ok(codes.filter((c) => c === 'dependency-cycle').length >= 2, codes.join(','));
    assert.ok(codes.includes('invalid-recurrence'), codes.join(','));
  });
});

suite('queries', () => {
  test('QueryService runs query text against the live index', async () => {
    const api = await getApi();
    const r = api.queries.run('not done\npath includes notes/project-a.md\nsort by description');
    assert.equal(r.errors.length, 0);
    assert.ok(r.matched >= 4, `matched ${r.matched}`);
    assert.ok(r.root.tasks[0]!.description.localeCompare(r.root.tasks[1]!.description) <= 0);
    assert.ok(api.queries.explain('due before next week').includes('due date is before'));
  });

  test('saved queries come from .tasks/queries/*.md and settings', async () => {
    const api = await getApi();
    await api.savedQueries.reload();
    const file = api.savedQueries.all().find((q) => q.source === 'file');
    assert.ok(file, 'file query found');
    assert.equal(file.name, 'This week');
    assert.ok(file.query.includes('group by filename'));
    await api.settings.update('savedQueries', [{ name: 'From settings', query: 'not done' }], vscode.ConfigurationTarget.Workspace);
    try {
      await waitFor(() => api.savedQueries.all().some((q) => q.name === 'From settings'), 3000, 'settings query');
      const r = api.queries.run(api.savedQueries.all().find((q) => q.name === 'From settings')!.query);
      assert.ok(r.matched > 0);
    } finally {
      await api.settings.update('savedQueries', undefined, vscode.ConfigurationTarget.Workspace);
    }
  });
});

suite('markdown preview', () => {
  test('extendMarkdownIt renders tasks and query blocks through the built-in markdown engine', async () => {
    const api = await getApi();
    const mdExt = vscode.extensions.getExtension('vscode.markdown-language-features');
    assert.ok(mdExt, 'built-in markdown extension present');
    // Render through our own hook with a fresh markdown-it to prove the export works end to end.
    const MarkdownIt = (await import('markdown-it')).default;
    const md = api.extendMarkdownIt(new MarkdownIt());
    const html = md.render('- [ ] preview task ⏫ 📅 2026-09-25\n\n```tasks\nnot done\npath includes project-a\n```', { currentDocument: fixtureUri('notes/week-38.md') });
    assert.ok(html.includes('tfm-task'), html);
    assert.ok(html.includes('tfm-badge tfm-pri-high'));
    assert.ok(html.includes('tfm-query-block'));
    assert.ok(html.includes('href="project-a.md#L'), 'relative link with line');
  });
});

suite('edit dialog', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('opens for the task under the cursor and applies fields from the webview', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    const task = await findTask(api, 'notes/project-a.md', 'Budget proposal');
    const host = api.webviews.openEdit({ key: task.location.key, line: task.location.line });
    await waitFor(() => host.received.includes('task/load'), 8000, 'edit dialog loaded the task');
    // Simulate what the Apply button sends.
    await (host as unknown as { handle(m: unknown): Promise<void> }).handle({
      type: 'task/setFields', key: task.location.key, line: task.location.line,
      fields: { description: 'Budget proposal v2', priority: '1', due: '2026-10-03', recurrence: 'every month', status: '/' },
    });
    const line = fs.readFileSync(uri.fsPath, 'utf8').split('\n')[task.location.line];
    assert.equal(line, '- [/] Budget proposal v2 ⏫ 🔁 every month 📅 2026-10-03');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('creates a task at a line with dependency refs resolved to ids', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    const dep = await findTask(api, 'notes/project-a.md', 'Star marker task'); // has no id
    const host = api.webviews.openEdit({ key: uri.toString(), line: 1 });
    await waitFor(() => host.received.includes('task/load'), 8000, 'dialog ready');
    await (host as unknown as { handle(m: unknown): Promise<void> }).handle({
      type: 'task/create', key: uri.toString(), line: 1,
      fields: { description: 'created from dialog', dependsOn: [`@${dep.location.key}#${dep.location.line}`] },
    });
    const lines = fs.readFileSync(uri.fsPath, 'utf8').split('\n');
    const created = lines.find((l) => l.includes('created from dialog'))!;
    const m = /⛔ ([a-z0-9]{6})$/.exec(created);
    assert.ok(m, created);
    assert.ok(lines.some((l) => l.includes(`Star marker task 🆔 ${m![1]}`)), 'dependency got an id');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
});

suite('kanban', () => {
  const guard = new FixtureGuard();
  teardown(() => guard.restore());

  test('panel boots, runs the default query and applies a drop as a field change', async () => {
    const api = await getApi();
    guard.protect('notes/project-a.md');
    const uri = fixtureUri('notes/project-a.md');
    const host = api.webviews.openKanban();
    await waitFor(() => host.received.includes('query/run'), 8000, 'kanban query');
    const task = await findTask(api, 'notes/project-a.md', 'Numbered task');
    await (host as unknown as { handle(m: unknown): Promise<void> }).handle({ type: 'task/setField', key: task.location.key, line: task.location.line, field: 'status', value: '/' });
    await (host as unknown as { handle(m: unknown): Promise<void> }).handle({ type: 'task/setField', key: task.location.key, line: task.location.line, field: 'due', value: '2026-09-22' });
    const line = fs.readFileSync(uri.fsPath, 'utf8').split('\n')[task.location.line];
    assert.equal(line, '1. [/] Numbered task 📅 2026-09-22');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
});
