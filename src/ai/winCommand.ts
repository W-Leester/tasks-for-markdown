/**
 * Windows: what to start for a command name without cmd.exe (10-14 Windows check). `shell: true` joined the
 * arguments unescaped into one cmd.exe line, which broke the JSON for `claude mcp add-json`. Instead: an `.exe`
 * on PATH runs directly; an npm `.cmd` shim is read and the script it would run starts on our own Node.
 * File access is passed in so this can be tested off Windows.
 */
import * as path from 'node:path';
import { shimTarget } from './mcpConfig';

export interface WinStart { file: string; pre: string[]; node: boolean }

export async function resolveWindowsCommand(cmd: string, pathEnv: string, execPath: string, fsx: { exists(p: string): Promise<boolean>; read(p: string): Promise<string> }): Promise<WinStart | undefined> {
  if (path.win32.isAbsolute(cmd)) return { file: cmd, pre: [], node: false };
  for (const dir of pathEnv.split(';').filter(Boolean)) {
    for (const ext of ['.exe', '.com']) {
      const file = path.win32.join(dir, cmd + ext);
      if (await fsx.exists(file)) return { file, pre: [], node: false };
    }
    for (const ext of ['.cmd', '.bat']) {
      const shim = path.win32.join(dir, cmd + ext);
      if (!(await fsx.exists(shim))) continue;
      const target = shimTarget(await fsx.read(shim).catch(() => ''), dir);
      if (!target || !(await fsx.exists(target))) continue;
      if (/\.exe$/i.test(target)) return { file: target, pre: [], node: false };
      return { file: execPath, pre: [target], node: true };
    }
  }
  return undefined;
}
