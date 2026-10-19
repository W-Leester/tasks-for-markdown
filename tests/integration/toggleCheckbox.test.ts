import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, sleep } from './helpers';

suite('add or remove checkbox (M26)', () => {
  test('Ctrl+Shift+C adds/removes a checkbox; the dialog is Cmd+Shift+C on macOS and Alt+Shift+C elsewhere, only in Markdown, the rendered view and our sidebar (10-18)', () => {
    const pkg = vscode.extensions.getExtension('HastyCapybara.tasks-for-markdown')!.packageJSON as { contributes: { keybindings: { command: string; key: string; mac?: string; when?: string }[] } };
    const kb = pkg.contributes.keybindings.filter((k) => k.command === 'tasksmd.toggleCheckbox');
    assert.deepEqual(kb.map((k) => [k.key, k.mac, k.when]), [['ctrl+shift+c', 'ctrl+shift+c', 'editorTextFocus && editorLangId == markdown']]);
    const dialog = pkg.contributes.keybindings.filter((k) => k.command === 'tasksmd.createOrEdit');
    assert.deepEqual(dialog.map((k) => [k.key, k.mac]), [['alt+shift+c', 'cmd+shift+c']]);
    // Cmd+Shift+C is VS Code's "new external terminal" on macOS: only take it where it is ours.
    assert.match(dialog[0]!.when!, /editorLangId == markdown/);
    assert.match(dialog[0]!.when!, /activeCustomEditorId == tasksmd\.rendered/);
    assert.match(dialog[0]!.when!, /focusedView =~ \/\^tasksmd/);
  });

  test('quick search key only in Markdown, the rendered view and our sidebar — it took "Focus Breadcrumbs" everywhere (M29)', () => {
    const pkg = vscode.extensions.getExtension('HastyCapybara.tasks-for-markdown')!.packageJSON as { contributes: { keybindings: { command: string; key: string; mac?: string; when?: string }[] } };
    const kb = pkg.contributes.keybindings.find((k) => k.command === 'tasksmd.quickSearch')!;
    assert.ok(kb.when, 'has a when clause');
    assert.match(kb.when!, /editorLangId == markdown/);
    assert.match(kb.when!, /activeCustomEditorId == tasksmd\.rendered/);
    assert.match(kb.when!, /focusedView =~ \/\^tasksmd/);
  });

  test('no rendered view in front → no rendered selection; the shortcuts command exists', async () => {
    assert.equal(await vscode.commands.executeCommand('tasksmd.rendered.selection'), undefined);
    assert.ok((await vscode.commands.getCommands(true)).includes('tasksmd.openKeybindings'));
  });

  test('adds a box to the line under the cursor, removes it from a task line, and follows the first line of a selection', async () => {
    await getApi();
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: 'plain\n- bullet\n- [ ] task\n\n' });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(0, 2, 0, 2);
    await vscode.commands.executeCommand('tasksmd.toggleCheckbox');
    assert.equal(doc.lineAt(0).text, '- [ ] plain');
    editor.selection = new vscode.Selection(2, 0, 2, 0);
    await vscode.commands.executeCommand('tasksmd.toggleCheckbox');
    assert.equal(doc.lineAt(2).text, '- task');
    // Empty line: a box, cursor after it.
    editor.selection = new vscode.Selection(3, 0, 3, 0);
    await vscode.commands.executeCommand('tasksmd.toggleCheckbox');
    await sleep(50);
    assert.equal(doc.lineAt(3).text, '- [ ] ');
    assert.deepEqual([editor.selection.active.line, editor.selection.active.character], [3, 6]);
    // Selection over lines 0–2 (first line is now a task): every line loses its box; the plain bullet stays.
    editor.selection = new vscode.Selection(0, 0, 2, 3);
    await vscode.commands.executeCommand('tasksmd.toggleCheckbox');
    assert.deepEqual([doc.lineAt(0).text, doc.lineAt(1).text, doc.lineAt(2).text], ['- plain', '- bullet', '- task']);
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });
});
