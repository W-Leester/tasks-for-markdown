import * as vscode from 'vscode';

// Runs last (file order): make sure no dirty editor can block VS Code from exiting.
suite('teardown', () => {
  test('reverts dirty documents and closes editors', async () => {
    for (const doc of vscode.workspace.textDocuments) {
      if (!doc.isDirty) continue;
      await vscode.window.showTextDocument(doc, { preview: false });
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });
});
