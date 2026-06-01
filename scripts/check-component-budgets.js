#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const componentsRoot = path.join(repoRoot, 'src', 'components');
const maxLinesPerComponent = 600;

function collectTsxFiles(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectTsxFiles(absolutePath, files);
      continue;
    }
    if (entry.isFile() && absolutePath.endsWith('.tsx')) {
      files.push(absolutePath);
    }
  }
  return files;
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.length === 0) {
    return 0;
  }
  return content.split(/\r?\n/).length;
}

function main() {
  if (!fs.existsSync(componentsRoot)) {
    throw new Error('Missing src/components directory');
  }

  const files = collectTsxFiles(componentsRoot);
  const violations = [];

  for (const filePath of files) {
    const lines = countLines(filePath);
    if (lines > maxLinesPerComponent) {
      violations.push({
        filePath: toRepoRelative(filePath),
        lines,
      });
    }
  }

  if (violations.length > 0) {
    console.error(`Component budget check failed: ${violations.length} file(s) exceed ${maxLinesPerComponent} lines.`);
    for (const violation of violations.sort((a, b) => b.lines - a.lines)) {
      console.error(`- ${violation.filePath}: ${violation.lines} lines`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Component budget check passed (${files.length} files, max ${maxLinesPerComponent} lines).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
