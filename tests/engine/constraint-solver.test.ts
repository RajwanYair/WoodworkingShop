import { describe, expect, it } from 'vitest';
import {
  applyConstraints,
  clampDimension,
  getDimensionRange,
  getDefaultConstraints,
  validateConstraints,
} from '../../src/engine/constraint-solver';
import type { DimensionConstraint } from '../../src/engine/constraint-solver';
import { cfg } from '../helpers';

describe('getDefaultConstraints', () => {
  it('returns a non-empty array of constraints', () => {
    const cs = getDefaultConstraints();
    expect(cs.length).toBeGreaterThan(0);
  });

  it('covers all required dimension fields', () => {
    const cs = getDefaultConstraints();
    const fields = new Set(cs.map((c) => c.field));
    expect(fields.has('width')).toBe(true);
    expect(fields.has('height')).toBe(true);
    expect(fields.has('depth')).toBe(true);
    expect(fields.has('shelfCount')).toBe(true);
    expect(fields.has('drawerCount')).toBe(true);
    expect(fields.has('kickHeight')).toBe(true);
    expect(fields.has('doorReveal')).toBe(true);
  });

  it('includes a ratio constraint for depth vs height (tip-over safety)', () => {
    const cs = getDefaultConstraints();
    const ratioC = cs.find((c) => c.field === 'depth' && c.op === 'ratio');
    expect(ratioC).toBeDefined();
    expect(ratioC?.relatedField).toBe('height');
    expect(ratioC?.value).toBe(0.8);
  });
});

describe('validateConstraints — valid config produces no violations', () => {
  it.each([
    ['default config', cfg()],
    ['narrow cabinet', cfg({ width: 300, height: 720, depth: 400 })],
    ['wardrobe', cfg({ width: 1200, height: 2200, depth: 600 })],
  ])('%s', (_label, config) => {
    const violations = validateConstraints(config);
    expect(violations).toHaveLength(0);
  });
});

describe('validateConstraints — min violations', () => {
  it.each([
    ['width too small', cfg({ width: 100 }), 'width'],
    ['height too small', cfg({ height: 100 }), 'height'],
    ['depth too small', cfg({ depth: 50 }), 'depth'],
  ])('%s', (_label, config, expectedField) => {
    const violations = validateConstraints(config);
    const v = violations.find((x) => x.field === expectedField && x.op === 'min');
    expect(v).toBeDefined();
    expect(v?.correctedValue).toBeGreaterThanOrEqual(v!.limitValue);
  });
});

describe('validateConstraints — max violations', () => {
  it.each([
    ['width too large', cfg({ width: 3000 }), 'width'],
    ['height too large', cfg({ height: 4000 }), 'height'],
    ['shelfCount too large', cfg({ shelfCount: 25 }), 'shelfCount'],
  ])('%s', (_label, config, expectedField) => {
    const violations = validateConstraints(config);
    const v = violations.find((x) => x.field === expectedField && x.op === 'max');
    expect(v).toBeDefined();
    expect(v?.correctedValue).toBeLessThanOrEqual(v!.limitValue);
  });
});

describe('validateConstraints — ratio constraint', () => {
  it('flags depth > 80 % of height', () => {
    // height=500, depth=450: 450 > 0.8*500=400
    const config = cfg({ height: 500, depth: 450 });
    const violations = validateConstraints(config);
    const v = violations.find((x) => x.field === 'depth' && x.op === 'ratio');
    expect(v).toBeDefined();
    expect(v?.correctedValue).toBeLessThanOrEqual(400);
  });

  it('does not flag depth = 80 % of height (boundary)', () => {
    const config = cfg({ height: 500, depth: 400 });
    const violations = validateConstraints(config);
    const v = violations.find((x) => x.field === 'depth' && x.op === 'ratio');
    expect(v).toBeUndefined();
  });
});

describe('validateConstraints — step constraint', () => {
  it('flags non-integer width', () => {
    const custom: DimensionConstraint[] = [
      { field: 'width', op: 'step', value: 5, message: 'width must be multiple of 5' },
    ];
    const config = cfg({ width: 303 }); // not divisible by 5
    const violations = validateConstraints(config, custom);
    expect(violations.length).toBeGreaterThan(0);
    const v = violations[0];
    expect(v.field).toBe('width');
    // corrected should be nearest multiple of 5
    expect(v.correctedValue % 5).toBe(0);
  });
});

describe('validateConstraints — violation message', () => {
  it('includes the constraint message in each violation', () => {
    const config = cfg({ width: 100 }); // violates min 200
    const violations = validateConstraints(config);
    const v = violations.find((x) => x.field === 'width' && x.op === 'min');
    expect(v?.message).toBeTruthy();
    expect(typeof v?.message).toBe('string');
  });
});

describe('applyConstraints', () => {
  it('does not mutate the original config', () => {
    const original = cfg({ width: 100 });
    applyConstraints(original);
    expect(original.width).toBe(100);
  });

  it('clamps width to minimum', () => {
    const result = applyConstraints(cfg({ width: 100 }));
    expect(result.width).toBeGreaterThanOrEqual(200);
  });

  it('clamps height to maximum', () => {
    const result = applyConstraints(cfg({ height: 5000 }));
    expect(result.height).toBeLessThanOrEqual(3000);
  });

  it('applies ratio correction before downstream checks', () => {
    // depth 900 vs height 800: 900 > 0.8*800=640 → corrected depth ≤ 640
    const result = applyConstraints(cfg({ height: 800, depth: 900 }));
    expect(result.depth).toBeLessThanOrEqual(640);
  });

  it('returns valid config that produces no violations', () => {
    const bad = cfg({ width: 50, height: 10000, depth: 9000, shelfCount: 99 });
    const fixed = applyConstraints(bad);
    const violations = validateConstraints(fixed);
    expect(violations).toHaveLength(0);
  });
});

describe('clampDimension', () => {
  it.each([
    ['width below min', 'width' as const, 100, 200],
    ['width above max', 'width' as const, 3000, 2400],
    ['depth below min', 'depth' as const, 50, 100],
  ])('%s', (_label, field, input, expected) => {
    const result = clampDimension(field, input, cfg());
    expect(result).toBe(expected);
  });

  it('clamps depth via ratio against height in config', () => {
    const config = cfg({ height: 600 });
    // 0.8 * 600 = 480 → depth should be clamped to ≤ 480
    const result = clampDimension('depth', 550, config);
    expect(result).toBeLessThanOrEqual(480);
  });

  it('returns value unchanged when already within bounds', () => {
    const result = clampDimension('width', 600, cfg());
    expect(result).toBe(600);
  });
});

describe('getDimensionRange', () => {
  it('returns correct min/max/step for width', () => {
    const range = getDimensionRange('width', cfg());
    expect(range.min).toBe(200);
    expect(range.max).toBe(2400);
    expect(range.step).toBe(1);
  });

  it('returns depth max bounded by ratio of current height', () => {
    const config = cfg({ height: 1000 });
    const range = getDimensionRange('depth', config);
    // 0.8 * 1000 = 800
    expect(range.max).toBeLessThanOrEqual(800);
  });

  it('returns doorReveal step of 0.5', () => {
    const range = getDimensionRange('doorReveal', cfg());
    expect(range.step).toBe(0.5);
  });
});
