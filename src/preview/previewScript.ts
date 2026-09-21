/* Runs inside VS Code's built-in Markdown preview webview (contributes.markdown.previewScripts). */
// M5.0 spike: find a channel from the preview back to the extension.
declare function acquireVsCodeApi(): { postMessage(msg: unknown): void } | undefined;

interface Channel {
  name: string;
  send(command: string, args: unknown[]): boolean;
}

const channels: Channel[] = [];

// Channel A: the VS Code webview API (may already be acquired by the preview itself).
try {
  const api = acquireVsCodeApi();
  if (api) {
    channels.push({
      name: 'api',
      send: (command, args) => {
        api.postMessage({ type: 'command', source: (window as unknown as { documentUri?: string }).documentUri ?? '', body: { command, args } });
        return true;
      },
    });
  }
} catch {
  /* already acquired by the preview */
}

// Channel B: a synthetic click on a `command:` link, which the preview forwards to the extension.
channels.push({
  name: 'link',
  send: (command, args) => {
    const a = document.createElement('a');
    a.href = `command:${command}?${encodeURIComponent(JSON.stringify(args))}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  },
});

function ping(): void {
  for (const c of channels) {
    try {
      c.send('tasksmd._previewPing', [c.name]);
    } catch {
      /* ignore */
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ping);
else ping();
