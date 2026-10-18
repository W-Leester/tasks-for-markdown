import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, sleep } from './helpers';

/**
 * Editing a task shown in an editor next to an emoji that shares its first UTF-16 unit (🔁 📅 🔺 🔼 🔽 🛫 …) must keep
 * both whole (incident #44): a whole-line replace through workspace.applyEdit was shrunk by the editor and cut them.
 */
suite('edits next to emoji (incident #44)', () => {
  async function apply(line: string, kind: string, value: unknown): Promise<string> {
    await getApi();
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: `# N\n${line}\n` });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, 3, 1, 3);
    await sleep(300);
    await vscode.commands.executeCommand('tasksmd.inlinePick.apply', { kind, value });
    await sleep(400);
    const text = doc.lineAt(1).text;
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    return text;
  }

  test('adding 🔁 before 📅, and swapping 🔼 for 🔽', async () => {
    assert.equal(await apply('- [ ] gym 📅 2026-10-20', 'recurrence', 'every day'), '- [ ] gym 🔁 every day 📅 2026-10-20');
    assert.equal(await apply('- [ ] gym 🔼 📅 2026-10-20', 'priority', '4'), '- [ ] gym 🔽 📅 2026-10-20');
    assert.equal(await apply('- [ ] gym 📅 2026-10-20', 'priority', '0'), '- [ ] gym 🔺 📅 2026-10-20');
  });
});
