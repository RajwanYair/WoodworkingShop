import { afterEach, describe, expect, it } from 'vitest';
import { getBrowserHref, setBrowserQueryParam } from '../../../src/platform/share/browser-url';

const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

afterEach(() => {
  window.history.replaceState(null, '', originalUrl);
});

describe('browser URL adapters', () => {
  it('reads the current absolute browser URL', () => {
    expect(getBrowserHref()).toBe(window.location.href);
  });

  it('sets a query parameter while retaining other query parameters', () => {
    window.history.replaceState(null, '', '/?tab=optimizer');

    setBrowserQueryParam('tpl', 'bookcase');

    const url = new URL(window.location.href);
    expect(url.searchParams.get('tab')).toBe('optimizer');
    expect(url.searchParams.get('tpl')).toBe('bookcase');
  });
});
