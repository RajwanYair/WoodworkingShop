#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const repoRoot = process.cwd();
const mcpPath = path.join(repoRoot, '.vscode', 'mcp.json');

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

function isHttpsUrl(value) {
  return typeof value === 'string' && value.startsWith('https://');
}

function isSecretEnvKey(key) {
  return /(key|token|secret|password)/i.test(key);
}

function isSecretPlaceholder(value) {
  return typeof value === 'string' && value.includes('${input:');
}

function main() {
  if (!fs.existsSync(mcpPath)) {
    throw new Error('Missing required file: .vscode/mcp.json');
  }

  const config = parseJsonc(mcpPath);
  const servers = config?.servers;
  if (!servers || typeof servers !== 'object') {
    throw new Error('mcp.json must include a top-level "servers" object');
  }

  const errors = [];

  for (const [serverName, serverConfig] of Object.entries(servers)) {
    if (!serverConfig || typeof serverConfig !== 'object') {
      errors.push(`Server "${serverName}" must be an object`);
      continue;
    }

    if (!isNonEmptyString(serverConfig.description)) {
      errors.push(`Server "${serverName}" must define a non-empty description`);
    }

    if (serverConfig.type === 'http' && !isHttpsUrl(serverConfig.url)) {
      errors.push(`Server "${serverName}" must use an HTTPS URL`);
    }

    if (serverConfig.env && typeof serverConfig.env === 'object') {
      for (const [envKey, envValue] of Object.entries(serverConfig.env)) {
        if (isSecretEnvKey(envKey) && !isSecretPlaceholder(envValue)) {
          errors.push(`Server "${serverName}" has non-placeholder secret env value for ${envKey}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('MCP metadata validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  const serverCount = Object.keys(servers).length;
  console.log(`MCP metadata validation passed (${serverCount} servers verified).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
