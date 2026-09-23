import MarkdownIt from 'markdown-it';
import { type PluginDeps, tasksMarkdownItPlugin } from './markdownItPlugin';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface RenderDocumentOptions {
  /** Absolute URL for a relative image path, or null to leave it alone. */
  resolveImage?(src: string): string | null;
  /** Value of markdown-it's env (the plugin reads the query source from it). */
  env?: Record<string, unknown>;
  /** Show YAML front matter as a muted key/value block at the top (like Cursor's editor). */
  frontMatter?: boolean;
}

/**
 * Renders a whole note for the interactive rendered view (FR-4.6): the same markdown-it pipeline
 * as the built-in preview plus a few adjustments — YAML front matter is blanked (line numbers are
 * preserved so `data-tfm-line` still maps to the document), checkboxes are made clickable, and
 * relative image paths are resolved for the webview. No vscode imports so it is unit-testable.
 */
export function renderDocumentHtml(text: string, deps: PluginDeps, options: RenderDocumentOptions = {}): string {
  const md = new MarkdownIt({ html: false, linkify: true });
  tasksMarkdownItPlugin(md, deps);
  // Keep the line count: replace every non-newline character of the front matter with nothing.
  let frontMatter = '';
  const source = text.replace(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/, (m, body: string) => {
    frontMatter = body;
    return m.replace(/[^\n]/g, '');
  });
  let html = md.render(source, options.env);
  if (options.frontMatter && frontMatter.trim()) {
    const rows = frontMatter.split(/\r?\n/).filter((l) => l.trim()).map((l) => {
      const m = /^([^:]+):\s*(.*)$/.exec(l);
      return m ? `<div><span class="k">${escape(m[1]!.trim())}</span>: ${escape(m[2]!)}</div>` : `<div>${escape(l)}</div>`;
    });
    html = `<div class="rv-frontmatter">${rows.join('')}</div>` + html;
  }
  html = html.replace(/(<input type="checkbox" class="tfm-check") disabled/g, '$1');
  if (options.resolveImage) {
    const resolve = options.resolveImage;
    html = html.replace(/(<img\b[^>]*?\ssrc=")([^"]+)(")/g, (m, pre: string, src: string, post: string) => {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(src)) return m;
      const resolved = resolve(decodeURI(src));
      return resolved ? `${pre}${resolved}${post}` : m;
    });
  }
  return html;
}
