import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/** Every bundled third-party package must be listed with its license text (MIT/BSD/ISC require it). */
describe('THIRD_PARTY_NOTICES.md', () => {
  it('matches what esbuild actually bundles (run `pnpm notices` after adding a dependency)', () => {
    const out = execFileSync(process.execPath, ['scripts/third-party-notices.mjs', '--check'], { encoding: 'utf8', timeout: 120_000 });
    expect(out).toContain('is up to date');
  }, 120_000);
});
