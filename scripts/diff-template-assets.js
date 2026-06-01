#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const manifestPath = path.join(repoRoot, 'config', 'template-sync-manifest.json');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function isObject(value) {
  return typeof value === 'object' && value !== null;
}

function normalizeTargetPattern(pattern) {
  if (pattern.startsWith('MyScripts/')) {
    return pattern.slice('MyScripts/'.length);
  }
  return pattern;
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

function listRelativeFiles(basePath) {
  const stat = fs.statSync(basePath);
  if (stat.isFile()) {
    return [''];
  }

  const files = [];

  function walk(currentPath) {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        files.push(path.relative(basePath, absolutePath).replaceAll('\\', '/'));
      }
    }
  }

  walk(basePath);
  files.sort();
  return files;
}

function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function compareAsset(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath)) {
    return {
      status: 'missing-target',
      message: `Target path missing: ${targetPath}`,
    };
  }

  const sourceFiles = listRelativeFiles(sourcePath);
  const targetFiles = listRelativeFiles(targetPath);

  const sourceSet = new Set(sourceFiles);
  const targetSet = new Set(targetFiles);

  const missingInTarget = sourceFiles.filter((file) => !targetSet.has(file));
  const extraInTarget = targetFiles.filter((file) => !sourceSet.has(file));

  const contentDiffs = [];
  for (const relativeFile of sourceFiles) {
    if (!targetSet.has(relativeFile)) {
      continue;
    }
    const srcFile = relativeFile === '' ? sourcePath : path.join(sourcePath, relativeFile);
    const tgtFile = relativeFile === '' ? targetPath : path.join(targetPath, relativeFile);
    if (hashFile(srcFile) !== hashFile(tgtFile)) {
      contentDiffs.push(relativeFile || path.basename(sourcePath));
    }
  }

  if (missingInTarget.length === 0 && extraInTarget.length === 0 && contentDiffs.length === 0) {
    return { status: 'in-sync' };
  }

  return {
    status: 'drift',
    missingInTarget,
    extraInTarget,
    contentDiffs,
  };
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
  const report = [];

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

    report.push({
      id,
      sourcePathRel,
      targetRelative,
      result: compareAsset(sourcePath, targetPath),
    });
  }

  const drifted = report.filter((row) => row.result.status !== 'in-sync');

  console.log(`Template drift report: ${report.length - drifted.length}/${report.length} assets in sync.`);
  for (const row of report) {
    if (row.result.status === 'in-sync') {
      console.log(`- ${row.id}: in sync`);
      continue;
    }

    if (row.result.status === 'missing-target') {
      console.log(`- ${row.id}: drift (missing target)`);
      console.log(`  ${row.result.message}`);
      continue;
    }

    console.log(`- ${row.id}: drift`);
    if (row.result.missingInTarget.length > 0) {
      console.log(`  missing in target (${row.result.missingInTarget.length}):`);
      for (const item of row.result.missingInTarget.slice(0, 10)) {
        console.log(`    - ${item}`);
      }
    }
    if (row.result.extraInTarget.length > 0) {
      console.log(`  extra in target (${row.result.extraInTarget.length}):`);
      for (const item of row.result.extraInTarget.slice(0, 10)) {
        console.log(`    - ${item}`);
      }
    }
    if (row.result.contentDiffs.length > 0) {
      console.log(`  content drift (${row.result.contentDiffs.length}):`);
      for (const item of row.result.contentDiffs.slice(0, 10)) {
        console.log(`    - ${item}`);
      }
    }
  }

  if (drifted.length > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
