import { describe, it, expect } from 'vitest';
import { createJsonMemo } from '../../src/engine/memo';

describe('createJsonMemo', () => {
  it('returns cached result on repeated identical primitive args', () => {
    let callCount = 0;
    const fn = (n: number) => {
      callCount++;
      return n * 2;
    };
    const memoFn = createJsonMemo(fn);

    expect(memoFn(5)).toBe(10);
    expect(memoFn(5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it('recomputes for different arguments', () => {
    let callCount = 0;
    const fn = (n: number) => {
      callCount++;
      return n * 3;
    };
    const memoFn = createJsonMemo(fn);

    expect(memoFn(2)).toBe(6);
    expect(memoFn(4)).toBe(12);
    expect(callCount).toBe(2);
  });

  it('handles complex serialisable object arguments', () => {
    let callCount = 0;
    const fn = (obj: { a: number; b: string }) => {
      callCount++;
      return obj.a;
    };
    const memoFn = createJsonMemo(fn);

    expect(memoFn({ a: 1, b: 'x' })).toBe(1);
    expect(memoFn({ a: 1, b: 'x' })).toBe(1); // cache hit
    expect(memoFn({ a: 2, b: 'x' })).toBe(2); // miss
    expect(callCount).toBe(2);
  });

  it('handles multiple arguments', () => {
    let callCount = 0;
    const fn = (a: number, b: number) => {
      callCount++;
      return a + b;
    };
    const memoFn = createJsonMemo(fn);

    expect(memoFn(1, 2)).toBe(3);
    expect(memoFn(1, 2)).toBe(3); // hit
    expect(memoFn(2, 1)).toBe(3); // miss — different arg order
    expect(callCount).toBe(2);
  });

  it('evicts the oldest entry when cache exceeds MAX_CACHE_SIZE (8)', () => {
    let callCount = 0;
    const fn = (n: number) => {
      callCount++;
      return n;
    };
    const memoFn = createJsonMemo(fn);

    // Fill 9 distinct entries — entry 0 is evicted when entry 8 enters
    for (let i = 0; i < 9; i++) memoFn(i);
    expect(callCount).toBe(9);

    // Entry 8 is the most recent — must still be cached
    memoFn(8);
    expect(callCount).toBe(9);

    // Entry 0 was evicted — must trigger a re-compute
    memoFn(0);
    expect(callCount).toBe(10);
  });

  it('returns correct result after cache eviction', () => {
    const fn = (n: number) => n * 10;
    const memoFn = createJsonMemo(fn);

    for (let i = 0; i < 9; i++) memoFn(i); // entry 0 evicted
    expect(memoFn(0)).toBe(0); // re-computed — must still be correct
  });
});

describe('generateParts memoisation', () => {
  it('returns same array reference for identical configs', async () => {
    const { generateParts } = await import('../../src/engine/parts');
    const { DEFAULT_CONFIG } = await import('../../src/engine/materials');
    const result1 = generateParts(DEFAULT_CONFIG);
    const result2 = generateParts(DEFAULT_CONFIG);
    expect(result1).toBe(result2); // same reference = cache hit
  });

  it('returns different reference for different configs', async () => {
    const { generateParts } = await import('../../src/engine/parts');
    const { DEFAULT_CONFIG } = await import('../../src/engine/materials');
    const result1 = generateParts(DEFAULT_CONFIG);
    const result2 = generateParts({ ...DEFAULT_CONFIG, shelfCount: DEFAULT_CONFIG.shelfCount + 1 });
    expect(result1).not.toBe(result2);
  });
});
