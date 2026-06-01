#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const agentsDir = path.join(repoRoot, '.github', 'agents');

function hasDefinitionOfDoneHeading(content) {
  return /^##\s+Definition of done\b/im.test(content) || /^##\s+Definition of Done\b/im.test(content);
}

function hasChecklistAfterDefinition(content) {
  const headingMatch = content.match(/^##\s+Definition of done\b/im) ?? content.match(/^##\s+Definition of Done\b/im);
  if (!headingMatch || headingMatch.index === undefined) {
    return false;
  }

  const startIndex = headingMatch.index;
  const afterHeading = content.slice(startIndex);
  const nextHeadingIndex = afterHeading.slice(1).search(/\n##\s+/m);
  const section = nextHeadingIndex === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIndex + 1);

  if (!section) {
    return false;
  }
  const checklistPattern = /^\s*(\d+\.\s+|-\s+|\*\s+)/m;
  return checklistPattern.test(section);
}

function main() {
  if (!fs.existsSync(agentsDir)) {
    throw new Error('Missing required directory: .github/agents');
  }

  const agentFiles = fs
    .readdirSync(agentsDir)
    .filter((name) => name.endsWith('.agent.md'))
    .sort((a, b) => a.localeCompare(b));

  if (agentFiles.length === 0) {
    throw new Error('No .agent.md files found under .github/agents');
  }

  const errors = [];

  for (const fileName of agentFiles) {
    const fullPath = path.join(agentsDir, fileName);
    const content = fs.readFileSync(fullPath, 'utf8');

    if (!hasDefinitionOfDoneHeading(content)) {
      errors.push(`${fileName}: missing \"Definition of done\" heading`);
      continue;
    }

    if (!hasChecklistAfterDefinition(content)) {
      errors.push(`${fileName}: Definition-of-Done section must include checklist items`);
    }
  }

  if (errors.length > 0) {
    console.error('Agent contract validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Agent contract validation passed (${agentFiles.length} agent files verified).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
