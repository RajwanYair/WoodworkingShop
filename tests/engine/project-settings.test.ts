import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROJECT_SETTINGS,
  mergeSettings,
  validateSettings,
  describeSettings,
} from '../../src/engine/project-settings';
import type { ProjectSettings } from '../../src/engine/project-settings';

describe('DEFAULT_PROJECT_SETTINGS', () => {
  it('has mm as default length unit', () => {
    expect(DEFAULT_PROJECT_SETTINGS.lengthUnit).toBe('mm');
  });

  it('passes its own validation', () => {
    expect(validateSettings(DEFAULT_PROJECT_SETTINGS)).toHaveLength(0);
  });
});

describe('mergeSettings', () => {
  it('returns new object, not the original', () => {
    const merged = mergeSettings(DEFAULT_PROJECT_SETTINGS, { lengthUnit: 'cm' });
    expect(merged).not.toBe(DEFAULT_PROJECT_SETTINGS);
  });

  it('applies single override', () => {
    const merged = mergeSettings(DEFAULT_PROJECT_SETTINGS, { currency: 'EUR' });
    expect(merged.currency).toBe('EUR');
    expect(merged.lengthUnit).toBe(DEFAULT_PROJECT_SETTINGS.lengthUnit);
  });

  it('does not mutate base', () => {
    mergeSettings(DEFAULT_PROJECT_SETTINGS, { labourRatePerHour: 100 });
    expect(DEFAULT_PROJECT_SETTINGS.labourRatePerHour).toBe(50);
  });
});

describe('validateSettings', () => {
  function overrideSettings(overrides: Partial<ProjectSettings>): ProjectSettings {
    return { ...DEFAULT_PROJECT_SETTINGS, ...overrides };
  }

  it('returns error for zero thickness', () => {
    const errors = validateSettings(overrideSettings({ defaultThicknessMm: 0 }));
    expect(errors.some((e) => e.includes('defaultThicknessMm'))).toBe(true);
  });

  it('returns error for negative labour rate', () => {
    const errors = validateSettings(overrideSettings({ labourRatePerHour: -5 }));
    expect(errors.some((e) => e.includes('labourRatePerHour'))).toBe(true);
  });

  it('allows zero labour rate', () => {
    const errors = validateSettings(overrideSettings({ labourRatePerHour: 0 }));
    expect(errors.filter((e) => e.includes('labourRatePerHour'))).toHaveLength(0);
  });

  it('returns no errors for valid settings', () => {
    expect(validateSettings(DEFAULT_PROJECT_SETTINGS)).toHaveLength(0);
  });
});

describe('describeSettings', () => {
  it('includes key fields in output', () => {
    const s = describeSettings(DEFAULT_PROJECT_SETTINGS);
    expect(s).toContain('mm');
    expect(s).toContain('USD');
    expect(s).toContain('18 mm');
  });
});
