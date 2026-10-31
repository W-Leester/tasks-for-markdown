import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { fixtureUri, getApi, showFocused } from './helpers';

suite('blocks typed into in the rendered view (M39)', () => {
  const FILE = 'block-edit-test.md';
  let internal: Awaited<ReturnType<typeof getApi>>;
  const uri = () => fixtureUri(FILE);
  const read = () => fs.readFileSync(uri().fsPath, 'utf8');
  const write = async (text: string) => {
    if (!fs.existsSync(uri().fsPath)) fs.writeFileSync(uri().fsPath, '', 'utf8');
    const doc = await vscode.workspace.openTextDocument(uri());
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri(), new vscode.Range(0, 0, doc.lineCount, 0), text);
    await vscode.workspace.applyEdit(edit);
    await doc.save();
  };

  suiteSetup(async () => {
    internal = await getApi();
  });
  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    if (fs.existsSync(uri().fsPath)) fs.unlinkSync(uri().fsPath);
  });

  test('replaces only the block lines, keeps a list item’s indent, saves a file nobody is editing', async () => {
    await write(['# 제목', '', '문단', '둘째 줄', '', '- 항목', '  - 하위', '  - 둘째 하위', '', '끝', ''].join('\n'));
    await internal.editService.replaceBlock(uri(), 2, 4, '문단\n둘째 줄', '고친 문단');
    assert.strictEqual(read(), ['# 제목', '', '고친 문단', '', '- 항목', '  - 하위', '  - 둘째 하위', '', '끝', ''].join('\n'));
    await internal.editService.replaceBlock(uri(), 5, 6, '- 하위', '- 바꾼 하위\n  - 새 손자');
    assert.strictEqual(read(), ['# 제목', '', '고친 문단', '', '- 항목', '  - 바꾼 하위', '    - 새 손자', '  - 둘째 하위', '', '끝', ''].join('\n'));
  });

  test('refuses when the block changed since the view was drawn; same text changes nothing', async () => {
    await write('old\n');
    await assert.rejects(internal.editService.replaceBlock(uri(), 0, 1, 'older', 'new'), /part of the note has changed/);
    await assert.rejects(internal.editService.replaceBlock(uri(), 0, 3, 'old', 'new'), /part of the note has changed/);
    assert.strictEqual(read(), 'old\n');
    const doc = await vscode.workspace.openTextDocument(uri());
    const version = doc.version;
    await internal.editService.replaceBlock(uri(), 0, 1, 'old', 'old');
    assert.strictEqual(doc.version, version);
  });

  test('"+ Write" appends after one blank line, whatever the note ends with; blank text adds nothing', async () => {
    for (const [before, after] of [['a', 'a\n\n새 글\n'], ['a\n', 'a\n\n새 글\n'], ['a\n\n', 'a\n\n새 글\n'], ['', '새 글\n']]) {
      await write(before!);
      await internal.editService.appendText(uri(), '새 글\n');
      assert.strictEqual(read(), after, JSON.stringify(before));
    }
    await internal.editService.appendText(uri(), '  \n');
    assert.strictEqual(read(), '새 글\n');
  });

  test('a source editor showing the note: the edit lands there, unsaved, and one undo brings it back', async () => {
    await write('문단\n');
    const editor = await showFocused(await vscode.workspace.openTextDocument(uri()));
    await internal.editService.replaceBlock(uri(), 0, 1, '문단', '고침');
    assert.strictEqual(editor.document.getText(), '고침\n');
    assert.strictEqual(editor.document.isDirty, true);
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(editor.document.getText(), '문단\n');
  });
});
