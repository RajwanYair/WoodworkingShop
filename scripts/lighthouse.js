import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

/**
 * Lighthouse CI wrapper.
 * - CI: writes output to .lighthouseci/ in the workspace so actions/upload-artifact
 *   can collect the report.
 * - Local: writes to $TEMP/WoodworkingShop/.lighthouseci/ to avoid workspace pollution.
 */
// In CI: write to .lighthouseci/ in the workspace so actions/upload-artifact can find it.
// Locally: write to $TEMP to avoid workspace pollution.
const outputDir = process.env.CI
  ? path.resolve('.lighthouseci')
  : path.join(os.tmpdir(), 'WoodworkingShop', '.lighthouseci');
mkdirSync(outputDir, { recursive: true });

const configPath = path.resolve('config/lighthouserc.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
config.ci.upload.outputDir = outputDir;

const resolvedConfigPath = path.join(os.tmpdir(), 'WoodworkingShop', 'lighthouserc.resolved.json');
mkdirSync(path.dirname(resolvedConfigPath), { recursive: true });
writeFileSync(resolvedConfigPath, JSON.stringify(config, null, 2));

try {
  execSync(`npx --yes @lhci/cli@0.14.x autorun --config=${resolvedConfigPath}`, { stdio: 'inherit' });
} catch {
  process.exit(1);
}
