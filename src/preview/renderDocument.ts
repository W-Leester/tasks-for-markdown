import MarkdownItCtor from 'markdown-it';
import type { MarkdownIt } from 'markdown-it';
import { quoteText } from '../core/file';
import { type PluginDeps, tasksMarkdownItPlugin } from './markdownItPlugin';

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface RenderDocumentOptions {
  /** Absolute URL for a relative image path, or null to leave it alone. */
  resolveImage?(src: string): string | null;
  /** Value of markdown-it's env (the plugin reads the query source from it). */
  env?: Record<string, unknown>;
  /** Show YAML front matter as a muted key/value block at the top (like Cursor's editor). */
  frontMatter?: boolean;
  /** Other extensions' `extendMarkdownIt` (M34), applied after ours. */
  plugins?: readonly ((md: MarkdownIt) => unknown)[];
  /** A borrowed plugin failed (its index, or 'render' when rendering with them failed and we rendered without). */
  onPluginError?(which: number | 'render', err: unknown): void;
}

/**
 * Renders a whole note for the interactive rendered view (FR-4.6): the same markdown-it pipeline
 * as the built-in preview plus a few adjustments — YAML front matter is blanked (line numbers are
 * preserved so `data-tfm-line` still maps to the document), checkboxes are made clickable, and
 * relative image paths are resolved for the webview. No vscode imports so it is unit-testable.
 */
export function renderDocumentHtml(text: string, deps: PluginDeps, options: RenderDocumentOptions = {}): string {
  const build = (borrowed: boolean): MarkdownIt => {
    const md = new MarkdownItCtor({ html: false, linkify: true });
    tasksMarkdownItPlugin(md, deps);
    md.core.ruler.push('tfm_quotes', markQuotes);
    if (borrowed) {
      (options.plugins ?? []).forEach((plugin, i) => {
        try {
          plugin(md);
        } catch (err) {
          options.onPluginError?.(i, err); // left out; the others still apply
        }
      });
    }
    return md;
  };
  // Keep the line count: replace every non-newline character of the front matter with nothing.
  let frontMatter = '';
  const source = text.replace(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/, (m, body: string) => {
    frontMatter = body;
    return m.replace(/[^\n]/g, '');
  });
  let html: string;
  try {
    html = build(true).render(source, options.env);
  } catch (err) {
    if (!options.plugins?.length) throw err;
    options.onPluginError?.('render', err); // a borrowed plugin broke rendering: the note without them
    html = build(false).render(source, options.env);
  }
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

/**
 * Outermost blockquotes get their line range and text (M38) so the rendered view can turn one into an input and the
 * host can write it back: `data-tfm-quote="<start>-<end>"` (end exclusive) and `data-tfm-quote-text`.
 */
function markQuotes(state: { src: string; tokens: { type: string; map: [number, number] | null; attrSet(name: string, value: string): void }[] }): void {
  const lines = state.src.split('\n');
  let depth = 0;
  for (const token of state.tokens) {
    if (token.type === 'blockquote_close') depth--;
    if (token.type !== 'blockquote_open') continue;
    if (depth++ > 0 || !token.map) continue;
    const [start] = token.map;
    // markdown-it's range takes in the blank line that ends the quote.
    let end = token.map[1];
    while (end > start && !lines[end - 1]!.trim()) end--;
    const quote = quoteText(lines.slice(start, end));
    if (!quote) continue;
    token.attrSet('data-tfm-quote', `${start}-${end}`);
    token.attrSet('data-tfm-quote-text', quote.text);
  }
}
