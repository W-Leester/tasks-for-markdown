import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, sleep } from './helpers';

/** The ✓ Done · Priority ▾ · 📅 Due ▾ · ✎ Edit buttons of the cursor line (M30). */
suite('task line actions (M30)', () => {
  const config = () => vscode.workspace.getConfiguration('tasksmd');

  async function open(): Promise<{ doc: vscode.TextDocument; line: string }> {
    await getApi();
    const line = '- [ ] write report 📅 2026-10-20';
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: `# Notes\n${line}\n\nplain text\n` });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, 3, 1, 3);
    await sleep(300);
    return { doc, line };
  }
  const hints = (doc: vscode.TextDocument) =>
    vscode.commands.executeCommand<vscode.InlayHint[]>('vscode.executeInlayHintProvider', doc.uri, new vscode.Range(0, 0, doc.lineCount, 0));
  const lensCommands = async (doc: vscode.TextDocument) =>
    ((await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', doc.uri)) ?? []).map((l) => l.command?.command);
  const labelText = (h: vscode.InlayHint) => (typeof h.label === 'string' ? h.label : h.label.map((p) => p.value).join(''));
  const labelLength = (h: vscode.InlayHint) => [...labelText(h)].length;
  const picksOf = (hs: vscode.InlayHint[]) => hs.flatMap((h) => (typeof h.label === 'string' ? [] : h.label)).filter((p) => p.command?.command === 'tasksmd.inlinePick').map((p) => (p.command!.arguments![0] as { kind: string }).kind);
  async function buttonsFor(line: string): Promise<{ picks: string[]; cmds: (string | undefined)[] }> {
    await getApi();
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: `# N\n${line}\n` });
    const editor = await vscode.window.showTextDocument(doc);
    editor.selection = new vscode.Selection(1, 3, 1, 3);
    await sleep(300);
    const hs = await hints(doc);
    return { picks: picksOf(hs), cmds: hs.flatMap(partCommands) };
  }
  const partCommands = (h: vscode.InlayHint) => (typeof h.label === 'string' ? [] : h.label.map((p) => p.command?.command).filter(Boolean));

  teardown(async () => {
    await config().update('codeLens.position', undefined, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('by default the buttons sit at the end of the cursor line, not above it', async () => {
    const { doc, line } = await open();
    const ours = (await hints(doc)).filter((h) => partCommands(h).some((c) => c?.startsWith('tasksmd.')));
    assert.ok(ours.length >= 4, 'the buttons');
    assert.ok(ours.every((h) => h.position.line === 1 && h.position.character === line.length), 'at the end of the task line');
    const cmds = ours.flatMap(partCommands);
    assert.equal(cmds.filter((c) => c === 'tasksmd.markDone').length, 1, 'one set of buttons');
    for (const c of ['tasksmd.markDone', 'tasksmd.createOrEdit']) assert.ok(cmds.includes(c), c);
    // Fields not set yet open a drop-down on the line (M31); the due date is set, so no due button, and no postpone.
    assert.deepEqual(picksOf(ours), ['priority', 'recurrence']);
    assert.ok(!cmds.includes('tasksmd.postpone'));
    // The editor cuts a line's hints off after editor.inlayHints.maximumLength (43 by default, all hints of the line
    // together): Edit was hidden behind "…". In Markdown we lift the limit.
    const total = ours.reduce((n, h) => n + labelLength(h), 0);
    const max = vscode.workspace.getConfiguration('editor', { languageId: 'markdown' }).get<number>('inlayHints.maximumLength');
    assert.ok(max === 0 || total <= max!, `buttons (${total} chars: ${ours.map(labelText).join(' ')}) fit in maximumLength ${max}`);
    assert.ok(!(await lensCommands(doc)).includes('tasksmd.markDone'), 'no CodeLens above the line');
  });

  test('codeLens.position "above" keeps the old CodeLens and no inlay buttons', async () => {
    await config().update('codeLens.position', 'above', vscode.ConfigurationTarget.Global);
    const { doc } = await open();
    assert.ok((await lensCommands(doc)).includes('tasksmd.markDone'), 'CodeLens above the line');
    assert.equal((await hints(doc)).filter((h) => partCommands(h).includes('tasksmd.markDone')).length, 0);
  });

  test('codeLens.mode "off" shows neither', async () => {
    await config().update('codeLens.mode', 'off', vscode.ConfigurationTarget.Global);
    try {
      const { doc } = await open();
      assert.equal((await hints(doc)).filter((h) => partCommands(h).includes('tasksmd.markDone')).length, 0);
      assert.ok(!(await lensCommands(doc)).includes('tasksmd.markDone'));
    } finally {
      await config().update('codeLens.mode', undefined, vscode.ConfigurationTarget.Global);
    }
  });
  test('only fields that are not set yet get a button (10-19)', async () => {
    assert.deepEqual((await buttonsFor('- [ ] plain')).picks, ['priority', 'due']);
    const full = await buttonsFor('- [ ] all set ⏫ 🔁 every week ⏳ 2026-10-19 📅 2026-10-20');
    assert.deepEqual(full.picks, []);
    assert.deepEqual(full.cmds, ['tasksmd.markDone', 'tasksmd.createOrEdit']);
  });
});
