import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

const tempCacheDir = path.join(os.tmpdir(), 'WoodworkingShop', '.stylelintcache');
try {
  execSync(`npx stylelint --cache --cache-location "${tempCacheDir}" "src/**/*.css"`, { stdio: 'inherit' });
} catch {
  process.exit(1);
}
