#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const packagePath = path.join(repoRoot, 'package.json');
const copilotInstructionsPath = path.join(repoRoot, '.github', 'copilot-instructions.md');
const agentsPath = path.join(repoRoot, 'AGENTS.md');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getMajor(versionRange) {
  const match = versionRange.match(/(\d+)\./);
  if (!match) {
    throw new Error(`Unable to parse major version from: ${versionRange}`);
  }
  return Number.parseInt(match[1], 10);
}

function getMajorMinor(versionRange) {
  const match = versionRange.match(/(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Unable to parse major.minor version from: ${versionRange}`);
  }
  return `${match[1]}.${match[2]}`;
}

function assertIncludes(text, token, targetName, errors) {
  if (!text.includes(token)) {
    errors.push(`${targetName} is missing token: ${token}`);
  }
}

function main() {
  if (!fs.existsSync(packagePath)) {
    throw new Error('Missing required file: package.json');
  }
  if (!fs.existsSync(copilotInstructionsPath)) {
    throw new Error('Missing required file: .github/copilot-instructions.md');
  }
  if (!fs.existsSync(agentsPath)) {
    throw new Error('Missing required file: AGENTS.md');
  }

  const packageJson = JSON.parse(readText(packagePath));
  const appVersion = packageJson.version;

  const reactMajor = getMajor(packageJson.dependencies.react);
  const tsMajor = getMajor(packageJson.devDependencies.typescript);
  const viteMajor = getMajor(packageJson.devDependencies.vite);
  const vitestMajor = getMajor(packageJson.devDependencies.vitest);
  const playwrightMajorMinor = getMajorMinor(packageJson.devDependencies['@playwright/test']);
  const i18nextMajor = getMajor(packageJson.dependencies.i18next);
  const zustandMajor = getMajor(packageJson.dependencies.zustand);
  const tailwindMajor = getMajor(packageJson.devDependencies.tailwindcss);

  const copilotText = readText(copilotInstructionsPath);
  const agentsText = readText(agentsPath);
  const errors = [];

  assertIncludes(copilotText, `Current release: v${appVersion}`, '.github/copilot-instructions.md', errors);
  assertIncludes(agentsText, `**v${appVersion}**`, 'AGENTS.md', errors);

  const stackTokens = [
    `React ${reactMajor}`,
    `TypeScript ${tsMajor}`,
    `Vite ${viteMajor}`,
    `Vitest ${vitestMajor}`,
    `Playwright ${playwrightMajorMinor}`,
    `i18next ${i18nextMajor}`,
    `Zustand ${zustandMajor}`,
    `Tailwind CSS v${tailwindMajor}`,
  ];

  for (const token of stackTokens) {
    assertIncludes(copilotText, token, '.github/copilot-instructions.md', errors);
    assertIncludes(agentsText, token, 'AGENTS.md', errors);
  }

  if (errors.length > 0) {
    console.error('AI context version validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`AI context version validation passed (version v${appVersion}).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
