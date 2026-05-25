/**
 * Runs all quality checks concurrently — mirrors what CI does with bash `&`.
 * Each check's output is buffered and printed only on failure, giving clean
 * signal-to-noise compared to interleaved sequential output.
 *
 * Usage: npm run quality:fast
 */
import { exec } from 'node:child_process';

const checks = ['typecheck', 'lint', 'lint:css', 'lint:md', 'format:check', 'i18n:coverage'];

const results = await Promise.all(
  checks.map(
    (name) =>
      new Promise((resolve) => {
        exec(`npm run ${name}`, (error, stdout, stderr) => {
          resolve({ name, code: error?.code ?? 0, output: stdout + stderr });
        });
      }),
  ),
);

const failed = results.filter((r) => r.code !== 0);
if (failed.length > 0) {
  for (const { name, output } of failed) {
    process.stderr.write(`\n${'─'.repeat(60)}\n❌  ${name} FAILED\n${'─'.repeat(60)}\n`);
    process.stderr.write(output);
  }
  process.exit(1);
}
console.log('✓  All quality checks passed');
