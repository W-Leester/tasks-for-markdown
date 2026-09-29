import { type StatusRegistry, Task, isTaskLine, parseTaskLine, type TaskLocation, type TaskNote } from '../task';

export interface FileParseOptions {
  /** Index key; defaults to `path`. */
  key?: string;
  path: string;
  statusRegistry: StatusRegistry;
  globalFilter?: string;
}

export interface Heading {
  line: number;
  level: number;
  text: string;
}

export interface FileParseResult {
  tasks: Task[];
  headings: Heading[];
  frontmatterTags: string[];
}

const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/u;
const FENCE_RE = /^\s*(`{3,}|~{3,})/u;
export const LIST_ITEM_RE = /^([ \t]*)([-*+]|\d+[.)])[ \t]+/u;
const TAB_WIDTH = 4;

export function indentWidth(ws: string): number {
  let w = 0;
  for (const ch of ws) w += ch === '\t' ? TAB_WIDTH - (w % TAB_WIDTH) : 1;
  return w;
}

/** `tags: [a, b]`, `tags: a, b`, `tags:\n  - a`, and the singular `tag:` form. */
function parseFrontmatterTags(lines: readonly string[]): string[] {
  const tags: string[] = [];
  const add = (raw: string) => {
    const t = raw.trim().replace(/^["']|["']$/g, '');
    if (!t) return;
    const tag = t.startsWith('#') ? t : '#' + t;
    if (!tags.includes(tag)) tags.push(tag);
  };
  for (let i = 0; i < lines.length; i++) {
    const m = /^(tags?)\s*:\s*(.*)$/iu.exec(lines[i]!);
    if (!m) continue;
    const rest = m[2]!.trim();
    if (rest.startsWith('[')) {
      rest.replace(/^\[|\]$/g, '').split(',').forEach(add);
    } else if (rest.length > 0) {
      rest.split(/[,\s]+/).forEach(add);
    } else {
      for (let j = i + 1; j < lines.length; j++) {
        const item = /^\s*-\s*(.+)$/u.exec(lines[j]!);
        if (!item) break;
        add(item[1]!);
      }
    }
  }
  return tags;
}

/**
 * Parse a whole markdown document. Lines inside front matter, fenced code blocks and HTML
 * comments are never tasks. Each task records its nearest preceding heading and its nesting
 * (depth + parent list item) so queries can group by heading and hide sub-items.
 */
export function parseFile(text: string, options: FileParseOptions): FileParseResult {
  const lines = text.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const tasks: Task[] = [];
  const headings: Heading[] = [];
  let frontmatterTags: string[] = [];

  let start = 0;
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, i) => i > 0 && (l.trim() === '---' || l.trim() === '...'));
    if (end > 0) {
      frontmatterTags = parseFrontmatterTags(lines.slice(1, end));
      start = end + 1;
    }
  }

  let fence: { char: string; length: number } | null = null;
  let inComment = false;
  let heading: string | null = null;
  // Stack of open list items: [indent width, line number].
  const stack: { indent: number; line: number }[] = [];
  // Notes collected per task line (direct non-checkbox children).
  const notesByLine = new Map<number, TaskNote[]>();

  for (let i = start; i < lines.length; i++) {
    const line = lines[i]!;

    if (fence) {
      const m = FENCE_RE.exec(line);
      if (m && m[1]![0] === fence.char && m[1]!.length >= fence.length && line.trim() === m[1]) fence = null;
      continue;
    }
    if (inComment) {
      if (line.includes('-->')) inComment = false;
      continue;
    }
    const fm = FENCE_RE.exec(line);
    if (fm) {
      fence = { char: fm[1]![0]!, length: fm[1]!.length };
      continue;
    }
    const open = line.indexOf('<!--');
    if (open !== -1 && line.indexOf('-->', open) === -1) {
      inComment = true;
      continue;
    }

    const hm = HEADING_RE.exec(line);
    if (hm) {
      heading = hm[2]!;
      headings.push({ line: i, level: hm[1]!.length, text: heading });
      stack.length = 0;
      continue;
    }

    const lm = LIST_ITEM_RE.exec(line);
    if (!lm) {
      // A non-indented, non-blank, non-list line ends the current list.
      if (line.trim().length > 0 && !/^\s/u.test(line)) stack.length = 0;
      continue;
    }

    const indent = indentWidth(lm[1]!);
    while (stack.length && stack[stack.length - 1]!.indent >= indent) stack.pop();
    const parentLine = stack.length ? stack[stack.length - 1]!.line : null;
    const depth = stack.length;
    stack.push({ indent, line: i });

    if (!isTaskLine(line)) {
      const notes = parentLine === null ? undefined : notesByLine.get(parentLine);
      const text = line.slice(lm[0].length).trim();
      if (notes && text) notes.push({ line: i, text });
      continue;
    }
    const notes: TaskNote[] = [];
    const location: TaskLocation = { key: options.key ?? options.path, path: options.path, line: i, heading, frontmatterTags, depth, parentLine, notes };
    const task = parseTaskLine(line, { statusRegistry: options.statusRegistry, globalFilter: options.globalFilter, location });
    if (task) {
      tasks.push(task);
      notesByLine.set(i, notes);
    }
  }

  return { tasks, headings, frontmatterTags };
}
