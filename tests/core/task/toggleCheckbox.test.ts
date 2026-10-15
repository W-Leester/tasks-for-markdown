import { describe, expect, it } from 'vitest';
import { checkboxMode, toggleCheckboxLine } from '../../../src/core/task/toggleCheckbox';

describe('toggleCheckboxLine (M26, Ctrl+Shift+Space)', () => {
  it('adds a checkbox to plain text, list items and empty lines, keeping indent and marker', () => {
    expect(toggleCheckboxLine('Write the report')).toBe('- [ ] Write the report');
    expect(toggleCheckboxLine('  Write the report')).toBe('  - [ ] Write the report');
    expect(toggleCheckboxLine('- Write the report')).toBe('- [ ] Write the report');
    expect(toggleCheckboxLine('* Write the report')).toBe('* [ ] Write the report');
    expect(toggleCheckboxLine('1. Write the report')).toBe('1. [ ] Write the report');
    expect(toggleCheckboxLine('\t- nested')).toBe('\t- [ ] nested');
    expect(toggleCheckboxLine('')).toBe('- [ ] ');
    expect(toggleCheckboxLine('    ')).toBe('    - [ ] ');
  });

  it('removes the checkbox (and its status) from a task line', () => {
    expect(toggleCheckboxLine('- [ ] Write the report 📅 2026-10-20')).toBe('- Write the report 📅 2026-10-20');
    expect(toggleCheckboxLine('- [x] Done thing ✅ 2026-10-10')).toBe('- Done thing ✅ 2026-10-10');
    expect(toggleCheckboxLine('  * [/] in progress')).toBe('  * in progress');
    expect(toggleCheckboxLine('2) [-] cancelled')).toBe('2) cancelled');
    expect(toggleCheckboxLine('- [ ] ')).toBe('- ');
  });

  it('a mixed selection follows the first line: adding leaves existing tasks alone, removing leaves plain lines alone', () => {
    expect(checkboxMode('- [ ] a')).toBe('remove');
    expect(checkboxMode('- a')).toBe('add');
    expect(checkboxMode('')).toBe('add');
    expect(toggleCheckboxLine('- [ ] already', 'add')).toBe('- [ ] already');
    expect(toggleCheckboxLine('plain', 'remove')).toBe('plain');
    expect(toggleCheckboxLine('- bullet', 'remove')).toBe('- bullet');
  });

  it('does not treat links or code as checkboxes', () => {
    expect(toggleCheckboxLine('- [link](x)')).toBe('- [ ] [link](x)'); // "[link]" is not a one-character box
    expect(toggleCheckboxLine('-[ ] no space after the marker')).toBe('- [ ] -[ ] no space after the marker');
  });
});
