import * as vscode from 'vscode';
import { TaskIndex } from './core/index';
import { StatusRegistry } from './core/task';
import { IndexService } from './index/IndexService';
import { Settings } from './settings/Settings';

const output = vscode.window.createOutputChannel('Tasks for Markdown');
const log = (msg: string) => output.appendLine(`[${new Date().toISOString()}] ${msg}`);

export interface ExtensionApi {
  index: TaskIndex;
  indexService: IndexService;
  settings: Settings;
}

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionApi> {
  log(`activate ${context.extension.packageJSON.version}`);

  const settings = new Settings();
  const index = new TaskIndex();
  // M3 replaces this with a registry built from settings.
  const statusRegistry = StatusRegistry.default();
  const indexService = new IndexService({ index, settings, getStatusRegistry: () => statusRegistry, log });

  context.subscriptions.push(
    output,
    settings,
    indexService,
    { dispose: () => index.dispose() },
    vscode.commands.registerCommand('tasksmd.reindex', () => indexService.rescan()),
    vscode.commands.registerCommand('tasksmd.showLogs', () => output.show()),
  );

  void indexService.start();
  return { index, indexService, settings };
}

export function deactivate(): void {
  log('deactivate');
}
