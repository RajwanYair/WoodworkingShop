import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { encodeLabelQr } from '../../src/engine/qr-code';

function rasterize(matrix: readonly (readonly boolean[])[], scale: number): { data: Uint8ClampedArray; size: number } {
  const quietZone = 4;
  const size = (matrix.length + quietZone * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let py = (y + quietZone) * scale; py < (y + quietZone + 1) * scale; py++) {
        for (let px = (x + quietZone) * scale; px < (x + quietZone + 1) * scale; px++) {
          const offset = (py * size + px) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    }),
  );
  return { data, size };
}

describe('encodeLabelQr', () => {
  it('returns a deterministic version 1 matrix with the three finder patterns', () => {
    const matrix = encodeLabelQr('P-001');
    expect(matrix).toEqual(encodeLabelQr('P-001'));
    expect(matrix).toHaveLength(21);
    expect(matrix.every((row) => row.length === 21)).toBe(true);
    expect(matrix[0]?.slice(0, 7)).toEqual([true, true, true, true, true, true, true]);
    expect(matrix[0]?.slice(14, 21)).toEqual([true, true, true, true, true, true, true]);
    expect(matrix[14]?.slice(0, 7)).toEqual([true, true, true, true, true, true, true]);
  });

  it('decodes a lowercase expanded label reference with jsQR', () => {
    const payload = 'P-001a';
    const { data, size } = rasterize(encodeLabelQr(payload), 8);
    expect(jsQR(data, size, size)?.data).toBe(payload);
  });

  it.each([
    { value: '', reason: 'empty payload' },
    { value: 'P-001-0123456789ab', reason: 'payload over capacity' },
    { value: 'P-001-😀', reason: 'non-ASCII payload' },
  ])('throws RangeError for $reason', ({ value }) => {
    expect(() => encodeLabelQr(value)).toThrow(RangeError);
  });
});
