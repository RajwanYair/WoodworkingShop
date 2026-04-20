import { describe, it, expect } from 'vitest';
import { mmToInches, formatDim, sliderStep } from '../../src/utils/units';

describe('mmToInches', () => {
  it('converts exact inches', () => {
    expect(mmToInches(25.4)).toBe('1"');
    expect(mmToInches(50.8)).toBe('2"');
  });

  it('converts fractional inches', () => {
    // 12.7mm = 1/2"
    expect(mmToInches(12.7)).toBe('1/2"');
  });

  it('handles zero', () => {
    expect(mmToInches(0)).toBe('0"');
  });

  it('handles mixed whole + fraction', () => {
    // 38.1mm = 1.5" = 1-1/2"
    expect(mmToInches(38.1)).toBe('1-1/2"');
  });

  it('rounds to nearest 1/16"', () => {
    // 1.5875mm = 1/16"
    expect(mmToInches(1.5875)).toBe('1/16"');
  });
});

describe('formatDim', () => {
  it('formats metric as mm', () => {
    expect(formatDim(600, 'metric')).toBe('600 mm');
  });

  it('formats imperial as inches', () => {
    expect(formatDim(25.4, 'imperial')).toBe('1"');
  });
});

describe('sliderStep', () => {
  it('returns 10 for metric', () => {
    expect(sliderStep('metric')).toBe(10);
  });

  it('returns 6 for imperial', () => {
    expect(sliderStep('imperial')).toBe(6);
  });
});
