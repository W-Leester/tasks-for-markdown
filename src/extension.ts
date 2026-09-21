import * as vscode from 'vscode';

const output = vscode.window.createOutputChannel('Tasks for Markdown');

export function activate(context: vscode.ExtensionContext): void {
  output.appendLine(`activate (${context.extension.packageJSON.version})`);

  context.subscriptions.push(
    output,
    vscode.commands.registerCommand('tasks.reindex', () => {
      // Real implementation lands with the index in M1.
      output.appendLine('tasks.reindex: not implemented yet');
      void vscode.window.showInformationMessage(vscode.l10n.t('Tasks: indexing is not implemented yet.'));
    }),
  );
}

export function deactivate(): void {
  output.appendLine('deactivate');
}
