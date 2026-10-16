import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  browserSessionStorage,
  dispatchBrowserEvent,
  isMediaQueryMatched,
  listenToBrowserEvent,
  listenToMediaQuery,
} from '../../../src/platform/browser/runtime';

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  } else {
    Reflect.deleteProperty(window, 'matchMedia');
  }
  sessionStorage.clear();
});

describe('browser runtime adapters', () => {
  it('reads, writes, and removes session values through sessionStorage', () => {
    browserSessionStorage.setItem('test-key', 'value');
    expect(browserSessionStorage.getItem('test-key')).toBe('value');

    browserSessionStorage.removeItem('test-key');
    expect(browserSessionStorage.getItem('test-key')).toBeNull();
  });

  it('returns the requested media-query fallback when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });

    expect(isMediaQueryMatched('(min-width: 1024px)')).toBe(false);
    expect(isMediaQueryMatched('(min-width: 1024px)', true)).toBe(true);
    expect(listenToMediaQuery('(min-width: 1024px)', vi.fn())).toEqual(expect.any(Function));
  });

  it('returns the fallback when there is no browser window', () => {
    vi.stubGlobal('window', undefined);

    expect(isMediaQueryMatched('(prefers-color-scheme: dark)', true)).toBe(true);
    expect(listenToMediaQuery('(min-width: 1024px)', vi.fn())).toEqual(expect.any(Function));
  });

  it('reports and subscribes to media-query changes', () => {
    let listener: EventListenerOrEventListenerObject | undefined;
    const mediaQuery = {
      matches: true,
      addEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        listener = callback;
      },
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => mediaQuery });
    const onChange = vi.fn();

    expect(isMediaQueryMatched('(prefers-reduced-motion: reduce)')).toBe(true);
    const unsubscribe = listenToMediaQuery('(min-width: 1024px)', onChange);
    mediaQuery.matches = false;
    if (typeof listener === 'function') listener(new Event('change'));
    unsubscribe();

    expect(onChange).toHaveBeenCalledWith(false);
    expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce();
  });

  it('dispatches and removes browser event listeners through the adapter', () => {
    const listener = vi.fn();
    const unsubscribe = listenToBrowserEvent('platform-test-event', listener);

    dispatchBrowserEvent('platform-test-event', { action: 'open' });
    unsubscribe();
    dispatchBrowserEvent('platform-test-event', { action: 'close' });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { action: 'open' } }));
  });
});
