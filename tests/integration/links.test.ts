import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { queryLink, taskLink } from '../../src/links/taskLinks';
import { findTask, fixtureUri, getApi, getExports } from './helpers';

suite('task links (M23)', () => {
  teardown(() => vscode.commands.executeCommand('workbench.action.closeAllEditors'));

  test('an open link (parsed by VS Code itself) moves the editor to the task line', async () => {
    const api = await getApi();
    const task = await findTask(api, 'notes/project-a.md', 'Numbered task');
    const link = taskLink(vscode.env.uriScheme, task.location.path, task.location.line);
    await api.links.handle(vscode.Uri.parse(link));
    const editor = vscode.window.activeTextEditor;
    assert.ok(editor, 'an editor is open');
    assert.equal(editor.document.uri.fsPath, fixtureUri('notes/project-a.md').fsPath);
    assert.equal(editor.selection.active.line, task.location.line);
  });

  test('a link with ".." is refused and opens nothing', async () => {
    const api = await getApi();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await api.links.handle(vscode.Uri.parse(`${vscode.env.uriScheme}://hastycapybara.tasks-for-markdown/open?path=notes/../../outside.md&line=1`));
    assert.equal(vscode.window.activeTextEditor, undefined);
  });

  test('a query link with & and Korean survives VS Code decoding; ui.link builds the same open link', async () => {
    const uri = vscode.Uri.parse(queryLink(vscode.env.uriScheme, 'not done\ndescription includes R&D 회의'));
    const { parseTaskLink } = await import('../../src/links/taskLinks');
    assert.deepEqual(parseTaskLink(uri.path, uri.query), { kind: 'query', text: 'not done\ndescription includes R&D 회의' });

    const pub = (await getExports()).getAPI(1, { extensionId: 'test.links' });
    assert.ok(pub.features.includes('links'));
    const link = await pub.ui.link({ path: 'notes/project-a.md', line: 3 });
    assert.equal(link, taskLink(vscode.env.uriScheme, 'notes/project-a.md', 3));
    const r = await vscode.commands.executeCommand<string>('tasksmd.api.ui.link', { ref: { path: 'notes/project-a.md', line: 3 } });
    assert.equal(r, link);
  });
});
