#!/usr/bin/env node

import { spawn } from 'node:child_process';

const command = 'npx';
const args = ['vitest', 'run', 'tests/utils/export-golden-baseline.test.ts'];

const child =
  process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', `${command} ${args.join(' ')}`], {
        stdio: 'inherit',
        env: {
          ...process.env,
          UPDATE_EXPORT_GOLDEN: '1',
        },
      })
    : spawn(command, args, {
        stdio: 'inherit',
        env: {
          ...process.env,
          UPDATE_EXPORT_GOLDEN: '1',
        },
      });

child.on('close', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
