/**
 * Messages exchanged between the extension host and every Svelte webview (D§5.6). Both sides import
 * this file, so the union is the single source of truth. Filled in during M6.
 */
export type ToWebview = { type: 'state/init'; locale: string } | { type: 'state/patch' };
export type FromWebview = { type: 'ui/ready' };
