import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { fixtureUri, getApi, sleep } from './helpers';

// Regression: the contribution keys must be the flat 'markdown.markdownItPlugins' form, or the
// built-in preview silently ignores the plugin (found in the field, 2026-09-21).
suite('built-in preview integration', () => {
  test('VS Code asks the extension for its markdown-it plugin when a preview opens', async () => {
    const api = await getApi();
    const doc = await vscode.workspace.openTextDocument(fixtureUri('notes/week-38.md'));
    await vscode.window.showTextDocument(doc);
    await vscode.commands.executeCommand('markdown.showPreviewToSide');
    await sleep(3000);
    assert.ok(api.preview.extendCalls > 0, 'extendMarkdownIt was never called');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
});
