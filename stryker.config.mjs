import os from 'node:os';
import path from 'node:path';

const reportDirectory = path.join(os.tmpdir(), 'WoodworkingShop', 'mutation');
const relativeToWorkspace = (target) => path.relative(process.cwd(), target);

export default {
  mutate: [
    'src/engine/dimensions.ts',
    'src/engine/parts.ts',
    'src/engine/cut-optimizer.ts',
    'src/engine/validation.ts',
  ],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
    related: true,
  },
  concurrency: 2,
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: {
    fileName: relativeToWorkspace(path.join(reportDirectory, 'mutation.html')),
  },
  jsonReporter: {
    fileName: relativeToWorkspace(path.join(reportDirectory, 'mutation.json')),
  },
  tempDirName: relativeToWorkspace(path.join(reportDirectory, 'tmp')),
  thresholds: {
    break: null,
  },
};
