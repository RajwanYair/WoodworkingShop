import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('workflow governance', () => {
  it.each(['stryker.config.mjs', 'stryker.weekly.config.mjs', 'vitest.mutation.config.ts'])(
    'references existing mutation targets in %s',
    (filename) => {
      const source = readFileSync(resolve(filename), 'utf8');
      const targets = [...source.matchAll(/'((?:src|tests)\/[^']+)'/g)].map((match) => match[1]!);

      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) expect(existsSync(resolve(target)), target).toBe(true);
    },
  );

  it.each([
    { placement: 'step', expectedStatus: 0 },
    { placement: 'job', expectedStatus: 1 },
  ])('validates runner context at $placement scope', ({ placement, expectedStatus }) => {
    const root = process.cwd();
    const fixture = mkdtempSync(join(tmpdir(), 'WoodworkingShop-workflow-'));

    try {
      cpSync(join(root, '.github', 'workflows'), join(fixture, '.github', 'workflows'), { recursive: true });
      for (const filename of ['README.md', 'stryker.weekly.config.mjs', 'vitest.mutation.config.ts']) {
        cpSync(join(root, filename), join(fixture, filename));
      }
      if (placement === 'job') {
        const mutationPath = join(fixture, '.github', 'workflows', 'mutation.yml');
        const mutation = readFileSync(mutationPath, 'utf8').replace(
          '    timeout-minutes: 15',
          '    env:\n      STRYKER_INCREMENTAL_FILE: ${{ runner.temp }}/mutation.json\n    timeout-minutes: 15',
        );
        writeFileSync(mutationPath, mutation);
      }

      const result = spawnSync(process.execPath, [resolve(root, 'scripts', 'validate-workflow-governance.js')], {
        cwd: fixture,
        encoding: 'utf8',
      });

      expect(result.error).toBeUndefined();
      expect(result.status, result.stdout + result.stderr).toBe(expectedStatus);
      if (placement === 'job') expect(result.stderr).toContain('Job-level env cannot use runner context');
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
