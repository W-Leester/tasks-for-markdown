import { describe, expect, it } from 'vitest';
// globToRegExp lives next to vscode code; import it through a vscode-free path is not possible,
// so this test loads the module with a stubbed 'vscode'.
import { vi } from 'vitest';
vi.mock('vscode', () => ({}));
const { globToRegExp } = await import('../src/index/IndexService');

describe('globToRegExp', () => {
  it.each([
    ['**/*.md', 'a.md', true],
    ['**/*.md', 'x/y/a.md', true],
    ['**/*.md', 'a.txt', false],
    ['**/node_modules/**', 'node_modules/a/b.md', true],
    ['**/node_modules/**', 'x/node_modules/b.md', true],
    ['**/node_modules/**', 'src/a.md', false],
    ['{**/*.md,**/*.markdown}', 'n.markdown', true],
    ['docs/*.md', 'docs/a.md', true],
    ['docs/*.md', 'docs/x/a.md', false],
    ['a?c.md', 'abc.md', true],
  ])('%s vs %s -> %s', (glob, path, expected) => {
    expect(globToRegExp(glob).test(path)).toBe(expected);
  });
});
