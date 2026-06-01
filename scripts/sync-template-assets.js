#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'config', 'template-sync-manifest.json');

function isObject(value) {
  return typeof value === 'object' && value !== null;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyRecursive(sourcePath, targetPath) {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    ensureDir(targetPath);
    for (const entry of fs.readdirSync(sourcePath)) {
      copyRecursive(path.join(sourcePath, entry), path.join(targetPath, entry));
    }
    return;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function resolveParentWorkspaceRoot(currentRepoRoot) {
  const parent = path.dirname(currentRepoRoot);
  const parentName = path.basename(parent);

  if (parentName !== 'MyScripts') {
    throw new Error(
      `Expected repo parent folder to be MyScripts, found "${parentName}". Run this script from the WoodworkingShop workspace.`,
    );
  }

  return parent;
}

function normalizeTargetPattern(pattern) {
  if (pattern.startsWith('MyScripts/')) {
    return pattern.slice('MyScripts/'.length);
  }
  return pattern;
}

function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Missing required file: config/template-sync-manifest.json');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!isObject(manifest) || !Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error('Invalid template sync manifest: assets must be a non-empty array');
  }

  const templateName = manifest.templateName;
  if (typeof templateName !== 'string' || templateName.trim().length === 0) {
    throw new Error('Invalid template sync manifest: templateName must be a non-empty string');
  }

  const parentWorkspaceRoot = resolveParentWorkspaceRoot(repoRoot);

  const copied = [];

  for (const asset of manifest.assets) {
    if (!isObject(asset)) {
      throw new Error('Invalid manifest asset entry: expected object');
    }

    const id = asset.id;
    const sourcePathRel = asset.sourcePath;
    const targetPatternRaw = asset.targetPattern;

    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Invalid manifest asset id');
    }
    if (typeof sourcePathRel !== 'string' || sourcePathRel.trim().length === 0) {
      throw new Error(`Asset ${id} has invalid sourcePath`);
    }
    if (typeof targetPatternRaw !== 'string' || !targetPatternRaw.includes('<template>')) {
      throw new Error(`Asset ${id} has invalid targetPattern`);
    }

    const sourcePath = path.join(repoRoot, sourcePathRel);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Asset ${id} source path does not exist: ${sourcePathRel}`);
    }

    const normalizedPattern = normalizeTargetPattern(targetPatternRaw);
    const targetRelative = normalizedPattern.replace('<template>', templateName);
    const targetPath = path.join(parentWorkspaceRoot, targetRelative);

    copyRecursive(sourcePath, targetPath);
    copied.push({ id, sourcePathRel, targetRelative });
  }

  console.log(`Template sync completed: ${copied.length} assets copied to parent MyScripts template folder.`);
  for (const row of copied) {
    console.log(`- ${row.id}: ${row.sourcePathRel} -> ${row.targetRelative}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
