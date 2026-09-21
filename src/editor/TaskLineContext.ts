import * as vscode from 'vscode';
import { isTaskLine } from '../core/task';

export const CONTEXT_ON_TASK_LINE = 'tasksmd.onTaskLine';

/**
 * Maintains the `tasksmd.onTaskLine` context key: true while the active editor is a markdown
 * document and the primary cursor sits on a checklist line. Keybindings and menus use it.
 */
export class TaskLineContext implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private current: boolean | null = null;

  constructor() {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.update()),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor === vscode.window.activeTextEditor) this.update();
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) this.update();
      }),
    );
    this.update();
  }

  static isOnTaskLine(editor: vscode.TextEditor | undefined): boolean {
    if (!editor || editor.document.languageId !== 'markdown') return false;
    const line = editor.selection.active.line;
    return line < editor.document.lineCount && isTaskLine(editor.document.lineAt(line).text);
  }

  private update(): void {
    const value = TaskLineContext.isOnTaskLine(vscode.window.activeTextEditor);
    if (value === this.current) return;
    this.current = value;
    void vscode.commands.executeCommand('setContext', CONTEXT_ON_TASK_LINE, value);
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
