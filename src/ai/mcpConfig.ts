/**
 * Pure helpers for M21 (design.md 7.16): how the bundled CLI is started on the editor's own Node,
 * what goes into other tools' MCP configs, and the `tasksmd` launcher script. No vscode import.
 */
import * as path from 'node:path';

/** A stdio MCP server: the same shape VS Code, Cursor, Claude Code and Claude Desktop use. */
export interface McpServerSpec {
  command: string;
  args: string[];
  env: Record<string, string>;
}

/** Run `cliPath` (dist/tasksmd.cjs) as an MCP server for `root` on the editor's Node (no npm needed). */
export function serverSpec(execPath: string, cliPath: string, root: string): McpServerSpec {
  return { command: execPath, args: [cliPath, 'mcp', '--root', root], env: { ELECTRON_RUN_AS_NODE: '1' } };
}

/** `tasks` for a single folder; `tasks-<folder>` when several are open, so each gets its own server. */
export function serverName(folderName: string, folderCount: number): string {
  if (folderCount <= 1) return 'tasks';
  const slug = folderName.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '') || 'folder';
  return `tasks-${slug}`;
}

export class ConfigParseError extends Error {}

/**
 * Add or replace one server in a JSON config (`mcpServers` for Claude Desktop and Cursor, `servers`
 * for VS Code). Every other key and server is kept. `previous` is what was there under that name.
 * Throws ConfigParseError when the existing text is not a JSON object — never overwrite a file we
 * cannot read.
 */
export function mergeMcpServers(text: string | undefined, key: 'mcpServers' | 'servers', name: string, spec: McpServerSpec): { text: string; previous: unknown } {
  let config: Record<string, unknown> = {};
  if (text !== undefined && text.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new ConfigParseError(err instanceof Error ? err.message : String(err));
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ConfigParseError('the file is not a JSON object');
    config = parsed as Record<string, unknown>;
  }
  const servers = config[key] && typeof config[key] === 'object' && !Array.isArray(config[key]) ? { ...(config[key] as Record<string, unknown>) } : {};
  const previous = servers[name];
  servers[name] = { command: spec.command, args: spec.args, env: spec.env };
  return { text: JSON.stringify({ ...config, [key]: servers }, null, 2) + '\n', previous };
}

/** Arguments for `claude mcp add-json --scope local <name> <json>` (this machine, this project only). */
export function claudeAddJsonArgs(name: string, spec: McpServerSpec): string[] {
  return ['mcp', 'add-json', '--scope', 'local', name, JSON.stringify({ type: 'stdio', command: spec.command, args: spec.args, env: spec.env })];
}

/** The same, as one line a user can paste into a terminal (POSIX quoting). */
export function claudeAddJsonCommand(name: string, spec: McpServerSpec): string {
  const q = (s: string) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);
  return ['claude', ...claudeAddJsonArgs(name, spec)].map(q).join(' ');
}

/** First line marks our launcher, so we only ever overwrite or delete our own file. */
export const LAUNCHER_MARK = 'tasksmd launcher - installed by Tasks for Markdown (HastyCapybara.tasks-for-markdown)';

export function launcherFileName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'tasksmd.cmd' : 'tasksmd';
}

/** The `tasksmd` command: runs the stable copy of the CLI on the editor's Node. */
export function launcherScript(platform: NodeJS.Platform, execPath: string, cliPath: string): string {
  if (platform === 'win32') {
    return [`@echo off`, `rem ${LAUNCHER_MARK}`, `rem Remove with "Tasks: Uninstall 'tasksmd' command".`, `set ELECTRON_RUN_AS_NODE=1`, `"${execPath}" "${cliPath}" %*`, ''].join('\r\n');
  }
  const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
  return [`#!/bin/sh`, `# ${LAUNCHER_MARK}`, `# Remove with "Tasks: Uninstall 'tasksmd' command".`, `ELECTRON_RUN_AS_NODE=1 exec ${q(execPath)} ${q(cliPath)} "$@"`, ''].join('\n');
}

export function isOurLauncher(text: string): boolean {
  return text.includes(LAUNCHER_MARK);
}

/**
 * Where to put the launcher: the first per-user folder that is already on PATH, else the
 * conventional one (`~/.local/bin`; Windows `%LOCALAPPDATA%\tasksmd\bin`) with `onPath: false`.
 */
export function pickBinDir(platform: NodeJS.Platform, home: string, pathEnv: string, localAppData?: string): { dir: string; onPath: boolean } {
  const sep = platform === 'win32' ? ';' : ':';
  const norm = (p: string) => (platform === 'win32' ? path.win32.normalize(p).toLowerCase().replace(/\\+$/, '') : path.posix.normalize(p).replace(/\/+$/, ''));
  const entries = pathEnv.split(sep).filter(Boolean).map(norm);
  if (platform === 'win32') {
    const dir = path.win32.join(localAppData ?? path.win32.join(home, 'AppData', 'Local'), 'tasksmd', 'bin');
    return { dir, onPath: entries.includes(norm(dir)) };
  }
  for (const dir of [path.posix.join(home, '.local', 'bin'), path.posix.join(home, 'bin')]) {
    if (entries.includes(norm(dir))) return { dir, onPath: true };
  }
  return { dir: path.posix.join(home, '.local', 'bin'), onPath: false };
}

/** The line to add to a shell profile (or the Windows step) when the folder is not on PATH yet. */
export function pathAdvice(platform: NodeJS.Platform, dir: string): string {
  if (platform === 'win32') return `setx PATH "%PATH%;${dir}"`;
  return `export PATH="${dir}:$PATH"`;
}

/** Claude Desktop's config file, or undefined on platforms it does not run on. */
export function claudeDesktopConfigPath(platform: NodeJS.Platform, home: string, appData?: string): string | undefined {
  if (platform === 'darwin') return path.posix.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  if (platform === 'win32') return path.win32.join(appData ?? path.win32.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
  return undefined;
}
