#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const promptsDir = path.join(repoRoot, '.github', 'prompts');

function getOutputContractSection(content) {
  const headingMatch = content.match(/^##\s+Output contract\b/im) ?? content.match(/^##\s+Output Contract\b/im);
  if (!headingMatch || headingMatch.index === undefined) {
    return '';
  }

  const startIndex = headingMatch.index;
  const afterHeading = content.slice(startIndex);
  const nextHeadingIndex = afterHeading.slice(1).search(/\n##\s+/m);
  return nextHeadingIndex === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIndex + 1);
}

function hasOutputContractChecklist(content) {
  const section = getOutputContractSection(content);
  if (!section) {
    return false;
  }
  return /^\s*(\d+\.\s+|-\s+|\*\s+)/m.test(section);
}

function main() {
  if (!fs.existsSync(promptsDir)) {
    throw new Error('Missing required directory: .github/prompts');
  }

  const promptFiles = fs
    .readdirSync(promptsDir)
    .filter((name) => name.endsWith('.prompt.md'))
    .sort((a, b) => a.localeCompare(b));

  if (promptFiles.length === 0) {
    throw new Error('No .prompt.md files found under .github/prompts');
  }

  const errors = [];

  for (const fileName of promptFiles) {
    const fullPath = path.join(promptsDir, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');

    if (!/##\s+Output contract\b/i.test(content)) {
      errors.push(`${fileName}: missing \"Output contract\" section`);
      continue;
    }

    if (!hasOutputContractChecklist(content)) {
      errors.push(`${fileName}: Output contract section must include checklist items`);
    }
  }

  if (errors.length > 0) {
    console.error('Prompt contract validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Prompt contract validation passed (${promptFiles.length} prompt files verified).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
