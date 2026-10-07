import { describe, expect, it } from 'vitest';
import {
  ConfigParseError, claudeAddJsonArgs, claudeCodeHasServer, claudeDesktopHasServer, claudeDesktopRunningFrom, claudeAddJsonCommand, claudeDesktopConfigPath, isOurLauncher, launcherFileName, launcherScript, mergeMcpServers, pathAdvice, pickBinDir, serverName, serverSpec,
} from '../../src/ai/mcpConfig';

const spec = serverSpec('/Apps/Code Helper (Plugin)', '/home/u/.tasksmd/tasksmd.cjs', '/home/u/notes');

describe('M21 MCP config helpers', () => {
  it('runs the bundled CLI on the editor Node', () => {
    expect(spec).toEqual({ command: '/Apps/Code Helper (Plugin)', args: ['/home/u/.tasksmd/tasksmd.cjs', 'mcp', '--root', '/home/u/notes'], env: { ELECTRON_RUN_AS_NODE: '1' } });
  });

  it('names one server per folder', () => {
    expect(serverName('notes', 1)).toBe('tasks');
    expect(serverName('My Notes', 2)).toBe('tasks-my-notes');
    expect(serverName('업무 노트', 3)).toBe('tasks-업무-노트');
    expect(serverName('!!!', 2)).toBe('tasks-folder');
  });

  it('merges into existing configs, keeping every other key and server', () => {
    const before = JSON.stringify({ globalShortcut: 'Ctrl+Space', mcpServers: { github: { command: 'gh' } } });
    const r = mergeMcpServers(before, 'mcpServers', 'tasks', spec);
    expect(JSON.parse(r.text)).toEqual({ globalShortcut: 'Ctrl+Space', mcpServers: { github: { command: 'gh' }, tasks: { command: spec.command, args: spec.args, env: spec.env } } });
    expect(r.previous).toBeUndefined();
    const again = mergeMcpServers(r.text, 'mcpServers', 'tasks', spec);
    expect(again.previous).toEqual({ command: spec.command, args: spec.args, env: spec.env });
    expect(JSON.parse(mergeMcpServers(undefined, 'servers', 'tasks', spec).text)).toEqual({ servers: { tasks: { command: spec.command, args: spec.args, env: spec.env } } });
    expect(JSON.parse(mergeMcpServers('  ', 'mcpServers', 'tasks', spec).text).mcpServers.tasks.command).toBe(spec.command);
  });

  it('refuses to touch a file that is not a JSON object', () => {
    expect(() => mergeMcpServers('{ "mcpServers": ', 'mcpServers', 'tasks', spec)).toThrow(ConfigParseError);
    expect(() => mergeMcpServers('[1]', 'mcpServers', 'tasks', spec)).toThrow(ConfigParseError);
  });

  it('builds the Claude Code add-json command (local scope)', () => {
    const args = claudeAddJsonArgs('tasks', spec);
    expect(args.slice(0, 5)).toEqual(['mcp', 'add-json', '--scope', 'local', 'tasks']);
    expect(JSON.parse(args[5]!)).toEqual({ type: 'stdio', ...spec });
    const line = claudeAddJsonCommand('tasks', spec);
    expect(line.startsWith("claude mcp add-json --scope local tasks '{")).toBe(true);
  });

  it('writes a marked launcher that only runs our CLI', () => {
    const sh = launcherScript('darwin', "/Apps/Code's Helper", '/home/u/.tasksmd/tasksmd.cjs');
    expect(sh.split('\n')[0]).toBe('#!/bin/sh');
    expect(isOurLauncher(sh)).toBe(true);
    expect(sh).toContain(`ELECTRON_RUN_AS_NODE=1 exec '/Apps/Code'\\''s Helper' '/home/u/.tasksmd/tasksmd.cjs' "$@"`);
    const cmd = launcherScript('win32', 'C:\\Code\\Code.exe', 'C:\\Users\\u\\.tasksmd\\tasksmd.cjs');
    expect(cmd).toContain('set ELECTRON_RUN_AS_NODE=1\r\n"C:\\Code\\Code.exe" "C:\\Users\\u\\.tasksmd\\tasksmd.cjs" %*');
    expect(isOurLauncher(cmd)).toBe(true);
    expect(isOurLauncher('#!/bin/sh\necho someone else')).toBe(false);
    expect(launcherFileName('win32')).toBe('tasksmd.cmd');
    expect(launcherFileName('linux')).toBe('tasksmd');
  });

  it('prefers a per-user bin folder that is already on PATH', () => {
    expect(pickBinDir('darwin', '/Users/u', '/usr/bin:/Users/u/bin:/bin')).toEqual({ dir: '/Users/u/bin', onPath: true });
    expect(pickBinDir('linux', '/home/u', '/home/u/.local/bin/:/usr/bin')).toEqual({ dir: '/home/u/.local/bin', onPath: true });
    expect(pickBinDir('darwin', '/Users/u', '/usr/bin:/bin')).toEqual({ dir: '/Users/u/.local/bin', onPath: false });
    expect(pathAdvice('darwin', '/Users/u/.local/bin')).toBe('export PATH="/Users/u/.local/bin:$PATH"');
    const win = pickBinDir('win32', 'C:\\Users\\u', 'C:\\Windows;C:\\Users\\u\\AppData\\Local\\tasksmd\\bin\\', 'C:\\Users\\u\\AppData\\Local');
    expect(win).toEqual({ dir: 'C:\\Users\\u\\AppData\\Local\\tasksmd\\bin', onPath: true });
  });

  it('knows where Claude Desktop keeps its config', () => {
    expect(claudeDesktopConfigPath('darwin', '/Users/u')).toBe('/Users/u/Library/Application Support/Claude/claude_desktop_config.json');
    expect(claudeDesktopConfigPath('win32', 'C:\\Users\\u', 'C:\\Users\\u\\AppData\\Roaming')).toBe('C:\\Users\\u\\AppData\\Roaming\\Claude\\claude_desktop_config.json');
    expect(claudeDesktopConfigPath('linux', '/home/u')).toBeUndefined();
  });

  it('reads (only) whether Claude Code and Claude Desktop already have the server', () => {
    const claude = JSON.stringify({ oauthAccount: { x: 1 }, projects: { '/n': { mcpServers: { tasks: {} } }, '/m': {} }, mcpServers: { other: {} } });
    expect(claudeCodeHasServer(claude, '/n', 'tasks')).toBe(true);
    expect(claudeCodeHasServer(claude, '/m', 'tasks')).toBe(false);
    expect(claudeCodeHasServer(JSON.stringify({ mcpServers: { tasks: {} } }), '/m', 'tasks')).toBe(true); // user scope
    expect(claudeCodeHasServer(undefined, '/n', 'tasks')).toBe(false);
    expect(claudeCodeHasServer('{broken', '/n', 'tasks')).toBe(false);
    expect(claudeDesktopHasServer(JSON.stringify({ mcpServers: { tasks: {} } }), 'tasks')).toBe(true);
    expect(claudeDesktopHasServer(JSON.stringify({ mcpServers: {} }), 'tasks')).toBe(false);
    expect(claudeDesktopHasServer(undefined, 'tasks')).toBe(false);
  });

  it('detects a running Claude Desktop app (not Claude Code or its helpers)', () => {
    expect(claudeDesktopRunningFrom('darwin', '81111 /Applications/Claude.app/Contents/MacOS/Claude\n')).toBe(true);
    expect(claudeDesktopRunningFrom('darwin', '1825 /Applications/Claude.app/Contents/Helpers/chrome-native-host chrome-extension://x/')).toBe(false);
    expect(claudeDesktopRunningFrom('darwin', '')).toBe(false);
    // When nothing matches, pgrep fails with an error that repeats the pattern (the 10-08 bug).
    expect(claudeDesktopRunningFrom('darwin', 'Command failed: pgrep -fl Claude.app/Contents/MacOS/Claude')).toBe(false);
    expect(claudeDesktopRunningFrom('win32', 'Claude.exe                   1234 Console    1    150,000 K')).toBe(true);
    expect(claudeDesktopRunningFrom('win32', 'INFO: No tasks are running which match the specified criteria.')).toBe(false);
    expect(claudeDesktopRunningFrom('linux', 'anything')).toBe(false);
  });
});
