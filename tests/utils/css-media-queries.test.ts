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

describe('index.css — WCAG AA high-contrast class (beyond forced-colors)', () => {
  it('provides focus-visible outline for .high-contrast', () => {
    expect(css).toContain('.high-contrast :focus-visible');
  });

  it('provides dark-mode focus ring in yellow for .high-contrast.dark', () => {
    expect(css).toContain('.high-contrast.dark :focus-visible');
    expect(css).toContain('#ff0');
  });

  it('adds interactive element borders in .high-contrast', () => {
    expect(css).toContain('.high-contrast button');
    expect(css).toContain('border: 2px solid #000');
  });

  it('adds link underline and colour in .high-contrast', () => {
    expect(css).toContain('.high-contrast a');
    expect(css).toContain('text-decoration: underline');
  });

  it('adds dark-mode link underline in .high-contrast.dark', () => {
    expect(css).toContain('.high-contrast.dark a');
    expect(css).toContain('#aaf');
  });
});

describe('index.css — tablet portrait responsive layout', () => {
  it('contains orientation portrait media query for tablet', () => {
    expect(css).toContain('@media (orientation: portrait) and (640px <= width <= 1023px)');
  });

  it('applies inline padding to main-content in tablet portrait', () => {
    expect(css).toContain('padding-inline: 1.5rem');
  });
});
