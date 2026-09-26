/**
 * Entry point of the `@hastycapybara/tasks-core` npm package: the vscode-free heart of the
 * extension. Parsing and serialising task lines, dates and recurrence, the query engine, the
 * in-memory index, HTML rendering and statistics — the same code the extension runs.
 */
export * from './task';
export * from './dates';
export * from './recurrence';
export * from './file';
export * from './index';
export * from './query';
export * from './render';
export * from './stats';
export * from './views';
export * from './dto';
export { setupQuery } from './query';
