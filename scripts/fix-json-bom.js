#!/usr/bin/env node
// Fix UTF-8 BOM and backtick-n sequences in i18n files
import { readFileSync, writeFileSync } from 'fs';

for (const file of ['src/i18n/he.json', 'src/i18n/en.json']) {
  const buf = readFileSync(file);
  // Strip UTF-8 BOM if present
  const content =
    buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? buf.slice(3).toString('utf8') : buf.toString('utf8');
  // Replace literal backtick+n with real newlines
  const BACKTICK_N = '\x60n';
  const fixed = content.split(BACKTICK_N).join('\n');
  writeFileSync(file, fixed, { encoding: 'utf8' });
  try {
    JSON.parse(fixed);
    console.log(file + ' OK');
  } catch (e) {
    console.error(file + ' ERR: ' + e.message);
  }
}
