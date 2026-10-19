import { describe, expect, it } from 'vitest';
import { appendCreated } from '../../../src/core/task/createdField';

describe('appendCreated (M33)', () => {
  it('adds ➕ today at the end of a new task line', () => {
    expect(appendCreated('- [ ] buy milk', '2026-10-19', 'emoji')).toBe('- [ ] buy milk ➕ 2026-10-19');
    expect(appendCreated('  - [ ] 보고서 📅 2026-10-25', '2026-10-19', 'emoji')).toBe('  - [ ] 보고서 📅 2026-10-25 ➕ 2026-10-19');
    expect(appendCreated('- [ ] buy milk  ', '2026-10-19', 'emoji')).toBe('- [ ] buy milk ➕ 2026-10-19');
  });

  it('on an empty box keeps a space for what is typed next', () => {
    expect(appendCreated('- [ ] ', '2026-10-19', 'emoji')).toBe('- [ ]  ➕ 2026-10-19');
  });

  it('dataview format', () => {
    expect(appendCreated('- [ ] buy milk', '2026-10-19', 'dataview')).toBe('- [ ] buy milk [created:: 2026-10-19]');
  });

  it('leaves a line that already has a created date, or is not a task', () => {
    expect(appendCreated('- [ ] a ➕ 2026-10-01', '2026-10-19', 'emoji')).toBe('- [ ] a ➕ 2026-10-01');
    expect(appendCreated('- [ ] a [created:: 2026-10-01]', '2026-10-19', 'emoji')).toBe('- [ ] a [created:: 2026-10-01]');
    expect(appendCreated('- [ ] a (created:: 2026-10-01)', '2026-10-19', 'dataview')).toBe('- [ ] a (created:: 2026-10-01)');
    expect(appendCreated('- plain', '2026-10-19', 'emoji')).toBe('- plain');
  });
});
