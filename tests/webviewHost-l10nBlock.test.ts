import { describe, expect, it } from 'vitest';
import { L10N_BLOCK_ID, l10nBlock } from '../src/webviewHost/l10nBlock';

describe('l10nBlock (bundle embedded in the webview HTML)', () => {
  it('is an inert JSON script with the bundle', () => {
    const html = l10nBlock({ Columns: '열', Tasks: '태스크' });
    expect(html).toMatch(new RegExp(`^<script type="application/json" id="${L10N_BLOCK_ID}">`));
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
    expect(JSON.parse(json)).toEqual({ Columns: '열', Tasks: '태스크' });
  });

  it('cannot close the script element early', () => {
    const html = l10nBlock({ x: '</script><script>alert(1)</script>', y: '<!--' });
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain('<!--');
    const json = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
    expect(JSON.parse(json).x).toBe('</script><script>alert(1)</script>');
  });
});
