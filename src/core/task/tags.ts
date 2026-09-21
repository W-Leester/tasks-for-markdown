/**
 * Obsidian tag rules: `#` preceded by start-of-text or whitespace, followed by letters, digits,
 * `_`, `-`, `/`; must contain at least one non-digit. A `#` inside a URL is preceded by a
 * non-space character and is therefore not a tag.
 */
const TAG_RE = /(?<=^|\s)#([\p{L}\p{N}_\-/]+)/gu;

export function extractTags(text: string): string[] {
  const tags: string[] = [];
  for (const m of text.matchAll(TAG_RE)) {
    const body = m[1] ?? '';
    if (!/\P{N}/u.test(body)) continue; // purely numeric (#123) is not a tag
    const tag = '#' + body;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}
