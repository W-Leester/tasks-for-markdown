import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type * as Core from '../../src/core/dto';
import type * as Api from '../../src/api/types';

// Compile-time: the public data shapes must equal the internal DTOs (both directions). A mismatch fails `pnpm typecheck`.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const checks: [Equal<Core.TaskDto, Api.TaskDto>, Equal<Core.GroupDto, Api.GroupDto>, Equal<Core.TreeDto, Api.TreeDto>, Equal<Core.SavedQueryDto, Api.SavedQueryDto>] = [true, true, true, true];

describe('public API types (src/api/types.ts)', () => {
  it('match the internal DTOs', () => {
    expect(checks).toEqual([true, true, true, true]);
  });

  it('are one self-contained file: no imports, so it can be copied into another project', () => {
    const src = readFileSync('src/api/types.ts', 'utf8');
    expect(src).not.toMatch(/^\s*import\b/m);
    expect(src).not.toMatch(/^\s*export\s+(?:type\s+)?\{[^}]*\}\s+from\b/m);
    expect(src).not.toMatch(/\bimport\(/);
  });
});
