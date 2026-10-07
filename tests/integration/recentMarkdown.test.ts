import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { FixtureGuard, fixtureUri, getApi } from './helpers';

/** Incident #28: commands run from the walkthrough (or with another tab in front) act on the note in use. */
suite('commands target the note in use, not the tab in front', () => {
  const guard = new FixtureGuard();
  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await guard.restore();
  });

  const openNoteThenSomethingElse = async () => {
    await getApi();
    guard.protect('notes/project-a.md');
    const note = await vscode.workspace.openTextDocument(fixtureUri('notes/project-a.md'));
    const editor = await vscode.window.showTextDocument(note);
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    // Another tab in front, like the walkthrough: a plain-text document in the same group.
    const other = await vscode.workspace.openTextDocument({ language: 'plaintext', content: 'not a note' });
    await vscode.window.showTextDocument(other);
    assert.equal(vscode.window.activeTextEditor?.document.languageId, 'plaintext');
    return note;
  };

  test('Insert query block goes into the last Markdown note', async () => {
    const note = await openNoteThenSomethingElse();
    await vscode.commands.executeCommand('tasksmd.insertQueryBlock');
    assert.equal(vscode.window.activeTextEditor?.document, note);
    assert.ok(note.getText().startsWith('```tasks\n'), note.getText().slice(0, 40));
  });

  test('Open rendered view opens that note', async () => {
    const note = await openNoteThenSomethingElse();
    await vscode.commands.executeCommand('tasksmd.openRendered');
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    assert.ok(tab?.input instanceof vscode.TabInputCustom, 'a custom editor is in front');
    assert.equal((tab.input as vscode.TabInputCustom).uri.toString(), note.uri.toString());
  });
});
