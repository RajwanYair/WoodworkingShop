import { describe, it, expect } from 'vitest';
import { calculateHingeBoreSpec, hingeCount, formatHingeBoreSpecSummary } from '../../src/engine/hinge-bore';

describe('hingeCount', () => {
  it('returns 2 hinges for door height ≤ 600 mm', () => {
    expect(hingeCount(400)).toBe(2);
    expect(hingeCount(600)).toBe(2);
  });

  it('returns 3 hinges for door height 601–1200 mm', () => {
    expect(hingeCount(700)).toBe(3);
    expect(hingeCount(1200)).toBe(3);
  });

  it('returns 4 hinges for door height 1201–1800 mm', () => {
    expect(hingeCount(1201)).toBe(4);
    expect(hingeCount(1800)).toBe(4);
  });

  it('returns 5 hinges for door height 1801–2200 mm', () => {
    expect(hingeCount(2100)).toBe(5);
    expect(hingeCount(2200)).toBe(5);
  });

  it('returns 6 hinges for door height > 2200 mm', () => {
    expect(hingeCount(2201)).toBe(6);
    expect(hingeCount(3000)).toBe(6);
  });
});

describe('calculateHingeBoreSpec — success cases', () => {
  it('returns ok for a standard 720 mm door with 18 mm material', () => {
    const result = calculateHingeBoreSpec(720, 400, 18);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.count).toBe(3);
    expect(result.value.materialOk).toBe(true);
    expect(result.value.positions).toHaveLength(3);
    expect(result.value.profileId).toBe('default');
  });

  it('positions are ordered top to bottom', () => {
    const result = calculateHingeBoreSpec(900, 400, 18);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ys = result.value.positions.map((p) => p.y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });

  it('all bore x positions are positive and within door width', () => {
    const result = calculateHingeBoreSpec(720, 400, 18);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const pos of result.value.positions) {
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(400);
    }
  });

  it('cup diameter is 35 mm for generic (default) profile', () => {
    const result = calculateHingeBoreSpec(720, 400, 18);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const pos of result.value.positions) {
      expect(pos.diameter).toBe(35);
    }
  });

  it('uses Blum profile spec when profileId is provided', () => {
    const result = calculateHingeBoreSpec(720, 400, 18, 'blum-clip-top-blumotion');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profileId).toBe('blum-clip-top-blumotion');
    expect(result.value.positions[0].diameter).toBe(35);
  });

  it('materialOk is false when material thickness < minMaterialThickness', () => {
    const result = calculateHingeBoreSpec(720, 400, 12); // 12 mm < 16 mm minimum
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.materialOk).toBe(false);
    expect(result.value.minMaterialThickness).toBe(16);
  });

  it('materialOk is true for 16 mm material', () => {
    const result = calculateHingeBoreSpec(720, 400, 16);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.materialOk).toBe(true);
  });

  it('mount holes are at standard 32 mm system offset', () => {
    const result = calculateHingeBoreSpec(720, 400, 18);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pos = result.value.positions[0];
    expect(pos.mountHole1.dx).toBe(32);
    expect(pos.mountHole2.dx).toBe(32);
    expect(pos.mountHole1.dy).toBe(16);
    expect(pos.mountHole2.dy).toBe(-16);
  });

  it('tall door (2100 mm) gets 5 hinges', () => {
    const result = calculateHingeBoreSpec(2100, 600, 18);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.count).toBe(5);
  });

  it('falls back to default spec for unknown profileId', () => {
    const result = calculateHingeBoreSpec(720, 400, 18, 'unknown-profile');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profileId).toBe('default');
  });
});

describe('calculateHingeBoreSpec — error cases', () => {
  it('returns err for door height below 200 mm', () => {
    const result = calculateHingeBoreSpec(150, 400, 18);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('DOOR_TOO_SMALL');
  });

  it('returns err for door width below 50 mm', () => {
    const result = calculateHingeBoreSpec(720, 30, 18);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('DOOR_TOO_SMALL');
  });
});

describe('formatHingeBoreSpecSummary', () => {
  it('includes hinge count and positions', () => {
    const result = calculateHingeBoreSpec(720, 400, 18);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const summary = formatHingeBoreSpecSummary(result.value);
    expect(summary).toContain('3 hinges');
    expect(summary).toMatch(/y=\d+ mm/);
    expect(summary).toMatch(/∅35 mm cup/);
  });
});
