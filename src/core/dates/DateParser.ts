import { dayjs, type Dayjs } from './dayjs';

/**
 * Small, deterministic natural-language date parser (no chrono dependency). Understands the
 * phrases the auto-suggest and edit modal offer, in English and Korean:
 *   2026-09-25 · 2026/9/25 · today · tomorrow · yesterday · monday · next friday · last tue ·
 *   in 3 days · 3 days · 2 weeks · in 1 month · 3 days ago · next week/month/year · last week ·
 *   6 oct · oct 6 · october 6th 2027 · 오늘 · 내일 · 모레 · 어제 · 3일 후 · 2주 뒤 · 다음주 · 월요일 · 다음 금요일
 * Returns null when the text is not understood. All results are at start of day.
 */
export function parseNaturalDate(input: string, today: Dayjs): Dayjs | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!text) return null;
  const base = today.startOf('day');

  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (iso) return validDate(+iso[1]!, +iso[2]!, +iso[3]!);

  const fixed = FIXED[text];
  if (fixed !== undefined) return base.add(fixed, 'day');

  // next/last week|month|year — 다음주/다음달/내년, 지난주/지난달
  let m = /^(next|last|this) (week|month|year)$/.exec(text) ?? koPeriod(text);
  if (m) {
    const dir = m[1] === 'next' ? 1 : m[1] === 'last' ? -1 : 0;
    return base.add(dir, m[2] as 'week' | 'month' | 'year');
  }

  // in N units / N units / N units ago / N일 후 / N일 뒤 / N일 전
  m = /^(?:in )?(\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten) (day|days|week|weeks|month|months|year|years)( ago)?$/.exec(text) ?? koRelative(text);
  if (m) {
    const n = numberWord(m[1]!) * (m[3] ? -1 : 1);
    return base.add(n, unit(m[2]!));
  }

  // weekdays: monday, next monday, last monday, this monday, 월요일, 다음 월요일, 지난 월요일
  m = /^(?:(next|last|this) )?([a-z]+)$/.exec(text) ?? koWeekday(text);
  if (m) {
    const wd = WEEKDAYS[m[2]!];
    if (wd !== undefined) return weekday(base, wd, (m[1] as 'next' | 'last' | 'this' | undefined) ?? 'this');
  }

  // 6 oct / 6 october 2027 / oct 6 / october 6th, 2027
  m = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)(?:,? (\d{4}))?$/.exec(text);
  if (m && MONTHS[m[2]!] !== undefined) return validDate(m[3] ? +m[3] : base.year(), MONTHS[m[2]!]! + 1, +m[1]!);
  m = /^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?$/.exec(text);
  if (m && MONTHS[m[1]!] !== undefined) return validDate(m[3] ? +m[3] : base.year(), MONTHS[m[1]!]! + 1, +m[2]!);
  // 10월 6일 / 2027년 10월 6일
  m = /^(?:(\d{4})년 ?)?(\d{1,2})월 ?(\d{1,2})일$/.exec(text);
  if (m) return validDate(m[1] ? +m[1] : base.year(), +m[2]!, +m[3]!);

  return null;
}

const FIXED: Record<string, number> = {
  today: 0, tod: 0, now: 0, '오늘': 0,
  tomorrow: 1, tom: 1, tmr: 1, '내일': 1,
  yesterday: -1, '어제': -1,
  '모레': 2, '글피': 3, '그제': -2, '그저께': -2,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
  '일요일': 0, '월요일': 1, '화요일': 2, '수요일': 3, '목요일': 4, '금요일': 5, '토요일': 6,
  '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6,
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5,
  july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};

function unit(u: string): 'day' | 'week' | 'month' | 'year' {
  if (u.startsWith('week') || u === '주') return 'week';
  if (u.startsWith('month') || u === '달' || u === '개월') return 'month';
  if (u.startsWith('year') || u === '년') return 'year';
  return 'day';
}

function validDate(y: number, mo: number, d: number): Dayjs | null {
  const s = `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const r = dayjs(s, 'YYYY-MM-DD', true);
  return r.isValid() ? r : null;
}

/** `this` = next occurrence including today; `next` = strictly after today; `last` = strictly before. */
function weekday(base: Dayjs, wd: number, dir: 'next' | 'last' | 'this'): Dayjs {
  const diff = (wd - base.day() + 7) % 7;
  if (dir === 'this') return base.add(diff, 'day');
  if (dir === 'next') return base.add(diff === 0 ? 7 : diff, 'day');
  const back = (base.day() - wd + 7) % 7;
  return base.subtract(back === 0 ? 7 : back, 'day');
}

function koPeriod(text: string): RegExpExecArray | null {
  const map: Record<string, [string, string]> = {
    '다음주': ['next', 'week'], '다음 주': ['next', 'week'], '내주': ['next', 'week'],
    '다음달': ['next', 'month'], '다음 달': ['next', 'month'], '내년': ['next', 'year'],
    '지난주': ['last', 'week'], '지난 주': ['last', 'week'], '지난달': ['last', 'month'], '지난 달': ['last', 'month'], '작년': ['last', 'year'],
    '이번주': ['this', 'week'], '이번 주': ['this', 'week'], '이번달': ['this', 'month'], '이번 달': ['this', 'month'], '올해': ['this', 'year'],
  };
  const v = map[text];
  return v ? (['', v[0], v[1]] as unknown as RegExpExecArray) : null;
}

function koRelative(text: string): RegExpExecArray | null {
  const m = /^(\d+)\s*(일|주|달|개월|년)\s*(후|뒤|전)$/.exec(text);
  if (!m) return null;
  return ['', m[1]!, m[2]!, m[3] === '전' ? ' ago' : ''] as unknown as RegExpExecArray;
}

function koWeekday(text: string): RegExpExecArray | null {
  const m = /^(?:(다음|지난|이번)\s*)?([월화수목금토일](?:요일)?)$/.exec(text);
  if (!m) return null;
  const dir = m[1] === '다음' ? 'next' : m[1] === '지난' ? 'last' : 'this';
  return ['', dir, m[2]!] as unknown as RegExpExecArray;
}

/** "two" → 2 (Obsidian accepts number words in relative dates: "in two weeks"). */
function numberWord(w: string): number {
  const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  return words[w] ?? +w;
}
