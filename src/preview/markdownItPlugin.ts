import type { MarkdownIt, RendererRule, StateCore, Token } from 'markdown-it';
import { type RenderOptions, renderBadges, renderCheckbox, renderQueryResult } from '../core/render';
import { Query, type QueryResult, type QuerySource } from '../core/query';
import { type StatusRegistry, parseTaskLine, splitTaskLine } from '../core/task';

export interface PluginDeps {
  getStatusRegistry(): StatusRegistry;
  /** Run a query for a ```tasks block; `source` identifies the rendering document. */
  runQuery(text: string, source?: QuerySource): QueryResult;
  parseQuery(text: string, source?: QuerySource): Query;
  renderOptions(source?: QuerySource): RenderOptions;
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
      return `<div class="tfm-query-block"${line}>${renderQueryResult(result, query.layout, text, deps.renderOptions(source))}</div>\n`;
    } catch (err) {
      deps.log?.(`preview: tasks block failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
      return defaultFence(tokens, idx, options, env, self);
    }
  };
  md.renderer.rules.fence = fence;
}

/** Checkbox markup other task-list plugins (markdown-it-task-lists, Markdown All in One) inject. */
const FOREIGN_CHECKBOX_RE = /<input[^>]*class="[^"]*task-list-item-checkbox[^"]*"[^>]*>/i;

function decorateTaskLines(state: StateCore, deps: PluginDeps): void {
  {
    const tokens = state.tokens;
    const registry = deps.getStatusRegistry();
    const o = deps.renderOptions(deps.sourceFromEnv(state.env));
    for (let i = 0; i + 2 < tokens.length; i++) {
      const open = tokens[i]!;
      if (open.type !== 'list_item_open' || tokens[i + 1]!.type !== 'paragraph_open' || tokens[i + 2]!.type !== 'inline') continue;
      const inline = tokens[i + 2]!;
      if (!inline.children?.length) continue;
      // markdown-it-task-lists (Markdown All in One) strips "[ ] " from the content and prepends
      // its own <input>; recover the symbol from that checkbox so the line parses again.
      let line: string;
      const c0 = inline.children[0]!;
      if (c0.type === 'html_inline' && FOREIGN_CHECKBOX_RE.test(c0.content)) {
        const symbol = /\bchecked\b/i.test(c0.content) ? 'x' : ' ';
        line = `- [${symbol}] ${inline.content.trimStart()}`;
      } else {
        if (!TASK_START.test(inline.content)) continue;
        line = `- ${inline.content}`;
      }
      const task = parseTaskLine(line, { statusRegistry: registry, globalFilter: deps.globalFilter() });
      if (!task) continue;

      open.attrJoin('class', `tfm-task tfm-status-${task.isCompleted ? (task.isCancelled ? 'cancelled' : 'done') : 'open'}`);
      if (open.map) open.attrSet('data-tfm-line', String(open.map[0]));
      open.attrSet('data-symbol', task.status.symbol);

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
      box.content = renderCheckbox(task);
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
      const badges = renderBadges(task, null, o);
      if (badges) {
        const tok = new state.Token('html_inline', '', 0);
        tok.content = ' ' + badges;
        inline.children.push(tok);
      }
    }
  }
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
