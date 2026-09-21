/** Shared "includes | does not include | regex matches | regex does not match" handling. */

export interface TextMatcher {
  explain: string;
  test(value: string | null): boolean;
}

const MAX_REGEX_LENGTH = 300;

export function parseRegexLiteral(text: string): RegExp {
  const m = /^\/(.+)\/([a-z]*)$/s.exec(text.trim());
  if (!m) throw new Error(`Regular expression must be written as /pattern/flags, got "${text}"`);
  if (m[1]!.length > MAX_REGEX_LENGTH) throw new Error('Regular expression is too long');
  // Reject the most common catastrophic-backtracking shapes (nested quantifiers) up front.
  if (/\((?:[^()]*[+*][^()]*)\)[+*]/.test(m[1]!)) throw new Error('Regular expression has nested quantifiers and could hang; please simplify it');
  return new RegExp(m[1]!, m[2]);
}

/**
 * Parse `<op> <value>` where op is one of the four text operators. `nullMatches` says whether a
 * missing value (e.g. no heading) counts for the negative operators.
 */
export function parseTextOperator(rest: string, what: string, opts: { caseInsensitive?: boolean } = {}): TextMatcher | null {
  const ci = opts.caseInsensitive !== false;
  let m = /^(includes|does not include|include|do not include)\s+(.+)$/s.exec(rest);
  if (m) {
    const negative = m[1]!.startsWith('do');
    const needle = m[2]!.trim();
    const n = ci ? needle.toLowerCase() : needle;
    return {
      explain: `${what} ${negative ? 'does not include' : 'includes'} ${needle}`,
      test: (v) => {
        const has = v !== null && (ci ? v.toLowerCase() : v).includes(n);
        return negative ? !has : has;
      },
    };
  }
  m = /^regex (matches|does not match)\s+(.+)$/s.exec(rest);
  if (m) {
    const negative = m[1] === 'does not match';
    const re = parseRegexLiteral(m[2]!);
    return {
      explain: `${what} ${negative ? 'does not match' : 'matches'} regex ${re.toString()}`,
      test: (v) => {
        const has = v !== null && re.test(v);
        return negative ? !has : has;
      },
    };
  }
  return null;
}
