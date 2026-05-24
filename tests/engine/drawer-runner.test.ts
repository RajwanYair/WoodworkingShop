import { describe, it, expect } from 'vitest';
import { validateDrawerRunner, getDrawerRunnerSpec, getAllDrawerRunnerSpecs } from '../../src/engine/drawer-runner';

describe('validateDrawerRunner — standard runner', () => {
  it('passes for a light load with adequate depth', () => {
    const result = validateDrawerRunner('standard', 10, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(true);
    expect(result.value.failures).toHaveLength(0);
    expect(result.value.spec.slideType).toBe('standard');
  });

  it('fails when load exceeds 25 kg rated capacity', () => {
    const result = validateDrawerRunner('standard', 30, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(false);
    expect(result.value.failures.length).toBeGreaterThan(0);
  });

  it('fails when depth is below 250 mm minimum', () => {
    const result = validateDrawerRunner('standard', 10, 200);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(false);
    expect(result.value.failures.some((f) => f.includes('depth'))).toBe(true);
  });

  it('suggests an upgrade when load exceeds capacity', () => {
    const result = validateDrawerRunner('standard', 40, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.suggestedAlternative).toBeDefined();
    // Should suggest full-extension (50 kg rated) since soft-close is 35 kg
    expect(result.value.suggestedAlternative).toBe('full-extension');
  });
});

describe('validateDrawerRunner — soft-close runner', () => {
  it('passes for 30 kg load with 300 mm depth', () => {
    const result = validateDrawerRunner('soft-close', 30, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(true);
  });

  it('fails when load exceeds 35 kg rated capacity', () => {
    const result = validateDrawerRunner('soft-close', 40, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(false);
    expect(result.value.suggestedAlternative).toBe('full-extension');
  });

  it('spec has softClose = true', () => {
    const result = validateDrawerRunner('soft-close', 10, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.spec.softClose).toBe(true);
    expect(result.value.spec.fullExtension).toBe(false);
  });
});

describe('validateDrawerRunner — full-extension runner', () => {
  it('passes for 50 kg load (at rated capacity)', () => {
    const result = validateDrawerRunner('full-extension', 50, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.valid).toBe(true);
    expect(result.value.loadUtilisationPct).toBe(100);
  });

  it('spec has fullExtension = true and softClose = true', () => {
    const result = validateDrawerRunner('full-extension', 10, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.spec.fullExtension).toBe(true);
    expect(result.value.spec.softClose).toBe(true);
  });
});

describe('validateDrawerRunner — load utilisation calculation', () => {
  it('calculates utilisation percentage correctly', () => {
    const result = validateDrawerRunner('standard', 12, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 12 / 25 = 48%
    expect(result.value.loadUtilisationPct).toBe(48);
  });

  it('utilisation is 100% when load equals rated capacity', () => {
    const result = validateDrawerRunner('standard', 25, 300);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.loadUtilisationPct).toBe(100);
  });
});

describe('validateDrawerRunner — error cases', () => {
  it('returns err for zero drawer depth', () => {
    const result = validateDrawerRunner('standard', 10, 0);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ZERO_DEPTH');
  });

  it('returns err for negative drawer depth', () => {
    const result = validateDrawerRunner('standard', 10, -50);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ZERO_DEPTH');
  });
});

describe('getDrawerRunnerSpec', () => {
  it('returns the spec for standard slide', () => {
    const spec = getDrawerRunnerSpec('standard');
    expect(spec.slideType).toBe('standard');
    expect(spec.maxLoadKg).toBe(25);
  });

  it('returns the spec for full-extension slide', () => {
    const spec = getDrawerRunnerSpec('full-extension');
    expect(spec.maxLoadKg).toBe(50);
    expect(spec.fullExtension).toBe(true);
  });
});

describe('getAllDrawerRunnerSpecs', () => {
  it('returns all 3 specs', () => {
    const specs = getAllDrawerRunnerSpecs();
    expect(specs).toHaveLength(3);
  });

  it('specs are ordered by rated load ascending', () => {
    const specs = getAllDrawerRunnerSpecs();
    for (let i = 1; i < specs.length; i++) {
      expect(specs[i].maxLoadKg).toBeGreaterThanOrEqual(specs[i - 1].maxLoadKg);
    }
  });
});
