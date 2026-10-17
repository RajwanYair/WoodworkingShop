import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const headers = readFileSync(resolve(__dirname, '../../public/_headers'), 'utf8');
const policyLine = headers.split(/\r?\n/u).find((line) => line.trimStart().startsWith('Permissions-Policy:'));
const directives = new Map(
  (policyLine?.slice(policyLine.indexOf(':') + 1) ?? '')
    .split(',')
    .map((directive) => directive.trim().split('=', 2) as [string, string]),
);

describe('Permissions-Policy', () => {
  it.each(['camera', 'microphone', 'serial'] as const)('allows same-origin %s use', (feature) => {
    expect(directives.get(feature)).toBe('(self)');
  });

  it.each(['geolocation', 'payment', 'usb', 'bluetooth', 'hid'] as const)('continues to deny %s', (feature) => {
    expect(directives.get(feature)).toBe('()');
  });
});
