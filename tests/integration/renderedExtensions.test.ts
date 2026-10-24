import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { getApi } from './helpers';

/**
 * The rendered view uses what other extensions add to the built-in Markdown preview (M34). VS Code ships two such
 * extensions itself: math (KaTeX) and, in recent versions, Mermaid — real contributions to test against.
 */
suite('rendered view: other Markdown extensions (M34)', () => {
  const fakeWebview = { asWebviewUri: (u: vscode.Uri) => u } as unknown as vscode.Webview;

  test("borrows the built-in math extension's plugin and styles, never the preview's own runtime", async () => {
    const api = await getApi();
    const b = await api.rendered.borrowed();
    const ids = b.plugins.map((p) => p.id);
    assert.ok(ids.includes('vscode.markdown-math'), ids.join(', '));
    const files = [...b.scripts.map((s) => s.uri.path), ...b.styles.map((u) => u.path)];
    assert.ok(files.some((f) => f.includes('markdown-math') && f.endsWith('.css')), files.join('\n'));
    assert.ok(!files.some((f) => f.includes('markdown-language-features')), 'not the built-in preview itself');

    const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: '# M\n\nArea $x^2$\n\n```mermaid\ngraph TD; A-->B\n```\n\n- [ ] task 📅 2026-10-25\n' });
    const html = api.rendered.renderHtml(doc, fakeWebview, b);
    assert.match(html, /class="katex/, 'math drawn by the borrowed plugin');
    assert.match(html, /tfm-check/, 'our tasks still render');
    if (ids.includes('vscode.mermaid-markdown-features')) assert.match(html, /mermaid/, 'mermaid block handed to its extension');
  });

  test('tasksmd.rendered.markdownExtensions off: nothing borrowed', async () => {
    const api = await getApi();
    await api.settings.update('rendered.markdownExtensions', false, vscode.ConfigurationTarget.Global);
    try {
      const b = await api.rendered.borrowed();
      assert.deepEqual([b.plugins.length, b.scripts.length, b.styles.length], [0, 0, 0]);
      const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: 'Area $x^2$\n' });
      assert.doesNotMatch(api.rendered.renderHtml(doc, fakeWebview, b), /katex/);
    } finally {
      await api.settings.update('rendered.markdownExtensions', undefined, vscode.ConfigurationTarget.Global);
    }
  });
});
