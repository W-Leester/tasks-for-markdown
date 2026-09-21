/**
 * Tag character class mirrors Obsidian Tasks (`TaskRegularExpressions.hashTags`): anything but
 * whitespace and common punctuation. A `#` must be preceded by start-of-text or whitespace, so a
 * `#` inside a URL or a `[[Note#heading]]` link is not a tag.
 */
export const TAG_BODY = String.raw`[^ !@#$%^&*(),.?":{}|<>]+`;
const TAG_RE = new RegExp(String.raw`(?<=^|\s)#${TAG_BODY}`, 'gu');
/** One or more tags at the end of a string (used by the parser to move tags back into the description). */
export const TRAILING_TAGS_RE = new RegExp(String.raw`(?:(?:^|\s)#${TAG_BODY})+$`, 'u');

export function extractTags(text: string): string[] {
  const tags: string[] = [];
  for (const m of text.matchAll(TAG_RE)) {
    const tag = m[0];
    if (!/\P{N}/u.test(tag.slice(1))) continue; // purely numeric (#123) is not a tag in Obsidian
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags;
}
