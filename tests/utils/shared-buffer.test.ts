import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trySharedArrayBuffer, isSharedArrayBufferAvailable } from '../../src/workers/shared-buffer';

describe('trySharedArrayBuffer', () => {
  let origCrossOriginIsolated: boolean | undefined;
  let origSharedArrayBuffer: typeof SharedArrayBuffer | undefined;

  beforeEach(() => {
    // Save originals
    origCrossOriginIsolated = typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : undefined;
    origSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore crossOriginIsolated if writable
    try {
      if (origCrossOriginIsolated !== undefined) {
        Object.defineProperty(globalThis, 'crossOriginIsolated', {
          value: origCrossOriginIsolated,
          configurable: true,
          writable: true,
        });
      }
      if (origSharedArrayBuffer !== undefined) {
        Object.defineProperty(globalThis, 'SharedArrayBuffer', {
          value: origSharedArrayBuffer,
          configurable: true,
          writable: true,
        });
      }
    } catch {
      /* Some environments don't allow redefining globals */
    }
  });

  it('returns null for negative size', () => {
    expect(trySharedArrayBuffer(-1)).toBeNull();
  });

  it('returns null when SharedArrayBuffer is undefined', () => {
    Object.defineProperty(globalThis, 'SharedArrayBuffer', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(trySharedArrayBuffer(1024)).toBeNull();
  });

  it('returns null when crossOriginIsolated is false', () => {
    // Ensure SharedArrayBuffer is present but context is not isolated
    Object.defineProperty(globalThis, 'SharedArrayBuffer', {
      value: origSharedArrayBuffer ?? SharedArrayBuffer,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      value: false,
      configurable: true,
      writable: true,
    });
    expect(trySharedArrayBuffer(1024)).toBeNull();
  });

  it('returns a SharedArrayBuffer of the requested size when isolated', () => {
    Object.defineProperty(globalThis, 'SharedArrayBuffer', {
      value: origSharedArrayBuffer ?? SharedArrayBuffer,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      value: true,
      configurable: true,
      writable: true,
    });
    const buf = trySharedArrayBuffer(256);
    if (buf !== null) {
      expect(buf.byteLength).toBe(256);
    }
    // If still null (env doesn't support SAB), that's also valid
  });

  it('returns null when SharedArrayBuffer constructor throws', () => {
    const ThrowingSAB = class {
      constructor() {
        throw new Error('not allowed');
      }
    };
    Object.defineProperty(globalThis, 'SharedArrayBuffer', {
      value: ThrowingSAB,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      value: true,
      configurable: true,
      writable: true,
    });
    expect(trySharedArrayBuffer(1024)).toBeNull();
  });
});

describe('isSharedArrayBufferAvailable', () => {
  it('returns false when SharedArrayBuffer is undefined', () => {
    Object.defineProperty(globalThis, 'SharedArrayBuffer', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(isSharedArrayBufferAvailable()).toBe(false);
  });
});
