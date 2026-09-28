import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readActiveCabinetIndexFromUrl,
  readTabFromUrl,
  pushActiveCabinetIndexToUrl,
  pushTabToUrl,
} from '../../src/utils/url-state';

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
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setSearch('?w=800');
    pushStateSpy = vi.spyOn(globalThis.history, 'pushState').mockImplementation(() => undefined);
    replaceStateSpy = vi.spyOn(globalThis.history, 'replaceState').mockImplementation(() => undefined);
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
  });

  it('pushes a new history entry with the tab param appended', () => {
    setSearch('');
    pushTabToUrl('optimizer');
    expect(pushStateSpy).toHaveBeenCalledOnce();
    expect(replaceStateSpy).not.toHaveBeenCalled();
    const url = pushStateSpy.mock.calls[0][2] as string;
    expect(url).toContain('tab=optimizer');
  });

  it('preserves existing URL params when adding the tab', () => {
    setSearch('?w=800&h=720');
    pushTabToUrl('preview');
    const url = pushStateSpy.mock.calls[0][2] as string;
    expect(url).toContain('w=800');
    expect(url).toContain('h=720');
    expect(url).toContain('tab=preview');
  });

  it('overwrites an existing ?tab= param', () => {
    setSearch('?tab=configurator');
    pushTabToUrl('pdf');
    const url = pushStateSpy.mock.calls[0][2] as string;
    expect(url).toContain('tab=pdf');
    expect(url).not.toContain('tab=configurator');
  });

  it('replaces the current entry when explicitly requested', () => {
    pushTabToUrl('workspace', true);
    expect(replaceStateSpy).toHaveBeenCalledOnce();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });
});

describe('active cabinet URL state', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setSearch('?w=800&pn=Project&tab=preview');
    replaceStateSpy = vi.spyOn(globalThis.history, 'replaceState').mockImplementation(() => undefined);
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
  });

  it.each([
    ['?cab=0', 3, 0],
    ['?cab=2', 3, 2],
  ])('reads cabinet index %i from %s when the index is valid', (search, cabinetCount, expected) => {
    setSearch(search);
    expect(readActiveCabinetIndexFromUrl(cabinetCount)).toBe(expected);
  });

  it.each(['', '?cab=-1', '?cab=3', '?cab=1.5', '?cab=invalid'])('ignores invalid cabinet index %s', (search) => {
    setSearch(search);
    expect(readActiveCabinetIndexFromUrl(3)).toBeNull();
  });

  it('updates the active cabinet while preserving other URL state', () => {
    pushActiveCabinetIndexToUrl(2);

    expect(replaceStateSpy).toHaveBeenCalledOnce();
    const url = replaceStateSpy.mock.calls[0][2] as string;
    expect(url).toContain('cab=2');
    expect(url).toContain('w=800');
    expect(url).toContain('pn=Project');
    expect(url).toContain('tab=preview');
  });

  it('omits the cabinet index for the first cabinet', () => {
    setSearch('?cab=2&w=800');
    pushActiveCabinetIndexToUrl(0);

    const url = replaceStateSpy.mock.calls[0][2] as string;
    expect(url).not.toContain('cab=');
    expect(url).toContain('w=800');
  });
});
