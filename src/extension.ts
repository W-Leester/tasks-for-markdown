import * as vscode from 'vscode';
import { registerCommands } from './commands/registerCommands';
import { TaskIndex } from './core/index';
import { StatusRegistry } from './core/task';
import { TaskDecorations } from './editor/TaskDecorations';
import { TaskLineContext } from './editor/TaskLineContext';
import { IndexService } from './index/IndexService';
import { TaskEditService } from './services/TaskEditService';
import { Settings } from './settings/Settings';
import { registerTreeView } from './views/registerTreeView';
import { StatusBar } from './views/StatusBar';

const output = vscode.window.createOutputChannel('Tasks for Markdown');
const log = (msg: string) => output.appendLine(`[${new Date().toISOString()}] ${msg}`);

export interface ExtensionApi {
  index: TaskIndex;
  indexService: IndexService;
  editService: TaskEditService;
  settings: Settings;
}

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionApi> {
  log(`activate ${context.extension.packageJSON.version}`);

  const settings = new Settings();
  const index = new TaskIndex();
  // M3 replaces this with a registry built from settings.
  const statusRegistry = StatusRegistry.default();
  const getStatusRegistry = () => statusRegistry;
  const indexService = new IndexService({ index, settings, getStatusRegistry, log });
  const editService = new TaskEditService({ settings, indexService, getStatusRegistry });

  context.subscriptions.push(output, settings, indexService, new TaskLineContext(), { dispose: () => index.dispose() });
  registerCommands(context, { index, indexService, editService, settings, getStatusRegistry, log });
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.showLogs', () => output.show()));
  registerTreeView(context, { index, settings, state: context.workspaceState, editService, log });
  context.subscriptions.push(new StatusBar(index), new TaskDecorations({ index, settings, getStatusRegistry }));

  // Drives the welcome view: shown only when the index is ready and holds no tasks.
  const updateEmpty = () => void vscode.commands.executeCommand('setContext', 'tasksmd.indexEmpty', index.state === 'ready' && index.taskCount() === 0);
  index.onDidChange(updateEmpty);
  index.onDidChangeProgress(updateEmpty);

  void indexService.start();
  return { index, indexService, editService, settings };
}

export function deactivate(): void {
  log('deactivate');
}
