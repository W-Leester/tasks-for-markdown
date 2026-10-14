import { describe, expect, it } from 'vitest';
import { resolveWindowsCommand } from '../../src/ai/winCommand';

const SHIM = '@ECHO off\r\nendLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\@anthropic-ai\\claude-code\\cli.js" %*';
const fake = (files: Record<string, string>) => ({
  exists: async (p: string) => p.toLowerCase() in Object.fromEntries(Object.keys(files).map((k) => [k.toLowerCase(), 1])),
  read: async (p: string) => { const k = Object.keys(files).find((f) => f.toLowerCase() === p.toLowerCase()); if (k === undefined) throw new Error('ENOENT'); return files[k]!; },
});
const CODE = 'C:\\Program Files\\Microsoft VS Code\\Code.exe';

describe('Windows command lookup without cmd.exe (10-14)', () => {
  it('runs a native claude.exe directly', async () => {
    const r = await resolveWindowsCommand('claude', 'C:\\Windows\\System32;C:\\Users\\u\\.local\\bin', CODE, fake({ 'C:\\Users\\u\\.local\\bin\\claude.exe': '' }));
    expect(r).toEqual({ file: 'C:\\Users\\u\\.local\\bin\\claude.exe', pre: [], node: false });
  });

  it('runs what an npm claude.cmd shim points to on the editor Node', async () => {
    const npm = 'C:\\Users\\u\\AppData\\Roaming\\npm';
    const cli = `${npm}\\node_modules\\@anthropic-ai\\claude-code\\cli.js`;
    const r = await resolveWindowsCommand('claude', `C:\\Windows\\System32;${npm}`, CODE, fake({ [`${npm}\\claude.cmd`]: SHIM, [cli]: '' }));
    expect(r).toEqual({ file: CODE, pre: [cli], node: true });
  });

  it('prefers an .exe found earlier on PATH; skips a shim whose target is missing; nothing found → undefined', async () => {
    const npm = 'C:\\npm';
    expect(await resolveWindowsCommand('claude', `${npm};C:\\bin`, CODE, fake({ [`${npm}\\claude.cmd`]: SHIM, 'C:\\bin\\claude.exe': '' })))
      .toEqual({ file: 'C:\\bin\\claude.exe', pre: [], node: false });
    expect(await resolveWindowsCommand('claude', npm, CODE, fake({ [`${npm}\\claude.cmd`]: SHIM }))).toBeUndefined();
    expect(await resolveWindowsCommand('tasklist', 'C:\\Windows\\System32', CODE, fake({ 'C:\\Windows\\System32\\tasklist.exe': '' })))
      .toEqual({ file: 'C:\\Windows\\System32\\tasklist.exe', pre: [], node: false });
    expect(await resolveWindowsCommand('claude', 'C:\\Windows', CODE, fake({}))).toBeUndefined();
  });
});
