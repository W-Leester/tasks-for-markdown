import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SETTINGS_DEFAULTS, SETTINGS_KEYS, SETTINGS_SECTION } from '../../src/settings/schema';

// Guards against package.json and schema.ts drifting apart.
describe('markdown contribution keys', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
  it('uses the flat dotted keys the built-in markdown extension reads', () => {
    expect(pkg.contributes['markdown.markdownItPlugins']).toBe(true);
    expect(pkg.contributes['markdown.previewStyles']).toEqual(['./media/preview.css']);
    expect(pkg.contributes.markdown).toBeUndefined();
  });
});

describe('settings schema vs package.json', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
  const props = pkg.contributes.configuration.properties as Record<string, { default: unknown }>;
  const nls = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.nls.json'), 'utf8'));
  const nlsKo = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.nls.ko.json'), 'utf8'));

  it('declares every schema key with the same default', () => {
    for (const key of SETTINGS_KEYS) {
      const full = `${SETTINGS_SECTION}.${key}`;
      expect(props[full], full).toBeDefined();
      expect(props[full]!.default, full).toEqual(SETTINGS_DEFAULTS[key]);
    }
  });

  it('has no package.json keys missing from the schema', () => {
    for (const full of Object.keys(props)) {
      expect(SETTINGS_KEYS.map((k) => `${SETTINGS_SECTION}.${k}`)).toContain(full);
    }
  });

  it('has an English and Korean string for every %placeholder%', () => {
    const text = JSON.stringify(pkg);
    for (const m of text.matchAll(/%([a-zA-Z0-9.]+)%/g)) {
      expect(nls[m[1]!], m[1]).toBeDefined();
      expect(nlsKo[m[1]!], m[1]).toBeDefined();
    }
  });
});
