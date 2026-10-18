import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, sleep } from './helpers';

/**
 * The task buttons' pickers open as a drop-down on the line (the suggestion list) instead of the QuickPick at the top
 * (M31). Each test runs the real button's command, types like the keyboard, then accepts what the list selected.
 */
suite('task button pickers on the line (M31)', () => {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); };

  async function pick(line: string, kind: string, typed = ''): Promise<string> {
    await getApi();
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: `# Notes\n${line}\n\nplain\n` });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, 2, 1, 2);
    await sleep(300);
    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>('vscode.executeInlayHintProvider', doc.uri, new vscode.Range(0, 0, doc.lineCount, 0));
    const button = hints
      .flatMap((h) => (typeof h.label === 'string' ? [] : h.label))
      .map((p) => p.command)
      .find((c) => c?.command === 'tasksmd.inlinePick' && (c.arguments?.[0] as { kind?: string } | undefined)?.kind === kind);
    assert.ok(button, `a ${kind} button that opens the drop-down`);
    await vscode.commands.executeCommand(button.command, ...(button.arguments ?? []));
    await sleep(500);
    for (const ch of typed) {
      await vscode.commands.executeCommand('type', { text: ch });
      await sleep(60);
    }
    await sleep(500);
    await vscode.commands.executeCommand('acceptSelectedSuggestion');
    await sleep(600);
    const text = doc.lineAt(1).text;
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    return text;
  }

  test('priority: the list opens on the line and the first choice sets 🔺', async () => {
    assert.equal(await pick('- [ ] write report', 'priority'), '- [ ] write report 🔺');
  });

  test('due: typed natural language becomes the date, and the typed text is gone', async () => {
    assert.equal(await pick('- [ ] write report', 'due', 'tomorrow'), `- [ ] write report 📅 ${tomorrow()}`);
    assert.match(await pick('- [ ] write report', 'due', 'next fri'), /^- \[ \] write report 📅 \d{4}-\d{2}-\d{2}$/);
    const in3 = new Date(); in3.setDate(in3.getDate() + 3);
    assert.equal(await pick('- [ ] 보고서', 'due', '3일 후'), `- [ ] 보고서 📅 ${iso(in3)}`);
  });

  test('recurrence and postpone', async () => {
    assert.equal(await pick('- [ ] gym 📅 2026-10-20', 'recurrence'), '- [ ] gym 🔁 every day 📅 2026-10-20');
    assert.equal(await pick('- [ ] gym 📅 2020-01-01', 'postpone'), `- [ ] gym 📅 ${tomorrow()}`);
  });
});
