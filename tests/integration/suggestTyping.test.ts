import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, sleep } from './helpers';

/**
 * Real typing into the editor (the `type` command, as the keyboard does), not a direct provider call: whether the
 * suggestion list actually opens. "Open" is checked by accepting the selected suggestion and seeing the line change.
 */
suite('auto-suggest while typing (incident #42)', () => {
  const config = () => vscode.workspace.getConfiguration('tasksmd');

  async function typeAndAccept(text: string): Promise<string> {
    await getApi();
    const start = '- [ ] write report';
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: `# Notes\n${start}\n` });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, start.length, 1, start.length);
    await sleep(300);
    for (const ch of text) {
      await vscode.commands.executeCommand('type', { text: ch });
      await sleep(80);
    }
    await sleep(700);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    await sleep(200);
    const line = doc.lineAt(1).text;
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    return line;
  }

  teardown(async () => {
    await config().update('autoSuggest.minMatch', undefined, vscode.ConfigurationTarget.Global);
  });

  // Default settings: a bare space never opens it (it broke Korean typing and turned Enter into accepting); keyword
  // letters do, through the editor's quick suggestions; Korean text never does.
  test('default: a space alone does not open the list', async () => {
    assert.equal(await typeAndAccept(' '), '- [ ] write report ');
  });

  test('default: typing the letters of a keyword opens it', async () => {
    assert.match(await typeAndAccept(' du'), /📅/);
  });

  test('default: Korean text never opens it', async () => {
    assert.equal(await typeAndAccept(' 사과 사기 '), '- [ ] write report 사과 사기 ');
  });

  test('minMatch 0 still opens it on a space, for those who want that', async () => {
    await config().update('autoSuggest.minMatch', 0, vscode.ConfigurationTarget.Global);
    assert.notEqual(await typeAndAccept(' '), '- [ ] write report ');
  });

  test('Markdown gets quick suggestions without word-based ones', () => {
    const md = vscode.workspace.getConfiguration('editor', { languageId: 'markdown' });
    assert.equal(md.get<{ other: string }>('quickSuggestions')?.other, 'on');
    assert.equal(md.get('wordBasedSuggestions'), 'off');
  });
});
