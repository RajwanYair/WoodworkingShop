import { describe, expect, it } from 'vitest';
import { packText, unpackText } from '../../src/workers/text-payload';

describe('worker text payloads', () => {
  it('round-trips text through a transferable copy', () => {
    const packed = packText('cabinet,width', undefined, 'bom.csv');

    expect(packed.shared).toBe(false);
    expect(packed.filename).toBe('bom.csv');
    expect(unpackText(packed, undefined)).toBe('cabinet,width');
  });

  it('writes into a shared buffer when the text fits and does not expose a copy', () => {
    const shared = new SharedArrayBuffer(64);
    const packed = packText('sheet', shared, 'sheets.dxf');

    expect(packed).toEqual({ shared: true, byteLength: 5, filename: 'sheets.dxf' });
    expect(unpackText(packed, shared)).toBe('sheet');
  });

  it('falls back to a copy when the shared buffer is too small', () => {
    const shared = new SharedArrayBuffer(4);
    const packed = packText('too-long', shared);

    expect(packed.shared).toBe(false);
    expect(packed.bytes).toBeInstanceOf(Uint8Array);
    expect(unpackText(packed, undefined)).toBe('too-long');
  });
});
