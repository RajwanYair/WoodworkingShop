import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readTabFromUrl, pushTabToUrl } from '../../src/utils/url-state';

// ── Helpers ────────────────────────────────────────────────────────────────────

function setSearch(qs: string) {
  Object.defineProperty(globalThis, 'location', {
    value: { ...globalThis.location, search: qs, pathname: '/' },
    writable: true,
  });
}

// ── readTabFromUrl ─────────────────────────────────────────────────────────────

describe('readTabFromUrl', () => {
  const VALID_TABS = ['workspace', 'configurator', 'preview', 'optimizer', 'assembly', 'pdf', 'calculators'] as const;

  it.each(VALID_TABS)('returns "%s" when ?tab=%s is in the URL', (tab) => {
    setSearch(`?tab=${tab}`);
    expect(readTabFromUrl()).toBe(tab);
  });

  it('returns null when ?tab= is absent', () => {
    setSearch('?w=800&h=720');
    expect(readTabFromUrl()).toBeNull();
  });

  it('returns null for an unknown tab value', () => {
    setSearch('?tab=unknown_panel');
    expect(readTabFromUrl()).toBeNull();
  });

  it('returns null for an empty tab param', () => {
    setSearch('?tab=');
    expect(readTabFromUrl()).toBeNull();
  });
});

// ── pushTabToUrl ───────────────────────────────────────────────────────────────

describe('pushTabToUrl', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setSearch('?w=800');
    replaceStateSpy = vi.spyOn(globalThis.history, 'replaceState').mockImplementation(() => undefined);
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  it('calls replaceState with the tab param appended', () => {
    setSearch('');
    pushTabToUrl('optimizer');
    expect(replaceStateSpy).toHaveBeenCalledOnce();
    const url = replaceStateSpy.mock.calls[0][2] as string;
    expect(url).toContain('tab=optimizer');
  });

  it('preserves existing URL params when adding the tab', () => {
    setSearch('?w=800&h=720');
    pushTabToUrl('preview');
    const url = replaceStateSpy.mock.calls[0][2] as string;
    expect(url).toContain('w=800');
    expect(url).toContain('h=720');
    expect(url).toContain('tab=preview');
  });

  it('overwrites an existing ?tab= param', () => {
    setSearch('?tab=configurator');
    pushTabToUrl('pdf');
    const url = replaceStateSpy.mock.calls[0][2] as string;
    expect(url).toContain('tab=pdf');
    expect(url).not.toContain('tab=configurator');
  });
});
