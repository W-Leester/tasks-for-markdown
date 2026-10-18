import * as vscode from 'vscode';
import { type Clock, type Dayjs, describeRelative, parseNaturalDate, systemClock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import { type DateFieldName, generateTaskId, isTaskLine } from '../core/task';
import { DATAVIEW_DATE_KEY } from '../core/task/formats/dataview';
import { WRITE_EMOJI } from '../core/task/formats/emoji';
import type { Settings } from '../settings/Settings';
import { relativeText } from './relativeText';
import { t } from '../l10n';

export interface CompletionDeps {
  index: TaskIndex;
  settings: Settings;
  clock?: Clock;
  /** A task button's drop-down open on this line (M31) comes first. */
  picker?: { items(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionList | undefined };
}

/** Text just before the cursor that means "a date is expected here": `📅 `, `[due:: `, … */
const DATE_CONTEXT_RE = /(?:([➕🛫⏳⌛📅📆🗓✅❌])️?|[[(](created|start|scheduled|due|completion|cancelled)::)\s*([^\s\]).]*(?: [^\s\]).]*)*)$/u;
const KEYWORD_PREFIX_RE = /(?:^|\s)([\p{L}\p{N} ]*)$/u;
/** A task line with nothing after the checkbox yet. */
const EMPTY_TASK_RE = /^\s*(?:[-*+]|\d+[.)])\s+\[[^\]]\]\s*$/;

interface Keyword {
  match: string; // what the user types
  label: string;
  detail: string;
  emoji: string; // inserted for emoji format
  dataview: string; // inserted for dataview format
  /** Re-open the suggest widget after inserting (for date fields). */
  chain?: boolean;
  sort: string;
}

/**
 * Auto-suggest on task lines (FR-3.11 ~ FR-3.15). Two modes: keyword mode ("due", "pri",
 * "every week", "id"…) that inserts the field marker, and date mode right after a date marker
 * where presets and the typed natural-language text ("next fri", "3일 후") become dates.
 */
export class TaskCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private readonly deps: CompletionDeps) {}

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.CompletionItem[] | vscode.CompletionList {
    const picking = this.deps.picker?.items(document, position);
    if (picking) return picking;
    if (!this.deps.settings.get('autoSuggest.enabled')) return [];
    const line = document.lineAt(position.line).text;
    if (!isTaskLine(line)) return [];
    const before = line.slice(0, position.character);
    const today = (this.deps.clock ?? systemClock).now().startOf('day');

    const date = DATE_CONTEXT_RE.exec(before);
    if (date) return this.dateItems(position, date[3] ?? '', today);

    const invoked = context.triggerKind === vscode.CompletionTriggerKind.Invoke;
    // Nothing written after the checkbox yet ("- [ ] "): no automatic list. A list editor such as Markdown All in
    // One inserts "- [ ] " on Enter, and an open suggestion widget makes it give up Tab (indent) and Enter (10-18).
    // Ctrl+Space still shows the suggestions.
    if (!invoked && EMPTY_TASK_RE.test(before)) return [];
    const tail = (KEYWORD_PREFIX_RE.exec(before)?.[1] ?? '').trimStart();
    // Match the longest run of trailing words (up to 3) that looks like a keyword: "pri", "every w",
    // "on completion d"; otherwise just the last word.
    const words = tail.split(' ').filter((w) => w.length > 0);
    const keywords = this.keywords(today);
    let prefix = words.at(-1) ?? '';
    for (let n = Math.min(3, words.length); n >= 1; n--) {
      const cand = words.slice(-n).join(' ');
      if (keywords.some((k) => score(k.match, cand.toLowerCase()) > 0)) {
        prefix = cand;
        break;
      }
    }
    if (tail.endsWith(' ') || tail.length === 0) prefix = '';
    if (!invoked && prefix.length < this.deps.settings.get('autoSuggest.minMatch')) return [];
    return this.keywordItems(position, prefix, today, keywords);
  }

  /**
   * Right after a typed letter: should the list open now? Yes when the word just reached `max(1, minMatch)` letters
   * and it (with up to two words before it) starts a keyword word — `d` (due), `every w`. The editor itself never asks
   * on letters in Markdown (quick suggestions are off there, and Cursor keeps them off), so we open it. Korean or other
   * text matches no keyword and never opens it; the list popping up on every space interrupted Korean typing (#42).
   */
  shouldOpenAfterTyping(document: vscode.TextDocument, position: vscode.Position): boolean {
    if (!this.deps.settings.get('autoSuggest.enabled')) return false;
    const line = document.lineAt(position.line).text;
    if (!isTaskLine(line)) return false;
    const before = line.slice(0, position.character);
    if (DATE_CONTEXT_RE.test(before)) return false;
    const words = (KEYWORD_PREFIX_RE.exec(before)?.[1] ?? '').split(' ').filter((w) => w.length > 0);
    const last = words.at(-1) ?? '';
    if (!/^[A-Za-z]+$/.test(last) || last.length !== Math.max(1, this.deps.settings.get('autoSuggest.minMatch'))) return false;
    const keywords = this.keywords((this.deps.clock ?? systemClock).now().startOf('day'));
    for (let n = Math.min(3, words.length); n >= 1; n--) {
      const cand = words.slice(-n).join(' ').toLowerCase();
      if (keywords.some((k) => score(k.match, cand) >= 2)) return true;
    }
    return false;
  }

  // ---- keyword mode --------------------------------------------------------------------------

  private keywords(today: Dayjs): Keyword[] {
    const iso = today.format('YYYY-MM-DD');
    const date = (field: DateFieldName, match: string, label: string, sort: string): Keyword => ({
      match, label, detail: t('{0} — then pick a date', label), emoji: `${WRITE_EMOJI[field]} `, dataview: `[${DATAVIEW_DATE_KEY[field]}:: `, chain: true, sort,
    });
    const list: Keyword[] = [
      date('due', 'due', '📅 ' + t('due date'), '10'),
      date('scheduled', 'scheduled', '⏳ ' + t('scheduled date'), '11'),
      date('start', 'start', '🛫 ' + t('start date'), '12'),
      { match: 'created today', label: '➕ ' + t('created today'), detail: iso, emoji: `➕ ${iso}`, dataview: `[created:: ${iso}]`, sort: '13' },
      { match: 'priority highest', label: '🔺 ' + t('priority: highest'), detail: 'highest', emoji: '🔺', dataview: '[priority:: highest]', sort: '20' },
      { match: 'priority high', label: '⏫ ' + t('priority: high'), detail: 'high', emoji: '⏫', dataview: '[priority:: high]', sort: '21' },
      { match: 'priority medium', label: '🔼 ' + t('priority: medium'), detail: 'medium', emoji: '🔼', dataview: '[priority:: medium]', sort: '22' },
      { match: 'priority low', label: '🔽 ' + t('priority: low'), detail: 'low', emoji: '🔽', dataview: '[priority:: low]', sort: '23' },
      { match: 'priority lowest', label: '⏬ ' + t('priority: lowest'), detail: 'lowest', emoji: '⏬', dataview: '[priority:: lowest]', sort: '24' },
      { match: 'every day', label: '🔁 every day', detail: t('repeat daily'), emoji: '🔁 every day', dataview: '[repeat:: every day]', sort: '30' },
      { match: 'every weekday', label: '🔁 every weekday', detail: t('repeat Mon–Fri'), emoji: '🔁 every weekday', dataview: '[repeat:: every weekday]', sort: '31' },
      { match: 'every week', label: '🔁 every week', detail: t('repeat weekly'), emoji: '🔁 every week', dataview: '[repeat:: every week]', sort: '32' },
      { match: 'every 2 weeks', label: '🔁 every 2 weeks', detail: t('repeat every two weeks'), emoji: '🔁 every 2 weeks', dataview: '[repeat:: every 2 weeks]', sort: '33' },
      { match: 'every month', label: '🔁 every month', detail: t('repeat monthly'), emoji: '🔁 every month', dataview: '[repeat:: every month]', sort: '34' },
      { match: 'every year', label: '🔁 every year', detail: t('repeat yearly'), emoji: '🔁 every year', dataview: '[repeat:: every year]', sort: '35' },
      { match: 'every week when done', label: '🔁 every week when done', detail: t('repeat from the completion date'), emoji: '🔁 every week when done', dataview: '[repeat:: every week when done]', sort: '36' },
      { match: 'id', label: '🆔 ' + t('id (generated)'), detail: t('lets other tasks depend on this one'), emoji: '🆔 ${id}', dataview: '[id:: ${id}]', sort: '40' },
      { match: 'depends on', label: '⛔ ' + t('depends on'), detail: t('ids of tasks that must finish first'), emoji: '⛔ ', dataview: '[dependsOn:: ', sort: '41' },
      { match: 'on completion delete', label: '🏁 delete', detail: t('remove the task when done'), emoji: '🏁 delete', dataview: '[onCompletion:: delete]', sort: '50' },
      { match: 'on completion keep', label: '🏁 keep', detail: t('keep the task when done (default)'), emoji: '🏁 keep', dataview: '[onCompletion:: keep]', sort: '51' },
    ];
    return list;
  }

  private keywordItems(position: vscode.Position, prefix: string, _today: Dayjs, keywords: Keyword[]): vscode.CompletionItem[] {
    const format = this.deps.settings.get('taskFormat');
    const max = this.deps.settings.get('autoSuggest.maxItems');
    const needle = prefix.toLowerCase();
    const range = new vscode.Range(position.translate(0, -prefix.length), position);
    const scored = keywords
      .map((k) => ({ k, score: score(k.match, needle) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.k.sort.localeCompare(b.k.sort))
      .slice(0, max);
    return scored.map(({ k }) => {
      const item = new vscode.CompletionItem({ label: k.label, description: k.match }, vscode.CompletionItemKind.Event);
      item.detail = k.detail;
      item.filterText = k.match;
      item.sortText = k.sort;
      item.range = range;
      let text = format === 'dataview' ? k.dataview : k.emoji;
      if (text.includes('${id}')) text = text.replace('${id}', generateTaskId((id) => this.deps.index.byId(id).length > 0));
      item.insertText = text;
      if (k.chain) item.command = { command: 'editor.action.triggerSuggest', title: 'suggest' };
      return item;
    });
  }

  // ---- date mode ------------------------------------------------------------------------------

  private dateItems(position: vscode.Position, typed: string, today: Dayjs): vscode.CompletionItem[] {
    const dv = /[[(](?:created|start|scheduled|due|completion|cancelled)::\s*[^\]]*$/u.test(
      vscode.window.activeTextEditor?.document.lineAt(position.line).text.slice(0, position.character) ?? '',
    );
    const close = dv ? ']' : '';
    const range = new vscode.Range(position.translate(0, -typed.length), position);
    const fmt = (d: Dayjs) => `${d.format('YYYY-MM-DD')} (${d.format('ddd')}) · ${relativeText(describeRelative(d, today))}`;
    const monday = today.add((8 - today.day()) % 7 || 7, 'day');
    const friday = today.add((5 - today.day() + 7) % 7 || 7, 'day');
    const presets: [string, Dayjs][] = [
      [t('today'), today],
      [t('tomorrow'), today.add(1, 'day')],
      [t('friday'), friday],
      [t('next monday'), monday],
      [t('in 1 week'), today.add(7, 'day')],
      [t('in 2 weeks'), today.add(14, 'day')],
      [t('next month'), today.add(1, 'month')],
    ];
    const items: vscode.CompletionItem[] = [];
    const parsed = typed.trim() ? parseNaturalDate(typed, today) : null;
    if (parsed) {
      const item = new vscode.CompletionItem({ label: `→ ${parsed.format('YYYY-MM-DD')}`, description: typed.trim() }, vscode.CompletionItemKind.Value);
      item.detail = fmt(parsed);
      item.insertText = parsed.format('YYYY-MM-DD') + close;
      item.filterText = typed;
      item.range = range;
      item.sortText = '0';
      item.preselect = true;
      items.push(item);
    }
    presets.forEach(([label, d], i) => {
      const item = new vscode.CompletionItem({ label, description: d.format('YYYY-MM-DD') }, vscode.CompletionItemKind.Value);
      item.detail = fmt(d);
      item.insertText = d.format('YYYY-MM-DD') + close;
      // Match the preset both by its label and by the typed text so the list narrows naturally.
      item.filterText = typed.trim() ? `${typed} ${label}` : label;
      item.range = range;
      item.sortText = `1${i}`;
      items.push(item);
    });
    return items;
  }
}

/** 0 = no match; higher is better. Prefix of the whole phrase beats prefix of a later word. */
function score(candidate: string, needle: string): number {
  if (!needle) return 1;
  if (candidate.startsWith(needle)) return 3;
  if (candidate.split(' ').some((w) => w.startsWith(needle))) return 2;
  if (candidate.includes(needle)) return 1;
  return 0;
}

/** Open the list when a typed letter starts a keyword (see `shouldOpenAfterTyping`). */
export function openSuggestionsWhileTyping(provider: TaskCompletionProvider): vscode.Disposable {
  return vscode.workspace.onDidChangeTextDocument((e) => {
    if (e.document.languageId !== 'markdown' || e.document !== vscode.window.activeTextEditor?.document) return;
    if (e.contentChanges.length !== 1) return;
    const c = e.contentChanges[0]!;
    if (c.rangeLength !== 0 || !/^[A-Za-z]$/.test(c.text)) return;
    if (provider.shouldOpenAfterTyping(e.document, c.range.start.translate(0, 1))) void vscode.commands.executeCommand('editor.action.triggerSuggest');
  });
}
