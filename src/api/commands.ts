import * as vscode from 'vscode';
import { toApiError } from './TasksApiImpl';
import type { TasksApi } from './types';

type Arg = Record<string, unknown>;

/**
 * Command surface (docs/api-plan.md §4.5): one hidden command per API method, taking a single
 * JSON argument with named parameters and resolving to the method's JSON result, or to
 * `{ error: { code, message } }` instead of rejecting so that keybindings and non-TypeScript
 * callers get something inspectable.
 */
export const API_COMMANDS: Record<string, (api: TasksApi, a: Arg) => Promise<unknown>> = {
  'tasksmd.api.query.run': (api, a) => api.query.run(a.query as string, { source: a.source as string | undefined, limit: a.limit as number | undefined }),
  'tasksmd.api.query.explain': (api, a) => api.query.explain(a.query as string, a.source as string | undefined),
  'tasksmd.api.query.get': (api, a) => api.query.get(a.ref as never),
  'tasksmd.api.query.list': (api, a) => api.query.list({ paths: a.paths as string[] | undefined }),
  'tasksmd.api.query.saved': (api) => api.query.saved(),
  'tasksmd.api.edit.create': (api, a) => api.edit.create(a.input as never, a.target as never),
  'tasksmd.api.edit.update': (api, a) => api.edit.update(a.ref as never, a.changes as never),
  'tasksmd.api.edit.setStatus': (api, a) => api.edit.setStatus(a.ref as never, a.symbol as string),
  'tasksmd.api.edit.toggle': (api, a) => api.edit.toggle(a.ref as never),
  'tasksmd.api.edit.postpone': (api, a) => api.edit.postpone(a.ref as never, a.to as string),
  'tasksmd.api.edit.remove': (api, a) => api.edit.remove(a.ref as never),
  'tasksmd.api.edit.batch': (api, a) => api.edit.batch(a.ops as never),
  'tasksmd.api.ui.openEdit': (api, a) => api.ui.openEdit(a.ref as never),
  'tasksmd.api.ui.openKanban': (api, a) => api.ui.openKanban(a as never),
  'tasksmd.api.ui.openCalendar': (api, a) => api.ui.openCalendar(a as never),
  'tasksmd.api.ui.openQueryResults': (api, a) => api.ui.openQueryResults(a.query as string, a.source as string | undefined),
  'tasksmd.api.ui.reveal': (api, a) => api.ui.reveal(a.ref as never),
};

export function registerApiCommands(context: vscode.ExtensionContext, api: TasksApi): void {
  for (const [id, fn] of Object.entries(API_COMMANDS)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, async (arg?: unknown) => {
        try {
          const result = await fn(api, (arg && typeof arg === 'object' ? arg : {}) as Arg);
          return result === undefined ? null : result;
        } catch (err) {
          return { error: toApiError(err) };
        }
      }),
    );
  }
}
