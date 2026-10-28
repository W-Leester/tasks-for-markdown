import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi, showFocused, sleep } from './helpers';

/** The line buttons (✓ Done · Priority ▾ · …) are off by default and switched in the TASKS title bar (M36). */
suite('line buttons switch (M36)', () => {
  const mode = () => vscode.workspace.getConfiguration('tasksmd').inspect<string>('codeLens.mode');
  const buttons = async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: '# N\n- [ ] plain\n' });
    const editor = await showFocused(doc);
    editor.selection = new vscode.Selection(1, 3, 1, 3);
    await sleep(300);
    const hints = await vscode.commands.executeCommand<vscode.InlayHint[]>('vscode.executeInlayHintProvider', doc.uri, new vscode.Range(0, 0, doc.lineCount, 0));
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    return hints.flatMap((h) => (typeof h.label === 'string' ? [] : h.label)).filter((p) => p.command?.command?.startsWith('tasksmd.')).length;
  };
  teardown(async () => {
    await vscode.workspace.getConfiguration('tasksmd').update('codeLens.mode', undefined, vscode.ConfigurationTarget.Workspace);
  });

  test('off by default: no buttons on the line', async () => {
    await getApi();
    assert.equal(mode()?.defaultValue, 'off');
    assert.equal(await buttons(), 0);
  });

  test('show / hide write this project\'s setting and the buttons follow', async () => {
    await getApi();
    await vscode.commands.executeCommand('tasksmd.lineButtons.show');
    assert.equal(mode()?.workspaceValue, 'cursorLine');
    assert.ok((await buttons()) >= 3, 'buttons on the cursor line');
    await vscode.commands.executeCommand('tasksmd.lineButtons.hide');
    assert.equal(mode()?.workspaceValue, 'off');
    assert.equal(await buttons(), 0);
  });

  test('the TASKS title bar has the switch: one icon per state', () => {
    const pkg = vscode.extensions.getExtension('HastyCapybara.tasks-for-markdown')!.packageJSON as { contributes: { menus: Record<string, { command: string; when?: string }[]>; commands: { command: string; icon?: string }[] } };
    const title = pkg.contributes.menus['view/title']!;
    const show = title.find((m) => m.command === 'tasksmd.lineButtons.show');
    const hide = title.find((m) => m.command === 'tasksmd.lineButtons.hide');
    assert.match(show?.when ?? '', /view == tasksmd\.tasks/);
    assert.match(show?.when ?? '', /config\.tasksmd\.codeLens\.mode == 'off'/);
    assert.match(hide?.when ?? '', /config\.tasksmd\.codeLens\.mode != 'off'/);
    const icon = (id: string) => pkg.contributes.commands.find((c) => c.command === id)?.icon;
    assert.deepEqual([icon('tasksmd.lineButtons.show'), icon('tasksmd.lineButtons.hide')], ['$(eye-closed)', '$(eye)']);
  });
});
