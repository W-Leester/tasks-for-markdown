import { registerFilters } from './filters';
import { registerFunctions } from './functions';
import { registerLayout } from './layout';
import { registerSortGroup } from './sortGroup';

let registered = false;
/** Idempotent: installs every instruction parser into Query. Called by the module consumers. */
export function setupQuery(): void {
  if (registered) return;
  registered = true;
  registerFunctions();
  registerFilters();
  registerLayout();
  registerSortGroup();
}
setupQuery();

export { Query } from './Query';
export { tokenize, expandPlaceholders } from './tokenizer';
export type { Filter, Grouper, GroupNode, Layout, LayoutElement, QueryContext, QueryError, QueryResult, QuerySource, Sorter } from './types';
export { parseBoolean, fileFolder, fileName, fileRoot } from './filters';
export { toScriptTask, type ScriptTask } from './functions';
