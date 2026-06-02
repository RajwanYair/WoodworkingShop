#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const packagePath = path.join(repoRoot, 'package.json');

const expectedHooks = {
  'pre-commit': 'npx lint-staged',
  'commit-msg': 'node scripts/validate-commit-msg.js $1',
};

const requiredLintStagedKeys = ['*.{ts,tsx}', '*.{json,yaml,yml}', '*.md', '*.css'];
const requiredTsLintCommands = ['eslint --max-warnings 0 --fix', 'prettier --write'];

function main() {
  if (!fs.existsSync(packagePath)) {
    throw new Error('Missing required file: package.json');
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const errors = [];

  const hooks = pkg['simple-git-hooks'];
  if (!hooks || typeof hooks !== 'object') {
    errors.push('package.json must define `simple-git-hooks` object');
  } else {
    for (const [hookName, expectedCommand] of Object.entries(expectedHooks)) {
      if (!(hookName in hooks)) {
        errors.push(`Missing simple-git-hooks entry: ${hookName}`);
        continue;
      }
      if (hooks[hookName] !== expectedCommand) {
        errors.push(`Hook ${hookName} must equal \"${expectedCommand}\"`);
      }
    }
  }

  const lintStaged = pkg['lint-staged'];
  if (!lintStaged || typeof lintStaged !== 'object') {
    errors.push('package.json must define `lint-staged` object');
  } else {
    for (const key of requiredLintStagedKeys) {
      if (!(key in lintStaged)) {
        errors.push(`Missing lint-staged rule: ${key}`);
      }
    }

    const tsRule = lintStaged['*.{ts,tsx}'];
    if (!Array.isArray(tsRule)) {
      errors.push('lint-staged rule `*.{ts,tsx}` must be an array');
    } else {
      for (const command of requiredTsLintCommands) {
        if (!tsRule.includes(command)) {
          errors.push(`lint-staged ts rule missing command: ${command}`);
        }
      }
    }

    if (lintStaged['*.md'] !== 'markdownlint-cli2 --fix') {
      errors.push('lint-staged md rule must equal "markdownlint-cli2 --fix"');
    }
  }

  if (errors.length > 0) {
    console.error('Hook governance validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Hook governance validation passed (simple-git-hooks + lint-staged contracts verified).');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
