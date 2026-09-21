/**
 * Ported from Obsidian Tasks `src/Task/Recurrence.ts` and `src/Task/Occurrence.ts`
 * (MIT, Copyright (c) 2021 Martin Schenck and Clare Macrae), rewritten on dayjs.
 */
import { RRule, type Options } from 'rrule';
import { dayjs, type Dayjs } from '../dates/dayjs';

/** The dates of one instance of a recurring task. */
export interface Occurrence {
  start: Dayjs | null;
  scheduled: Dayjs | null;
  due: Dayjs | null;
}

export interface RecurrenceOptions {
  /** "Today" for `when done` rules and for tasks without any date. */
  today: Dayjs;
  /** Setting: drop the scheduled date on the new instance (when start or due exist). */
  removeScheduledDateOnRecurrence?: boolean;
}

/** rrule works in UTC only; feed it UTC midnight of the calendar day and read the day back. */
function toUtc(d: Dayjs, endOfDay = false): Date {
  return endOfDay ? new Date(Date.UTC(d.year(), d.month(), d.date(), 23, 59, 59, 999)) : new Date(Date.UTC(d.year(), d.month(), d.date()));
}
function fromUtc(date: Date): Dayjs {
  return dayjs(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).startOf('day');
}

export class Recurrence {
  private constructor(
    private readonly rrule: RRule,
    readonly baseOnToday: boolean,
    readonly occurrence: Occurrence,
    private readonly opts: RecurrenceOptions,
  ) {}

  /**
   * Parse `every …[ when done]`. Returns null for text rrule cannot understand (the user may
   * still be typing).
   */
  static fromText(text: string, occurrence: Occurrence, opts: RecurrenceOptions): Recurrence | null {
    const match = /^([a-zA-Z0-9, !]+?)( when done)?$/i.exec(text.trim());
    if (!match) return null;
    const ruleText = match[1]!.trim();
    const baseOnToday = match[2] !== undefined;
    let options: Partial<Options> | null;
    try {
      options = RRule.parseText(ruleText);
    } catch {
      return null;
    }
    if (!options || options.freq === undefined) return null;
    const reference = referenceDate(occurrence, opts);
    options.dtstart = toUtc(!baseOnToday && reference ? reference : opts.today);
    let rrule: RRule;
    try {
      rrule = new RRule(options);
      if (/RRule error/i.test(rrule.toText())) return null;
    } catch {
      return null;
    }
    // rrule silently drops words it does not understand ("every week on funday" -> "every week").
    // Require every input word to be (a prefix of) a word in the canonical text.
    const canonical = rrule.toText().toLowerCase().split(/[\s,]+/).filter(Boolean);
    const words = ruleText.toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (!words.every((w) => canonical.some((c) => c.startsWith(w)))) return null;
    return new Recurrence(rrule, baseOnToday, occurrence, opts);
  }

  /** Canonical rule text, e.g. `every week on Monday when done`. */
  toText(): string {
    return this.rrule.toText() + (this.baseOnToday ? ' when done' : '');
  }

  /** Dates of the next instance, or an all-null occurrence when the task has no dates. */
  next(today: Dayjs = this.opts.today): Occurrence {
    const reference = referenceDate(this.occurrence, this.opts);
    if (!reference) return { start: null, scheduled: null, due: null };
    const nextRef = this.baseOnToday ? this.nextFromToday(today) : this.nextAfter(reference, this.rrule);
    return shiftOccurrence(this.occurrence, reference, nextRef, this.opts);
  }

  private nextFromToday(today: Dayjs): Dayjs {
    const rule = new RRule({ ...this.rrule.origOptions, dtstart: toUtc(today) });
    return this.nextAfter(today, rule);
  }

  /**
   * Next occurrence strictly after `after`. Monthly and yearly rules get the Obsidian fix for
   * short months: `every month` from Jan 31 lands on Feb 28, not Mar 31 (rrule would skip
   * February because it has no 31st). We step `after` back a day at a time until the gap is the
   * expected number of months / years.
   */
  private nextAfter(after: Dayjs, rrule: RRule): Dayjs {
    let cursor = after;
    let next = rrule.after(toUtc(cursor, true));
    if (!next) return after; // rule exhausted (e.g. count/until) — keep the date
    const text = this.rrule.toText();
    const month = /every( \d+)? month(s)?(.*)?/.exec(text);
    const year = /every( \d+)? year(s)?(.*)?/.exec(text);
    const step = (tooFar: (n: Date) => boolean) => {
      while (tooFar(next!)) {
        cursor = cursor.subtract(1, 'day');
        const rule = new RRule({ ...rrule.origOptions, dtstart: toUtc(cursor) });
        const n = rule.after(toUtc(cursor, true));
        if (!n) break;
        next = n;
      }
    };
    if (month && !text.includes(' on ')) {
      const skip = month[1] ? Number.parseInt(month[1].trim(), 10) : 1;
      step((n) => monthsBetween(toUtc(cursor, true), n) > skip);
    }
    if (year) {
      const skip = year[1] ? Number.parseInt(year[1].trim(), 10) : 1;
      step((n) => n.getUTCFullYear() - toUtc(cursor, true).getUTCFullYear() > skip);
    }
    return fromUtc(next);
  }
}

function monthsBetween(after: Date, next: Date): number {
  return next.getUTCMonth() - after.getUTCMonth() + (next.getUTCFullYear() - after.getUTCFullYear()) * 12;
}

/** Due → scheduled → start (or due → start → scheduled when the scheduled date will be dropped). */
export function referenceDate(o: Occurrence, opts: Pick<RecurrenceOptions, 'removeScheduledDateOnRecurrence'>): Dayjs | null {
  const order = opts.removeScheduledDateOnRecurrence ? [o.due, o.start, o.scheduled] : [o.due, o.scheduled, o.start];
  return order.find((d): d is Dayjs => d !== null) ?? null;
}

/** Move every date by the same number of days the reference date moved. */
function shiftOccurrence(o: Occurrence, reference: Dayjs, nextReference: Dayjs, opts: RecurrenceOptions): Occurrence {
  const shift = (d: Dayjs | null): Dayjs | null => {
    if (!d) return null;
    const offsetDays = Math.round(d.startOf('day').diff(reference.startOf('day'), 'day', true));
    return nextReference.add(offsetDays, 'day');
  };
  const canDropScheduled = o.start !== null || o.due !== null;
  const dropScheduled = !!opts.removeScheduledDateOnRecurrence && canDropScheduled;
  return { start: shift(o.start), scheduled: dropScheduled ? null : shift(o.scheduled), due: shift(o.due) };
}

/** True when rrule understands the text (used by diagnostics and the edit UI). */
export function isValidRecurrenceText(text: string): boolean {
  return Recurrence.fromText(text, { start: null, scheduled: null, due: null }, { today: dayjs() }) !== null;
}
