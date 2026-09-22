import * as vscode from 'vscode';
import { registerConvertCommand } from './commands/convertCommand';
import { registerEditCommands } from './commands/editCommands';
import { registerQueryCommands } from './commands/queryCommands';
import { registerCommands } from './commands/registerCommands';
import { registerStatusCommands } from './commands/statusCommands';
import { TaskIndex } from './core/index';
import { TaskCodeLensProvider } from './editor/TaskCodeLensProvider';
import { TaskCompletionProvider } from './editor/TaskCompletionProvider';
import { TaskDecorations } from './editor/TaskDecorations';
import { TaskDiagnostics } from './editor/TaskDiagnostics';
import { TaskHoverProvider } from './editor/TaskHoverProvider';
import { TaskLineContext } from './editor/TaskLineContext';
import { IndexService } from './index/IndexService';
import { PreviewIntegration } from './preview/PreviewIntegration';
import { ArchiveService } from './services/ArchiveService';
import { NotificationService } from './services/NotificationService';
import { QueryService } from './services/QueryService';
import { SavedQueryStore } from './services/SavedQueryStore';
import { TaskEditService } from './services/TaskEditService';
import { UpdateCheckService } from './services/UpdateCheckService';
import { Settings } from './settings/Settings';
import { statusRegistryFromSettings } from './settings/statusRegistryFromSettings';
import { registerSavedQueryView } from './views/registerSavedQueryView';
import { registerTreeView } from './views/registerTreeView';
import { registerWebviews } from './webviewHost/registerWebviews';
import type { WebviewHost } from './webviewHost/WebviewHost';
import { StatusBar } from './views/StatusBar';
import { configureLanguage, t } from './l10n';

const output = vscode.window.createOutputChannel('Tasks for Markdown');
const log = (msg: string) => output.appendLine(`[${new Date().toISOString()}] ${msg}`);

export interface ExtensionApi {
  index: TaskIndex;
  indexService: IndexService;
  editService: TaskEditService;
  queries: QueryService;
  savedQueries: SavedQueryStore;
  settings: Settings;
  archive: ArchiveService;
  preview: PreviewIntegration;
  /** Consumed by VS Code's built-in Markdown extension (contributes.markdown.markdownItPlugins). */
  extendMarkdownIt(md: import('markdown-it').MarkdownIt): import('markdown-it').MarkdownIt;
  webviews: { openEdit: (target: { key: string | null; line: number | null }) => WebviewHost; openKanban: () => WebviewHost; openQueryBuilder: (id: string | null) => WebviewHost; openStats: () => WebviewHost; openCalendar: () => WebviewHost; openQueryResults: (target: { text: string; source: string; label: string } | null) => WebviewHost };
}

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionApi> {
  log(`activate ${context.extension.packageJSON.version} (${vscode.env.appName} ${vscode.version}, ${vscode.env.language}, trusted=${vscode.workspace.isTrusted})`);

  const settings = new Settings();
  configureLanguage(context.extensionPath, settings.get('language'));
  context.subscriptions.push(
    settings.onDidChange(async () => {
      const reload = t('Reload window');
      if ((await vscode.window.showInformationMessage(t('Tasks: reload the window to apply the language change.'), reload)) === reload) void vscode.commands.executeCommand('workbench.action.reloadWindow');
    }, ['language']),
  );
  const index = new TaskIndex();
  let statusRegistry = statusRegistryFromSettings(settings, log);
  const getStatusRegistry = () => statusRegistry;
  const indexService = new IndexService({ index, settings, getStatusRegistry, log });
  const editService = new TaskEditService({ settings, indexService, index, getStatusRegistry });
  const queries = new QueryService(index, settings);
  const savedQueries = new SavedQueryStore(settings);
  context.subscriptions.push(queries, savedQueries);

  context.subscriptions.push(output, settings, indexService, new TaskLineContext(), { dispose: () => index.dispose() });
  const webviews = registerWebviews(context, { context, index, settings, queries, savedQueries, editService, indexService, getStatusRegistry, log });
  const commandDeps = { index, indexService, editService, settings, getStatusRegistry, log };
  registerCommands(context, commandDeps);
  registerEditCommands(context, { ...commandDeps, openEdit: (target) => webviews.openEdit(target) });
  registerStatusCommands(context, commandDeps);
  registerConvertCommand(context, commandDeps);
  registerQueryCommands(context, { ...commandDeps, queries, openQueryResults: webviews.openQueryResults });
  // Status types decide isDone/isCompleted, so a change means every file must be re-parsed.
  context.subscriptions.push(
    settings.onDidChange(() => {
      statusRegistry = statusRegistryFromSettings(settings, log);
      void indexService.rescan();
    }, ['statuses']),
  );
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.showLogs', () => output.show()));
  registerTreeView(context, { index, settings, state: context.workspaceState, editService, log });
  registerSavedQueryView(context, { store: savedQueries, queries, settings, editService, log });
  context.subscriptions.push(new StatusBar(index), new TaskDecorations({ index, settings, getStatusRegistry }));
  const markdown: vscode.DocumentSelector = { language: 'markdown' };
  const codeLens = new TaskCodeLensProvider({ settings, getStatusRegistry });
  context.subscriptions.push(codeLens, vscode.languages.registerCodeLensProvider(markdown, codeLens));
  context.subscriptions.push(vscode.languages.registerHoverProvider(markdown, new TaskHoverProvider({ index, settings, getStatusRegistry })));
  // Markdown has quickSuggestions off by default, so a space is the trigger (like Obsidian's auto-suggest).
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(markdown, new TaskCompletionProvider({ index, settings }), ' '));
  const diagnostics = new TaskDiagnostics({ index, settings, getStatusRegistry });
  context.subscriptions.push(diagnostics, vscode.languages.registerCodeActionsProvider(markdown, diagnostics, { providedCodeActionKinds: TaskDiagnostics.providedCodeActionKinds }));

  // Drives the welcome view: shown only when the index is ready and holds no tasks.
  const updateEmpty = () => void vscode.commands.executeCommand('setContext', 'tasksmd.indexEmpty', index.state === 'ready' && index.taskCount() === 0);
  index.onDidChange(updateEmpty);
  index.onDidChangeProgress(updateEmpty);

  const preview = new PreviewIntegration({ index, queries, settings, getStatusRegistry, log });
  context.subscriptions.push(preview);

  const archive = new ArchiveService({ index, indexService, settings, log });
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.archiveCompleted', () => archive.run().catch((err) => { log(String(err)); void vscode.window.showErrorMessage(t('Tasks: {0}', err instanceof Error ? err.message : String(err))); })));
  const notifications = new NotificationService({ index, settings, state: context.globalState, log });
  context.subscriptions.push(notifications);
  // Not during tests: toasts would block the runner.
  if (context.extensionMode !== vscode.ExtensionMode.Test) notifications.start();

  const updates = new UpdateCheckService(context, settings, log);
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.checkForUpdates', () => updates.check(true)));
  if (context.extensionMode !== vscode.ExtensionMode.Test) void updates.checkOnStartup();

  void indexService.start();
  return { index, indexService, editService, queries, savedQueries, settings, archive, preview, extendMarkdownIt: (md) => preview.extendMarkdownIt(md), webviews };
}

export function deactivate(): void {
  log('deactivate');
}
