import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import os from 'os';
import path from 'path';

/**
 * Lighthouse CI wrapper — resolves $TEMP-based output directory so that
 * intermediate artifacts never pollute the workspace root.
 */
const tmpDir = path.join(os.tmpdir(), 'WoodworkingShop', '.lighthouseci');
mkdirSync(tmpDir, { recursive: true });

const configPath = path.resolve('config/lighthouserc.json');
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
config.ci.upload.outputDir = tmpDir;

const resolvedConfigPath = path.join(os.tmpdir(), 'WoodworkingShop', 'lighthouserc.resolved.json');
writeFileSync(resolvedConfigPath, JSON.stringify(config, null, 2));

try {
  execSync(`npx --yes @lhci/cli@0.14.x autorun --config=${resolvedConfigPath}`, { stdio: 'inherit' });
} catch {
  process.exit(1);
}
