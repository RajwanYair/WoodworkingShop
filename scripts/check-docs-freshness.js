#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const ownershipPath = path.join(repoRoot, 'docs', 'OWNERSHIP.md');

function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseOwnershipTable(content) {
  const lines = content.split(/\r?\n/);
  const rows = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('|')) {
      continue;
    }

    if (line.includes('---')) {
      continue;
    }

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length !== 4) {
      continue;
    }

    if (cells[0] === 'Document') {
      continue;
    }

    rows.push({
      documentPath: cells[0],
      owner: cells[1],
      maxAgeDays: cells[2],
      lastReviewed: cells[3],
    });
  }

  return rows;
}

function main() {
  if (!fs.existsSync(ownershipPath)) {
    throw new Error('Missing required file: docs/OWNERSHIP.md');
  }

  const content = fs.readFileSync(ownershipPath, 'utf8');
  const rows = parseOwnershipTable(content);

  if (rows.length === 0) {
    throw new Error('OWNERSHIP.md must contain at least one ownership row');
  }

  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const errors = [];

  for (const row of rows) {
    if (!row.documentPath) {
      errors.push('Found row with empty document path');
      continue;
    }

    if (!row.owner) {
      errors.push(`Missing owner for ${row.documentPath}`);
    }

    const maxAge = Number.parseInt(row.maxAgeDays, 10);
    if (!Number.isFinite(maxAge) || maxAge <= 0) {
      errors.push(`Invalid max age days for ${row.documentPath}: ${row.maxAgeDays}`);
      continue;
    }

    const reviewedDate = parseIsoDate(row.lastReviewed);
    if (!reviewedDate) {
      errors.push(`Invalid last reviewed date for ${row.documentPath}: ${row.lastReviewed}`);
      continue;
    }

    const docAbsolutePath = path.join(repoRoot, row.documentPath);
    if (!fs.existsSync(docAbsolutePath)) {
      errors.push(`Document does not exist: ${row.documentPath}`);
      continue;
    }

    const ageDays = Math.floor((nowMs - reviewedDate.getTime()) / dayMs);
    if (ageDays > maxAge) {
      errors.push(`${row.documentPath} is stale: ${ageDays} days old exceeds max ${maxAge} days (owner: ${row.owner})`);
    }
  }

  if (errors.length > 0) {
    console.error('Documentation freshness check failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Documentation freshness check passed (${rows.length} ownership entries validated).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
