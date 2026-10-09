import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Only these go into the .vsix. Anything else in the repo root (releases/ with old builds, scratch files)
// must be excluded by .vscodeignore — the Marketplace upload is a local build (incident #35).
const ALLOWED = [/^dist\//, /^media\//, /^l10n\//, /^package(\.nls(\.ko)?)?\.json$/, /^README(\.ko)?\.md$/, /^CHANGELOG\.md$/, /^LICENSE$/, /^NOTICE\.md$/, /^THIRD_PARTY_NOTICES\.md$/];

describe('vsix contents', () => {
  it('packs only the extension files', () => {
    const files = execFileSync('pnpm', ['exec', 'vsce', 'ls', '--no-dependencies'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map((l) => l.trim()).filter(Boolean);
    expect(files).toContain('package.json');
    expect(files.filter((f) => !ALLOWED.some((re) => re.test(f)))).toEqual([]);
  }, 30_000);
});
