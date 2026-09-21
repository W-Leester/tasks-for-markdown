import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * `t()` for the extension host. Follows VS Code's display language by default (vscode.l10n), but
 * `tasksmd.language` can force a bundle regardless of the editor language — most of our users
 * run an English Cursor/VS Code and still want Korean task UI.
 *
 * Limits: command titles, setting descriptions and view names come from package.nls.* and are
 * resolved by VS Code itself, so they always follow the editor language.
 */
let forced: Record<string, string> | null = null;
let forcedLang = 'auto';

export function configureLanguage(extensionPath: string, language: string): void {
  forcedLang = language;
  if (language === 'auto' || language === 'en') {
    forced = language === 'en' ? {} : null;
    return;
  }
  try {
    forced = JSON.parse(fs.readFileSync(path.join(extensionPath, 'l10n', `bundle.l10n.${language}.json`), 'utf8')) as Record<string, string>;
  } catch {
    forced = null;
  }
}

export function currentLanguage(): string {
  return forcedLang === 'auto' ? vscode.env.language : forcedLang;
}

/** The bundle handed to webviews (english key -> translated string). */
export function currentBundle(): Record<string, string> {
  if (forced) return forced;
  return (vscode.l10n.bundle as Record<string, string> | undefined) ?? {};
}

export function t(message: string, ...args: (string | number | boolean)[]): string {
  if (forced) {
    const s = forced[message] ?? message;
    return s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
  }
  return vscode.l10n.t(message, ...args);
}
