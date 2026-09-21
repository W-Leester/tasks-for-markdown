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
}

export function unknownLocation(path = '', line = 0): TaskLocation {
  return { key: path, path, line, heading: null, frontmatterTags: [], depth: 0, parentLine: null };
}
