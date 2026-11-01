/**
 * What the live view (M40) draws over the Markdown text: marks hidden (`#`, `**`, `` ` ``, `[](url)`, `>`) on lines
 * the cursor is not on, bullets as `•`, task boxes as checkboxes, and line styles for headings, quotes, code and
 * tables. Computed from the syntax tree as plain specs so it can be tested without a view.
 */
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

export type LiveDeco =
  /** Text not shown (a Markdown mark). */
  | { kind: 'hide'; from: number; to: number }
  /** A bullet list mark shown as `•`. */
  | { kind: 'bullet'; from: number; to: number }
  /** `- [ ]` / `- [x]` shown as a checkbox; `line` is 0-based. */
  | { kind: 'task'; from: number; to: number; checked: boolean; line: number }
  /** A class on a whole line (at its start). */
  | { kind: 'line'; from: number; cls: string }
  /** A class on a stretch of text; `href` for links. */
  | { kind: 'mark'; from: number; to: number; cls: string; href?: string };

/** Lines (1-based) a selection range touches: there the marks show, so the text can be edited as written. */
export function activeLines(state: EditorState, focused: boolean): Set<number> {
  const lines = new Set<number>();
  if (!focused) return lines;
  for (const r of state.selection.ranges) {
    const a = state.doc.lineAt(r.from).number, b = state.doc.lineAt(r.to).number;
    for (let n = a; n <= b; n++) lines.add(n);
  }
  return lines;
}

const BLOCK_LINES: Record<string, string> = { Blockquote: 'cm-lv-quote', FencedCode: 'cm-lv-codeblock', CodeBlock: 'cm-lv-codeblock', Table: 'cm-lv-table' };

export function liveDecos(state: EditorState, active: Set<number>, from = 0, to = state.doc.length): LiveDeco[] {
  const out: LiveDeco[] = [];
  const doc = state.doc;
  const lineOf = (pos: number) => doc.lineAt(pos).number;
  const shown = (pos: number) => active.has(lineOf(pos));
  /** A mark and the space after it. */
  const withSpace = (n: SyntaxNode) => (doc.sliceString(n.to, n.to + 1) === ' ' ? n.to + 1 : n.to);
  const linesOf = (a: number, b: number, cls: string) => {
    for (let n = lineOf(a), last = lineOf(Math.max(a, b - 1)); n <= last; n++) out.push({ kind: 'line', from: doc.line(n).from, cls });
  };
  syntaxTree(state).iterate({
    from,
    to,
    enter: (ref) => {
      const n = ref.node;
      const name = n.name;
      const parent = n.parent?.name ?? '';
      const heading = /^(?:ATX|Setext)Heading(\d)$/.exec(name);
      if (heading) { out.push({ kind: 'line', from: doc.lineAt(n.from).from, cls: `cm-lv-h${heading[1]}` }); return; }
      if (BLOCK_LINES[name]) { linesOf(n.from, n.to, BLOCK_LINES[name]!); if (name !== 'Blockquote') return; }
      if (name === 'HorizontalRule') {
        if (!shown(n.from)) { out.push({ kind: 'line', from: doc.lineAt(n.from).from, cls: 'cm-lv-hr' }); out.push({ kind: 'hide', from: n.from, to: n.to }); }
        return;
      }
      if (name === 'InlineCode') out.push({ kind: 'mark', from: n.from, to: n.to, cls: 'cm-lv-code' });
      if (shown(n.from)) return; // the cursor's line: Markdown as written
      if (name === 'HeaderMark' && /^ATXHeading/.test(parent)) {
        // Opening marks with their space; closing `##` too.
        out.push({ kind: 'hide', from: n.from, to: n.from === n.parent!.from ? withSpace(n) : n.to });
      } else if (name === 'EmphasisMark' || name === 'StrikethroughMark' || (name === 'CodeMark' && parent === 'InlineCode')) {
        out.push({ kind: 'hide', from: n.from, to: n.to });
      } else if (name === 'QuoteMark') {
        out.push({ kind: 'hide', from: n.from, to: withSpace(n) });
      } else if (name === 'Link') {
        linkDecos(n, state, out);
        return false;
      } else if (name === 'URL' && parent !== 'Link' && parent !== 'Image' && parent !== 'Autolink') {
        out.push({ kind: 'mark', from: n.from, to: n.to, cls: 'cm-lv-link', href: doc.sliceString(n.from, n.to) });
      } else if (name === 'ListMark' && parent === 'ListItem') {
        const task = n.nextSibling?.name === 'Task' ? n.nextSibling.firstChild : null;
        if (task?.name === 'TaskMarker') {
          const mark = doc.sliceString(task.from, task.to);
          out.push({ kind: 'task', from: n.from, to: withSpace(task), checked: !/^\[ \]$/.test(mark), line: lineOf(n.from) - 1 });
        } else if (n.parent?.parent?.name === 'BulletList') {
          out.push({ kind: 'bullet', from: n.from, to: n.to });
        }
      }
      return undefined;
    },
  });
  return out;
}

/** `[text](url "title")`: only the text, styled as a link that knows where it goes. */
function linkDecos(link: SyntaxNode, state: EditorState, out: LiveDeco[]): void {
  const marks: SyntaxNode[] = [];
  let url: SyntaxNode | null = null;
  for (let c = link.firstChild; c; c = c.nextSibling) {
    if (c.name === 'LinkMark') marks.push(c);
    else if (c.name === 'URL') url = c;
  }
  if (marks.length < 2) return; // a reference link or unfinished: leave as written
  const textFrom = marks[0]!.to, textTo = marks[1]!.from;
  out.push({ kind: 'hide', from: marks[0]!.from, to: marks[0]!.to });
  out.push({ kind: 'mark', from: textFrom, to: textTo, cls: 'cm-lv-link', href: url ? state.doc.sliceString(url.from, url.to).replace(/^<|>$/g, '') : '' });
  // Everything after the text: `](url "title")`.
  out.push({ kind: 'hide', from: marks[1]!.from, to: link.to });
}

/** The ```tasks blocks in the text: whole lines from the opening fence to the closing one, and the source between. */
export function findQueryBlocks(state: EditorState): { from: number; to: number; source: string; body: number }[] {
  const out: { from: number; to: number; source: string; body: number }[] = [];
  const doc = state.doc;
  for (let n = 1; n <= doc.lines; n++) {
    const open = /^ {0,3}(`{3,}|~{3,})[ \t]*tasks\b/.exec(doc.line(n).text);
    if (!open) continue;
    const fence = open[1]!;
    for (let m = n + 1; m <= doc.lines; m++) {
      const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(doc.line(m).text);
      if (!close || close[1]![0] !== fence[0] || close[1]!.length < fence.length) continue;
      const lines: string[] = [];
      for (let k = n + 1; k < m; k++) lines.push(doc.line(k).text);
      out.push({ from: doc.line(n).from, to: doc.line(m).to, source: lines.join('\n'), body: n < m - 1 ? doc.line(n + 1).from : doc.line(n).to });
      n = m;
      break;
    }
  }
  return out;
}
