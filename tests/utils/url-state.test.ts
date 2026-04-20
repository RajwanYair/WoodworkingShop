import { describe, it, expect } from 'vitest';
import { configToParams, paramsToConfig } from '../../src/utils/url-state';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { cfg } from '../helpers';

describe('url-state', () => {
  describe('configToParams', () => {
    it('returns empty params for default config', () => {
      const params = configToParams(DEFAULT_CONFIG);
      expect(params.toString()).toBe('');
    });

    it('encodes width change', () => {
      const params = configToParams(cfg({ width: 800 }));
      expect(params.get('w')).toBe('800');
    });

    it('encodes height change', () => {
      const params = configToParams(cfg({ height: 1800 }));
      expect(params.get('h')).toBe('1800');
    });

    it('encodes depth change', () => {
      const params = configToParams(cfg({ depth: 400 }));
      expect(params.get('d')).toBe('400');
    });

    it('encodes material changes', () => {
      const params = configToParams(cfg({ carcassMaterial: 'melamine-18' }));
      expect(params.get('cm')).toBe('melamine-18');
    });

    it('encodes door config', () => {
      const params = configToParams(cfg({ doorCount: 1, doorStyle: 'none', doorReveal: 5 }));
      expect(params.get('dc')).toBe('1');
      expect(params.get('ds')).toBe('none');
      expect(params.get('dr')).toBe('5');
    });

    it('encodes custom shelf positions', () => {
      const params = configToParams(
        cfg({
          shelfSpacing: 'custom',
          customShelfPositions: [200, 400, 600],
        }),
      );
      expect(params.get('ss')).toBe('custom');
      expect(params.get('csp')).toBe('200,400,600');
    });

    it('only encodes non-default values (delta encoding)', () => {
      const params = configToParams(cfg({ width: 800 }));
      // Should have width but NOT height, depth, etc.
      expect(params.has('w')).toBe(true);
      expect(params.has('h')).toBe(false);
      expect(params.has('d')).toBe(false);
    });
  });

  describe('paramsToConfig', () => {
    it('returns empty object for empty params', () => {
      const result = paramsToConfig(new URLSearchParams(''));
      expect(Object.keys(result).length).toBe(0);
    });

    it('parses width', () => {
      const result = paramsToConfig(new URLSearchParams('w=800'));
      expect(result.width).toBe(800);
    });

    it('parses height', () => {
      const result = paramsToConfig(new URLSearchParams('h=1800'));
      expect(result.height).toBe(1800);
    });

    it('parses shelf spacing', () => {
      const result = paramsToConfig(new URLSearchParams('ss=custom&csp=200,400'));
      expect(result.shelfSpacing).toBe('custom');
      expect(result.customShelfPositions).toEqual([200, 400]);
    });

    it('validates doorCount values', () => {
      expect(paramsToConfig(new URLSearchParams('dc=1')).doorCount).toBe(1);
      expect(paramsToConfig(new URLSearchParams('dc=2')).doorCount).toBe(2);
      expect(paramsToConfig(new URLSearchParams('dc=3')).doorCount).toBeUndefined();
    });

    it('validates doorStyle values', () => {
      expect(paramsToConfig(new URLSearchParams('ds=flat')).doorStyle).toBe('flat');
      expect(paramsToConfig(new URLSearchParams('ds=none')).doorStyle).toBe('none');
      expect(paramsToConfig(new URLSearchParams('ds=shaker')).doorStyle).toBe('shaker');
      expect(paramsToConfig(new URLSearchParams('ds=glass')).doorStyle).toBe('glass');
      expect(paramsToConfig(new URLSearchParams('ds=invalid')).doorStyle).toBeUndefined();
    });

    it('validates furnitureType values', () => {
      expect(paramsToConfig(new URLSearchParams('ft=cabinet')).furnitureType).toBe('cabinet');
      expect(paramsToConfig(new URLSearchParams('ft=desk')).furnitureType).toBe('desk');
      expect(paramsToConfig(new URLSearchParams('ft=wardrobe')).furnitureType).toBe('wardrobe');
      expect(paramsToConfig(new URLSearchParams('ft=bookshelf')).furnitureType).toBe('bookshelf');
      expect(paramsToConfig(new URLSearchParams('ft=invalid')).furnitureType).toBeUndefined();
    });

    it('parses drawerCount', () => {
      expect(paramsToConfig(new URLSearchParams('drc=2')).drawerCount).toBe(2);
    });

    it('validates handleStyle values', () => {
      expect(paramsToConfig(new URLSearchParams('hs=bar')).handleStyle).toBe('bar');
      expect(paramsToConfig(new URLSearchParams('hs=knob')).handleStyle).toBe('knob');
      expect(paramsToConfig(new URLSearchParams('hs=invalid')).handleStyle).toBeUndefined();
    });

    it('validates language', () => {
      expect(paramsToConfig(new URLSearchParams('lang=en')).lang).toBe('en');
      expect(paramsToConfig(new URLSearchParams('lang=he')).lang).toBe('he');
      expect(paramsToConfig(new URLSearchParams('lang=fr')).lang).toBeUndefined();
    });
  });

  describe('round-trip', () => {
    it('encode → decode preserves all custom values', () => {
      const custom = cfg({
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
      const params = configToParams(custom);
      const decoded = paramsToConfig(params);
      expect(decoded.width).toBe(800);
      expect(decoded.height).toBe(1800);
      expect(decoded.depth).toBe(500);
      expect(decoded.furnitureType).toBe('wardrobe');
      expect(decoded.shelfCount).toBe(6);
      expect(decoded.doorCount).toBe(1);
      expect(decoded.doorStyle).toBe('shaker');
      expect(decoded.handleStyle).toBe('knob');
      expect(decoded.drawerCount).toBe(3);
      expect(decoded.edgeBanding).toBe('none');
      expect(decoded.lang).toBe('he');
    });

    it('encode → decode for default config returns empty patch', () => {
      const params = configToParams(DEFAULT_CONFIG);
      const decoded = paramsToConfig(params);
      expect(Object.keys(decoded).length).toBe(0);
    });
  });
});
