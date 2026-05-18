import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/engine/validation';
import { cfg } from '../helpers';

describe('validateConfig', () => {
  it('returns empty array for a valid default config', () => {
    const issues = validateConfig(cfg());
    // Default config is wide, tall, uses plywood — should be valid
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('raises CARCASS_TOO_NARROW error when width < 2t + 100', () => {
    // plywood-17 thickness = 17 → minimum = 2*17+100 = 134
    const issues = validateConfig(cfg({ width: 100 }));
    expect(issues.some((i) => i.code === 'CARCASS_TOO_NARROW')).toBe(true);
    const issue = issues.find((i) => i.code === 'CARCASS_TOO_NARROW')!;
    expect(issue.severity).toBe('error');
    expect(issue.field).toBe('width');
    expect(issue.suggestedValue).toBeTypeOf('number');
  });

  it('raises CARCASS_TOO_SHORT error when height is too small', () => {
    const issues = validateConfig(cfg({ height: 100 }));
    expect(issues.some((i) => i.code === 'CARCASS_TOO_SHORT')).toBe(true);
  });

  it('raises DOOR_TOO_NARROW for a very narrow two-door cabinet', () => {
    // With doorCount=2 and width=350, each door ~170mm — below 200mm minimum
    const issues = validateConfig(cfg({ width: 350, doorCount: 2, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'DOOR_TOO_NARROW')).toBe(true);
    const issue = issues.find((i) => i.code === 'DOOR_TOO_NARROW')!;
    expect(issue.severity).toBe('error');
  });

  it('does not raise DOOR_TOO_NARROW for doorStyle none', () => {
    const issues = validateConfig(cfg({ width: 350, doorStyle: 'none' }));
    expect(issues.some((i) => i.code === 'DOOR_TOO_NARROW')).toBe(false);
  });

  it('raises DOOR_ASPECT_RATIO warning for tall narrow door', () => {
    // A single door with width=300 height=2000 → ratio = (2000-6)/(300-6) ≈ 6.8 > 5
    const issues = validateConfig(
      cfg({ width: 300, height: 2000, doorCount: 1, doorStyle: 'flat' }),
    );
    expect(issues.some((i) => i.code === 'DOOR_ASPECT_RATIO')).toBe(true);
    const issue = issues.find((i) => i.code === 'DOOR_ASPECT_RATIO')!;
    expect(issue.severity).toBe('warning');
  });

  it('raises KICK_TOO_TALL warning when kick > 50% of height', () => {
    const issues = validateConfig(cfg({ height: 600, kickHeight: 350 }));
    expect(issues.some((i) => i.code === 'KICK_TOO_TALL')).toBe(true);
    expect(issues.find((i) => i.code === 'KICK_TOO_TALL')!.severity).toBe('warning');
  });

  it('raises SHELF_CLEARANCE_TOO_SMALL when too many shelves in short cabinet', () => {
    // height=600, plywood-17 → internalH = 566, 10 shelves → clearance = 566/11 ≈ 51 < 60
    const issues = validateConfig(cfg({ height: 600, shelfCount: 10 }));
    expect(issues.some((i) => i.code === 'SHELF_CLEARANCE_TOO_SMALL')).toBe(true);
    const issue = issues.find((i) => i.code === 'SHELF_CLEARANCE_TOO_SMALL')!;
    expect(issue.severity).toBe('warning');
    expect(issue.suggestedValue).toBeTypeOf('number');
  });

  it('raises DRAWERS_TOO_MANY warning when drawers crowd shelves', () => {
    // height=500, shelfCount=2, drawerCount=3 → remainingH tiny
    const issues = validateConfig(cfg({ height: 500, shelfCount: 2, drawerCount: 3 }));
    expect(issues.some((i) => i.code === 'DRAWERS_TOO_MANY')).toBe(true);
  });

  it('raises NO_BACK_TALL_CABINET warning for tall open-back cabinet', () => {
    const issues = validateConfig(cfg({ hasBack: false, height: 1800, furnitureType: 'cabinet' }));
    expect(issues.some((i) => i.code === 'NO_BACK_TALL_CABINET')).toBe(true);
    expect(issues.find((i) => i.code === 'NO_BACK_TALL_CABINET')!.severity).toBe('warning');
  });

  it('does not raise NO_BACK_TALL_CABINET for panel type', () => {
    const issues = validateConfig(cfg({ hasBack: false, height: 1800, furnitureType: 'panel' }));
    expect(issues.some((i) => i.code === 'NO_BACK_TALL_CABINET')).toBe(false);
  });

  it('sorts issues: errors before warnings before info', () => {
    // Create a config with multiple issues
    const issues = validateConfig(
      cfg({ width: 100, height: 600, shelfCount: 10, kickHeight: 400 }),
    );
    const severities = issues.map((i) => i.severity);
    const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]]);
    }
  });

  it('raises a span warning for wide chipboard span', () => {
    // width=1200 → shelfWidth ≈ 1162mm, chipboard-18 has low modulus
    // May emit SHELF_DEFLECTION_WARNING, SHELF_DEFLECTION_DANGER, or SHELF_SPAN_CHIPBOARD
    const issues = validateConfig(
      cfg({ width: 1200, carcassMaterial: 'chipboard-18', shelfCount: 2 }),
    );
    const hasDef = issues.some(
      (i) =>
        i.code === 'SHELF_DEFLECTION_WARNING' ||
        i.code === 'SHELF_DEFLECTION_DANGER' ||
        i.code === 'SHELF_SPAN_CHIPBOARD',
    );
    expect(hasDef).toBe(true);
  });

  it('raises no deflection error for stiff plywood at moderate span', () => {
    // width=800, plywood-17 — should be fine
    const issues = validateConfig(
      cfg({ width: 800, carcassMaterial: 'plywood-17', shelfCount: 2 }),
    );
    expect(issues.some((i) => i.code === 'SHELF_DEFLECTION_DANGER')).toBe(false);
  });

  it('every issue has both en and he messages', () => {
    const issues = validateConfig(cfg({ width: 100, height: 100, shelfCount: 10 }));
    for (const issue of issues) {
      expect(issue.message.en).toBeTruthy();
      expect(issue.message.he).toBeTruthy();
    }
  });

  // ── Hinge clearance rules (Sprint 12) ──

  it('raises HINGE_CLEARANCE_INSUFFICIENT when door width < 300 mm', () => {
    // width=400, 2 doors → doorWidth ≈ (400-2*17)/2 ≈ 183 mm < 300
    const issues = validateConfig(cfg({ width: 400, doorCount: 2, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'HINGE_CLEARANCE_INSUFFICIENT')).toBe(true);
    const issue = issues.find((i) => i.code === 'HINGE_CLEARANCE_INSUFFICIENT')!;
    expect(issue.severity).toBe('warning');
  });

  it('does not raise HINGE_CLEARANCE_INSUFFICIENT for wide doors', () => {
    // width=700, 1 door → doorWidth ≈ 666 mm > 300
    const issues = validateConfig(cfg({ width: 700, doorCount: 1, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'HINGE_CLEARANCE_INSUFFICIENT')).toBe(false);
  });

  it('raises DOOR_EXCEEDS_STANDARD_HINGE_RATING for very tall door', () => {
    // height=2400 → doorHeight > 2200
    const issues = validateConfig(cfg({ height: 2400, doorStyle: 'flat', doorCount: 1 }));
    expect(issues.some((i) => i.code === 'DOOR_EXCEEDS_STANDARD_HINGE_RATING')).toBe(true);
    const issue = issues.find((i) => i.code === 'DOOR_EXCEEDS_STANDARD_HINGE_RATING')!;
    expect(issue.severity).toBe('warning');
  });

  it('does not raise DOOR_EXCEEDS_STANDARD_HINGE_RATING for standard door height', () => {
    const issues = validateConfig(cfg({ height: 900, doorStyle: 'flat', doorCount: 1 }));
    expect(issues.some((i) => i.code === 'DOOR_EXCEEDS_STANDARD_HINGE_RATING')).toBe(false);
  });

  it('raises WIDE_SINGLE_DOOR when single door exceeds 800 mm', () => {
    // width=900, 1 door → doorWidth ≈ 866 mm > 800
    const issues = validateConfig(cfg({ width: 900, doorCount: 1, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'WIDE_SINGLE_DOOR')).toBe(true);
    const issue = issues.find((i) => i.code === 'WIDE_SINGLE_DOOR')!;
    expect(issue.severity).toBe('warning');
    expect(issue.suggestedValue).toBe(2);
  });

  it('does not raise WIDE_SINGLE_DOOR for two-door cabinet over 800 mm wide', () => {
    // width=1000, 2 doors → each door ≈ 483 mm — not a single wide door
    const issues = validateConfig(cfg({ width: 1000, doorCount: 2, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'WIDE_SINGLE_DOOR')).toBe(false);
  });

  it('hinge rules do not fire when doorStyle is none', () => {
    const issues = validateConfig(cfg({ width: 900, doorCount: 1, doorStyle: 'none' }));
    expect(issues.some((i) => i.code === 'HINGE_CLEARANCE_INSUFFICIENT')).toBe(false);
    expect(issues.some((i) => i.code === 'WIDE_SINGLE_DOOR')).toBe(false);
  });
});

