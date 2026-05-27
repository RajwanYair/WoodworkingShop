import { describe, it, expect } from 'vitest';
import {
  STANDARD_CLEARANCES,
  getEffectiveClearance,
  validateApplianceClearance,
  validateAllApplianceClearances,
  getClearanceSummary,
} from '../../src/engine/appliance-clearance';
import type { AppliancePlacement, Obstacle } from '../../src/engine/appliance-clearance';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const OVEN: AppliancePlacement = {
  id: 'oven-1',
  type: 'oven',
  x: 500,
  y: 0,
  width: 600,
  depth: 560,
  height: 900,
};

const COOKTOP: AppliancePlacement = {
  id: 'cooktop-1',
  type: 'cooktop',
  x: 500,
  y: 0,
  width: 600,
  depth: 560,
  height: 50,
};

// ─── STANDARD_CLEARANCES ──────────────────────────────────────────────────────

describe('STANDARD_CLEARANCES', () => {
  it.each([
    ['oven', { top: 50, bottom: 0, left: 5, right: 5, rear: 25, front: 900 }],
    ['dishwasher', { top: 5, bottom: 0, left: 5, right: 5, rear: 50, front: 600 }],
    ['refrigerator', { top: 50, bottom: 0, left: 10, right: 10, rear: 50, front: 900 }],
    ['cooktop', { top: 650, bottom: 0, left: 50, right: 50, rear: 50, front: 600 }],
    ['microwave', { top: 75, bottom: 0, left: 25, right: 25, rear: 50, front: 450 }],
  ] as const)('defines clearances for %s', (type, expected) => {
    expect(STANDARD_CLEARANCES[type]).toEqual(expected);
  });
});

// ─── getEffectiveClearance ────────────────────────────────────────────────────

describe('getEffectiveClearance', () => {
  it('returns standard spec when no custom clearance', () => {
    expect(getEffectiveClearance(OVEN)).toEqual(STANDARD_CLEARANCES.oven);
  });

  it('merges custom overrides onto standard spec', () => {
    const custom: AppliancePlacement = { ...OVEN, customClearance: { top: 100, front: 1200 } };
    const result = getEffectiveClearance(custom);
    expect(result.top).toBe(100);
    expect(result.front).toBe(1200);
    expect(result.left).toBe(5); // unchanged
  });
});

// ─── validateApplianceClearance ───────────────────────────────────────────────

describe('validateApplianceClearance', () => {
  it('returns no violations when obstacles are far away', () => {
    const farObstacle: Obstacle = {
      id: 'cab-1',
      label: 'Cabinet',
      x: 5000,
      y: 5000,
      width: 600,
      depth: 400,
      height: 720,
    };
    const violations = validateApplianceClearance(OVEN, [farObstacle]);
    expect(violations).toHaveLength(0);
  });

  it('detects left-side violation', () => {
    // Obstacle immediately to the left of oven — 2mm gap, oven needs 5mm
    const obstacle: Obstacle = { id: 'wall-left', label: 'Wall', x: 495, y: 0, width: 3, depth: 600, height: 2400 };
    const violations = validateApplianceClearance(OVEN, [obstacle]);
    const leftViolation = violations.find((v) => v.side === 'left');
    expect(leftViolation).toBeDefined();
    expect(leftViolation!.requiredMm).toBe(5);
    expect(leftViolation!.actualMm).toBe(2);
    expect(leftViolation!.shortfallMm).toBe(3);
  });

  it('detects right-side violation', () => {
    // Obstacle 3mm to the right (oven ends at x=1100, obstacle at x=1103)
    const obstacle: Obstacle = { id: 'wall-right', label: 'Wall', x: 1103, y: 0, width: 100, depth: 600, height: 2400 };
    const violations = validateApplianceClearance(OVEN, [obstacle]);
    const rightViolation = violations.find((v) => v.side === 'right');
    expect(rightViolation).toBeDefined();
    expect(rightViolation!.actualMm).toBe(3);
    expect(rightViolation!.shortfallMm).toBe(2);
  });

  it('detects rear-side violation', () => {
    // Wall behind oven — gap is too small (oven needs 25mm rear)
    // Oven y=0, so rear obstacle must end before y=0. Let's place it so gap = 10mm
    const obstacle: Obstacle = {
      id: 'back-wall',
      label: 'Back Wall',
      x: 500,
      y: -110,
      width: 600,
      depth: 100,
      height: 2400,
    };
    const violations = validateApplianceClearance(OVEN, [obstacle]);
    const rearViolation = violations.find((v) => v.side === 'rear');
    expect(rearViolation).toBeDefined();
    expect(rearViolation!.actualMm).toBe(10);
    expect(rearViolation!.shortfallMm).toBe(15);
  });

  it('detects front-side violation (door swing)', () => {
    // Obstacle in front of oven — oven needs 900mm front clearance
    // Oven ends at y=560, obstacle at y=800 → gap = 240mm < 900mm
    const obstacle: Obstacle = { id: 'island', label: 'Island', x: 500, y: 800, width: 600, depth: 400, height: 720 };
    const violations = validateApplianceClearance(OVEN, [obstacle]);
    const frontViolation = violations.find((v) => v.side === 'front');
    expect(frontViolation).toBeDefined();
    expect(frontViolation!.actualMm).toBe(240);
    expect(frontViolation!.shortfallMm).toBe(660);
  });

  it('does not flag bottom violations (bottom clearance is 0)', () => {
    const obstacle: Obstacle = { id: 'floor', label: 'Floor', x: 0, y: 0, width: 5000, depth: 5000, height: 0 };
    const violations = validateApplianceClearance(OVEN, [obstacle]);
    expect(violations.filter((v) => v.side === 'bottom')).toHaveLength(0);
  });

  it('handles custom clearance overrides', () => {
    const customOven: AppliancePlacement = { ...OVEN, customClearance: { left: 50 } };
    // Obstacle 20mm to the left
    const obstacle: Obstacle = { id: 'cab', label: 'Cabinet', x: 480, y: 0, width: 0, depth: 600, height: 720 };
    const violations = validateApplianceClearance(customOven, [obstacle]);
    const leftViolation = violations.find((v) => v.side === 'left');
    expect(leftViolation).toBeDefined();
    expect(leftViolation!.requiredMm).toBe(50);
    expect(leftViolation!.actualMm).toBe(20);
  });

  it('cooktop detects overhead cabinet too close', () => {
    // Cooktop needs 650mm above. Overhead cabinet at same x/y plan position
    // with height > cooktop height means it's a top violation
    const overheadCab: Obstacle = {
      id: 'wall-cab',
      label: 'Wall Cabinet',
      x: 500,
      y: 0,
      width: 600,
      depth: 350,
      height: 900,
    };
    const violations = validateApplianceClearance(COOKTOP, [overheadCab]);
    const topViolation = violations.find((v) => v.side === 'top');
    expect(topViolation).toBeDefined();
    expect(topViolation!.requiredMm).toBe(650);
    expect(topViolation!.actualMm).toBe(0);
  });
});

// ─── validateAllApplianceClearances ───────────────────────────────────────────

describe('validateAllApplianceClearances', () => {
  it('returns valid=true when no violations', () => {
    const result = validateAllApplianceClearances([OVEN], []);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('aggregates violations from multiple appliances', () => {
    const tightObstacle: Obstacle = { id: 'wall', label: 'Wall', x: 498, y: 0, width: 0, depth: 600, height: 2400 };
    const fridge: AppliancePlacement = {
      id: 'fridge-1',
      type: 'refrigerator',
      x: 500,
      y: 0,
      width: 700,
      depth: 600,
      height: 1800,
    };
    const result = validateAllApplianceClearances([OVEN, fridge], [tightObstacle]);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    expect(result.violations.some((v) => v.applianceId === 'oven-1')).toBe(true);
    expect(result.violations.some((v) => v.applianceId === 'fridge-1')).toBe(true);
  });

  it('handles empty appliance array', () => {
    const result = validateAllApplianceClearances(
      [],
      [{ id: 'w', label: 'W', x: 0, y: 0, width: 100, depth: 100, height: 100 }],
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ─── getClearanceSummary ──────────────────────────────────────────────────────

describe('getClearanceSummary', () => {
  it('excludes zero-clearance sides', () => {
    const summary = getClearanceSummary('oven');
    expect(summary.bottom).toBeUndefined();
    expect(summary.top).toBe(50);
    expect(summary.front).toBe(900);
  });

  it.each([
    ['oven', ['top', 'left', 'right', 'rear', 'front']],
    ['dishwasher', ['top', 'left', 'right', 'rear', 'front']],
    ['cooktop', ['top', 'left', 'right', 'rear', 'front']],
  ] as const)('returns non-zero sides for %s', (type, expectedSides) => {
    const summary = getClearanceSummary(type);
    for (const side of expectedSides) {
      expect(summary[side]).toBeGreaterThan(0);
    }
  });
});
