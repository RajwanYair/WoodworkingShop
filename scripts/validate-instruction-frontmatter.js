#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const instructionsDir = path.join(repoRoot, '.github', 'instructions');

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return null;
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return null;
  }

  return content.slice(4, endIndex);
}

function parseApplyTo(frontmatter) {
  const applyToMatch = frontmatter.match(/^applyTo:\s*(.+)$/m);
  if (!applyToMatch) {
    return '';
  }

  const rawValue = applyToMatch[1].trim();
  if (!rawValue) {
    return '';
  }

  const unquoted = rawValue.replace(/^['"]|['"]$/g, '').trim();
  return unquoted;
}

function main() {
  if (!fs.existsSync(instructionsDir)) {
    throw new Error('Missing required directory: .github/instructions');
  }

  const instructionFiles = fs
    .readdirSync(instructionsDir)
    .filter((name) => name.endsWith('.instructions.md'))
    .sort((a, b) => a.localeCompare(b));

  if (instructionFiles.length === 0) {
    throw new Error('No .instructions.md files found under .github/instructions');
  }

  const errors = [];

  for (const fileName of instructionFiles) {
    const fullPath = path.join(instructionsDir, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      errors.push(`${fileName}: missing YAML frontmatter block`);
      continue;
    }

    const applyTo = parseApplyTo(frontmatter);
    if (!applyTo) {
      errors.push(`${fileName}: missing or empty applyTo frontmatter value`);
      continue;
    }

    if (!/[*]/.test(applyTo) && !applyTo.includes('/')) {
      errors.push(`${fileName}: applyTo should define a scoped path/glob, got "${applyTo}"`);
    }
  }

  if (errors.length > 0) {
    console.error('Instruction frontmatter validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Instruction frontmatter validation passed (${instructionFiles.length} instruction files verified).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
