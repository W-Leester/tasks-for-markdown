/**
 * Keys the editor does itself stay in the webview; other Cmd/Ctrl shortcuts (copy, paste, cut, save, Cmd+P, Cmd+W…)
 * go on to VS Code, which in the desktop app does copy/paste for the webview (incidents 48). Undo stays here: passed
 * on, VS Code would undo the note behind the editor's back.
 */
const OWN_CMD_KEYS = new Set([65, 70, 71, 89, 90, 68, 76, 191, 219, 221, 13]); // A F G Y Z D L / [ ] Enter
export function keepKey(e: Pick<KeyboardEvent, 'keyCode' | 'code' | 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>, mac: boolean): boolean {
  const k = e.keyCode === 229 && /^Key[A-Z]$/.test(e.code) ? e.code.charCodeAt(3) : e.keyCode;
  const cmd = (e.metaKey || (e.ctrlKey && !mac)) && !e.altKey;
  if (cmd) return OWN_CMD_KEYS.has(k) || (k === 86 && e.shiftKey);
  // F1…F12 and Ctrl shortcuts on macOS (Ctrl+Tab, Ctrl+`) are the editor app's; Ctrl+letter there is a text key (Ctrl+A/E/K).
  if (k >= 112 && k <= 123) return false;
  if (mac && e.ctrlKey && !/^Key[A-Z]$/.test(e.code)) return false;
  return true; // typing, Enter, Tab, arrows, Backspace, Escape…
}
