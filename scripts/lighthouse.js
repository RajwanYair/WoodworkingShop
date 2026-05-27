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
mkdirSync(outputDir, { recursive: true });

/**
 * Sprint 147 — Production Lighthouse CI gates.
 * Targets: TBT < 200 ms, FCP < 1.2 s, LCP < 2.5 s, CLS < 0.1
 * Category scores: performance ≥ 0.9, accessibility ≥ 0.95
 *
 * 'error' = hard gate (blocks merge), 'warn' = advisory (reported but non-blocking).
 * numberOfRuns: 3 for statistical stability in CI.
 */
const config = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 4173 --strictPort',
      url: ['http://localhost:4173/WoodworkingShop/'],
      startServerReadyPattern: 'Local:',
      numberOfRuns: process.env.CI ? 3 : 1,
    },
    assert: {
      preset: 'lighthouse:no-pwa',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 0.95, aggregationMethod: 'pessimistic' }],
        'categories:best-practices': ['error', { minScore: 0.9, aggregationMethod: 'median-run' }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1200, aggregationMethod: 'median-run' }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median-run' }],
        'total-blocking-time': ['error', { maxNumericValue: 200, aggregationMethod: 'median-run' }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median-run' }],
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
  execSync(`npx --yes @lhci/cli@0.14.x autorun --config=${resolvedConfigPath}`, { stdio: 'inherit' });
} catch {
  process.exit(1);
}
