import { describe, it, expect } from 'vitest';
import {
  calculateEdgeBandBom,
  totalEdgeBandMetres,
  getEdgeProfileSpec,
  EDGE_PROFILE_SPECS,
} from '../../src/engine/edge-profile';
import type { EdgeBandPanel } from '../../src/engine/edge-profile';

function panel(id: string, widthMm: number, lengthMm: number, overrides?: Partial<EdgeBandPanel>): EdgeBandPanel {
  return {
    id,
    widthMm,
    lengthMm,
    edgeMaterial: 'White PVC 0.4mm',
    edges: { top: 'iron-on', bottom: 'iron-on', left: 'none', right: 'none' },
    ...overrides,
  };
}

describe('EDGE_PROFILE_SPECS', () => {
  it('has entries for all 6 profile types', () => {
    expect(Object.keys(EDGE_PROFILE_SPECS)).toHaveLength(6);
  });

  it('all specs have bilingual names', () => {
    for (const spec of Object.values(EDGE_PROFILE_SPECS)) {
      expect(spec.name.en.length).toBeGreaterThan(0);
    }
  });
});

describe('calculateEdgeBandBom — basic', () => {
  it('sums top + bottom iron-on edges for a single panel', () => {
    // Panel 600 wide × 720 long — top + bottom = 2 × 600 = 1200 mm
    const bom = calculateEdgeBandBom([panel('1', 600, 720)]);
    const line = bom.find((l) => l.profile === 'iron-on');
    expect(line?.totalLengthMm).toBe(1200);
    expect(line?.totalLengthM).toBe(1.2);
  });

  it('omits none edges', () => {
    const bom = calculateEdgeBandBom([panel('1', 600, 720)]);
    expect(bom.find((l) => l.profile === 'none')).toBeUndefined();
  });

  it('returns empty for panels with all edges = none', () => {
    const bom = calculateEdgeBandBom([
      panel('1', 600, 720, { edges: { top: 'none', bottom: 'none', left: 'none', right: 'none' } }),
    ]);
    expect(bom).toHaveLength(0);
  });
});

describe('calculateEdgeBandBom — multiple materials', () => {
  it('groups by edgeMaterial and profile', () => {
    const bom = calculateEdgeBandBom([
      panel('1', 600, 720, { edgeMaterial: 'White PVC' }),
      panel('2', 400, 600, { edgeMaterial: 'Oak Veneer' }),
    ]);
    const materials = [...new Set(bom.map((l) => l.edgeMaterial))];
    expect(materials).toContain('White PVC');
    expect(materials).toContain('Oak Veneer');
  });

  it('merges same material + profile across panels', () => {
    const bom = calculateEdgeBandBom([panel('1', 600, 720), panel('2', 400, 500)]);
    // Both are 'White PVC 0.4mm' + 'iron-on' — should produce exactly 1 line
    expect(bom.filter((l) => l.profile === 'iron-on')).toHaveLength(1);
  });
});

describe('calculateEdgeBandBom — side edges', () => {
  it('uses lengthMm for left/right edges', () => {
    const bom = calculateEdgeBandBom([
      panel('1', 600, 720, {
        edges: { top: 'none', bottom: 'none', left: 'iron-on', right: 'iron-on' },
      }),
    ]);
    const line = bom.find((l) => l.profile === 'iron-on');
    // left + right = 2 × 720 = 1440 mm
    expect(line?.totalLengthMm).toBe(1440);
  });
});

describe('totalEdgeBandMetres', () => {
  it('sums all BOM line metres', () => {
    const bom = calculateEdgeBandBom([
      panel('1', 1000, 700, {
        edges: { top: 'iron-on', bottom: 'iron-on', left: 'iron-on', right: 'iron-on' },
      }),
    ]);
    // 2 × 1000 + 2 × 700 = 3400 mm = 3.4 m
    expect(totalEdgeBandMetres(bom)).toBe(3.4);
  });

  it('returns 0 for empty BOM', () => {
    expect(totalEdgeBandMetres([])).toBe(0);
  });
});

describe('getEdgeProfileSpec', () => {
  it('returns correct spec for iron-on', () => {
    const spec = getEdgeProfileSpec('iron-on');
    expect(spec.thicknessMm).toBe(0.4);
    expect(spec.requiresPowerTool).toBe(false);
  });

  it('returns correct spec for solid-wood', () => {
    const spec = getEdgeProfileSpec('solid-wood');
    expect(spec.requiresPowerTool).toBe(true);
  });
});
