import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const css = readFileSync(resolve(__dirname, '../../src/index.css'), 'utf-8');

describe('index.css media queries', () => {
  it('contains prefers-reduced-motion block', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('disables transitions in reduced-motion block', () => {
    expect(css).toContain('transition-duration: 0.01ms');
  });

  it('contains forced-colors high-contrast block', () => {
    expect(css).toContain('@media (forced-colors: active)');
  });

  it('high-contrast block maps buttons to system colours', () => {
    expect(css).toContain('ButtonFace');
    expect(css).toContain('ButtonText');
  });

  it('high-contrast block enforces focus ring using Highlight', () => {
    expect(css).toContain('Highlight');
  });
});
