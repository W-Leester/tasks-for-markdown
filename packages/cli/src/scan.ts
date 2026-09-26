import * as fs from 'node:fs';
import * as path from 'node:path';
import ignore from 'ignore';
import { parseFile } from '../../../src/core/file';
import { TaskIndex } from '../../../src/core/index';
import type { StatusRegistry } from '../../../src/core/task';
import type { CliConfig } from './config';

/** Workspace-relative posix path — also the index key outside VS Code. */
export function relPath(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join('/');
}

/** Turn exclude globs (double-star prefix/suffix) into gitignore rules understood by `ignore`. */
function globToIgnoreRule(glob: string): string {
  let g = glob.replace(/\\/g, '/');
  if (g.startsWith('**/')) g = g.slice(3);
  if (g.endsWith('/**')) g = g.slice(0, -3) + '/';
  return g;
}

function matchesInclude(rel: string, include: string[]): boolean {
  // The include globs in this project only vary by extension; honour the extensions they name.
  const exts = include.map((g) => /\.(\w+)$/.exec(g)?.[1]).filter((x): x is string => !!x);
  const ext = /\.(\w+)$/.exec(rel)?.[1];
  return !!ext && (exts.length ? exts.includes(ext) : ext === 'md');
}

/** Every Markdown file under root, minus .gitignore, the exclude globs, .git and node_modules. */
export function listMarkdownFiles(cfg: CliConfig): string[] {
  const ig = ignore();
  const gitignore = path.join(cfg.root, '.gitignore');
  if (fs.existsSync(gitignore)) ig.add(fs.readFileSync(gitignore, 'utf8'));
  ig.add(cfg.exclude.map(globToIgnoreRule));
  ig.add(['.git/', 'node_modules/']);
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const rel = relPath(cfg.root, abs);
      if (!rel) continue;
      if (e.isDirectory()) {
        if (ig.ignores(rel + '/')) continue;
        walk(abs);
      } else if (e.isFile()) {
        if (ig.ignores(rel)) continue;
        if (matchesInclude(rel, cfg.include)) out.push(abs);
      }
    }
  };
  walk(cfg.root);
  return out.sort();
}

/** Index one file's current text. */
export function indexFile(index: TaskIndex, cfg: CliConfig, registry: StatusRegistry, abs: string, text = fs.readFileSync(abs, 'utf8')): void {
  const rel = relPath(cfg.root, abs);
  const r = parseFile(text, { key: rel, path: rel, statusRegistry: registry, globalFilter: cfg.globalFilter || undefined });
  index.setFile({ key: rel, path: rel, tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags }, true);
}

export function buildIndex(cfg: CliConfig, registry: StatusRegistry): TaskIndex {
  const index = new TaskIndex();
  for (const abs of listMarkdownFiles(cfg)) indexFile(index, cfg, registry, abs);
  return index;
}
