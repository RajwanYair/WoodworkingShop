import { readFileSync } from 'node:fs';

const commitMsgPath = process.argv[2];
if (!commitMsgPath) {
  console.error('validate-commit-msg: missing commit message file path');
  process.exit(1);
}

const message = readFileSync(commitMsgPath, 'utf8').trim();
const subject = message.split('\n')[0];

const ignorePrefixes = ['Merge ', 'Revert "'];
if (ignorePrefixes.some((prefix) => subject.startsWith(prefix))) {
  process.exit(0);
}

// Conventional commit with optional scope and optional breaking marker.
const conventionalCommitPattern =
  /^(feat|fix|chore|refactor|test|docs|ci|perf|style|revert|release|sprint)(\([a-z0-9\-/.]+\))?!?: [^\s].{0,70}$/;

if (!conventionalCommitPattern.test(subject)) {
  console.error('Invalid commit message. Expected conventional commit format.');
  console.error('Example: feat(engine): add spline joint calculator');
  console.error('Allowed types: feat|fix|chore|refactor|test|docs|ci|perf|style|revert|release|sprint');
  process.exit(1);
}

if (subject.endsWith('.')) {
  console.error('Commit subject must not end with a period.');
  process.exit(1);
}
