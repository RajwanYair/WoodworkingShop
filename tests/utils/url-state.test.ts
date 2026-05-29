import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  configToParams,
  paramsToConfig,
  readConfigFromUrl,
  compressConfigToBase64,
  decompressBase64ToConfig,
  generateShareRefKey,
  pushConfigToUrlOffline,
  resolveUrlRef,
  readConfigFromUrlAsync,
  URL_REF_THRESHOLD,
  REF_KEY_LENGTH,
} from '../../src/utils/url-state';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { cfg } from '../helpers';
import * as idbStorage from '../../src/utils/indexed-db-storage';

function toRecord(qs: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(qs).entries());
}

vi.mock('../../src/utils/indexed-db-storage', () => ({
  storeUrlRef: vi.fn().mockResolvedValue(undefined),
  loadUrlRef: vi.fn().mockResolvedValue(undefined),
  deleteUrlRef: vi.fn().mockResolvedValue(undefined),
}));

describe('url-state', () => {
  describe('configToParams', () => {
    it('returns empty params for default config', () => {
      const params = configToParams(DEFAULT_CONFIG);
      expect(Object.keys(params).length).toBe(0);
    });

    it.each([
      [{ width: 800 }, 'w', '800'],
      [{ height: 1800 }, 'h', '1800'],
      [{ depth: 400 }, 'd', '400'],
      [{ carcassMaterial: 'melamine-18' as const }, 'cm', 'melamine-18'],
    ])('encodes single-field delta: %j', (overrides, param, value) => {
      expect(configToParams(cfg(overrides as Parameters<typeof cfg>[0]))[param as string]).toBe(value);
    });

    it('encodes door and shelf config', () => {
      const door = configToParams(cfg({ doorCount: 1, doorStyle: 'none', doorReveal: 5 }));
      expect(door.dc).toBe('1');
      expect(door.ds).toBe('none');
      expect(door.dr).toBe('5');
      const shelf = configToParams(cfg({ shelfSpacing: 'custom', customShelfPositions: [200, 400, 600] }));
      expect(shelf.ss).toBe('custom');
      expect(shelf.csp).toBe('200,400,600');
    });

    it('only encodes non-default values (delta encoding)', () => {
      const params = configToParams(cfg({ width: 800 }));
      // Should have width but NOT height, depth, etc.
      expect('w' in params).toBe(true);
      expect('h' in params).toBe(false);
      expect('d' in params).toBe(false);
    });
  });

  describe('paramsToConfig', () => {
    it('returns empty object for empty params', () => {
      const result = paramsToConfig({});
      expect(Object.keys(result).length).toBe(0);
    });

    it.each([
      ['w=800', 'width', 800],
      ['h=1800', 'height', 1800],
      ['drc=2', 'drawerCount', 2],
    ])('parses %s correctly', (qs, key, expected) => {
      const r = paramsToConfig(toRecord(qs)) as Record<string, unknown>;
      expect(r[key]).toBe(expected);
    });

    it('parses shelf spacing', () => {
      const result = paramsToConfig(toRecord('ss=custom&csp=200,400'));
      expect(result.shelfSpacing).toBe('custom');
      expect(result.customShelfPositions).toEqual([200, 400]);
    });

    it.each<[string, string, unknown]>([
      ['dc=1', 'doorCount', 1],
      ['dc=2', 'doorCount', 2],
      ['ds=flat', 'doorStyle', 'flat'],
      ['ds=none', 'doorStyle', 'none'],
      ['ds=shaker', 'doorStyle', 'shaker'],
      ['ds=glass', 'doorStyle', 'glass'],
      ['ft=cabinet', 'furnitureType', 'cabinet'],
      ['ft=desk', 'furnitureType', 'desk'],
      ['ft=wardrobe', 'furnitureType', 'wardrobe'],
      ['ft=bookshelf', 'furnitureType', 'bookshelf'],
      ['hs=bar', 'handleStyle', 'bar'],
      ['hs=knob', 'handleStyle', 'knob'],
      ['lang=en', 'lang', 'en'],
      ['lang=he', 'lang', 'he'],
    ])('parses valid param %s', (qs, key, expected) => {
      expect((paramsToConfig(toRecord(qs)) as Record<string, unknown>)[key]).toBe(expected);
    });

    it.each<[string, string]>([
      ['dc=3', 'doorCount'],
      ['ds=invalid', 'doorStyle'],
      ['ft=invalid', 'furnitureType'],
      ['hs=invalid', 'handleStyle'],
      ['lang=fr', 'lang'],
    ])('rejects invalid param %s → undefined', (qs, key) => {
      expect((paramsToConfig(toRecord(qs)) as Record<string, unknown>)[key]).toBeUndefined();
    });
  });

  describe('round-trip', () => {
    it('encode → decode preserves all custom values', () => {
      const c = cfg({
        width: 800,
        height: 1800,
        depth: 500,
        furnitureType: 'wardrobe',
        shelfCount: 6,
        doorCount: 1,
        doorStyle: 'shaker',
        handleStyle: 'knob',
        drawerCount: 3,
        edgeBanding: 'none',
        lang: 'he',
      });
      expect(paramsToConfig(configToParams(c))).toMatchObject({
        width: 800,
        height: 1800,
        depth: 500,
        furnitureType: 'wardrobe',
        shelfCount: 6,
        doorCount: 1,
        doorStyle: 'shaker',
        handleStyle: 'knob',
        drawerCount: 3,
        edgeBanding: 'none',
        lang: 'he',
      });
    });

    it('encode → decode for default config returns empty patch', () => {
      const params = configToParams(DEFAULT_CONFIG);
      const decoded = paramsToConfig(params);
      expect(Object.keys(decoded).length).toBe(0);
    });
  });

  describe('readConfigFromUrl — tpl= deep-link', () => {
    function withSearch(qs: string, fn: () => void) {
      const orig = window.location.search;
      Object.defineProperty(window, 'location', { writable: true, value: { ...window.location, search: qs } });
      try {
        fn();
      } finally {
        Object.defineProperty(window, 'location', { writable: true, value: { ...window.location, search: orig } });
      }
    }

    it('returns empty patch when no params; merges template + URL overrides; falls back on unknown tpl', () => {
      withSearch('', () => expect(Object.keys(readConfigFromUrl()).length).toBe(0));
      withSearch('?tpl=kitchen-base', () => {
        const r = readConfigFromUrl();
        expect(typeof r.width).toBe('number');
        expect(r.furnitureType).toBe('cabinet');
      });
      withSearch('?tpl=kitchen-base&w=1200', () => expect(readConfigFromUrl().width).toBe(1200));
      withSearch('?tpl=nonexistent-template-xyz&w=600', () => {
        expect(readConfigFromUrl().width).toBe(600);
        expect(readConfigFromUrl().furnitureType).toBeUndefined();
      });
    });
  });
});

describe('url-state — compact base64 serialisation (Sprint 35)', () => {
  it('compressConfigToBase64 returns a string for any config', () => {
    expect(compressConfigToBase64(cfg({ width: 800, height: 1800 }))).toBeTruthy();
    expect(compressConfigToBase64(cfg())).toBeTruthy();
  });

  it('round-trip: compress then decompress recovers all field types', () => {
    const c = cfg({
      width: 750,
      height: 2100,
      carcassMaterial: 'melamine-18',
      doorCount: 1,
      doorStyle: 'shaker',
      shelfSpacing: 'custom',
      customShelfPositions: [200, 450, 700],
    });
    const r = decompressBase64ToConfig(compressConfigToBase64(c));
    expect(r).toMatchObject({
      width: 750,
      height: 2100,
      carcassMaterial: 'melamine-18',
      doorCount: 1,
      doorStyle: 'shaker',
      customShelfPositions: [200, 450, 700],
    });
  });

  it('decompressBase64ToConfig returns empty object for malformed input', () => {
    expect(decompressBase64ToConfig('!!not-valid-base64!!')).toEqual({});
  });

  it('base64url output contains no +, / or = characters', () => {
    const b64 = compressConfigToBase64(cfg({ width: 800, carcassMaterial: 'melamine-18', doorStyle: 'shaker' }));
    expect(b64).not.toContain('+');
    expect(b64).not.toContain('/');
    expect(b64).not.toContain('=');
  });
});

describe('generateShareRefKey', () => {
  it('generates distinct lowercase-alphanumeric keys of correct length', () => {
    const keys = Array.from({ length: 10 }, generateShareRefKey);
    expect(keys[0]).toHaveLength(REF_KEY_LENGTH);
    expect(keys[0]).toMatch(/^[a-z0-9]+$/);
    expect(new Set(keys).size).toBe(10);
  });
});

describe('resolveUrlRef', () => {
  const { loadUrlRef } = idbStorage;

  beforeEach(() => {
    vi.mocked(loadUrlRef).mockReset();
  });

  it('returns null for unknown key; decodes stored config correctly', async () => {
    vi.mocked(loadUrlRef).mockResolvedValueOnce(undefined);
    expect(await resolveUrlRef('unknownkey')).toBeNull();

    const compact = compressConfigToBase64(cfg({ width: 900, height: 1800 }));
    vi.mocked(loadUrlRef).mockResolvedValue(compact);
    const result = await resolveUrlRef('somekey');
    expect(result?.width).toBe(900);
    expect(result?.height).toBe(1800);
  });
});

describe('pushConfigToUrlOffline', () => {
  const { storeUrlRef } = idbStorage;

  beforeEach(() => {
    vi.mocked(storeUrlRef).mockReset().mockResolvedValue(undefined);
    // Set up a minimal window.location.search / history mock
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', search: '', origin: 'http://localhost' },
      writable: true,
    });
    window.history.replaceState = vi.fn();
  });

  it('uses ?c= param when compact config is within threshold', async () => {
    const short = cfg({ width: 600 }); // minimal diff from defaults → short base64
    await pushConfigToUrlOffline(short);
    expect(window.history.replaceState).toHaveBeenCalled();
    const url = vi.mocked(window.history.replaceState).mock.calls[0][2] as string;
    expect(url).toContain('c=');
    expect(url).not.toContain('ref=');
    expect(storeUrlRef).not.toHaveBeenCalled();
  });

  it('URL_REF_THRESHOLD constant is within expected range', () => {
    expect(URL_REF_THRESHOLD).toBeGreaterThan(256);
    expect(URL_REF_THRESHOLD).toBeLessThanOrEqual(4096);
  });
});

describe('readConfigFromUrlAsync', () => {
  const { loadUrlRef } = idbStorage;

  beforeEach(() => {
    vi.mocked(loadUrlRef).mockReset();
  });

  it('resolves ?ref= from IDB, falls through to ?c=, falls through to inline params', async () => {
    const compact750 = compressConfigToBase64(cfg({ width: 750 }));
    vi.mocked(loadUrlRef).mockResolvedValueOnce(compact750);
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', search: '?ref=abc12345', origin: 'http://localhost' },
      writable: true,
    });
    expect((await readConfigFromUrlAsync()).width).toBe(750);

    vi.mocked(loadUrlRef).mockResolvedValueOnce(undefined);
    const compact850 = compressConfigToBase64(cfg({ width: 850 }));
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', search: `?ref=missing&c=${compact850}`, origin: 'http://localhost' },
      writable: true,
    });
    expect((await readConfigFromUrlAsync()).width).toBe(850);

    Object.defineProperty(window, 'location', {
      value: { pathname: '/', search: '?w=700', origin: 'http://localhost' },
      writable: true,
    });
    expect((await readConfigFromUrlAsync()).width).toBe(700);
  });
});
