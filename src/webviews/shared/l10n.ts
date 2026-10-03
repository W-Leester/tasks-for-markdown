/** Bundle embedded in the page by the host (src/webviewHost/l10nBlock.ts), so the first render is translated. */
function embedded(): Record<string, string> {
  try {
    const text = typeof document === 'undefined' ? null : document.getElementById('tfm-l10n')?.textContent;
    return text ? (JSON.parse(text) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

let bundle: Record<string, string> = embedded();

export function setBundle(b: Record<string, string>): void {
  bundle = b;
}

/** vscode.l10n.t-compatible: english key, {0} placeholders. */
export function t(key: string, ...args: (string | number)[]): string {
  const s = bundle[key] ?? key;
  return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}
