import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, sleep } from './helpers';

suite('toggle checkbox (M26)', () => {
  test('Ctrl+Shift+Q is bound in Markdown editors on every platform (Ctrl+Shift+Space never reaches the app on macOS with input-source switching)', () => {
    const pkg = vscode.extensions.getExtension('HastyCapybara.tasks-for-markdown')!.packageJSON as { contributes: { keybindings: { command: string; key: string; mac?: string; when?: string }[] } };
    const kb = pkg.contributes.keybindings.filter((k) => k.command === 'tasksmd.toggleCheckbox');
    assert.deepEqual(kb.map((k) => [k.key, k.mac, k.when]), [['ctrl+shift+q', 'ctrl+shift+q', 'editorTextFocus && editorLangId == markdown']]);
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
