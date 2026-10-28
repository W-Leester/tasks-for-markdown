import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, showFocused, sleep } from './helpers';

/**
 * The task buttons' pickers open as a drop-down on the line (the suggestion list) instead of the QuickPick at the top
 * (M31). Each test runs the real button's command, types like the keyboard, then accepts what the list selected.
 */
suite('task button pickers on the line (M31)', () => {
  // Line buttons are off by default since 10-28 (M36): this suite turns them on.
  suiteSetup(() => vscode.workspace.getConfiguration('tasksmd').update('codeLens.mode', 'cursorLine', vscode.ConfigurationTarget.Global));
  suiteTeardown(() => vscode.workspace.getConfiguration('tasksmd').update('codeLens.mode', undefined, vscode.ConfigurationTarget.Global));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return iso(d); };

  async function pick(line: string, kind: string, typed = ''): Promise<string> {
    await getApi();
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: `# Notes\n${line}\n\nplain\n` });
    const editor = await showFocused(doc);
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

  test('recurrence', async () => {
    assert.equal(await pick('- [ ] gym 📅 2026-10-20', 'recurrence'), '- [ ] gym 🔁 every day 📅 2026-10-20');
  });

  /** Picker items (dates, rules, priorities) in what the editor would show at the cursor now. */
  async function pickerItemsAt(doc: vscode.TextDocument, pos: vscode.Position): Promise<string[]> {
    const list = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', doc.uri, pos);
    return list.items.map((i) => (typeof i.label === 'string' ? i.label : i.label.label)).filter((l) => /^(→|📅 |⚠|🗑|🔁 every|🔺|⏫)/.test(l));
  }
  async function openDuePicker(): Promise<{ doc: vscode.TextDocument; editor: vscode.TextEditor }> {
    await getApi();
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: '# Notes\n- [ ] write report\n' });
    const editor = await showFocused(doc);
    editor.selection = new vscode.Selection(1, 2, 1, 2);
    await sleep(300);
    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>('vscode.executeInlayHintProvider', doc.uri, new vscode.Range(0, 0, doc.lineCount, 0));
    const button = hints.flatMap((h) => (typeof h.label === 'string' ? [] : h.label)).map((p) => p.command).find((c) => c?.command === 'tasksmd.inlinePick' && (c.arguments?.[0] as { kind: string }).kind === 'due')!;
    await vscode.commands.executeCommand(button.command, ...(button.arguments ?? []));
    await sleep(500);
    return { doc, editor };
  }
  const typeText = async (text: string) => {
    for (const ch of text) {
      await vscode.commands.executeCommand('type', { text: ch });
      await sleep(40);
    }
    await sleep(300);
  };

  // 10-19 user report: after closing the drop-down, plain writing on that line kept getting it back — Enter then picked
  // a date (taking the typed words) or swallowed the line break.
  test('Esc ends the pick: writing on that line gets no drop-down items afterwards', async () => {
    const pkg = vscode.extensions.getExtension('HastyCapybara.tasks-for-markdown')!.packageJSON as { contributes: { keybindings: { key: string; command: string; when?: string }[] } };
    const esc = pkg.contributes.keybindings.find((k) => k.command === 'tasksmd.inlinePick.cancel');
    assert.equal(esc?.key, 'escape');
    assert.match(esc!.when!, /tasksmd\.inlinePicking/);
    const { doc, editor } = await openDuePicker();
    assert.ok((await pickerItemsAt(doc, editor.selection.active)).length > 0, 'the drop-down is open');
    await vscode.commands.executeCommand('tasksmd.inlinePick.cancel'); // what Esc runs
    await typeText(' and call tomorrow');
    assert.deepEqual(await pickerItemsAt(doc, editor.selection.active), []);
    assert.equal(doc.lineAt(1).text, '- [ ] write report and call tomorrow');
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });

  test('moving the cursor away ends the pick too', async () => {
    const { doc, editor } = await openDuePicker();
    editor.selection = new vscode.Selection(0, 0, 0, 0);
    await sleep(200);
    const end = doc.lineAt(1).range.end;
    editor.selection = new vscode.Selection(end, end);
    await typeText(' tomorrow');
    assert.deepEqual(await pickerItemsAt(doc, editor.selection.active), []);
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
  });

  test('a pick left alone for a while ends by itself (window switched away and back)', async () => {
    const api = await getApi();
    const picker = api.picker;
    const before = picker.idleMs;
    picker.idleMs = 300;
    try {
      const { doc, editor } = await openDuePicker();
      await sleep(600);
      await typeText(' tomorrow');
      assert.deepEqual(await pickerItemsAt(doc, editor.selection.active), []);
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    } finally {
      picker.idleMs = before;
    }
  });
});

