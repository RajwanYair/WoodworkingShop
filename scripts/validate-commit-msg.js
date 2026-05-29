import { readFileSync } from 'node:fs';

const commitMsgPath = process.argv[2];
if (!commitMsgPath) {
  console.error('validate-commit-msg: missing commit message file path');
  process.exit(1);
}

const message = readFileSync(commitMsgPath, 'utf8').trim();

const ignorePrefixes = ['Merge ', 'Revert "'];
if (ignorePrefixes.some((prefix) => message.startsWith(prefix))) {
  process.exit(0);
}

// Conventional commit with optional scope and optional breaking marker.
const conventionalCommitPattern =
  /^(feat|fix|chore|refactor|test|docs|ci|perf|style|revert)(\([a-z0-9\-/]+\))?!?: [^\s].{0,70}$/;

if (!conventionalCommitPattern.test(message)) {
  console.error('Invalid commit message. Expected conventional commit format.');
  console.error('Example: feat(engine): add spline joint calculator');
  console.error('Allowed types: feat|fix|chore|refactor|test|docs|ci|perf|style|revert');
  process.exit(1);
}

if (message.endsWith('.')) {
  console.error('Commit subject must not end with a period.');
  process.exit(1);
}
