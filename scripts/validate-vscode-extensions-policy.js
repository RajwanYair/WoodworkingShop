#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = process.cwd();
const extensionsPath = path.join(repoRoot, '.vscode', 'extensions.json');

const requiredRecommendations = [
  'esbenp.prettier-vscode',
  'dbaeumer.vscode-eslint',
  'stylelint.vscode-stylelint',
  'vitest.explorer',
  'ms-playwright.playwright',
  'github.copilot',
  'github.copilot-chat',
];

const requiredUnwanted = ['charliermarsh.ruff', 'ms-python.python', 'ms-python.vscode-pylance', 'ms-vscode.cpptools'];

const forbiddenRecommendationPrefixes = ['ms-python.', 'dart-code.', 'ms-vscode.cpptools'];

function parseJsonc(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = ts.parseConfigFileTextToJson(filePath, text);
  if (parsed.error) {
    const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
    throw new Error(`Failed to parse ${filePath}: ${message}`);
  }
  return parsed.config;
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function main() {
  if (!fs.existsSync(extensionsPath)) {
    throw new Error('Missing required file: .vscode/extensions.json');
  }

  const config = parseJsonc(extensionsPath);
  const recommendations = config?.recommendations;
  const unwanted = config?.unwantedRecommendations;

  const errors = [];

  if (!isNonEmptyStringArray(recommendations)) {
    errors.push('`recommendations` must be a non-empty string array');
  }

  if (!isNonEmptyStringArray(unwanted)) {
    errors.push('`unwantedRecommendations` must be a non-empty string array');
  }

  if (errors.length > 0) {
    console.error('VS Code extensions policy validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const recommendationSet = new Set(recommendations);
  const unwantedSet = new Set(unwanted);

  for (const extensionId of requiredRecommendations) {
    if (!recommendationSet.has(extensionId)) {
      errors.push(`Missing required recommendation: ${extensionId}`);
    }
  }

  for (const extensionId of requiredUnwanted) {
    if (!unwantedSet.has(extensionId)) {
      errors.push(`Missing required unwanted recommendation: ${extensionId}`);
    }
  }

  for (const extensionId of recommendations) {
    for (const prefix of forbiddenRecommendationPrefixes) {
      if (extensionId.startsWith(prefix)) {
        errors.push(`Forbidden recommendation for this TS-only workspace: ${extensionId}`);
        break;
      }
    }
  }

  for (const extensionId of recommendationSet) {
    if (unwantedSet.has(extensionId)) {
      errors.push(`Extension appears in both recommendations and unwantedRecommendations: ${extensionId}`);
    }
  }

  if (errors.length > 0) {
    console.error('VS Code extensions policy validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `VS Code extensions policy validation passed (${recommendations.length} recommendations, ${unwanted.length} unwanted).`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
