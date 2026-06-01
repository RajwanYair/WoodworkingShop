#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = process.cwd();
const mcpPath = path.join(repoRoot, '.vscode', 'mcp.json');

const requiredCoreServers = ['github', 'filesystem', 'fetch', 'playwright', 'memory', 'sequentialthinking', 'context7'];

/**
 * Parse JSONC with TypeScript's config parser so comments/trailing commas are supported.
 */
function parseJsonc(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const parsed = ts.parseConfigFileTextToJson(filePath, text);
  if (parsed.error) {
    const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
    throw new Error(`Failed to parse ${filePath}: ${message}`);
  }
  return parsed.config;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function main() {
  if (!fs.existsSync(mcpPath)) {
    throw new Error('Missing .vscode/mcp.json');
  }

  const mcp = parseJsonc(mcpPath);
  const servers = mcp?.servers;
  if (!servers || typeof servers !== 'object') {
    throw new Error('mcp.json must include a top-level "servers" object');
  }

  const errors = [];

  for (const serverName of requiredCoreServers) {
    if (!(serverName in servers)) {
      errors.push(`Missing required core MCP server: ${serverName}`);
      continue;
    }

    const serverConfig = servers[serverName];
    if (!serverConfig || typeof serverConfig !== 'object') {
      errors.push(`Server "${serverName}" must be an object`);
      continue;
    }

    if (!isNonEmptyString(serverConfig.description)) {
      errors.push(`Server "${serverName}" must define a non-empty description`);
    }
  }

  if (errors.length > 0) {
    console.error('MCP governance validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`MCP governance validation passed (${requiredCoreServers.length} core servers verified).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
