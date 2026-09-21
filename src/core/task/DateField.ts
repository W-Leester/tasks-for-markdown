import { dayjs, ISO_DATE, type Dayjs } from '../dates/dayjs';

/**
 * A date written on a task line. The raw text is always kept so an invalid value
 * (e.g. `2026-13-40`) survives a round trip and can be reported as a diagnostic.
 */
export class DateField {
  readonly raw: string;
  readonly date: Dayjs | null;

  private constructor(raw: string, date: Dayjs | null) {
    this.raw = raw;
    this.date = date;
  }

  get valid(): boolean {
    return this.date !== null;
  }

  /** Strict `YYYY-MM-DD` parse; anything else yields an invalid field that still remembers `raw`. */
  static parse(raw: string): DateField {
    const trimmed = raw.trim();
    const d = dayjs(trimmed, ISO_DATE, true);
    return new DateField(trimmed, d.isValid() ? d.startOf('day') : null);
  }

  static fromDate(date: Dayjs): DateField {
    const d = date.startOf('day');
    return new DateField(d.format(ISO_DATE), d);
  }

  /** Text to write back to the file. */
  format(): string {
    return this.date ? this.date.format(ISO_DATE) : this.raw;
  }

  isSame(other: DateField | null | undefined): boolean {
    if (!other) return false;
    if (this.date && other.date) return this.date.isSame(other.date, 'day');
    return this.raw === other.raw;
  }
}
