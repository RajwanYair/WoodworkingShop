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

describe('validateConfig — NARROW_BACK_OMITTED (Sprint 34)', () => {
  it('raises NARROW_BACK_OMITTED warning for narrow open-back cabinet', () => {
    const issue = getIssue(
      validateConfig(cfg({ hasBack: false, width: 350, furnitureType: 'cabinet' })),
      'NARROW_BACK_OMITTED',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('hasBack');
  });

  it.each([
    ['cabinet has a back panel', { hasBack: true, width: 350, furnitureType: 'cabinet' as const }],
    ['width >= 400 mm', { hasBack: false, width: 450, furnitureType: 'cabinet' as const }],
    [
      'furniture type is panel',
      {
        hasBack: false,
        width: 300,
        furnitureType: 'panel' as const,
        doorStyle: 'none' as const,
        kickHeight: 0,
        depth: 18,
      },
    ],
  ])('does not raise NARROW_BACK_OMITTED when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'NARROW_BACK_OMITTED')).toBe(false);
  });

  it('NARROW_BACK_OMITTED fires at exactly 399 mm (boundary)', () => {
    expect(
      hasCode(validateConfig(cfg({ hasBack: false, width: 399, furnitureType: 'bookshelf' })), 'NARROW_BACK_OMITTED'),
    ).toBe(true);
  });
});

describe('validateConfig — joinery rules (Sprint 45)', () => {
  it('JOINERY_MAX_SPAN fires for chipboard on span > 900 mm', () => {
    expect(
      hasCode(validateConfig(cfg({ carcassMaterial: 'chipboard-18', width: 1000, shelfCount: 1 })), 'JOINERY_MAX_SPAN'),
    ).toBe(true);
  });

  it.each([
    ['plywood on span > 900 mm', { carcassMaterial: 'plywood-18' as const, width: 1000, shelfCount: 1 }],
    ['chipboard when no shelves', { carcassMaterial: 'chipboard-18' as const, width: 1000, shelfCount: 0 }],
  ])('JOINERY_MAX_SPAN does not fire for %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'JOINERY_MAX_SPAN')).toBe(false);
  });

  it('JOINERY_MIN_SHELF_GAP fires when many shelves crammed into a small cabinet', () => {
    expect(
      hasCode(validateConfig(cfg({ height: 500, shelfCount: 5, doorStyle: 'none' })), 'JOINERY_MIN_SHELF_GAP'),
    ).toBe(true);
  });

  it.each([
    ['reasonable shelf spacing (2000mm, 3 shelves)', { height: 2000, shelfCount: 3 }],
    ['single shelf', { height: 500, shelfCount: 1 }],
  ])('JOINERY_MIN_SHELF_GAP does not fire for %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'JOINERY_MIN_SHELF_GAP')).toBe(false);
  });
});

describe('validateConfig — Sprint 56 new rules', () => {
  it('raises DEPTH_EXCEEDS_WIDTH warning when depth > width', () => {
    const issue = getIssue(validateConfig(cfg({ width: 600, depth: 800 })), 'DEPTH_EXCEEDS_WIDTH')!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('depth');
    expect(issue.suggestedValue).toBe(600);
  });

  it.each([
    ['depth equals width', { width: 600, depth: 600 }],
    ['depth < width', { width: 1000, depth: 600 }],
    ['panel furniture type', { width: 300, depth: 600, furnitureType: 'panel' as const }],
  ])('does not raise DEPTH_EXCEEDS_WIDTH when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'DEPTH_EXCEEDS_WIDTH')).toBe(false);
  });

  it('raises EXCESSIVE_DRAWER_COUNT error when drawers too shallow', () => {
    const issue = getIssue(validateConfig(cfg({ drawerCount: 20 })), 'EXCESSIVE_DRAWER_COUNT')!;
    expect(issue.severity).toBe('error');
    expect(issue.field).toBe('drawerCount');
    expect(issue.suggestedValue as number).toBeLessThan(20);
  });

  it.each([
    ['sensible drawer count', { drawerCount: 3 }],
    ['drawerCount is 0', { drawerCount: 0 }],
  ])('does not raise EXCESSIVE_DRAWER_COUNT when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'EXCESSIVE_DRAWER_COUNT')).toBe(false);
  });
});

describe('validateConfig — Sprint 56-79 rules', () => {
  it('raises WARDROBE_MISSING_TOEKICK (info) for wardrobe with kickHeight 0', () => {
    const issue = getIssue(
      validateConfig(cfg({ furnitureType: 'wardrobe', kickHeight: 0 })),
      'WARDROBE_MISSING_TOEKICK',
    )!;
    expect(issue.severity).toBe('info');
    expect(issue.suggestedValue).toBe(80);
    expect(issue.field).toBe('kickHeight');
  });

  it.each([
    ['wardrobe has kickHeight > 0', { furnitureType: 'wardrobe' as const, kickHeight: 80 }],
    ['non-wardrobe with kickHeight 0', { furnitureType: 'cabinet' as const, kickHeight: 0 }],
  ])('does NOT raise WARDROBE_MISSING_TOEKICK when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'WARDROBE_MISSING_TOEKICK')).toBe(false);
  });

  it('raises BACK_PANEL_OVERSIZED (info) when back panel > 9 mm', () => {
    const issue = getIssue(
      validateConfig(cfg({ hasBack: true, backPanelMaterial: 'plywood-17' })),
      'BACK_PANEL_OVERSIZED',
    )!;
    expect(issue.severity).toBe('info');
    expect(issue.field).toBe('backPanelMaterial');
  });

  it.each([
    ['thin back panel (4 mm)', { hasBack: true, backPanelMaterial: 'plywood-4' as const }],
    ['hasBack is false', { hasBack: false, backPanelMaterial: 'plywood-17' as const, height: 600 }],
  ])('does NOT raise BACK_PANEL_OVERSIZED when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'BACK_PANEL_OVERSIZED')).toBe(false);
  });

  it('raises DEPTH_TOO_SHALLOW_FOR_DOORS (warning) when depth < 250 with doors', () => {
    const issue = getIssue(
      validateConfig(cfg({ depth: 200, doorCount: 1, doorStyle: 'flat' })),
      'DEPTH_TOO_SHALLOW_FOR_DOORS',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.suggestedValue).toBe(250);
    expect(issue.field).toBe('depth');
  });

  it.each([
    ['depth >= 250', { depth: 250, doorCount: 1 as const, doorStyle: 'flat' as const }],
    ['doorCount is 0', { depth: 200, doorStyle: 'none' as const }],
  ])('does NOT raise DEPTH_TOO_SHALLOW_FOR_DOORS when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'DEPTH_TOO_SHALLOW_FOR_DOORS')).toBe(false);
  });

  it('DEPTH_TOO_SHALLOW_FOR_DOORS message contains the actual depth value', () => {
    const issue = getIssue(
      validateConfig(cfg({ depth: 180, doorCount: 2, doorStyle: 'flat' })),
      'DEPTH_TOO_SHALLOW_FOR_DOORS',
    )!;
    expect(issue.message.en).toContain('180');
    expect(issue.message.he).toContain('180');
  });

  // plywood-4 (t=4 mm) triggers thin-panel shelf-pin and message mentions the thickness
  it('raises PANEL_TOO_THIN_FOR_SHELF_PINS (info) for plywood-4 with shelves', () => {
    const issue = getIssue(
      validateConfig(cfg({ shelfCount: 2, carcassMaterial: 'plywood-4' })),
      'PANEL_TOO_THIN_FOR_SHELF_PINS',
    )!;
    expect(issue.severity).toBe('info');
    expect(issue.message.en).toContain('4');
    expect(issue.message.he).toContain('4');
  });

  it.each([
    ['no shelves', { shelfCount: 0, carcassMaterial: 'plywood-4' as const }],
    ['standard 18mm panel', { shelfCount: 2, carcassMaterial: 'plywood-18' as const }],
  ])('does not raise PANEL_TOO_THIN_FOR_SHELF_PINS when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'PANEL_TOO_THIN_FOR_SHELF_PINS')).toBe(false);
  });

  it('raises SHELF_COUNT_WARDROBE_BARE (info) for wardrobe with no shelves or drawers', () => {
    const issue = getIssue(
      validateConfig(cfg({ furnitureType: 'wardrobe', shelfCount: 0, drawerCount: 0 })),
      'SHELF_COUNT_WARDROBE_BARE',
    )!;
    expect(issue.severity).toBe('info');
    expect(issue.suggestedValue).toBe(1);
  });

  it.each([
    ['wardrobe has at least one shelf', { furnitureType: 'wardrobe' as const, shelfCount: 2, drawerCount: 0 }],
    ['wardrobe has at least one drawer', { furnitureType: 'wardrobe' as const, shelfCount: 0, drawerCount: 1 }],
    ['non-wardrobe with no shelves', { furnitureType: 'cabinet' as const, shelfCount: 0, drawerCount: 0 }],
  ])('does not raise SHELF_COUNT_WARDROBE_BARE when %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'SHELF_COUNT_WARDROBE_BARE')).toBe(false);
  });
});

describe('vendor hinge profile compatibility validation', () => {
  const thinMat = {
    key: 'test-thin-12',
    name: { en: 'Test 12 mm', he: 'בדיקה 12 מ"מ' },
    thickness: 12,
    sheetWidth: 2440,
    sheetLength: 1220,
    category: 'panel' as const,
    color: '#cccccc',
    hasGrain: false,
    densityKgM3: 700,
  };

  it('raises VENDOR_HINGE_PROFILE_UNKNOWN for an unrecognised profile id', () => {
    const issue = getIssue(
      validateConfig(cfg({ doorStyle: 'flat', hingeProfile: 'no-such-hinge-zzz' })),
      'VENDOR_HINGE_PROFILE_UNKNOWN',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('hingeProfile');
  });

  it('does not raise VENDOR_HINGE_PROFILE_UNKNOWN when hingeProfile is absent', () => {
    expect(
      hasCode(validateConfig(cfg({ doorStyle: 'flat', hingeProfile: undefined })), 'VENDOR_HINGE_PROFILE_UNKNOWN'),
    ).toBe(false);
  });

  it('raises VENDOR_HINGE_BORE_TOO_DEEP when panel is thinner than bore + 2 mm wall', () => {
    const issue = validateConfig(
      cfg({ doorStyle: 'flat', carcassMaterial: 'test-thin-12', hingeProfile: 'blum-clip-top-blumotion' }),
      [thinMat],
    ).find((i) => i.code === 'VENDOR_HINGE_BORE_TOO_DEEP');
    expect(issue?.severity).toBe('error');
    expect(issue?.field).toBe('carcassMaterial');
    expect(issue?.message.en).toContain('13.5');
  });

  it('does not raise VENDOR_HINGE_BORE_TOO_DEEP for a 18 mm panel', () => {
    expect(
      hasCode(
        validateConfig(
          cfg({ doorStyle: 'flat', carcassMaterial: 'melamine-18', hingeProfile: 'blum-clip-top-blumotion' }),
        ),
        'VENDOR_HINGE_BORE_TOO_DEEP',
      ),
    ).toBe(false);
  });

  it('raises VENDOR_HINGE_NOT_RATED_FOR_TALL_DOOR for a 110° hinge on a 2400 mm door', () => {
    const issue = getIssue(
      validateConfig(cfg({ doorStyle: 'flat', height: 2500, hingeProfile: 'blum-clip-top-110' })),
      'VENDOR_HINGE_NOT_RATED_FOR_TALL_DOOR',
    )!;
    expect(issue.severity).toBe('warning');
    expect(issue.message.en).toContain('110');
  });

  it.each([['wide-angle hinge (165°)', cfg({ doorStyle: 'flat', height: 2500, hingeProfile: 'blum-clip-top-165' })]])(
    'does not raise VENDOR_HINGE_NOT_RATED_FOR_TALL_DOOR when %s',
    (_desc, config) => {
      expect(hasCode(validateConfig(config), 'VENDOR_HINGE_NOT_RATED_FOR_TALL_DOOR')).toBe(false);
    },
  );

  it('does not raise hinge compatibility issues when doorStyle is none', () => {
    expect(
      validateConfig(cfg({ doorStyle: 'none', hingeProfile: 'blum-clip-top-blumotion' })).some((i) =>
        i.code.startsWith('VENDOR_HINGE'),
      ),
    ).toBe(false);
  });
});
