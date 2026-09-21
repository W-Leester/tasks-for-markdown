import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('vscode', () => ({}));
const { compareVersions, readLatest } = await import('../src/services/UpdateCheckService');

describe('compareVersions', () => {
  it.each([
    ['1.2.0', '1.1.9', 1],
    ['1.2.0', '1.2.0', 0],
    ['1.2', '1.2.1', -1],
    ['2.0.0-beta.1', '1.9.9', 1],
    ['0.0.1', '0.0.1-pre', 0],
  ])('%s vs %s -> %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});

describe('readLatest', () => {
  it('reads a latest.json file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tfm-'));
    const p = join(dir, 'latest.json');
    writeFileSync(p, JSON.stringify({ version: '1.2.3', vsix: '/share/tasks-for-markdown-1.2.3.vsix' }));
    expect((await readLatest(p)).version).toBe('1.2.3');
    writeFileSync(p, '{}');
    await expect(readLatest(p)).rejects.toThrow('version');
  });
});
