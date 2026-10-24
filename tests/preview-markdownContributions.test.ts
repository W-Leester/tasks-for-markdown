import { describe, expect, it } from 'vitest';
import { findMarkdownContributions } from '../src/preview/markdownContributions';

describe('findMarkdownContributions (M34)', () => {
  const ext = (id: string, contributes: Record<string, unknown>) => ({ id, packageJSON: { contributes } });

  it('lists the extensions that add to the built-in Markdown preview, minus ourselves', () => {
    const found = findMarkdownContributions([
      ext('bierner.markdown-mermaid', { 'markdown.markdownItPlugins': true, 'markdown.previewScripts': ['./dist-preview/index.bundle.js'] }),
      ext('someone.math', { 'markdown.previewStyles': ['./katex.css'], 'markdown.markdownItPlugins': true }),
      ext('HastyCapybara.tasks-for-markdown', { 'markdown.markdownItPlugins': true, 'markdown.previewStyles': ['./media/preview.css'] }),
      ext('yzhang.markdown-all-in-one', { commands: [] }),
      { id: 'broken.ext', packageJSON: undefined },
    ], 'HastyCapybara.tasks-for-markdown');
    expect(found).toEqual([
      { id: 'bierner.markdown-mermaid', plugin: true, scripts: [{ path: './dist-preview/index.bundle.js', module: false }], styles: [] },
      { id: 'someone.math', plugin: true, scripts: [], styles: ['./katex.css'] },
    ]);
  });

  it('ignores malformed entries', () => {
    expect(findMarkdownContributions([ext('x.y', { 'markdown.previewScripts': 'not-a-list', 'markdown.markdownItPlugins': 'yes' })], 'me.me')).toEqual([]);
    expect(findMarkdownContributions([ext('x.z', { 'markdown.previewScripts': ['ok.js', 3, '../../escape.js', { path: '../up.js' }] })], 'me.me')).toEqual([{ id: 'x.z', plugin: false, scripts: [{ path: 'ok.js', module: false }], styles: [] }]);
  });

  it('module scripts (VS Code\'s built-in Mermaid) and the built-in preview\'s own runtime, which is left out', () => {
    expect(findMarkdownContributions([
      ext('vscode.mermaid-markdown-features', { 'markdown.markdownItPlugins': true, 'markdown.previewScripts': [{ path: './markdown-preview-out/index.js', type: 'module' }] }),
      ext('vscode.markdown-language-features', { 'markdown.previewStyles': ['./media/markdown.css'], 'markdown.previewScripts': [{ path: './media/index.js', type: 'module' }] }),
    ], 'me.me')).toEqual([{ id: 'vscode.mermaid-markdown-features', plugin: true, scripts: [{ path: './markdown-preview-out/index.js', module: true }], styles: [] }]);
  });
});
