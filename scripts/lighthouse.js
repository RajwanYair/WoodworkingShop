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

// Inlined from config/lighthouserc.json (Sprint 66 — removed external config file)
const config = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --port 4173 --strictPort',
      url: ['http://localhost:4173/WoodworkingShop/'],
      startServerReadyPattern: 'Local:',
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance':        ['warn', { minScore: 0.6 }],
        'categories:accessibility':      ['error', { minScore: 0.9 }],
        'categories:best-practices':     ['warn', { minScore: 0.85 }],
        'categories:seo':                ['warn', { minScore: 0.8 }],
        'resource-summary:script:size':  ['warn', { maxNumericValue: 2100000 }],
        'resource-summary:total:size':   ['warn', { maxNumericValue: 2400000 }],
        'largest-contentful-paint':      ['warn', { maxNumericValue: 6000 }],
        'interactive':                   ['warn', { maxNumericValue: 7000 }],
        'total-blocking-time':           ['warn', { maxNumericValue: 1500 }],
        'cumulative-layout-shift':       ['warn', { maxNumericValue: 0.1 }],
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
