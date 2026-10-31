import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { fixtureUri, getApi, showFocused } from './helpers';

suite('blockquote typed into in the rendered view (M38)', () => {
  const FILE = 'quote-edit-test.md';
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

  test('replaces only the quote lines, "> " before each, and saves a file nobody is editing', async () => {
    await write(['# Q', '', '> 답변:', '>', '>', '', '다음 질문', ''].join('\n'));
    await internal.editService.replaceQuote(uri(), 2, 5, '답변:\n\n', '답변: 동의합니다\n\n둘째 줄');
    assert.strictEqual(read(), ['# Q', '', '> 답변: 동의합니다', '>', '> 둘째 줄', '', '다음 질문', ''].join('\n'));
  });

  test('keeps the indentation and the CRLF line ends; one ">" line when emptied', async () => {
    // Written to disk before the editor opens it: an edit through the editor would turn CRLF into LF.
    const crlf = fixtureUri('quote-edit-crlf.md');
    fs.writeFileSync(crlf.fsPath, '- item\r\n\r\n  > a\r\n  > b\r\n', 'utf8');
    try {
      await internal.editService.replaceQuote(crlf, 2, 4, 'a\nb', 'c');
      assert.strictEqual(fs.readFileSync(crlf.fsPath, 'utf8'), '- item\r\n\r\n  > c\r\n');
      await internal.editService.replaceQuote(crlf, 2, 3, 'c', '');
      assert.strictEqual(fs.readFileSync(crlf.fsPath, 'utf8'), '- item\r\n\r\n  >\r\n');
    } finally {
      fs.unlinkSync(crlf.fsPath);
    }
  });

  test('refuses when the quote changed since the view was drawn; same text changes nothing', async () => {
    await write('> old\n');
    await assert.rejects(internal.editService.replaceQuote(uri(), 0, 1, 'older', 'new'), /quote has changed/);
    await assert.rejects(internal.editService.replaceQuote(uri(), 0, 3, 'old', 'new'), /quote has changed/);
    assert.strictEqual(read(), '> old\n');
    const doc = await vscode.workspace.openTextDocument(uri());
    const version = doc.version;
    await internal.editService.replaceQuote(uri(), 0, 1, 'old', 'old');
    assert.strictEqual(doc.version, version);
  });

  test('one undo brings the quote back', async () => {
    await write('> 답변:\n');
    const editor = await showFocused(await vscode.workspace.openTextDocument(uri()));
    await internal.editService.replaceQuote(uri(), 0, 1, '답변:', '답변: 네\n좋아요');
    assert.strictEqual(editor.document.getText(), '> 답변: 네\n> 좋아요\n');
    await vscode.commands.executeCommand('undo');
    assert.strictEqual(editor.document.getText(), '> 답변:\n');
  });
});
