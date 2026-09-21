import { describe, expect, it, vi } from 'vitest';
vi.mock('vscode', () => ({
  Range: class { constructor(public sl: number, public sc: number, public el: number, public ec: number) {} },
  window: { createOutputChannel: () => ({}) },
  commands: {}, l10n: { t: (s: string) => s }, ThemeIcon: class {}, SnippetString: class {}, workspace: {},
}));
const { queryBlockAt } = await import('../src/commands/queryCommands');

function doc(lines: string[]) {
  return {
    lineCount: lines.length,
    lineAt: (l: number) => ({ text: lines[l]! }),
    getText: (r: { sl: number; el: number }) => lines.slice(r.sl, r.el).join('\n') + '\n',
  } as unknown as import('vscode').TextDocument;
}

describe('queryBlockAt', () => {
  const d = doc(['text', '```tasks', 'not done', 'due today', '```', 'after', '```', 'code', '```']);
  it('finds the block from inside and from the fence lines', () => {
    for (const l of [1, 2, 3, 4]) expect(queryBlockAt(d, l)?.text).toBe('not done\ndue today\n');
    expect(queryBlockAt(d, 2)?.start).toBe(1);
    expect(queryBlockAt(d, 2)?.end).toBe(4);
  });
  it('returns null outside a tasks block', () => {
    expect(queryBlockAt(d, 0)).toBeNull();
    expect(queryBlockAt(d, 5)).toBeNull();
    expect(queryBlockAt(d, 7)).toBeNull();
  });
});
