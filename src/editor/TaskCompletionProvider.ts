import * as vscode from 'vscode';
import { type Clock, type Dayjs, describeRelative, parseNaturalDate, systemClock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import { type DateFieldName, generateTaskId, isTaskLine } from '../core/task';
import { DATAVIEW_DATE_KEY } from '../core/task/formats/dataview';
import { WRITE_EMOJI } from '../core/task/formats/emoji';
import type { Settings } from '../settings/Settings';
import { relativeText } from './relativeText';

export interface CompletionDeps {
  index: TaskIndex;
  settings: Settings;
  clock?: Clock;
}

/** Text just before the cursor that means "a date is expected here": `📅 `, `[due:: `, … */
const DATE_CONTEXT_RE = /(?:([➕🛫⏳⌛📅📆🗓✅❌])️?|[[(](created|start|scheduled|due|completion|cancelled)::)\s*([^\s\]).]*(?: [^\s\]).]*)*)$/u;
const KEYWORD_PREFIX_RE = /(?:^|\s)([\p{L}\p{N} ]*)$/u;

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

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.CompletionItem[] {
    if (!this.deps.settings.get('autoSuggest.enabled')) return [];
    const line = document.lineAt(position.line).text;
    if (!isTaskLine(line)) return [];
    const before = line.slice(0, position.character);
    const today = (this.deps.clock ?? systemClock).now().startOf('day');

    const date = DATE_CONTEXT_RE.exec(before);
    if (date) return this.dateItems(position, date[3] ?? '', today);

    const invoked = context.triggerKind === vscode.CompletionTriggerKind.Invoke;
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

  // ---- keyword mode --------------------------------------------------------------------------

  private keywords(today: Dayjs): Keyword[] {
    const iso = today.format('YYYY-MM-DD');
    const date = (field: DateFieldName, match: string, label: string, sort: string): Keyword => ({
      match, label, detail: vscode.l10n.t('{0} — then pick a date', label), emoji: `${WRITE_EMOJI[field]} `, dataview: `[${DATAVIEW_DATE_KEY[field]}:: `, chain: true, sort,
    });
    const list: Keyword[] = [
      date('due', 'due', '📅 ' + vscode.l10n.t('due date'), '10'),
      date('scheduled', 'scheduled', '⏳ ' + vscode.l10n.t('scheduled date'), '11'),
      date('start', 'start', '🛫 ' + vscode.l10n.t('start date'), '12'),
      { match: 'created today', label: '➕ ' + vscode.l10n.t('created today'), detail: iso, emoji: `➕ ${iso}`, dataview: `[created:: ${iso}]`, sort: '13' },
      { match: 'priority highest', label: '🔺 ' + vscode.l10n.t('priority: highest'), detail: 'highest', emoji: '🔺', dataview: '[priority:: highest]', sort: '20' },
      { match: 'priority high', label: '⏫ ' + vscode.l10n.t('priority: high'), detail: 'high', emoji: '⏫', dataview: '[priority:: high]', sort: '21' },
      { match: 'priority medium', label: '🔼 ' + vscode.l10n.t('priority: medium'), detail: 'medium', emoji: '🔼', dataview: '[priority:: medium]', sort: '22' },
      { match: 'priority low', label: '🔽 ' + vscode.l10n.t('priority: low'), detail: 'low', emoji: '🔽', dataview: '[priority:: low]', sort: '23' },
      { match: 'priority lowest', label: '⏬ ' + vscode.l10n.t('priority: lowest'), detail: 'lowest', emoji: '⏬', dataview: '[priority:: lowest]', sort: '24' },
      { match: 'every day', label: '🔁 every day', detail: vscode.l10n.t('repeat daily'), emoji: '🔁 every day', dataview: '[repeat:: every day]', sort: '30' },
      { match: 'every weekday', label: '🔁 every weekday', detail: vscode.l10n.t('repeat Mon–Fri'), emoji: '🔁 every weekday', dataview: '[repeat:: every weekday]', sort: '31' },
      { match: 'every week', label: '🔁 every week', detail: vscode.l10n.t('repeat weekly'), emoji: '🔁 every week', dataview: '[repeat:: every week]', sort: '32' },
      { match: 'every 2 weeks', label: '🔁 every 2 weeks', detail: vscode.l10n.t('repeat every two weeks'), emoji: '🔁 every 2 weeks', dataview: '[repeat:: every 2 weeks]', sort: '33' },
      { match: 'every month', label: '🔁 every month', detail: vscode.l10n.t('repeat monthly'), emoji: '🔁 every month', dataview: '[repeat:: every month]', sort: '34' },
      { match: 'every year', label: '🔁 every year', detail: vscode.l10n.t('repeat yearly'), emoji: '🔁 every year', dataview: '[repeat:: every year]', sort: '35' },
      { match: 'every week when done', label: '🔁 every week when done', detail: vscode.l10n.t('repeat from the completion date'), emoji: '🔁 every week when done', dataview: '[repeat:: every week when done]', sort: '36' },
      { match: 'id', label: '🆔 ' + vscode.l10n.t('id (generated)'), detail: vscode.l10n.t('lets other tasks depend on this one'), emoji: '🆔 ${id}', dataview: '[id:: ${id}]', sort: '40' },
      { match: 'depends on', label: '⛔ ' + vscode.l10n.t('depends on'), detail: vscode.l10n.t('ids of tasks that must finish first'), emoji: '⛔ ', dataview: '[dependsOn:: ', sort: '41' },
      { match: 'on completion delete', label: '🏁 delete', detail: vscode.l10n.t('remove the task when done'), emoji: '🏁 delete', dataview: '[onCompletion:: delete]', sort: '50' },
      { match: 'on completion keep', label: '🏁 keep', detail: vscode.l10n.t('keep the task when done (default)'), emoji: '🏁 keep', dataview: '[onCompletion:: keep]', sort: '51' },
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
      [vscode.l10n.t('today'), today],
      [vscode.l10n.t('tomorrow'), today.add(1, 'day')],
      [vscode.l10n.t('friday'), friday],
      [vscode.l10n.t('next monday'), monday],
      [vscode.l10n.t('in 1 week'), today.add(7, 'day')],
      [vscode.l10n.t('in 2 weeks'), today.add(14, 'day')],
      [vscode.l10n.t('next month'), today.add(1, 'month')],
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
