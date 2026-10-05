import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  collectCriticalAssets,
  getCriticalBundleViolations,
  measureCriticalBundle,
} from '../../scripts/bundle-critical.js';

describe('collectCriticalAssets', () => {
  it('includes the entry and its static imports while excluding dynamic imports', () => {
    const assets = collectCriticalAssets({
      'index.html': {
        file: 'assets/index.js',
        src: 'index.html',
        isEntry: true,
        imports: ['_vendor.js'],
        dynamicImports: ['lazy-panel.js'],
        css: ['assets/index.css'],
      },
      '_vendor.js': { file: 'assets/vendor.js', imports: ['_shared.js'] },
      '_shared.js': { file: 'assets/shared.mjs', css: ['assets/vendor.css'] },
      'lazy-panel.js': { file: 'assets/lazy-panel.js' },
    });

    expect(assets).toEqual({
      javascript: ['assets/index.js', 'assets/shared.mjs', 'assets/vendor.js'],
      stylesheets: ['assets/index.css', 'assets/vendor.css'],
    });
  });

  it('throws when the Vite entry or one of its static imports is missing', () => {
    expect(() => collectCriticalAssets({})).toThrow('Could not find the index.html entry in the Vite manifest.');
    expect(() =>
      collectCriticalAssets({
        'index.html': { file: 'assets/index.js', src: 'index.html', isEntry: true, imports: ['missing.js'] },
      }),
    ).toThrow("Static import 'missing.js' is missing from the Vite manifest.");
  });
});

describe('getCriticalBundleViolations', () => {
  it('passes at the configured limits and reports each exceeded resource budget', () => {
    const budget = { initialJsBrotliKB: 100, initialCssBrotliKB: 20 };
    expect(
      getCriticalBundleViolations(
        { javascript: [], stylesheets: [], javascriptBrotliBytes: 100 * 1024, stylesheetBrotliBytes: 20 * 1024 },
        budget,
      ),
    ).toEqual([]);
    expect(
      getCriticalBundleViolations(
        { javascript: [], stylesheets: [], javascriptBrotliBytes: 101 * 1024, stylesheetBrotliBytes: 21 * 1024 },
        budget,
      ),
    ).toEqual([
      'Initial-route JS 101.0 KiB Brotli exceeds 100 KiB.',
      'Initial-route CSS 21.0 KiB Brotli exceeds 20 KiB.',
    ]);
  });

  it.each([0, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid budget limit %s', (initialJsBrotliKB) => {
    expect(() =>
      getCriticalBundleViolations(
        { javascript: [], stylesheets: [], javascriptBrotliBytes: 0, stylesheetBrotliBytes: 0 },
        { initialJsBrotliKB, initialCssBrotliKB: 14 },
      ),
    ).toThrow("Critical bundle budget 'initialJsBrotliKB' must be a positive number.");
  });
});

describe('measureCriticalBundle', () => {
  it('measures only the entry and static imports with Brotli compression', () => {
    const directory = mkdtempSync(join(tmpdir(), 'woodworkingshop-critical-bundle-'));
    try {
      writeFileSync(join(directory, 'index.js'), 'export const entry = true;');
      writeFileSync(join(directory, 'vendor.js'), 'export const vendor = true;');
      writeFileSync(join(directory, 'lazy.js'), 'export const lazy = true;');
      writeFileSync(join(directory, 'index.css'), 'body { color: black; }');

      const measured = measureCriticalBundle(
        {
          'index.html': {
            file: 'index.js',
            src: 'index.html',
            isEntry: true,
            imports: ['_vendor.js'],
            dynamicImports: ['lazy.js'],
            css: ['index.css'],
          },
          '_vendor.js': { file: 'vendor.js' },
          'lazy.js': { file: 'lazy.js' },
        },
        directory,
      );

      expect(measured.javascript).toEqual(['index.js', 'vendor.js']);
      expect(measured.stylesheets).toEqual(['index.css']);
      expect(measured.javascriptBrotliBytes).toBeGreaterThan(0);
      expect(measured.stylesheetBrotliBytes).toBeGreaterThan(0);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
