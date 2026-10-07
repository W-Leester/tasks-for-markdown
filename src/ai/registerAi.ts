import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { t } from '../l10n';
import type { Settings } from '../settings/Settings';
import {
  ConfigParseError, claudeAddJsonArgs, claudeAddJsonCommand, claudeDesktopConfigPath, isOurLauncher, launcherFileName, launcherScript, mergeMcpServers, pathAdvice, pickBinDir, serverName, serverSpec, type McpServerSpec,
} from './mcpConfig';

/**
 * M21 (design.md 7.16): AI agents and the terminal without npm.
 * - In the editor: the bundled MCP server is registered with Cursor (`vscode.cursor.mcp`) or
 *   VS Code (`vscode.lm.registerMcpServerDefinitionProvider`), whichever exists.
 * - Outside: a stable copy in ~/.tasksmd plus an optional `tasksmd` launcher, created only by the
 *   user's commands; refreshed on activation once it exists.
 */
export interface AiDeps {
  settings: Settings;
  log: (msg: string) => void;
}

interface Runtime {
  version: string;
  execPath: string;
  launcher?: string;
}

/** Cursor's extension API (Cursor ≥ 3.x); absent in VS Code. */
interface CursorMcp {
  registerServer(config: { name: string; server: McpServerSpec }): unknown;
  unregisterServer(name: string): unknown;
}

export interface AiInternals {
  /** 'cursor' | 'vscode' | 'none' — which registration API this editor offers. */
  mode: 'cursor' | 'vscode' | 'none';
  /** Servers registered right now (empty when off or untrusted). */
  current(): { name: string; label: string; spec: McpServerSpec }[];
}

const STABLE_DIR = () => path.join(os.homedir(), '.tasksmd');
const STABLE_CLI = () => path.join(STABLE_DIR(), 'tasksmd.cjs');
const RUNTIME_FILE = () => path.join(STABLE_DIR(), 'runtime.json');

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readRuntime(): Promise<Runtime | undefined> {
  try {
    return JSON.parse(await fs.readFile(RUNTIME_FILE(), 'utf8')) as Runtime;
  } catch {
    return undefined;
  }
}

function run(cmd: string, args: string[], cwd: string): Promise<{ ok: boolean; out: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: 30_000, shell: process.platform === 'win32' }, (err, stdout, stderr) => resolve({ ok: !err, out: `${stdout}${stderr}`.trim() || (err ? err.message : '') }));
  });
}

export function registerAi(context: vscode.ExtensionContext, deps: AiDeps): AiInternals {
  const bundledCli = context.asAbsolutePath(path.join('dist', 'tasksmd.cjs'));
  const version = String((context.extension.packageJSON as { version?: string }).version ?? '0.0.0');
  const appName = vscode.env.appName;

  const localFolders = () => (vscode.workspace.workspaceFolders ?? []).filter((f) => f.uri.scheme === 'file');
  const enabled = () => deps.settings.get('mcp.autoRegister') && vscode.workspace.isTrusted;
  const wanted = () => {
    if (!enabled()) return [];
    const folders = localFolders();
    return folders.map((f) => ({
      name: serverName(f.name, folders.length),
      label: folders.length > 1 ? `Tasks for Markdown (${f.name})` : 'Tasks for Markdown',
      spec: serverSpec(process.execPath, bundledCli, f.uri.fsPath),
    }));
  };

  // ---- automatic registration in the editor ----------------------------------------------------
  const cursorMcp = (vscode as unknown as { cursor?: { mcp?: Partial<CursorMcp> } }).cursor?.mcp;
  const lm = vscode.lm as unknown as { registerMcpServerDefinitionProvider?: typeof vscode.lm.registerMcpServerDefinitionProvider } | undefined;
  let mode: AiInternals['mode'] = 'none';
  let sync: () => void = () => undefined;

  if (cursorMcp?.registerServer && cursorMcp.unregisterServer) {
    mode = 'cursor';
    const api = cursorMcp as CursorMcp;
    let registered = new Map<string, string>(); // name -> JSON of the spec
    sync = () => {
      const next = new Map(wanted().map((w) => [w.name, JSON.stringify(w.spec)] as const));
      for (const name of registered.keys()) {
        if (next.get(name) !== registered.get(name)) {
          try { void Promise.resolve(api.unregisterServer(name)).catch((err) => deps.log(`mcp unregister ${name}: ${String(err)}`)); } catch (err) { deps.log(`mcp unregister ${name}: ${String(err)}`); }
        }
      }
      for (const w of wanted()) {
        if (registered.get(w.name) === JSON.stringify(w.spec)) continue;
        try { void Promise.resolve(api.registerServer({ name: w.name, server: w.spec })).catch((err) => deps.log(`mcp register ${w.name}: ${String(err)}`)); } catch (err) { deps.log(`mcp register ${w.name}: ${String(err)}`); }
      }
      registered = next;
      deps.log(`mcp (Cursor): ${[...next.keys()].join(', ') || 'none'}`);
    };
    context.subscriptions.push({ dispose: () => { for (const name of registered.keys()) { try { void api.unregisterServer(name); } catch { /* window closing */ } } } });
  } else if (lm?.registerMcpServerDefinitionProvider) {
    mode = 'vscode';
    const changed = new vscode.EventEmitter<void>();
    context.subscriptions.push(
      changed,
      lm.registerMcpServerDefinitionProvider('tasksmd.mcp', {
        onDidChangeMcpServerDefinitions: changed.event,
        provideMcpServerDefinitions: () => wanted().map((w) => new vscode.McpStdioServerDefinition(w.label, w.spec.command, w.spec.args, w.spec.env, version)),
      }),
    );
    sync = () => {
      changed.fire();
      deps.log(`mcp (VS Code): ${wanted().map((w) => w.name).join(', ') || 'none'}`);
    };
  }
  sync();
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => sync()),
    vscode.workspace.onDidGrantWorkspaceTrust(() => sync()),
    deps.settings.onDidChange(() => sync(), ['mcp.autoRegister']),
  );

  // ---- stable copy for tools outside the editor ------------------------------------------------
  /** Copy the CLI to ~/.tasksmd (when missing or from another version) and record how to run it. */
  const ensureRuntime = async (): Promise<string> => {
    await fs.mkdir(STABLE_DIR(), { recursive: true });
    const rt = await readRuntime();
    if (rt?.version !== version || !(await exists(STABLE_CLI()))) await fs.copyFile(bundledCli, STABLE_CLI());
    const next: Runtime = { ...rt, version, execPath: process.execPath };
    if (next.launcher && (await exists(next.launcher))) {
      const text = await fs.readFile(next.launcher, 'utf8');
      // The editor may have moved since the launcher was written: keep it pointing at this one.
      if (isOurLauncher(text)) {
        const script = launcherScript(process.platform, process.execPath, STABLE_CLI());
        if (text !== script) await fs.writeFile(next.launcher, script, { mode: 0o755 });
      }
    }
    await fs.writeFile(RUNTIME_FILE(), JSON.stringify(next, null, 2) + '\n');
    return STABLE_CLI();
  };
  // Only refresh what the user already set up; never create ~/.tasksmd on our own.
  if (context.extensionMode !== vscode.ExtensionMode.Test) {
    void exists(STABLE_DIR()).then((has) => (has ? ensureRuntime() : undefined)).catch((err) => deps.log(`runtime refresh: ${String(err)}`));
  }

  // ---- commands ---------------------------------------------------------------------------------
  const fail = (err: unknown) => {
    deps.log(String(err));
    void vscode.window.showErrorMessage(t('Tasks: {0}', err instanceof Error ? err.message : String(err)));
  };

  const installCli = async () => {
    const cli = await ensureRuntime();
    const { dir, onPath } = pickBinDir(process.platform, os.homedir(), process.env.PATH ?? '', process.env.LOCALAPPDATA);
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, launcherFileName(process.platform));
    if ((await exists(target)) && !isOurLauncher(await fs.readFile(target, 'utf8'))) {
      void vscode.window.showWarningMessage(t('A different "tasksmd" already exists at {0}; it was not replaced.', target));
      return;
    }
    await fs.writeFile(target, launcherScript(process.platform, process.execPath, cli), { mode: 0o755 });
    const rt = await readRuntime();
    await fs.writeFile(RUNTIME_FILE(), JSON.stringify({ ...rt, version, execPath: process.execPath, launcher: target }, null, 2) + '\n');
    deps.log(`installed launcher ${target}`);
    if (onPath) {
      void vscode.window.showInformationMessage(t('Installed the "tasksmd" command ({0}). Open a new terminal and run: tasksmd --help', target));
      return;
    }
    const copy = t('Copy the line');
    const line = pathAdvice(process.platform, dir);
    const choice = await vscode.window.showInformationMessage(t('Installed the "tasksmd" command in {0}, which is not on your PATH yet. Add this line to your shell profile (for example ~/.zshrc), then open a new terminal: {1}', dir, line), copy);
    if (choice === copy) await vscode.env.clipboard.writeText(line);
  };

  const uninstallCli = async () => {
    const rt = await readRuntime();
    const candidates = [rt?.launcher, path.join(pickBinDir(process.platform, os.homedir(), process.env.PATH ?? '', process.env.LOCALAPPDATA).dir, launcherFileName(process.platform))].filter((p): p is string => !!p);
    for (const p of candidates) {
      if ((await exists(p)) && isOurLauncher(await fs.readFile(p, 'utf8'))) {
        await fs.rm(p);
        if (rt) await fs.writeFile(RUNTIME_FILE(), JSON.stringify({ ...rt, launcher: undefined }, null, 2) + '\n');
        void vscode.window.showInformationMessage(t('Removed the "tasksmd" command ({0}).', p));
        return;
      }
    }
    void vscode.window.showInformationMessage(t('The "tasksmd" command is not installed.'));
  };

  const connectClaudeCode = async () => {
    const cli = await ensureRuntime();
    const folders = localFolders();
    if (!folders.length) return void vscode.window.showWarningMessage(t('Open a folder first.'));
    const probe = await run('claude', ['--version'], folders[0]!.uri.fsPath);
    for (const f of folders) {
      const name = serverName(f.name, folders.length);
      const spec = serverSpec(process.execPath, cli, f.uri.fsPath);
      if (!probe.ok) {
        const copy = t('Copy the command');
        const cmd = `cd ${JSON.stringify(f.uri.fsPath)} && ${claudeAddJsonCommand(name, spec)}`;
        if ((await vscode.window.showWarningMessage(t('The "claude" command was not found. Run this in a terminal to connect Claude Code: {0}', cmd), copy)) === copy) await vscode.env.clipboard.writeText(cmd);
        continue;
      }
      const r = await run('claude', claudeAddJsonArgs(name, spec), f.uri.fsPath);
      deps.log(`claude mcp add-json ${name}: ${r.ok ? 'ok' : 'failed'} ${r.out}`);
      if (r.ok) void vscode.window.showInformationMessage(t('Connected Claude Code to "{0}" (server "{1}", this project on this computer). Start a new Claude Code session to use it.', f.name, name));
      else void vscode.window.showWarningMessage(t('Claude Code: {0}', r.out));
    }
  };

  const connectClaudeDesktop = async () => {
    const file = claudeDesktopConfigPath(process.platform, os.homedir(), process.env.APPDATA);
    if (!file) return void vscode.window.showWarningMessage(t('Claude Desktop is not available on this system.'));
    if (!(await exists(path.dirname(file)))) return void vscode.window.showWarningMessage(t('Claude Desktop does not seem to be installed ({0} not found).', path.dirname(file)));
    const cli = await ensureRuntime();
    const folders = localFolders();
    if (!folders.length) return void vscode.window.showWarningMessage(t('Open a folder first.'));
    const before = (await exists(file)) ? await fs.readFile(file, 'utf8') : undefined;
    let text = before;
    const names: string[] = [];
    try {
      for (const f of folders) {
        const name = serverName(f.name, folders.length);
        text = mergeMcpServers(text, 'mcpServers', name, serverSpec(process.execPath, cli, f.uri.fsPath)).text;
        names.push(name);
      }
    } catch (err) {
      if (err instanceof ConfigParseError) return void vscode.window.showErrorMessage(t('Tasks: {0}', t('Could not read {0}: {1}. Fix the file and try again; it was not changed.', file, err.message)));
      throw err;
    }
    const ok = t('Update');
    const detail = t('Adds or updates the MCP server(s) {0} in {1}. Other servers and settings are kept; a backup is saved next to the file.', names.join(', '), file);
    if ((await vscode.window.showInformationMessage(t('Connect Claude Desktop to your tasks?'), { modal: true, detail }, ok)) !== ok) return;
    if (before !== undefined) await fs.writeFile(`${file}.bak`, before);
    await fs.writeFile(file, text!);
    deps.log(`claude desktop config updated: ${names.join(', ')}`);
    void vscode.window.showInformationMessage(t('Connected Claude Desktop. Quit and reopen Claude Desktop to load it.'));
  };

  const connectAi = async () => {
    const status = mode === 'none' ? t('this version has no MCP registration API') : enabled() ? t('connected automatically') : vscode.workspace.isTrusted ? t('off (tasksmd.mcp.autoRegister)') : t('off in untrusted workspaces');
    type Item = vscode.QuickPickItem & { run?: () => Promise<void> };
    // This editor's own agent is connected automatically, so it is a status line, not a choice;
    // only when the setting is off can it be picked (to turn it back on).
    const items: Item[] = [{ label: `${appName}: ${status}`, kind: vscode.QuickPickItemKind.Separator }];
    if (mode !== 'none' && vscode.workspace.isTrusted && !deps.settings.get('mcp.autoRegister')) {
      items.push({
        label: `$(sparkle) ${appName}`, description: t('turn automatic connection back on'), detail: t("This editor's AI agent"),
        run: async () => {
          await deps.settings.update('mcp.autoRegister', true, vscode.ConfigurationTarget.Global);
          void vscode.window.showInformationMessage(t('{0}: {1}', appName, t('connected automatically')));
        },
      });
    }
    items.push({ label: t('Other AI tools'), kind: vscode.QuickPickItemKind.Separator },
      { label: '$(terminal) Claude Code', description: t('this project, this computer'), detail: t('Runs "claude mcp add-json --scope local"'), run: connectClaudeCode });
    if (claudeDesktopConfigPath(process.platform, os.homedir(), process.env.APPDATA)) items.push({ label: '$(device-desktop) Claude Desktop', description: t('edits its config file after asking'), run: connectClaudeDesktop });
    const picked = await vscode.window.showQuickPick(items, { canPickMany: true, title: t('Connect AI agents to your tasks (MCP)'), placeHolder: t('Choose where to connect') });
    for (const p of picked ?? []) await p.run?.();
  };

  const guard = (fn: () => Promise<void>) => () => fn().catch(fail);
  context.subscriptions.push(
    vscode.commands.registerCommand('tasksmd.connectAi', guard(connectAi)),
    vscode.commands.registerCommand('tasksmd.installCli', guard(installCli)),
    vscode.commands.registerCommand('tasksmd.uninstallCli', guard(uninstallCli)),
    // Cursor has no "Welcome: Open Walkthrough…", so offer our own entry (as the Claude Code extension does).
    vscode.commands.registerCommand('tasksmd.openWalkthrough', (step?: unknown) => {
      const category = `${context.extension.id}#tasksmd.start`;
      return vscode.commands.executeCommand('workbench.action.openWalkthrough', typeof step === 'string' ? { category, step: `${category}#${step}` } : category, false);
    }),
  );
  // ---- the first launches: open the guide once, offer the terminal command up to 3 times -------
  const LAUNCHES = 'onboarding.launches', DONE = 'onboarding.done';
  const cliPresent = async () => {
    const rt = await readRuntime();
    if (rt?.launcher && (await exists(rt.launcher))) return true;
    for (const dir of (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)) if (await exists(path.join(dir, launcherFileName(process.platform)))) return true;
    return false;
  };
  const onboard = async () => {
    const state = context.globalState;
    const launch = (state.get<number>(LAUNCHES) ?? 0) + 1;
    await state.update(LAUNCHES, launch);
    if (launch === 1) await vscode.commands.executeCommand('tasksmd.openWalkthrough');
    if (launch > 3 || state.get<boolean>(DONE)) return;
    const offerInstall = !(await cliPresent());
    const install = t("Install 'tasksmd' command"), why = t('What can it do?'), guide = t('Open the guide'), never = t("Don't show again");
    const buttons = offerInstall ? [install, why, never] : launch > 1 ? [guide, never] : [];
    if (!buttons.length) return; // nothing to offer
    const message = offerInstall
      ? t('Tasks for Markdown: install the "tasksmd" command to check, add and complete tasks from any terminal, in scripts and with terminal AI agents (no npm needed).')
      : t('Tasks for Markdown: open the Get Started guide to see what it can do.');
    const choice = await vscode.window.showInformationMessage(message, ...buttons);
    if (choice === install) { await state.update(DONE, true); await installCli(); }
    else if (choice === why) await vscode.commands.executeCommand('tasksmd.openWalkthrough', 'cli');
    else if (choice === guide) await vscode.commands.executeCommand('tasksmd.openWalkthrough');
    else if (choice === never) await state.update(DONE, true);
  };
  if (context.extensionMode !== vscode.ExtensionMode.Test) void onboard().catch((err) => deps.log(`onboarding: ${String(err)}`));

  deps.log(`mcp registration: ${mode}`);
  return { mode, current: wanted };
}
