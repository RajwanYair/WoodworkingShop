import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

const tempCacheDir = path.join(os.tmpdir(), 'WoodworkingShop', '.eslintcache');
try {
  execSync(`npx eslint --cache --cache-location "${tempCacheDir}" --max-warnings 0 .`, { stdio: 'inherit' });
} catch (error) {
  process.exit(1);
}
