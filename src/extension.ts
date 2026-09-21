import * as vscode from 'vscode';
import { registerEditCommands } from './commands/editCommands';
import { registerCommands } from './commands/registerCommands';
import { TaskIndex } from './core/index';
import { StatusRegistry } from './core/task';
import { TaskCodeLensProvider } from './editor/TaskCodeLensProvider';
import { TaskCompletionProvider } from './editor/TaskCompletionProvider';
import { TaskDecorations } from './editor/TaskDecorations';
import { TaskHoverProvider } from './editor/TaskHoverProvider';
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
  const commandDeps = { index, indexService, editService, settings, getStatusRegistry, log };
  registerCommands(context, commandDeps);
  registerEditCommands(context, commandDeps);
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.showLogs', () => output.show()));
  registerTreeView(context, { index, settings, state: context.workspaceState, editService, log });
  context.subscriptions.push(new StatusBar(index), new TaskDecorations({ index, settings, getStatusRegistry }));
  const markdown: vscode.DocumentSelector = { language: 'markdown' };
  const codeLens = new TaskCodeLensProvider({ settings, getStatusRegistry });
  context.subscriptions.push(codeLens, vscode.languages.registerCodeLensProvider(markdown, codeLens));
  context.subscriptions.push(vscode.languages.registerHoverProvider(markdown, new TaskHoverProvider({ index, settings, getStatusRegistry })));
  // Markdown has quickSuggestions off by default, so a space is the trigger (like Obsidian's auto-suggest).
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(markdown, new TaskCompletionProvider({ index, settings }), ' '));

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
