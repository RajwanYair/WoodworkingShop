import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

/**
 * Lighthouse CI wrapper.
 * - CI: writes output to .lighthouseci/ in the workspace so actions/upload-artifact
 *   can collect the report.
 * - Local: writes to $TEMP/WoodworkingShop/.lighthouseci/ to avoid workspace pollution.
 */
const outputDir = process.env.CI
  ? path.resolve('.lighthouseci')
  : path.join(os.tmpdir(), 'WoodworkingShop', '.lighthouseci');
const lighthousePort = Number(process.env.WOODWORKINGSHOP_LIGHTHOUSE_PORT ?? 4173);
const lighthouseRuns = Number(process.env.WOODWORKINGSHOP_LIGHTHOUSE_RUNS ?? (process.env.CI ? 3 : 1));
mkdirSync(outputDir, { recursive: true });

/**
 * Sprint 376 — Production mobile Lighthouse CI gates.
 * Targets: TBT < 200 ms, FCP < 3 s, LCP < 4.8 s, CLS < 0.1
 * Category scores: performance ≥ 0.7, accessibility ≥ 0.95
 *
 * 'error' = hard gate (blocks merge), 'warn' = advisory (reported but non-blocking).
 * numberOfRuns: 3 for statistical stability in CI.
 */
const config = {
  ci: {
    collect: {
      startServerCommand: `npm run preview -- --port ${lighthousePort} --strictPort`,
      url: [`http://localhost:${lighthousePort}/WoodworkingShop/`],
      startServerReadyPattern: 'localhost:',
      startServerReadyTimeout: 60000,
      numberOfRuns: lighthouseRuns,
      settings: {
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
      },
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['error', { minScore: 0.7, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'pessimistic' }],
        'categories:best-practices': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 3000, aggregationMethod: 'median-run' }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4800, aggregationMethod: 'median-run' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median-run' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median-run' }],
        'forced-reflow-insight': 'warn',
        'network-dependency-tree-insight': 'warn',
        'unused-javascript': 'warn',
        'valid-source-maps': 'off',
        interactive: ['warn', { maxNumericValue: 3500 }],
        'resource-summary:script:size': ['warn', { maxNumericValue: 2600000 }],
        'resource-summary:total:size': ['warn', { maxNumericValue: 2800000 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir,
    },
  },
};

const resolvedConfigPath = path.join(os.tmpdir(), 'WoodworkingShop', 'lighthouserc.resolved.json');
mkdirSync(path.dirname(resolvedConfigPath), { recursive: true });
writeFileSync(resolvedConfigPath, JSON.stringify(config, null, 2));

try {
  execSync(`npx --yes @lhci/cli@0.15.1 autorun --config=${resolvedConfigPath}`, { stdio: 'inherit' });
} catch {
  process.exit(1);
}
