import { describe, expect, it } from 'vitest';
import { applyChanges, minimalChange } from '../../src/webviews/live/sync';

describe('live view sync (M40)', () => {
  it('finds the smallest replacement between two texts', () => {
    expect(minimalChange('abc', 'abc')).toBeNull();
    expect(minimalChange('hello world', 'hello brave world')).toEqual({ from: 6, to: 6, insert: 'brave ' });
    expect(minimalChange('- [ ] 할 일', '- [x] 할 일')).toEqual({ from: 3, to: 4, insert: 'x' });
    expect(minimalChange('aaa', 'aa')).toEqual({ from: 2, to: 3, insert: '' });
    expect(minimalChange('', 'new')).toEqual({ from: 0, to: 0, insert: 'new' });
  });

  it('never splits an emoji (surrogate pair)', () => {
    const a = '📅 date', b = '📆 date'; // same high surrogate, different low
    const c = minimalChange(a, b)!;
    expect(applyChanges(a, [c])).toBe(b);
    expect(c.from).toBe(0);
    expect(c.insert).toBe('📆');
    const d = minimalChange('x📅', 'x🔁')!;
    expect(d).toEqual({ from: 1, to: 3, insert: '🔁' });
  });

  it('applies several changes given in old-text coordinates', () => {
    expect(applyChanges('abcdef', [{ from: 0, to: 1, insert: 'X' }, { from: 4, to: 6, insert: 'YZW' }])).toBe('XbcdYZW');
    expect(applyChanges('abc', [{ from: 3, to: 3, insert: '!' }, { from: 0, to: 0, insert: '>' }])).toBe('>abc!');
  });
});

import { keepKey } from '../../src/webviews/live/keys';

describe('live view keys (M40)', () => {
  const k = (keyCode: number, code: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({ keyCode, code, key: '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
  it('keeps typing and the editor’s own Cmd keys; lets VS Code have F-keys, copy/paste, save and its shortcuts', () => {
    const mac = true;
    expect(keepKey(k(65, 'KeyA'), mac)).toBe(true); // typing
    expect(keepKey(k(13, 'Enter'), mac)).toBe(true);
    expect(keepKey(k(90, 'KeyZ', { metaKey: true }), mac)).toBe(true); // undo here
    expect(keepKey(k(70, 'KeyF', { metaKey: true }), mac)).toBe(true); // find here
    expect(keepKey(k(229, 'KeyZ', { metaKey: true }), mac)).toBe(true); // mid-syllable Cmd+Z
    expect(keepKey(k(69, 'KeyE', { ctrlKey: true }), mac)).toBe(true); // Ctrl+E: end of line on macOS
    expect(keepKey(k(112, 'F1'), mac)).toBe(false);
    expect(keepKey(k(9, 'Tab', { ctrlKey: true }), mac)).toBe(false); // Ctrl+Tab: switch editors
    expect(keepKey(k(192, 'Backquote', { ctrlKey: true }), mac)).toBe(false); // Ctrl+`: terminal
    for (const c of [86, 67, 88, 83, 80, 87]) expect(keepKey(k(c, 'KeyX', { metaKey: true }), mac)).toBe(false); // V C X S P W
    expect(keepKey(k(86, 'KeyV', { metaKey: true, shiftKey: true }), mac)).toBe(true);
    // Windows/Linux: Ctrl is Cmd.
    expect(keepKey(k(90, 'KeyZ', { ctrlKey: true }), false)).toBe(true);
    expect(keepKey(k(86, 'KeyV', { ctrlKey: true }), false)).toBe(false);
  });
});
