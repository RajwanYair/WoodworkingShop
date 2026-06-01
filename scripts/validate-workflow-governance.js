#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, '.github', 'workflows');

/** @type {Array<{name:string,path:string,requiredTokens:string[]}>} */
const workflowPolicies = [
  {
    name: 'CI workflow',
    path: '.github/workflows/ci.yml',
    requiredTokens: [
      'name: CI',
      'npm run quality:fast',
      'npm run mcp:validate',
      'npm run components:budget',
      'npm run test:coverage',
    ],
  },
  {
    name: 'Release workflow',
    path: '.github/workflows/release.yml',
    requiredTokens: [
      'name: Release',
      'npm run check',
      'actions/attest-build-provenance@v2',
      'softprops/action-gh-release@v3',
      'sbom.json',
    ],
  },
  {
    name: 'CodeQL workflow',
    path: '.github/workflows/codeql.yml',
    requiredTokens: [
      'name: CodeQL Security Analysis',
      'github/codeql-action/init@v3',
      'github/codeql-action/analyze@v3',
      'schedule:',
    ],
  },
  {
    name: 'Dependency review workflow',
    path: '.github/workflows/dependency-review.yml',
    requiredTokens: ['name: Dependency Review', 'actions/dependency-review-action@v5', 'fail-on-severity: moderate'],
  },
  {
    name: 'Secret scan workflow',
    path: '.github/workflows/secret-scan.yml',
    requiredTokens: ['name: Secret Scan', 'gitleaks/gitleaks-action@v3', 'GITLEAKS_CONFIG: .github/.gitleaks.toml'],
  },
];

function main() {
  if (!fs.existsSync(workflowsDir)) {
    throw new Error('Missing required directory: .github/workflows');
  }

  const errors = [];

  for (const policy of workflowPolicies) {
    const filePath = path.join(repoRoot, policy.path);
    if (!fs.existsSync(filePath)) {
      errors.push(`${policy.name} missing file: ${policy.path}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    for (const token of policy.requiredTokens) {
      if (!content.includes(token)) {
        errors.push(`${policy.name} missing required token \"${token}\" in ${policy.path}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Workflow governance validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Workflow governance validation passed (${workflowPolicies.length} workflows verified).`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
