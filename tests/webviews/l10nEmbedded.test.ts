import { afterEach, describe, expect, it, vi } from 'vitest';
import { l10nBlock } from '../../src/webviewHost/l10nBlock';

/** The first paint must already be translated: the bundle comes from the page, not the later state/init message. */
afterEach(() => { document.getElementById('tfm-l10n')?.remove(); vi.resetModules(); });

async function withEmbedded(bundle: Record<string, string>) {
  document.body.insertAdjacentHTML('beforeend', l10nBlock(bundle));
  vi.resetModules();
}

describe('webview l10n from the embedded bundle', () => {
  it('t() reads the bundle before any message', async () => {
    await withEmbedded({ Columns: '열', 'Moved to {0}': '{0}(으)로 이동' });
    const { t } = await import('../../src/webviews/shared/l10n');
    expect(t('Columns')).toBe('열');
    expect(t('Moved to {0}', '완료')).toBe('완료(으)로 이동');
  });

  it('falls back to the English key without a block or with broken JSON', async () => {
    document.body.insertAdjacentHTML('beforeend', '<script type="application/json" id="tfm-l10n">{oops</script>');
    vi.resetModules();
    const { t } = await import('../../src/webviews/shared/l10n');
    expect(t('Columns')).toBe('Columns');
  });

});
