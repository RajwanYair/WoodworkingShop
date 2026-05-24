import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Phase 12 / Sprint 7 — CycloneDX SBOM generation.
 *
 * - CI  (process.env.CI === 'true'): writes sbom.json to the workspace root
 *   so actions/upload-artifact can collect it as a release artefact.
 * - Local: writes to $TEMP/WoodworkingShop/sbom.json to keep the workspace clean.
 *
 * Uses @cyclonedx/cyclonedx-npm@latest via npx — no install required.
 */

const isCI = process.env.CI === 'true';
const outDir = isCI ? path.resolve('.') : path.join(os.tmpdir(), 'WoodworkingShop');
mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, 'sbom.json');

try {
  execSync(
    `npx --yes @cyclonedx/cyclonedx-npm@latest --output-format json --output-file "${outFile}" --package-lock-only`,
    { stdio: 'inherit' },
  );
  console.log(`SBOM written to: ${outFile}`);
} catch {
  process.exit(1);
}
