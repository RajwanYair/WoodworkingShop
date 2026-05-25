import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/engine/validation';
import { cfg } from '../helpers';

/** Returns true when at least one issue has the given code. */
const hasCode = (issues: ReturnType<typeof validateConfig>, code: string): boolean =>
  issues.some((i) => i.code === code);

/** Returns the first issue matching the given code, or undefined. */
const getIssue = (issues: ReturnType<typeof validateConfig>, code: string) => issues.find((i) => i.code === code);

describe('validateConfig', () => {
  it('returns empty array for a valid default config', () => {
    const issues = validateConfig(cfg());
    // Default config is wide, tall, uses plywood — should be valid
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('raises CARCASS_TOO_NARROW error when width < 2t + 100', () => {
    const issue = getIssue(validateConfig(cfg({ width: 100 })), 'CARCASS_TOO_NARROW')!;
    expect(issue.severity).toBe('error');
    expect(issue.field).toBe('width');
    expect(issue.suggestedValue).toBeTypeOf('number');
  });

  it('raises CARCASS_TOO_SHORT error when height is too small', () => {
    expect(hasCode(validateConfig(cfg({ height: 100 })), 'CARCASS_TOO_SHORT')).toBe(true);
  });

  it('raises DOOR_TOO_NARROW for a very narrow two-door cabinet', () => {
    expect(
      getIssue(validateConfig(cfg({ width: 350, doorCount: 2, doorStyle: 'flat' })), 'DOOR_TOO_NARROW')?.severity,
    ).toBe('error');
  });

  it.each([
    ['doorStyle none', { width: 350, doorStyle: 'none' as const }],
    ['only one door on narrow cabinet', { width: 350, doorCount: 1 as const, doorStyle: 'flat' as const }],
  ])('does not raise DOOR_TOO_NARROW when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'DOOR_TOO_NARROW')).toBe(false);
  });

  it('raises DOOR_ASPECT_RATIO warning for tall narrow door', () => {
    expect(
      getIssue(validateConfig(cfg({ width: 300, height: 2000, doorCount: 1, doorStyle: 'flat' })), 'DOOR_ASPECT_RATIO')
        ?.severity,
    ).toBe('warning');
  });

  it('raises KICK_TOO_TALL warning when kick > 50% of height', () => {
    expect(getIssue(validateConfig(cfg({ height: 600, kickHeight: 350 })), 'KICK_TOO_TALL')?.severity).toBe('warning');
  });

  it('raises SHELF_CLEARANCE_TOO_SMALL when too many shelves in short cabinet', () => {
    const issue = getIssue(validateConfig(cfg({ height: 600, shelfCount: 10 })), 'SHELF_CLEARANCE_TOO_SMALL')!;
    expect(issue.severity).toBe('warning');
    expect(issue.suggestedValue).toBeTypeOf('number');
  });

  it('raises DRAWERS_TOO_MANY warning when drawers crowd shelves', () => {
    expect(hasCode(validateConfig(cfg({ height: 500, shelfCount: 2, drawerCount: 3 })), 'DRAWERS_TOO_MANY')).toBe(true);
  });

  it('raises NO_BACK_TALL_CABINET warning for tall open-back cabinet', () => {
    expect(
      getIssue(validateConfig(cfg({ hasBack: false, height: 1800, furnitureType: 'cabinet' })), 'NO_BACK_TALL_CABINET')
        ?.severity,
    ).toBe('warning');
  });

  it.each([
    ['panel type', { hasBack: false, height: 1800, furnitureType: 'panel' as const }],
    ['has back', { hasBack: true, height: 1800 }],
    ['short cabinet', { hasBack: false, height: 800 }],
  ])('does not raise NO_BACK_TALL_CABINET when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'NO_BACK_TALL_CABINET')).toBe(false);
  });

  it('sorts issues: errors before warnings before info', () => {
    const issues = validateConfig(cfg({ width: 100, height: 600, shelfCount: 10, kickHeight: 400 }));
    const severities = issues.map((i) => i.severity);
    const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]]);
    }
  });

  it('raises a span warning for wide chipboard span', () => {
    const issues = validateConfig(cfg({ width: 1200, carcassMaterial: 'chipboard-18', shelfCount: 2 }));
    expect(
      issues.some((i) =>
        ['SHELF_DEFLECTION_WARNING', 'SHELF_DEFLECTION_DANGER', 'SHELF_SPAN_CHIPBOARD'].includes(i.code),
      ),
    ).toBe(true);
  });

  it('raises no deflection error for stiff plywood at moderate span', () => {
    expect(
      hasCode(
        validateConfig(cfg({ width: 800, carcassMaterial: 'plywood-17', shelfCount: 2 })),
        'SHELF_DEFLECTION_DANGER',
      ),
    ).toBe(false);
  });

  it('every issue has both en and he messages', () => {
    const issues = validateConfig(cfg({ width: 100, height: 100, shelfCount: 10 }));
    for (const issue of issues) {
      expect(issue.message.en).toBeTruthy();
      expect(issue.message.he).toBeTruthy();
    }
  });

  it('raises HINGE_CLEARANCE_INSUFFICIENT when door width < 300 mm', () => {
    expect(
      getIssue(validateConfig(cfg({ width: 400, doorCount: 2, doorStyle: 'flat' })), 'HINGE_CLEARANCE_INSUFFICIENT')
        ?.severity,
    ).toBe('warning');
  });

  it.each([
    ['wide doors', { width: 700, doorCount: 1 as const, doorStyle: 'flat' as const }],
    ['doorStyle none', { width: 400, doorStyle: 'none' as const }],
  ])('does not raise HINGE_CLEARANCE_INSUFFICIENT when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'HINGE_CLEARANCE_INSUFFICIENT')).toBe(false);
  });

  it('raises DOOR_EXCEEDS_STANDARD_HINGE_RATING for very tall door', () => {
    expect(
      getIssue(
        validateConfig(cfg({ height: 2400, doorStyle: 'flat', doorCount: 1 })),
        'DOOR_EXCEEDS_STANDARD_HINGE_RATING',
      )?.severity,
    ).toBe('warning');
  });

  it.each([
    ['standard door height', { height: 900, doorStyle: 'flat' as const, doorCount: 1 as const }],
    ['doorStyle none', { height: 2400, doorStyle: 'none' as const }],
  ])('does not raise DOOR_EXCEEDS_STANDARD_HINGE_RATING when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'DOOR_EXCEEDS_STANDARD_HINGE_RATING')).toBe(false);
  });

  it('raises WIDE_SINGLE_DOOR when single door exceeds 800 mm', () => {
    const issue = getIssue(validateConfig(cfg({ width: 900, doorCount: 1, doorStyle: 'flat' })), 'WIDE_SINGLE_DOOR')!;
    expect(issue.severity).toBe('warning');
    expect(issue.suggestedValue).toBe(2);
  });

  it.each([
    ['two-door cabinet over 800 mm wide', { width: 1000, doorCount: 2 as const, doorStyle: 'flat' as const }],
    ['doorStyle none', { width: 900, doorStyle: 'none' as const }],
  ])('does not raise WIDE_SINGLE_DOOR when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'WIDE_SINGLE_DOOR')).toBe(false);
  });

  it('raises DRAWER_HEIGHT_TOO_SMALL when drawerHeights contains a value < 100 mm', () => {
    const issue = getIssue(
      validateConfig(cfg({ drawerCount: 2, drawerHeights: [150, 60] })),
      'DRAWER_HEIGHT_TOO_SMALL',
    )!;
    expect(issue.severity).toBe('error');
    expect(issue.suggestedValue).toBe(100);
  });

  it('does not raise DRAWER_HEIGHT_TOO_SMALL for adequate drawer heights', () => {
    expect(
      hasCode(validateConfig(cfg({ drawerCount: 3, drawerHeights: [150, 150, 120] })), 'DRAWER_HEIGHT_TOO_SMALL'),
    ).toBe(false);
  });

  it('raises DRAWER_STACK_OVERFLOW when total drawer stack exceeds interior height', () => {
    expect(
      getIssue(
        validateConfig(cfg({ height: 600, drawerCount: 3, drawerHeights: [200, 200, 200], shelfCount: 0 })),
        'DRAWER_STACK_OVERFLOW',
      )?.severity,
    ).toBe('error');
  });

  it('does not raise DRAWER_STACK_OVERFLOW when stack fits', () => {
    expect(hasCode(validateConfig(cfg({ height: 900, drawerCount: 2 })), 'DRAWER_STACK_OVERFLOW')).toBe(false);
  });

  it('raises SPAN_TOO_WIDE warning when width > 1200 mm', () => {
    const issue = getIssue(validateConfig(cfg({ width: 1400, furnitureType: 'cabinet' })), 'SPAN_TOO_WIDE')!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('width');
  });

  it.each([
    ['width is 1200 mm (boundary)', { width: 1200 }],
    [
      'furniture type is panel',
      { width: 1800, furnitureType: 'panel' as const, doorStyle: 'none' as const, kickHeight: 0, depth: 18 },
    ],
  ])('does not raise SPAN_TOO_WIDE when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'SPAN_TOO_WIDE')).toBe(false);
  });

  it('raises CARCASS_HEIGHT_CRITICAL warning when height > 2400 mm', () => {
    const issue = getIssue(
      validateConfig(cfg({ height: 2500, furnitureType: 'wardrobe' })),
      'CARCASS_HEIGHT_CRITICAL',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('height');
  });

  it.each([
    ['height is exactly 2400 mm', { height: 2400 }],
    [
      'furniture type is panel',
      { height: 2800, furnitureType: 'panel' as const, doorStyle: 'none' as const, kickHeight: 0, depth: 18 },
    ],
  ])('does not raise CARCASS_HEIGHT_CRITICAL when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'CARCASS_HEIGHT_CRITICAL')).toBe(false);
  });
});

describe('validateConfig — SHELF_LOAD_CAPACITY_LOW (Sprint 30)', () => {
  it('raises SHELF_LOAD_CAPACITY_LOW for a very wide span with chipboard', () => {
    const issue = getIssue(
      validateConfig(cfg({ width: 1700, shelfCount: 2, carcassMaterial: 'chipboard-18', doorStyle: 'none' })),
      'SHELF_LOAD_CAPACITY_LOW',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('shelfCount');
  });

  it.each([
    [
      'normal span with plywood',
      { width: 800, shelfCount: 2, carcassMaterial: 'plywood-18' as const, doorStyle: 'none' as const },
    ],
    ['no shelves', { shelfCount: 0 }],
  ])('does not raise SHELF_LOAD_CAPACITY_LOW when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'SHELF_LOAD_CAPACITY_LOW')).toBe(false);
  });

  it('raises DADO_DEPTH_TOO_SHALLOW when panel is very thin with shelves', () => {
    const issue = getIssue(
      validateConfig(cfg({ shelfCount: 2, carcassMaterial: 'plywood-4' })),
      'DADO_DEPTH_TOO_SHALLOW',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('carcassMaterial');
  });

  it.each([
    ['standard 18mm panel', { shelfCount: 3, carcassMaterial: 'plywood-18' as const }],
    ['no shelves', { shelfCount: 0 }],
  ])('does not raise DADO_DEPTH_TOO_SHALLOW when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'DADO_DEPTH_TOO_SHALLOW')).toBe(false);
  });

  it('raises DRAWER_RUNNER_CLEARANCE_INSUFFICIENT for very narrow cabinet with drawers', () => {
    const issue = getIssue(
      validateConfig(cfg({ width: 200, drawerCount: 1, doorStyle: 'none' })),
      'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('width');
  });

  it.each([
    ['standard-width cabinet', { width: 600, drawerCount: 2, doorStyle: 'none' as const }],
    ['drawerCount is 0', { width: 200, drawerCount: 0, doorStyle: 'none' as const }],
  ])('does not raise DRAWER_RUNNER_CLEARANCE_INSUFFICIENT when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT')).toBe(false);
  });

  it('raises BACK_REBATE_TOO_SHALLOW for a very thin panel with back', () => {
    expect(
      getIssue(validateConfig(cfg({ carcassMaterial: 'plywood-4', hasBack: true })), 'BACK_REBATE_TOO_SHALLOW')
        ?.severity,
    ).toBe('info');
  });

  it.each([
    ['standard 18mm panel', { carcassMaterial: 'plywood-18' as const, hasBack: true }],
    ['hasBack is false (even thin material)', { carcassMaterial: 'plywood-4' as const, hasBack: false }],
  ])('does not raise BACK_REBATE_TOO_SHALLOW when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'BACK_REBATE_TOO_SHALLOW')).toBe(false);
  });

  it('raises HINGE_CUP_EDGE_DISTANCE_UNSAFE for extremely narrow door cabinet', () => {
    expect(
      getIssue(validateConfig(cfg({ width: 80, doorCount: 2, doorStyle: 'flat' })), 'HINGE_CUP_EDGE_DISTANCE_UNSAFE')
        ?.severity,
    ).toBe('error');
  });

  it.each([
    ['normal door width', { width: 600, doorCount: 1 as const, doorStyle: 'flat' as const }],
    ['doorStyle is none', { width: 100, doorStyle: 'none' as const }],
  ])('does not raise HINGE_CUP_EDGE_DISTANCE_UNSAFE when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'HINGE_CUP_EDGE_DISTANCE_UNSAFE')).toBe(false);
  });

  it('raises TALL_CARCASS_NO_SHELF for tall open carcass without shelves or drawers', () => {
    const issue = getIssue(
      validateConfig(cfg({ height: 1800, shelfCount: 0, drawerCount: 0, doorStyle: 'none', furnitureType: 'cabinet' })),
      'TALL_CARCASS_NO_SHELF',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('shelfCount');
    expect(issue.suggestedValue).toBe(1);
  });

  it.each([
    ['shelves are present', cfg({ height: 1800, shelfCount: 2, furnitureType: 'cabinet' })],
    [
      'drawers are present',
      cfg({ height: 1800, shelfCount: 0, drawerCount: 3, doorStyle: 'none', furnitureType: 'cabinet' }),
    ],
    [
      'cabinet is short',
      cfg({ height: 800, shelfCount: 0, drawerCount: 0, doorStyle: 'none', furnitureType: 'cabinet' }),
    ],
    ['furniture type is panel', cfg({ height: 1800, shelfCount: 0, drawerCount: 0, furnitureType: 'panel' })],
  ])('does not raise TALL_CARCASS_NO_SHELF when %s', (_, config) => {
    expect(hasCode(validateConfig(config), 'TALL_CARCASS_NO_SHELF')).toBe(false);
  });

  it('raises HINGE_SHELF_INTERFERENCE when middle hinge aligns with a shelf (1000mm cabinet, 3 shelves)', () => {
    const issue = getIssue(
      validateConfig(cfg({ height: 1000, shelfCount: 3, doorStyle: 'flat' })),
      'HINGE_SHELF_INTERFERENCE',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('shelfCount');
    expect(issue.message.en).toContain('mm');
    expect(issue.message.he).toContain('מ"מ');
  });

  it.each([
    ['doorStyle is none', cfg({ height: 1000, shelfCount: 3, doorStyle: 'none' })],
    ['shelfCount is 0', cfg({ height: 1000, shelfCount: 0, doorStyle: 'flat' })],
    ['default 2000mm 4-shelf cabinet (all hinges clear shelves)', cfg()],
  ])('does not raise HINGE_SHELF_INTERFERENCE when %s', (_, config) => {
    expect(hasCode(validateConfig(config), 'HINGE_SHELF_INTERFERENCE')).toBe(false);
  });
});
