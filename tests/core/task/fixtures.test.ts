import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StatusRegistry, isTaskLine, parseTaskLine, serializeTask } from '../../../src/core/task';

const statusRegistry = StatusRegistry.default();
const fixture = (name: string) =>
  readFileSync(join(__dirname, '..', '..', 'fixtures', 'parser', name), 'utf8')
    .split('\n')
    .map((l) => l.replace(/\r$/, ''));

describe('fixtures/parser/emoji.md', () => {
  const lines = fixture('emoji.md').filter(isTaskLine);
  it('contains task lines', () => expect(lines.length).toBeGreaterThan(30));
  it.each(lines)('round-trips %j', (line) => {
    const task = parseTaskLine(line, { statusRegistry })!;
    expect(task).not.toBeNull();
    expect(serializeTask(task, 'emoji')).toBe(line);
  });
});

describe('fixtures/parser/dataview.md', () => {
  const lines = fixture('dataview.md').filter(isTaskLine);
  it('contains task lines', () => expect(lines.length).toBeGreaterThan(10));
  it.each(lines)('round-trips %j', (line) => {
    const task = parseTaskLine(line, { statusRegistry })!;
    expect(serializeTask(task, 'dataview')).toBe(line);
  });
  it('converts to emoji and back without loss', () => {
    for (const line of lines) {
      const viaEmoji = serializeTask(parseTaskLine(line, { statusRegistry })!, 'emoji');
      expect(serializeTask(parseTaskLine(viaEmoji, { statusRegistry })!, 'dataview')).toBe(line);
    }
  });
});

describe('fixtures/parser/not-tasks.md', () => {
  it.each(fixture('not-tasks.md').filter((l) => l.length > 0 && !l.startsWith('#')))('rejects %j', (line) => {
    expect(isTaskLine(line)).toBe(false);
  });
});
