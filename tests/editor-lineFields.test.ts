import { describe, expect, it, vi } from 'vitest';
vi.mock('vscode', () => ({}));
const { fieldsStartOffset } = await import('../src/editor/lineFields');
import { StatusRegistry, parseTaskLine } from '../src/core/task';

const reg = StatusRegistry.default();
const off = (line: string) => fieldsStartOffset(line, parseTaskLine(line, { statusRegistry: reg })!);

describe('fieldsStartOffset', () => {
  it('points at the first field after the description', () => {
    const line = '- [ ] write report ⏫ 📅 2026-09-25';
    expect(line.slice(off(line)!)).toBe('⏫ 📅 2026-09-25');
  });
  it('returns null without fields', () => {
    expect(off('- [ ] plain #tag')).toBeNull();
    expect(off('  - [x] ')).toBeNull();
  });
  it('handles interleaved tags by falling back to the first field token', () => {
    const line = '- [ ] a 📅 2026-09-25 #tag';
    expect(line.slice(off(line)!)).toBe('📅 2026-09-25 #tag');
  });
  it('handles dataview fields and indentation', () => {
    const line = '    * [ ] d [due:: 2026-09-25]';
    expect(line.slice(off(line)!)).toBe('[due:: 2026-09-25]');
  });
});
