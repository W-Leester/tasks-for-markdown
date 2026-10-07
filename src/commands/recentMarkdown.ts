import * as vscode from 'vscode';

/**
 * The Markdown note a command should act on when it is run from somewhere else — the Get Started
 * walkthrough, a webview, the command palette with another tab in front (incident #28):
 * the active Markdown editor, else a visible one, else the most recently active one.
 */
let last: vscode.TextDocument | undefined;

export function trackRecentMarkdown(context: vscode.ExtensionContext): void {
  const note = (e: vscode.TextEditor | undefined) => {
    if (e?.document.languageId === 'markdown') last = e.document;
  };
  note(vscode.window.activeTextEditor);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(note));
}

export function recentMarkdownDocument(): vscode.TextDocument | undefined {
  const active = vscode.window.activeTextEditor?.document;
  if (active?.languageId === 'markdown') return active;
  const visible = vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'markdown')?.document;
  if (visible) return visible;
  return last && !last.isClosed ? last : undefined;
}

/** A text editor for that note, brought to the front (its cursor position is kept). */
export async function recentMarkdownEditor(): Promise<vscode.TextEditor | undefined> {
  const active = vscode.window.activeTextEditor;
  if (active?.document.languageId === 'markdown') return active;
  const doc = recentMarkdownDocument();
  if (!doc) return undefined;
  const visible = vscode.window.visibleTextEditors.find((e) => e.document === doc);
  return vscode.window.showTextDocument(doc, { viewColumn: visible?.viewColumn, preserveFocus: false });
}
