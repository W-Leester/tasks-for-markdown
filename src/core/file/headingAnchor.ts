/**
 * Heading anchors (`[목차](#1-비전)`) the way GitHub makes them, so a table of contents written for GitHub (or by an
 * AI) works in the rendered view. Pure; the webview uses it too.
 */

/** GitHub-style: lower case, punctuation dropped, each space a `-`. `1. 비전` → `1-비전`. */
export function headingSlug(text: string): string {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
}

/** The anchor of each heading, in order; a repeated one gets `-1`, `-2`, … (as on GitHub). */
export function headingAnchors(texts: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return texts.map((text) => {
    const base = headingSlug(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  });
}

/**
 * Which anchor a link's `#fragment` points to, or -1. Takes the fragment as written (percent-encoded or not), and
 * also the heading text itself (`#1. 비전`, `#Vision`).
 */
export function matchAnchor(anchors: readonly string[], fragment: string): number {
  let f = fragment;
  try {
    f = decodeURIComponent(fragment);
  } catch {
    // a stray `%`: use it as written
  }
  for (const want of [f, f.toLowerCase(), headingSlug(f)]) {
    const i = anchors.indexOf(want);
    if (i >= 0) return i;
  }
  return -1;
}

/** The line of the heading `#fragment` points to in a note's text (ATX `#` headings outside code fences), or -1. */
export function findHeadingLine(text: string, fragment: string): number {
  const lines: number[] = [];
  const texts: string[] = [];
  let fence: string | null = null;
  text.split('\n').forEach((raw, i) => {
    const l = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(l);
    if (f) {
      if (!fence) fence = f[1]![0]!.repeat(f[1]!.length);
      else if (f[1]!.startsWith(fence)) fence = null;
      return;
    }
    if (fence) return;
    const h = /^ {0,3}#{1,6}(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/.exec(l);
    if (!h) return;
    lines.push(i);
    texts.push(h[1] ?? '');
  });
  const i = matchAnchor(headingAnchors(texts), fragment);
  return i < 0 ? -1 : lines[i]!;
}
