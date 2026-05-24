import { describe, it, expect } from 'vitest';
import { getJointSpec, validateJointCompatibility, getAllJointSpecs } from '../../src/engine/joint-detail';

describe('getJointSpec — screw', () => {
  it('returns zero groove depth for screw joint', () => {
    const spec = getJointSpec('screw', 18);
    expect(spec.dimensions.grooveDepthMm).toBe(0);
    expect(spec.constraints.minThicknessMm).toBe(12);
    expect(spec.constraints.rigidAgainstRacking).toBe(false);
  });
});

describe('getJointSpec — pocket-screw', () => {
  it('returns non-zero pocket offset for pocket-screw joint', () => {
    const spec = getJointSpec('pocket-screw', 18);
    expect(spec.dimensions.pocketOffsetMm).toBeGreaterThan(0);
    expect(spec.constraints.minThicknessMm).toBe(15);
    expect(spec.constraints.rigidAgainstRacking).toBe(true);
  });
});

describe('getJointSpec — dado', () => {
  it('groove depth is 1/3 of material thickness', () => {
    const spec = getJointSpec('dado', 18);
    // 18 / 3 = 6 mm
    expect(spec.dimensions.grooveDepthMm).toBe(6);
  });

  it('groove width equals material thickness', () => {
    const spec = getJointSpec('dado', 18);
    expect(spec.dimensions.grooveWidthMm).toBe(18);
  });

  it('dado requires a power tool', () => {
    const spec = getJointSpec('dado', 18);
    expect(spec.constraints.requiresPowerTool).toBe(true);
  });

  it('dado is rigid against racking', () => {
    const spec = getJointSpec('dado', 18);
    expect(spec.constraints.rigidAgainstRacking).toBe(true);
  });
});

describe('getJointSpec — dowel', () => {
  it('returns 10 mm dowel for 18 mm material', () => {
    const spec = getJointSpec('dowel', 18);
    expect(spec.dimensions.dowelDiameterMm).toBe(10);
  });

  it('returns 8 mm dowel for 12 mm material', () => {
    const spec = getJointSpec('dowel', 12);
    expect(spec.dimensions.dowelDiameterMm).toBe(8);
  });

  it('dowel depth is ~45% of material thickness', () => {
    const spec = getJointSpec('dowel', 18);
    expect(spec.dimensions.dowelDepthMm).toBeCloseTo(18 * 0.45, 0);
  });
});

describe('getJointSpec — biscuit', () => {
  it('returns No.20 biscuit dimensions', () => {
    const spec = getJointSpec('biscuit', 18);
    expect(spec.dimensions.grooveDepthMm).toBe(10);
    expect(spec.dimensions.grooveWidthMm).toBe(24);
  });

  it('biscuit is not rigid against racking', () => {
    const spec = getJointSpec('biscuit', 18);
    expect(spec.constraints.rigidAgainstRacking).toBe(false);
  });

  it('biscuit requires minimum 50 mm face width', () => {
    const spec = getJointSpec('biscuit', 18);
    expect(spec.constraints.minFaceWidthMm).toBe(50);
  });
});

describe('validateJointCompatibility', () => {
  it('returns null for a compatible joint', () => {
    const result = validateJointCompatibility('dado', 18, 100);
    expect(result).toBeNull();
  });

  it('returns an error when material is too thin for pocket-screw', () => {
    const result = validateJointCompatibility('pocket-screw', 12, 100); // min = 15
    expect(result).not.toBeNull();
    expect(result?.en).toContain('15 mm');
  });

  it('returns an error when face width is too narrow for biscuit', () => {
    const result = validateJointCompatibility('biscuit', 18, 30); // min face = 50 mm
    expect(result).not.toBeNull();
    expect(result?.en).toContain('50 mm');
  });

  it('returns null when face width is exactly at minimum', () => {
    const result = validateJointCompatibility('biscuit', 18, 50);
    expect(result).toBeNull();
  });
});

describe('getAllJointSpecs', () => {
  it('returns specs for all 5 joint types', () => {
    const specs = getAllJointSpecs(18);
    expect(specs).toHaveLength(5);
    const types = specs.map((s) => s.type);
    expect(types).toContain('screw');
    expect(types).toContain('pocket-screw');
    expect(types).toContain('dado');
    expect(types).toContain('dowel');
    expect(types).toContain('biscuit');
  });

  it('all specs have bilingual names', () => {
    const specs = getAllJointSpecs(18);
    for (const s of specs) {
      expect(s.name.en.length).toBeGreaterThan(0);
      expect(s.name.he.length).toBeGreaterThan(0);
    }
  });
});
