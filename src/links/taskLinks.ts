/**
 * Task links (M23, design.md 7.17): `<scheme>://hastycapybara.tasks-for-markdown/open?path=…&line=…`
 * and `/query?text=…`. Pure functions — no vscode import — so they are unit-tested directly.
 *
 * `path` is the same workspace-relative path the public API uses (multi-root: prefixed with the
 * folder name). `line` in a link is 1-based, like an editor's line numbers; the API is 0-based.
 */

/** URI authority: the extension id, lower-cased as VS Code passes it to the handler. */
export const LINK_AUTHORITY = 'hastycapybara.tasks-for-markdown';

export type ParsedLink =
  | { kind: 'open'; path: string; line: number } // line: 0-based
  | { kind: 'query'; text: string }
  | { kind: 'guide' } // the Get Started walkthrough (README link)
  | { kind: 'error'; code: LinkError; value?: string };

/** Why a link was refused; the VS Code layer turns it into a translated message. */
export type LinkError = 'noPath' | 'absolutePath' | 'parentPath' | 'badLine' | 'noQuery' | 'functionQuery' | 'unknownAction';

/**
 * Values are percent-encoded twice: VS Code decodes `uri.query` once before the handler sees it,
 * and URLSearchParams decodes the second layer. With a single layer an encoded `&` or `=` inside
 * a query would come back as a separator. (Hand-written single-encoded links still work as long
 * as the values have no `&`, `=` or `+`.)
 */
const enc = (v: string) => encodeURIComponent(encodeURIComponent(v));

/** A link that opens `path` at the 0-based `line` in the editor whose URI scheme is `scheme`. */
export function taskLink(scheme: string, path: string, line: number): string {
  return `${scheme}://${LINK_AUTHORITY}/open?path=${enc(path.replace(/\\/g, '/'))}&line=${line + 1}`;
}

/** A link that shows the results of `query` (newlines kept as %0A). */
export function queryLink(scheme: string, query: string): string {
  return `${scheme}://${LINK_AUTHORITY}/query?text=${enc(query.replace(/\r\n/g, '\n').trim())}`;
}

/** JavaScript in queries (`filter|sort|group by function`) is never run from a link. */
const FUNCTION_LINE = /^\s*(filter|sort|group)\s+by\s+function\b/im;

/**
 * Parse the path and query string of a link as VS Code hands them to the URI handler (`uri.path`,
 * and `uri.query` already decoded once). Anything unexpected becomes `{ kind: 'error', code }`.
 */
export function parseTaskLink(path: string, query: string): ParsedLink {
  const params = new URLSearchParams(query);
  const action = path.replace(/^\/+|\/+$/g, '');
  if (action === 'open') {
    const p = (params.get('path') ?? '').replace(/\\/g, '/').trim();
    if (!p) return { kind: 'error', code: 'noPath' };
    if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return { kind: 'error', code: 'absolutePath', value: p };
    if (p.split('/').some((part) => part === '..')) return { kind: 'error', code: 'parentPath', value: p };
    const lineText = params.get('line') ?? '1';
    if (!/^[1-9]\d*$/.test(lineText)) return { kind: 'error', code: 'badLine', value: lineText };
    return { kind: 'open', path: p.split('/').filter(Boolean).join('/'), line: Number(lineText) - 1 };
  }
  if (action === 'query') {
    const text = (params.get('text') ?? '').trim();
    if (!text) return { kind: 'error', code: 'noQuery' };
    if (FUNCTION_LINE.test(text)) return { kind: 'error', code: 'functionQuery' };
    return { kind: 'query', text };
  }
  if (action === 'guide') return { kind: 'guide' };
  return { kind: 'error', code: 'unknownAction', value: action };
}
