/**
 * The translation bundle as an inert JSON block for the webview HTML, so the first render is
 * already translated (the `state/init` message arrives after the app has painted, and `t()` in
 * Svelte markup does not re-run). `<` is escaped so the text cannot close the script element.
 */
export const L10N_BLOCK_ID = 'tfm-l10n';

export function l10nBlock(bundle: Record<string, string>): string {
  const json = JSON.stringify(bundle).replace(/</g, '\\u003c');
  return `<script type="application/json" id="${L10N_BLOCK_ID}">${json}</script>`;
}
