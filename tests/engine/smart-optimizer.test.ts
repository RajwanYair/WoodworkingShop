import { describe, it, expect } from 'vitest';
import { findOptimizations } from '../../src/engine/smart-optimizer';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import type { CabinetConfig } from '../../src/engine/types';

function cfg(overrides: Partial<CabinetConfig> = {}): CabinetConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

describe('smart-optimizer', () => {
  describe('findOptimizations', () => {
    it('returns an array (possibly empty)', () => {
      const results = findOptimizations(cfg());
      expect(Array.isArray(results)).toBe(true);
    });

    it('returns results sorted by score ascending', () => {
      const results = findOptimizations(cfg({ depth: 600 }), { tolerance: 50 });
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i - 1].score);
      }
    });

    it('never returns results worse than original', () => {
      const config = cfg({ depth: 600 });
      const results = findOptimizations(config, { tolerance: 50 });
      for (const r of results) {
        expect(r.optimizedResult.totalSheets).toBeLessThanOrEqual(r.originalResult.totalSheets);
        if (r.optimizedResult.totalSheets === r.originalResult.totalSheets) {
          expect(r.optimizedResult.overallYield).toBeGreaterThan(r.originalResult.overallYield);
        }
      }
    });

    it('respects maxResults', () => {
      const results = findOptimizations(cfg({ depth: 600 }), { tolerance: 50, maxResults: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('includes proper savings data', () => {
      const results = findOptimizations(cfg({ depth: 600 }), { tolerance: 50 });
      for (const r of results) {
        expect(r.savings.sheetsRemoved).toBeGreaterThanOrEqual(0);
        expect(typeof r.savings.yieldImprovement).toBe('number');
        expect(typeof r.savings.wasteReduced).toBe('number');
      }
    });

    it('provides bilingual explanations', () => {
      const results = findOptimizations(cfg({ depth: 600 }), { tolerance: 50 });
      for (const r of results) {
        expect(r.explanation.en).toBeTruthy();
        expect(r.explanation.he).toBeTruthy();
      }
    });

    it('deduplicates by config fingerprint', () => {
      const results = findOptimizations(cfg({ depth: 600 }), {
        strategies: ['reduce-depth', 'adjust-width', 'adjust-height'],
        tolerance: 30,
      });
      const fingerprints = results.map(
        (r) => `${r.optimizedConfig.width}|${r.optimizedConfig.height}|${r.optimizedConfig.depth}|${r.optimizedConfig.carcassMaterial}`,
      );
      const unique = new Set(fingerprints);
      expect(unique.size).toBe(fingerprints.length);
    });

    it('filters by selected strategies', () => {
      const results = findOptimizations(cfg({ depth: 600 }), {
        strategies: ['reduce-depth'],
        tolerance: 50,
      });
      for (const r of results) {
        expect(r.strategy).toBe('reduce-depth');
      }
    });

    it('reduce-depth finds magic strip widths', () => {
      // depth 600 on 1220mm sheet: 3×404 + 2×4 = 1220 → ideal depth ~404
      const results = findOptimizations(cfg({ depth: 600 }), {
        strategies: ['reduce-depth'],
        tolerance: 200,
      });
      const depthValues = results.map((r) => r.optimizedConfig.depth);
      // Should find 404 (3 strips) and/or 608 (2 strips) or similar magic values
      expect(depthValues.length).toBeGreaterThan(0);
    });

    it('material-swap tries different materials', () => {
      const results = findOptimizations(cfg(), {
        strategies: ['material-swap'],
        tolerance: 20,
      });
      for (const r of results) {
        expect(r.strategy).toBe('material-swap');
        expect(r.optimizedConfig.carcassMaterial).not.toBe(DEFAULT_CONFIG.carcassMaterial);
      }
    });

    it('handles config at constraint boundaries', () => {
      const minConfig = cfg({ width: 300, height: 300, depth: 200 });
      const results = findOptimizations(minConfig, { tolerance: 10 });
      for (const r of results) {
        expect(r.optimizedConfig.width).toBeGreaterThanOrEqual(300);
        expect(r.optimizedConfig.height).toBeGreaterThanOrEqual(300);
        expect(r.optimizedConfig.depth).toBeGreaterThanOrEqual(200);
      }
    });
  });
});
