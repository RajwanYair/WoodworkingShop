#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'config', 'template-sync-manifest.json');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing required file: config/template-sync-manifest.json');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const errors = [];

  if (manifest.version !== 1) {
    errors.push('Manifest version must be 1');
  }

  if (!isNonEmptyString(manifest.templateName)) {
    errors.push('Manifest templateName must be a non-empty string');
  }

  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    errors.push('Manifest assets must be a non-empty array');
  }

  const ids = new Set();
  const sourcePaths = new Set();

  for (const asset of manifest.assets ?? []) {
    if (!asset || typeof asset !== 'object') {
      errors.push('Each manifest asset must be an object');
      continue;
    }

    const { id, sourcePath, targetPattern, owner } = asset;

    if (!isNonEmptyString(id)) {
      errors.push('Manifest asset id must be non-empty');
      continue;
    }
    if (ids.has(id)) {
      errors.push(`Duplicate manifest asset id: ${id}`);
    }
    ids.add(id);

    if (!isNonEmptyString(sourcePath)) {
      errors.push(`Asset ${id} has empty sourcePath`);
      continue;
    }
    if (sourcePaths.has(sourcePath)) {
      errors.push(`Duplicate manifest sourcePath: ${sourcePath}`);
    }
    sourcePaths.add(sourcePath);

    const absoluteSourcePath = path.join(repoRoot, sourcePath);
    if (!fs.existsSync(absoluteSourcePath)) {
      errors.push(`Asset ${id} sourcePath does not exist: ${sourcePath}`);
    }

    if (!isNonEmptyString(targetPattern) || !targetPattern.includes('<template>')) {
      errors.push(`Asset ${id} targetPattern must include <template>`);
    }

    if (!isNonEmptyString(owner)) {
      errors.push(`Asset ${id} owner must be non-empty`);
    }
  }

  if (errors.length > 0) {
    console.error('Template sync manifest validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Template sync manifest validation passed (${manifest.assets.length} assets verified).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
