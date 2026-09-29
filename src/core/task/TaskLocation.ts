export interface TaskLocation {
  /** Index key of the file (the extension uses `Uri.toString()`); equals `path` outside VS Code. */
  key: string;
  /** Human-readable, workspace-relative path used for display and queries. */
  path: string;
  /** 0-based line number. */
  line: number;
  /** Nearest preceding markdown heading text (without `#`), or null. */
  heading: string | null;
  /** Tags declared in the file's front matter. */
  frontmatterTags: readonly string[];
  /** Nesting depth of the list item: 0 for a top-level task. */
  depth: number;
  /** Line of the parent list item (task or not), or null. */
  parentLine: number | null;
  /** Notes: the task's direct child list items without a checkbox, in file order. */
  notes?: readonly TaskNote[];
}

/** One note line under a task (`  - text`). */
export interface TaskNote {
  /** 0-based line number. */
  line: number;
  /** Item text without the list marker. */
  text: string;
}

export function unknownLocation(path = '', line = 0): TaskLocation {
  return { key: path, path, line, heading: null, frontmatterTags: [], depth: 0, parentLine: null };
}
