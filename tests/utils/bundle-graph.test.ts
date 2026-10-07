import { describe, expect, it } from 'vitest';
import { getInitialRouteFiles } from '../../scripts/bundle-graph.js';

describe('getInitialRouteFiles', () => {
  it('returns deduplicated static JavaScript and CSS while excluding dynamic imports and assets', () => {
    const manifest = {
      'index.html': {
        file: 'index.html',
        imports: ['_shared.js', '_entry-deps.js'],
        dynamicImports: ['_lazy-panel.js'],
        css: ['assets/app.css'],
        assets: ['assets/cut-optimizer.worker-CtG8.js', 'assets/banner.svg'],
      },
      '_shared.js': {
        file: 'assets/shared.js',
        imports: ['_entry-deps.js'],
        css: ['assets/shared.css'],
      },
      '_entry-deps.js': { file: 'assets/entry-deps.js', imports: ['_shared.js'] },
      '_lazy-panel.js': { file: 'assets/lazy-panel.js', imports: [] },
    };

    expect(getInitialRouteFiles(manifest)).toEqual({
      javascript: ['assets/shared.js', 'assets/entry-deps.js'],
      stylesheets: ['assets/app.css', 'assets/shared.css'],
      assets: ['assets/banner.svg'],
    });
  });

  it.each([
    { entryKey: 'missing.html', error: /missing entry/ },
    { entryKey: 'broken.html', error: /import "_missing.js" is missing/ },
  ])('throws for an invalid manifest entry ($entryKey)', ({ entryKey, error }) => {
    const manifest =
      entryKey === 'broken.html' ? { 'broken.html': { file: 'index.html', imports: ['_missing.js'] } } : {};

    expect(() => getInitialRouteFiles(manifest, entryKey)).toThrow(error);
  });
});
