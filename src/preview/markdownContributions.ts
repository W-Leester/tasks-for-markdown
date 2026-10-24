/**
 * Extensions that add to the built-in Markdown preview (M34): a markdown-it plugin (`markdown.markdownItPlugins`,
 * their `activate()` returns `extendMarkdownIt`) and/or scripts and styles for the preview page. The rendered view
 * uses the same contributions so Mermaid and the like show there too, without us bundling them. Pure: reads
 * package.json only.
 */
export interface MarkdownContribution {
  id: string;
  plugin: boolean;
  /** Paths inside the extension folder, as written in its package.json; `module` for `{ path, type: 'module' }`. */
  scripts: { path: string; module: boolean }[];
  styles: string[];
}

/** The built-in preview's own page runtime (scroll sync, its CSS): it belongs to that page and fights ours. */
const PREVIEW_ITSELF = 'vscode.markdown-language-features';

const inside = (p: string) => !p.split(/[\\/]/).includes('..');
const paths = (v: unknown): string[] => (Array.isArray(v) ? v.filter((p): p is string => typeof p === 'string' && inside(p)) : []);
const scripts = (v: unknown): { path: string; module: boolean }[] => {
  if (!Array.isArray(v)) return [];
  const out: { path: string; module: boolean }[] = [];
  for (const s of v) {
    if (typeof s === 'string' && inside(s)) out.push({ path: s, module: false });
    else if (s && typeof s === 'object' && typeof (s as { path?: unknown }).path === 'string' && inside((s as { path: string }).path)) {
      out.push({ path: (s as { path: string }).path, module: (s as { type?: unknown }).type === 'module' });
    }
  }
  return out;
};

export function findMarkdownContributions(extensions: readonly { id: string; packageJSON?: unknown }[], selfId: string): MarkdownContribution[] {
  const out: MarkdownContribution[] = [];
  for (const ext of extensions) {
    if (ext.id.toLowerCase() === selfId.toLowerCase() || ext.id.toLowerCase() === PREVIEW_ITSELF) continue;
    const c = (ext.packageJSON as { contributes?: Record<string, unknown> } | undefined)?.contributes;
    if (!c) continue;
    const found = { id: ext.id, plugin: c['markdown.markdownItPlugins'] === true, scripts: scripts(c['markdown.previewScripts']), styles: paths(c['markdown.previewStyles']) };
    if (found.plugin || found.scripts.length || found.styles.length) out.push(found);
  }
  return out;
}
