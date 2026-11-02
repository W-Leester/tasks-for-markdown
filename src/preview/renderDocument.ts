import MarkdownItCtor from 'markdown-it';
import type { MarkdownIt } from 'markdown-it';
import { blockText, quoteText } from '../core/file';
import { headingAnchors } from '../core/file/headingAnchor';
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
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** YAML front matter as a muted key/value block. */
function frontMatterHtml(body: string): string {
  const rows = body.split(/\r?\n/).filter((l) => l.trim()).map((l) => {
    const m = /^([^:]+):\s*(.*)$/.exec(l);
    return m ? `<div><span class="k">${escape(m[1]!.trim())}</span>: ${escape(m[2]!)}</div>` : `<div>${escape(l)}</div>`;
  });
  return `<div class="rv-frontmatter">${rows.join('')}</div>`;
}

/** A block the live view (M40 F) draws off the cursor: its lines as written (joined with `\n`) and its HTML. */
export interface LiveBlock { kind: 'front' | 'table' | 'fence'; source: string; html: string }

/**
 * The note's blocks the live view shows rendered when the cursor is not in them (M40 F): the front matter, top-level
 * tables, and fenced code another extension draws (Mermaid…: its HTML is not a plain `<pre><code>`). ```tasks blocks
 * are drawn as query results elsewhere; plain code stays text to edit.
 */
export function liveBlocks(text: string, deps: PluginDeps, options: RenderDocumentOptions = {}): LiveBlock[] {
  const out: LiveBlock[] = [];
  const lines = text.split(/\r?\n/);
  const front = FRONT_MATTER.exec(text);
  if (front) {
    const n = front[0].replace(/\r?\n$/, '').split(/\r?\n/).length;
    out.push({ kind: 'front', source: lines.slice(0, n).join('\n'), html: front[1]!.trim() ? frontMatterHtml(front[1]!) : '<div class="rv-frontmatter"></div>' });
  }
  const blanked = text.replace(FRONT_MATTER, (m) => m.replace(/[^\n]/g, ''));
  const md = new MarkdownItCtor({ html: false, linkify: true });
  (options.plugins ?? []).forEach((plugin, i) => {
    try { plugin(md); } catch (err) { options.onPluginError?.(i, err); }
  });
  let tokens: { type: string; level: number; info: string; map: [number, number] | null }[];
  try { tokens = md.parse(blanked, options.env ?? {}); } catch (err) { options.onPluginError?.('render', err); tokens = new MarkdownItCtor().parse(blanked, {}); }
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.level !== 0 || !token.map) continue;
    const kind = token.type === 'table_open' ? 'table' : token.type === 'fence' && token.info.trim().split(/\s+/)[0] !== 'tasks' && token.info.trim() ? 'fence' : null;
    if (!kind) continue;
    const [start] = token.map;
    let end = token.map[1];
    while (end > start + 1 && !lines[end - 1]!.trim()) end--;
    const source = lines.slice(start, end).join('\n');
    if (seen.has(source)) continue;
    seen.add(source);
    let html: string;
    try { html = renderDocumentHtml(source + '\n', deps, { ...options, frontMatter: false }); } catch { continue; }
    // A fence drawn as plain code: leave it as text to edit.
    if (kind === 'fence' && /^\s*<pre><code[\s>]/.test(html)) continue;
    out.push({ kind, source, html });
  }
  return out;
}

export function renderDocumentHtml(text: string, deps: PluginDeps, options: RenderDocumentOptions = {}): string {
  const build = (borrowed: boolean): MarkdownIt => {
    const md = new MarkdownItCtor({ html: false, linkify: true });
    tasksMarkdownItPlugin(md, deps);
    md.core.ruler.push('tfm_quotes', markQuotes);
    md.core.ruler.push('tfm_headings', markHeadings);
    md.core.ruler.push('tfm_blocks', markBlocks);
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
  const source = text.replace(FRONT_MATTER, (m, body: string) => {
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
  if (options.frontMatter && frontMatter.trim()) html = frontMatterHtml(frontMatter) + html;
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

interface QuoteToken { type: string; map: [number, number] | null; children: { type: string }[] | null; attrSet(name: string, value: string): void }

/**
 * Outermost blockquotes get their line range and text (M38) so the rendered view can turn one into an input and the
 * host can write it back: `data-tfm-quote="<start>-<end>"` (end exclusive) and `data-tfm-quote-text`. Line breaks inside
 * quotes render as `<br>`.
 */
function markQuotes(state: { src: string; tokens: QuoteToken[] }): void {
  const lines = state.src.split('\n');
  let depth = 0;
  for (const token of state.tokens) {
    if (token.type === 'blockquote_close') depth--;
    // A line break typed in a quote shows as one (as in Obsidian), not joined into the line above.
    if (token.type === 'inline' && depth > 0) for (const child of token.children ?? []) if (child.type === 'softbreak') child.type = 'hardbreak';
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

interface HeadingToken { type: string; content: string; children: { type: string; content: string }[] | null; attrSet(name: string, value: string): void }

/** Headings get their GitHub-style anchor, `data-tfm-anchor`, so `[목차](#1-비전)` links scroll to them. */
function markHeadings(state: { tokens: HeadingToken[] }): void {
  const opens: HeadingToken[] = [];
  const texts: string[] = [];
  state.tokens.forEach((token, i) => {
    if (token.type !== 'heading_open') return;
    const inline = state.tokens[i + 1];
    // The text as shown: `**굵게**` counts as `굵게`, as on GitHub.
    const text = inline?.children ? inline.children.filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join('') : inline?.content ?? '';
    opens.push(token);
    texts.push(text);
  });
  headingAnchors(texts).forEach((anchor, i) => opens[i]!.attrSet('data-tfm-anchor', anchor));
}

interface BlockToken { type: string; info: string; map: [number, number] | null; attrSet(name: string, value: string): void }

/**
 * Blocks the rendered view lets the user type into (M39) get their line range and source text: `data-tfm-block`
 * (`<start>-<end>`, end exclusive, trailing blank lines left out) and `data-tfm-block-text`. Headings, paragraphs
 * outside lists and quotes, list items (every depth), tables and code blocks (not ```tasks). Quotes have their own
 * marks (M38); the view leaves out task rows and items holding tasks.
 */
function markBlocks(state: { src: string; tokens: BlockToken[] }): void {
  const lines = state.src.split('\n');
  let quotes = 0;
  let lists = 0;
  for (const token of state.tokens) {
    if (token.type === 'blockquote_open') quotes++;
    else if (token.type === 'blockquote_close') quotes--;
    else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') lists++;
    else if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') lists--;
    if (quotes > 0 || !token.map) continue;
    const t = token.type;
    const wanted =
      t === 'heading_open' || t === 'table_open' || t === 'list_item_open' || t === 'code_block' ||
      (t === 'paragraph_open' && lists === 0) || (t === 'fence' && token.info.trim().split(/\s+/)[0] !== 'tasks');
    if (!wanted) continue;
    const [start] = token.map;
    let end = token.map[1];
    while (end > start + 1 && !lines[end - 1]!.trim()) end--;
    token.attrSet('data-tfm-block', `${start}-${end}`);
    token.attrSet('data-tfm-block-text', blockText(lines.slice(start, end)).text);
  }
}
