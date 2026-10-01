import { describe, expect, it } from 'vitest';
import { asKg, asMm, asPct, err, ok } from '../../src/engine/types';

describe('measurement and result helpers', () => {
  it('preserves values when branding measurements', () => {
    expect(asMm(125)).toBe(125);
    expect(asKg(2.5)).toBe(2.5);
    expect(asPct(87.5)).toBe(87.5);
  });

  it('constructs discriminated success and failure results', () => {
    expect(ok({ count: 3 })).toEqual({ ok: true, value: { count: 3 } });
    expect(err('invalid input')).toEqual({ ok: false, error: 'invalid input' });
  });
});
