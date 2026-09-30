import * as fs from 'node:fs';
import * as path from 'node:path';

export class StaleLineError extends Error {
  constructor(readonly file: string, readonly line: number, readonly expected: string, readonly actual: string) {
    super(`Line ${line + 1} of ${file} is not the expected text`);
    this.name = 'StaleLineError';
  }
}

interface Doc { lines: string[]; eol: string; trailingNewline: boolean }

function read(abs: string): Doc {
  const text = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const trailingNewline = text.endsWith('\n');
  const body = trailingNewline ? text.slice(0, -eol.length) : text;
  return { lines: body === '' && !trailingNewline ? [] : body.split(eol), eol, trailingNewline: trailingNewline || body === '' };
}

function write(abs: string, doc: Doc): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, doc.lines.join(doc.eol) + (doc.lines.length ? doc.eol : ''), 'utf8');
}

const strip = (s: string) => (s.endsWith('\r') ? s.slice(0, -1) : s);

function check(abs: string, doc: Doc, line: number, expected: string): void {
  const actual = doc.lines[line] ?? '';
  if (strip(actual) !== strip(expected)) throw new StaleLineError(abs, line, expected, actual);
}

/** Rewrite the file's lines with `fn` after checking that `line` still has the expected text (notes under a task). */
export function rewriteAround(abs: string, line: number, expected: string, fn: (lines: string[]) => string[]): void {
  const doc = read(abs);
  check(abs, doc, line, expected);
  doc.lines = fn(doc.lines);
  write(abs, doc);
}

/** Replace a line (after checking its current text), optionally inserting lines above/below or deleting it. */
export function replaceLine(abs: string, line: number, expected: string, newText: string, insert?: { position: 'above' | 'below'; lines: string[] }, deleteOriginal = false): number {
  const doc = read(abs);
  check(abs, doc, line, expected);
  const extra = insert?.lines ?? [];
  if (deleteOriginal && extra.length) doc.lines.splice(line, 1, ...extra);
  else if (insert?.position === 'above') doc.lines.splice(line, 1, ...extra, newText);
  else doc.lines.splice(line, 1, newText, ...extra);
  write(abs, doc);
  return insert?.position === 'above' && !deleteOriginal ? line + extra.length : line;
}

/** Insert a new line after `line` (a blank line is replaced; `Infinity` appends). Returns the new line's index. */
export function insertLine(abs: string, line: number, text: string): number {
  const doc = read(abs);
  if (!Number.isFinite(line) || line >= doc.lines.length) {
    doc.lines.push(text);
    write(abs, doc);
    return doc.lines.length - 1;
  }
  if ((doc.lines[line] ?? '').trim() === '') {
    doc.lines[line] = text;
    write(abs, doc);
    return line;
  }
  const indent = /^[ \t]*/.exec(doc.lines[line]!)?.[0] ?? '';
  doc.lines.splice(line + 1, 0, indent + text.replace(/^[ \t]*/, ''));
  write(abs, doc);
  return line + 1;
}

export function deleteLine(abs: string, line: number, expected: string): void {
  const doc = read(abs);
  check(abs, doc, line, expected);
  doc.lines.splice(line, 1);
  write(abs, doc);
}

export function readLine(abs: string, line: number): string | undefined {
  return read(abs).lines[line];
}
