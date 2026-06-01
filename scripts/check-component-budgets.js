#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const componentsRoot = path.join(repoRoot, 'src', 'components');
const exceptionsConfigPath = path.join(repoRoot, 'config', 'component-budget-exceptions.json');

function parseIsoDate(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function loadExceptionsConfig() {
  if (!fs.existsSync(exceptionsConfigPath)) {
    return {
      maxLinesDefault: 600,
      exceptionsByPath: new Map(),
      configErrors: [],
    };
  }

  const raw = JSON.parse(fs.readFileSync(exceptionsConfigPath, 'utf8'));
  const configErrors = [];
  const exceptionsByPath = new Map();

  const maxLinesDefault =
    typeof raw.maxLinesDefault === 'number' && Number.isInteger(raw.maxLinesDefault) && raw.maxLinesDefault > 0
      ? raw.maxLinesDefault
      : 600;

  if (!Array.isArray(raw.exceptions)) {
    configErrors.push('component-budget-exceptions.json: exceptions must be an array');
    return { maxLinesDefault, exceptionsByPath, configErrors };
  }

  for (const entry of raw.exceptions) {
    if (!entry || typeof entry !== 'object') {
      configErrors.push('component-budget-exceptions.json: each exception must be an object');
      continue;
    }

    const { filePath, maxLines, reason, owner, expiresOn } = entry;

    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      configErrors.push('component-budget-exceptions.json: exception filePath must be a non-empty string');
      continue;
    }
    if (exceptionsByPath.has(filePath)) {
      configErrors.push(`component-budget-exceptions.json: duplicate exception for ${filePath}`);
      continue;
    }
    if (typeof maxLines !== 'number' || !Number.isInteger(maxLines) || maxLines <= maxLinesDefault) {
      configErrors.push(
        `component-budget-exceptions.json: ${filePath} maxLines must be an integer greater than maxLinesDefault (${maxLinesDefault})`,
      );
      continue;
    }
    if (typeof reason !== 'string' || reason.trim().length < 15) {
      configErrors.push(`component-budget-exceptions.json: ${filePath} reason must be at least 15 chars`);
      continue;
    }
    if (typeof owner !== 'string' || owner.trim().length === 0) {
      configErrors.push(`component-budget-exceptions.json: ${filePath} owner must be non-empty`);
      continue;
    }
    if (typeof expiresOn !== 'string' || parseIsoDate(expiresOn) === null) {
      configErrors.push(`component-budget-exceptions.json: ${filePath} expiresOn must be a valid ISO date`);
      continue;
    }

    exceptionsByPath.set(filePath, {
      maxLines,
      reason,
      owner,
      expiresOn,
    });
  }

  return {
    maxLinesDefault,
    exceptionsByPath,
    configErrors,
  };
}

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

  const { maxLinesDefault, exceptionsByPath, configErrors } = loadExceptionsConfig();
  if (configErrors.length > 0) {
    console.error('Component budget exceptions config is invalid:');
    for (const error of configErrors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const files = collectTsxFiles(componentsRoot);
  const violations = [];
  const expiredExceptions = [];
  const usedExceptions = new Set();
  const today = new Date();

  for (const filePath of files) {
    const relativePath = toRepoRelative(filePath);
    const lines = countLines(filePath);
    const exception = exceptionsByPath.get(relativePath);
    const budget = exception?.maxLines ?? maxLinesDefault;

    if (lines > budget) {
      violations.push({
        filePath: relativePath,
        lines,
        budget,
        reason: exception?.reason,
      });
    }

    if (exception) {
      usedExceptions.add(relativePath);
      const expiryDate = parseIsoDate(exception.expiresOn);
      if (expiryDate !== null && expiryDate < today) {
        expiredExceptions.push({ filePath: relativePath, expiresOn: exception.expiresOn });
      }
    }
  }

  const unusedExceptions = [];
  for (const relativePath of exceptionsByPath.keys()) {
    if (!usedExceptions.has(relativePath)) {
      unusedExceptions.push(relativePath);
    }
  }

  if (expiredExceptions.length > 0) {
    console.error('Component budget check failed: expired exceptions found.');
    for (const item of expiredExceptions) {
      console.error(`- ${item.filePath}: expired on ${item.expiresOn}`);
    }
    process.exitCode = 1;
    return;
  }

  if (unusedExceptions.length > 0) {
    console.error('Component budget check failed: stale exceptions found for files not present in scan.');
    for (const relativePath of unusedExceptions) {
      console.error(`- ${relativePath}`);
    }
    process.exitCode = 1;
    return;
  }

  if (violations.length > 0) {
    console.error(`Component budget check failed: ${violations.length} file(s) exceed configured line budgets.`);
    for (const violation of violations.sort((a, b) => b.lines - a.lines)) {
      if (violation.reason) {
        console.error(`- ${violation.filePath}: ${violation.lines} lines (budget ${violation.budget})`);
        console.error(`  reason: ${violation.reason}`);
      } else {
        console.error(`- ${violation.filePath}: ${violation.lines} lines (default budget ${violation.budget})`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Component budget check passed (${files.length} files, default max ${maxLinesDefault} lines, explicit exceptions ${exceptionsByPath.size}).`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
