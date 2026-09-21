import { registerLayout } from './layout';

let registered = false;
/** Idempotent: installs every instruction parser into Query. Called by the module consumers. */
export function setupQuery(): void {
  if (registered) return;
  registered = true;
  registerLayout();
}
setupQuery();

export { Query } from './Query';
export { tokenize, expandPlaceholders } from './tokenizer';
export type { Filter, Grouper, GroupNode, Layout, LayoutElement, QueryContext, QueryError, QueryResult, QuerySource, Sorter } from './types';
