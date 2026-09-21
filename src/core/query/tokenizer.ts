import type { QuerySource } from './types';

export interface QueryLine {
  /** 1-based line number of the first physical line (after continuations were joined). */
  line: number;
  text: string;
}

/**
 * Split query text into instructions (FR-7.14 / FR-7.9):
 * - `#` at the start of a line begins a comment
 * - a trailing `\` joins the next line
 * - `{{query.file.path}}`, `{{query.file.folder}}`, `{{query.file.filename}}`, `{{query.file.root}}`
 *   are replaced with the file the query is in
 */
export function tokenize(text: string, source?: QuerySource): QueryLine[] {
  const out: QueryLine[] = [];
  const physical = text.replace(/\r\n?/g, '\n').split('\n');
  let buffer = '';
  let start = 0;
  for (let i = 0; i < physical.length; i++) {
    const raw = physical[i]!;
    if (!buffer) start = i + 1;
    if (raw.trimEnd().endsWith('\\')) {
      buffer += raw.trimEnd().slice(0, -1).trimEnd() + ' ';
      continue;
    }
    const joined = (buffer + raw.trimStart()).trim();
    buffer = '';
    if (!joined || joined.startsWith('#')) continue;
    out.push({ line: start, text: expandPlaceholders(joined, source) });
  }
  if (buffer.trim()) out.push({ line: start, text: expandPlaceholders(buffer.trim(), source) });
  return out;
}

export function expandPlaceholders(text: string, source?: QuerySource): string {
  if (!text.includes('{{')) return text;
  const path = source?.path ?? '';
  const filename = path.split('/').pop() ?? '';
  const folderParts = path.split('/').slice(0, -1);
  const folder = folderParts.length ? folderParts.join('/') + '/' : '/';
  const root = folderParts.length ? folderParts[0] + '/' : '/';
  const filenameWithoutExtension = filename.replace(/\.[^.]+$/, '');
  const map: Record<string, string> = {
    'query.file.path': path,
    'query.file.pathWithoutExtension': path.replace(/\.[^.]+$/, ''),
    'query.file.folder': folder,
    'query.file.filename': filename,
    'query.file.filenameWithoutExtension': filenameWithoutExtension,
    'query.file.root': root,
  };
  return text.replace(/\{\{\s*([a-zA-Z.]+)\s*\}\}/g, (m, key: string) => (key in map ? map[key]! : m));
}
