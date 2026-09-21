import { describe, expect, it } from 'vitest';
import { STATUS_PRESETS, StatusRegistry, StatusType, presetStatuses } from '../../../src/core/task';

describe('status presets', () => {
  it('every preset has unique single-char symbols and valid next symbols', () => {
    for (const name of Object.keys(STATUS_PRESETS) as (keyof typeof STATUS_PRESETS)[]) {
      const rows = presetStatuses(name);
      const symbols = new Set(rows.map((r) => r.symbol));
      expect(symbols.size, name).toBe(rows.length);
      for (const r of rows) {
        expect(r.symbol.length).toBe(1);
        expect(symbols.has(r.nextSymbol), `${name}: ${r.symbol} -> ${r.nextSymbol}`).toBe(true);
      }
    }
  });

  it('ITS: [X] is DONE and toggles back to todo; [d] is IN_PROGRESS', () => {
    const reg = new StatusRegistry(presetStatuses('its'));
    expect(reg.bySymbol('X').type).toBe(StatusType.DONE);
    expect(reg.next(reg.bySymbol('X')).symbol).toBe(' ');
    expect(reg.bySymbol('d').type).toBe(StatusType.IN_PROGRESS);
    expect(reg.bySymbol('?').type).toBe(StatusType.TODO);
  });

  it('minimal and things share symbols', () => {
    expect(presetStatuses('minimal')).toEqual(presetStatuses('things'));
    expect(presetStatuses('core')).toHaveLength(4);
  });
});
