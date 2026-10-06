import { describe, expect, it } from 'vitest';
import { formatDate, formatMillimeters, formatNumber, formatNumberFixed, formatUnit } from '../../src/i18n/format';

describe('locale formatters', () => {
  it('formats numbers and units with the requested locale', () => {
    expect(formatNumber(1234.5, 'de-DE')).toBe('1.234,5');
    expect(formatNumberFixed(1234.5, 'de-DE', 2)).toBe('1.234,50');
    expect(formatUnit(1234.5, 'millimeter', 'de-DE')).toBe('1.234,5 mm');
    expect(formatMillimeters(1234.5, 'de-DE', 1)).toBe('1.234,5 mm');
  });

  it('formats dates with the requested locale and options', () => {
    expect(
      formatDate('2025-03-04T12:00:00Z', 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }),
    ).toBe('04 Mar 2025');
  });
});
