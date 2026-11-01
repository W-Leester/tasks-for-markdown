import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { LiveSync } from '../../src/preview/LiveView';
import type { ToLive } from '../../src/webviews/live/sync';
import { fixtureUri } from './helpers';

suite('live view sync with the note (M40)', () => {
  // A new file per test: an already open document would keep its old text.
  let n = 0;
  const files: string[] = [];
  let sync: LiveSync | undefined;
  const sent: ToLive[] = [];
  const open = async (text: string) => {
    const uri = fixtureUri(`live-sync-test-${++n}.md`);
    files.push(uri.fsPath);
    fs.writeFileSync(uri.fsPath, text, 'utf8');
    const doc = await vscode.workspace.openTextDocument(uri);
    sent.length = 0;
    sync = new LiveSync(doc, (m) => sent.push(m), () => undefined);
    return doc;
  };
  const settle = () => new Promise((r) => setTimeout(r, 50));

  teardown(() => sync?.dispose());
  suiteTeardown(() => { for (const f of files) if (fs.existsSync(f)) fs.unlinkSync(f); });

  test('applies the editor’s edits in order and sends nothing back, even when typed fast', async () => {
    const doc = await open('# 제목\n');
    // Not awaited one by one: each was made on the text the one before produced.
    const edits = ['a', 'b', 'c'].map((ch, i) => sync!.edit({ type: 'live/edit', changes: [{ from: 5 + i, to: 5 + i, insert: ch }], length: 5 + i }));
    edits.push(sync!.edit({ type: 'live/edit', changes: [{ from: 5, to: 8, insert: '' }], length: 8 })); // undo of all three
    await Promise.all(edits);
    await settle();
    assert.strictEqual(doc.getText(), '# 제목\n');
    assert.deepStrictEqual(sent, []);
  });

  test('a change made elsewhere is sent as the whole text', async () => {
    const doc = await open('one\n');
    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, new vscode.Position(1, 0), 'two\n');
    await vscode.workspace.applyEdit(edit);
    await settle();
    assert.deepStrictEqual(sent, [{ type: 'live/text', text: 'one\ntwo\n' }]);
  });

  test('an edit made on an old text (out of step) is not applied; the note’s text is sent instead', async () => {
    const doc = await open('abc\n');
    await sync!.edit({ type: 'live/edit', changes: [{ from: 0, to: 0, insert: 'X' }], length: 99 });
    assert.strictEqual(doc.getText(), 'abc\n');
    assert.deepStrictEqual(sent, [{ type: 'live/text', text: 'abc\n' }]);
  });

  test('CRLF notes: offsets count \\r\\n as two, as the editor does with the note’s line separator', async () => {
    const doc = await open('a\r\nb\r\n');
    await sync!.edit({ type: 'live/edit', changes: [{ from: 4, to: 4, insert: 'c' }], length: 6 });
    assert.strictEqual(doc.getText(), 'a\r\nbc\r\n');
  });
});
