let bundle: Record<string, string> = {};

export function setBundle(b: Record<string, string>): void {
  bundle = b;
}

/** vscode.l10n.t-compatible: english key, {0} placeholders. */
export function t(key: string, ...args: (string | number)[]): string {
  const s = bundle[key] ?? key;
  return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}
