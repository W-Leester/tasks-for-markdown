import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CliConfig } from './config';

export interface SavedQueryInfo { id: string; name: string; query: string; source: 'settings' | 'file' }


/** First ```tasks block of a query note, like the extension's SavedQueryStore. */
export function queryFromNote(text: string): string {
  const m = /```tasks[^\n]*\n([\s\S]*?)```/.exec(text);
  return (m?.[1] ?? '').trimEnd();
}

/** Saved queries: `tasksmd.savedQueries` in settings plus every `.tasks/queries/NAME.md` note under root. */
export function listSavedQueries(cfg: CliConfig): SavedQueryInfo[] {
  const out: SavedQueryInfo[] = cfg.savedQueries.map((q, i) => ({ id: `settings:${i}`, name: q.name, query: q.query, source: 'settings' as const }));
  const walk = (dir: string, depth: number) => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name === 'node_modules' || e.name === '.git') continue;
      const abs = path.join(dir, e.name);
      if (e.name === '.tasks') {
        const qdir = path.join(abs, 'queries');
        if (fs.existsSync(qdir)) {
          for (const f of fs.readdirSync(qdir).filter((n) => n.endsWith('.md')).sort()) {
            const file = path.join(qdir, f);
            const rel = path.relative(cfg.root, file).split(path.sep).join('/');
            out.push({ id: rel, name: f.replace(/\.md$/, ''), query: queryFromNote(fs.readFileSync(file, 'utf8')), source: 'file' });
          }
        }
        continue;
      }
      if (depth < 8) walk(abs, depth + 1);
    }
  };
  walk(cfg.root, 0);
  return out;
}
