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
    name: 'PR title workflow',
    path: '.github/workflows/pr-title.yml',
    requiredTokens: [
      'name: PR Title Lint',
      'types: [opened, edited, synchronize, reopened, ready_for_review]',
      'if: ${{ !github.event.pull_request.draft }}',
      'uses: amannn/action-semantic-pull-request@e32d7e603df1aa1ba07e981f2a23455dee596825 # v5',
    ],
  },
  {
    name: 'Release workflow',
    path: '.github/workflows/release.yml',
    requiredTokens: [
      'name: Release',
      'npm run check',
      'uses: actions/attest-build-provenance@e8998f949152b193b063cb0ec769d69d929409be # v2',
      'uses: softprops/action-gh-release@efb35369e0ad2afab669f228072c1b0d510eae64 # v3',
      'sbom.json',
    ],
  },
  {
    name: 'CodeQL workflow',
    path: '.github/workflows/codeql.yml',
    requiredTokens: [
      'name: CodeQL Security Analysis',
      'uses: github/codeql-action/init@9f759ee644a3e7c15c1390abf49868036c00067b # v3',
      'uses: github/codeql-action/analyze@9f759ee644a3e7c15c1390abf49868036c00067b # v3',
      'schedule:',
    ],
  },
  {
    name: 'Dependency review workflow',
    path: '.github/workflows/dependency-review.yml',
    requiredTokens: [
      'name: Dependency Review',
      'uses: actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294 # v5.0.0',
      'fail-on-severity: moderate',
    ],
  },
  {
    name: 'Secret scan workflow',
    path: '.github/workflows/secret-scan.yml',
    requiredTokens: [
      'name: Secret Scan',
      'uses: gitleaks/gitleaks-action@e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e # v3',
      'GITLEAKS_CONFIG: .github/.gitleaks.toml',
    ],
  },
  {
    name: 'Mutation testing workflow',
    path: '.github/workflows/mutation.yml',
    requiredTokens: [
      'name: Mutation Testing',
      "cron: '0 8 * * 1'",
      'timeout-minutes: 15',
      'npm run test:mutation',
      'stryker.weekly.config.mjs',
      'name: mutation-report',
    ],
  },
  {
    name: 'OpenSSF Scorecard workflow',
    path: '.github/workflows/scorecard.yml',
    requiredTokens: [
      'name: OpenSSF Scorecard',
      "cron: '30 1 * * 6'",
      'uses: ossf/scorecard-action@2d1146689b8cda280b9bc96326124645441f03bc # v2.4.4',
      'publish_results: true',
      'uses: github/codeql-action/upload-sarif@24c54180a607b1449ed407dd24f251e4e9147c8d # v4.38.3',
      'security-events: write',
    ],
  },
  {
    name: 'OpenSSF Scorecard badge',
    path: 'README.md',
    requiredTokens: [
      '[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/RajwanYair/WoodworkingShop/badge)](https://scorecard.dev/viewer/?uri=github.com/RajwanYair/WoodworkingShop)',
    ],
  },
  {
    name: 'Weekly mutation threshold config',
    path: 'stryker.weekly.config.mjs',
    requiredTokens: ["'src/engine/dimensions.ts'", "'src/utils/bom-export.ts'", 'break: 79'],
  },
  {
    name: 'Weekly mutation test scope config',
    path: 'vitest.mutation.config.ts',
    requiredTokens: ["'tests/engine/dimensions.test.ts'", "'tests/utils/bom-export.test.ts'"],
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
        errors.push(`${policy.name} missing required token "${token}" in ${policy.path}`);
      }
    }
  }

  const automationFiles = walkYamlFiles(path.join(repoRoot, '.github'));
  for (const filePath of automationFiles) {
    const relativePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const isWorkflow = relativePath.startsWith('.github/workflows/');

    if (isWorkflow) {
      if (/^permissions:/m.test(content)) {
        errors.push(`Workflow-level permissions are forbidden in ${relativePath}; define permissions per job`);
      }

      const lines = content.split(/\r?\n/);
      const jobsIndex = lines.findIndex((line) => /^jobs:\s*$/.test(line));
      if (jobsIndex !== -1) {
        const jobHeaders = [];
        for (let index = jobsIndex + 1; index < lines.length; index += 1) {
          if (/^  [\w-]+:\s*$/.test(lines[index])) jobHeaders.push(index);
        }
        for (let index = 0; index < jobHeaders.length; index += 1) {
          const start = jobHeaders[index];
          const end = jobHeaders[index + 1] ?? lines.length;
          const jobName = lines[start].trim().slice(0, -1);
          if (!lines.slice(start + 1, end).some((line) => /^    permissions:\s*$/.test(line))) {
            errors.push(`Missing job-level permissions for ${jobName} in ${relativePath}`);
          }
        }
      }
    }

    for (const line of content.split(/\r?\n/)) {
      if (!/^\s*-\s*uses:/.test(line)) continue;
      const match = line.match(/^\s*-\s*uses:\s*([^\s#]+)(?:\s+#\s*(v[^\s]+))?\s*$/);
      const actionRef = match?.[1];
      if (!actionRef || actionRef.startsWith('./')) continue;
      const sha = actionRef.slice(actionRef.lastIndexOf('@') + 1);
      if (!/^[a-f0-9]{40}$/.test(sha) || !match?.[2]) {
        errors.push(`External action must use a full SHA and version comment in ${relativePath}: ${actionRef}`);
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

function walkYamlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkYamlFiles(filePath);
    return /\.ya?ml$/i.test(entry.name) ? [filePath] : [];
  });
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
