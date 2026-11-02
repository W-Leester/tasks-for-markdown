import type { MarkdownIt, RendererRule, StateCore, Token } from 'markdown-it';
import { type RenderOptions, renderBadges, renderCheckbox, renderColumns, renderQueryResult, stripTags } from '../core/render';
import { Query, type QueryResult, type QuerySource } from '../core/query';
import { type StatusRegistry, type Task, hasTaskFields, parseTaskLine, splitTaskLine, urgency } from '../core/task';

export interface PluginDeps {
  getStatusRegistry(): StatusRegistry;
  /** Run a query for a ```tasks block; `source` identifies the rendering document. */
  runQuery(text: string, source?: QuerySource): QueryResult;
  parseQuery(text: string, source?: QuerySource): Query;
  /** `context` lets hosts style task lines and query-result rows differently. */
  renderOptions(source?: QuerySource, context?: 'line' | 'query'): RenderOptions;
  /** Map markdown-it's env to a query source (VS Code passes env.currentDocument). */
  sourceFromEnv(env: unknown): QuerySource | undefined;
  globalFilter(): string | undefined;
  enabled(): boolean;
  /** Errors are swallowed so the preview never goes blank; they are reported here. */
  log?(message: string): void;
}

const TASK_START = /^\[(.)\](?:\s|$)/u;

/**
 * markdown-it plugin for the built-in preview (FR-4.2, FR-4.4): checklist items become
 * `.tfm-task` list items with a (display-only) checkbox and metadata badges; ```tasks fences are
 * replaced with rendered query results. Everything happens at render time in the extension host.
 */
export function tasksMarkdownItPlugin(md: MarkdownIt, deps: PluginDeps): void {
  md.core.ruler.push('tfm_tasks', (state: StateCore) => {
    if (!deps.enabled()) return;
    try {
      decorateTaskLines(state, deps);
    } catch (err) {
      deps.log?.(`preview: task decoration failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    }
  });

  const defaultFence = md.renderer.rules.fence!;
  const fence: RendererRule = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!;
    if (!deps.enabled() || token.info.trim().split(/\s+/)[0] !== 'tasks') return defaultFence(tokens, idx, options, env, self);
    try {
      const source = deps.sourceFromEnv(env);
      const text = token.content;
      const query = deps.parseQuery(text, source);
      const result = deps.runQuery(text, source);
      const line = token.map ? ` data-line="${token.map[0]}"` : '';
      return `<div class="tfm-query-block"${line}>${renderQueryResult(result, query.layout, text, deps.renderOptions(source, 'query'))}</div>\n`;
    } catch (err) {
      deps.log?.(`preview: tasks block failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
      return defaultFence(tokens, idx, options, env, self);
    }
  };
  md.renderer.rules.fence = fence;
}

/** Checkbox markup other task-list plugins (markdown-it-task-lists, Markdown All in One) inject. */
const FOREIGN_CHECKBOX_RE = /<input[^>]*class="[^"]*task-list-item-checkbox[^"]*"[^>]*>/i;

/** The task on a list item that starts at `i`, and its line as written. */
function taskAt(tokens: Token[], i: number, registry: StatusRegistry, globalFilter: string | undefined): { task: Task; line: string } | null {
  const open = tokens[i]!;
  if (open.type !== 'list_item_open' || tokens[i + 1]!.type !== 'paragraph_open' || tokens[i + 2]!.type !== 'inline') return null;
  const inline = tokens[i + 2]!;
  if (!inline.children?.length) return null;
  // markdown-it-task-lists (Markdown All in One) strips "[ ] " from the content and prepends
  // its own <input>; recover the symbol from that checkbox so the line parses again.
  let line: string;
  const c0 = inline.children[0]!;
  if (c0.type === 'html_inline' && FOREIGN_CHECKBOX_RE.test(c0.content)) {
    const symbol = /\bchecked\b/i.test(c0.content) ? 'x' : ' ';
    line = `- [${symbol}] ${inline.content.trimStart()}`;
  } else {
    if (!TASK_START.test(inline.content)) return null;
    line = `- ${inline.content}`;
  }
  const task = parseTaskLine(line, { statusRegistry: registry, globalFilter });
  return task ? { task, line } : null;
}

function decorateTaskLines(state: StateCore, deps: PluginDeps): void {
  {
    const tokens = state.tokens;
    const registry = deps.getStatusRegistry();
    const o = deps.renderOptions(deps.sourceFromEnv(state.env), 'line');
    const found: { i: number; task: Task; line: string; group: number }[] = [];
    const fielded = new Set<number>();
    let depth = 0, group = -1;
    for (let i = 0; i + 2 < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') { if (depth++ === 0) group++; continue; }
      if (t.type === 'bullet_list_close' || t.type === 'ordered_list_close') { depth--; continue; }
      const hit = taskAt(tokens, i, registry, deps.globalFilter());
      if (!hit) continue;
      found.push({ i, ...hit, group });
      if (hasTaskFields(hit.task)) fielded.add(group);
    }
    for (const { i, task, line, group: g } of found) {
      const open = tokens[i]!;
      const inline = tokens[i + 2]! as Token & { children: Token[] }; // taskAt saw children
      // A plain checklist (no task in its list has a Tasks field, 11-02): a checkbox, no columns.
      const columns = !!o.columns && fielded.has(g);
      open.attrJoin('class', `tfm-task tfm-status-${task.isCompleted ? (task.isCancelled ? 'cancelled' : 'done') : 'open'}`);
      if (open.map) open.attrSet('data-tfm-line', String(open.map[0]));
      open.attrSet('data-symbol', task.status.symbol);
      // Sort/scope data for the rendered view (cheap; ignored by the built-in preview).
      if (task.due?.valid) open.attrSet('data-tfm-due', task.due.format());
      if (task.created?.valid) open.attrSet('data-tfm-created', task.created.format());
      const happens = task.happens();
      if (happens?.valid) open.attrSet('data-tfm-happens', happens.format());
      open.attrSet('data-tfm-priority', task.priority);
      open.attrSet('data-tfm-urgency', String(Math.round(urgency(task, o.today) * 100) / 100));
      if (task.isCompleted) open.attrSet('data-tfm-done', '1');

      // 1. Replace the leading "[x] " in the first text child with a checkbox. If another
      //    task-list plugin already turned it into an <input>, drop that and use ours.
      if (inline.children[0]!.type === 'html_inline' && FOREIGN_CHECKBOX_RE.test(inline.children[0]!.content)) {
        inline.children.shift();
        const after = inline.children[0];
        if (after?.type === 'text') after.content = after.content.replace(/^\s+/, '');
      }
      const first = inline.children[0];
      if (first?.type === 'text' && TASK_START.test(first.content)) first.content = first.content.replace(TASK_START, '');
      if (!inline.children.length) inline.children.push(Object.assign(new state.Token('text', '', 0), { content: '' }));
      const box = new state.Token('html_inline', '', 0);
      box.content = renderCheckbox(task) + '<span class="tfm-desc">';
      inline.children.unshift(box);

      // 2. Trim the metadata suffix from trailing text children and append badges.
      const parts = splitTaskLine(line)!;
      const descEnd = descriptionEnd(parts.body, task.description);
      if (descEnd !== null) {
        // The children no longer contain the "[x] " prefix, so measure against the body only.
        let toRemove = parts.body.length - descEnd;
        for (let c = inline.children.length - 1; c >= 0 && toRemove > 0; c--) {
          const child = inline.children[c]!;
          if (child.type !== 'text' && child.type !== 'softbreak') break;
          const take = Math.min(toRemove, child.content.length);
          child.content = child.content.slice(0, child.content.length - take);
          toRemove -= take;
          if (child.content.length === 0 && c > 0) inline.children.splice(c, 1);
        }
        const last = inline.children[inline.children.length - 1];
        if (last?.type === 'text') last.content = last.content.replace(/\s+$/, '');
      }
      const tok = new state.Token('html_inline', '', 0);
      if (o.columns && !columns) open.attrJoin('class', 'tfm-plain');
      if (columns) {
        // Column layout (rendered view, M12): tags move to their own column, so drop them from the text.
        for (const child of inline.children) if (child.type === 'text') child.content = stripTags(child.content);
        const last = inline.children[inline.children.length - 1];
        if (last?.type === 'text') last.content = last.content.replace(/\s+$/, '');
        const c = renderColumns(task, null, o);
        tok.content = c.afterDescription + '</span>' + c.cells;
      } else {
        const badges = renderBadges(task, null, o);
        tok.content = '</span>' + (badges ? ' ' + badges : '');
      }
      inline.children.push(tok);
    }
    markNotes(tokens);
  }
}

/** Notes (M13): direct child list items of a task that are not tasks themselves get `tfm-note`. */
function markNotes(tokens: Token[]): void {
  const stack: Token[] = [];
  const count = new Map<Token, number>();
  tokens.forEach((tok, i) => {
    if (tok.type === 'list_item_open') {
      const parent = stack[stack.length - 1];
      const isTask = /\btfm-task\b/u.test(String(tok.attrGet('class') ?? ''));
      if (parent && !isTask && /\btfm-task\b/u.test(String(parent.attrGet('class') ?? ''))) {
        tok.attrJoin('class', 'tfm-note');
        // Its place among the task's notes and its text as written, so the rendered view can edit or delete it (11-01).
        const n = count.get(parent) ?? 0;
        count.set(parent, n + 1);
        tok.attrSet('data-tfm-note', String(n));
        const inline = tokens.slice(i + 1, i + 4).find((t) => t.type === 'inline');
        if (inline) tok.attrSet('data-tfm-note-text', inline.content.split('\n')[0]!);
      }
      stack.push(tok);
    } else if (tok.type === 'list_item_close') stack.pop();
  });
}

/** Offset in `body` where the metadata starts (after the description), or null when there is none. */
function descriptionEnd(body: string, description: string): number | null {
  if (description && body.startsWith(description)) {
    const rest = body.slice(description.length);
    return rest.trim().length === 0 ? null : description.length;
  }
  const m = /[➕🛫⏳⌛📅📆🗓✅❌🔁🏁🆔⛔🔺⏫🔼🔽⏬]|[[(](?:created|start|scheduled|due|completion|cancelled|priority|repeat|onCompletion|id|dependsOn)::/u.exec(body);
  return m ? m.index : null;
}

export type { Token };
