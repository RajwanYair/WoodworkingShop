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
    const issue = getIssue(validateConfig(cfg({ width: 100, carcassMaterial: 'plywood-18' })), 'CARCASS_TOO_NARROW')!;
    expect(issue.severity).toBe('error');
    expect(issue.field).toBe('width');
    expect(issue.suggestedValue).toBe(136);
    expect(issue.message.en).toContain('Minimum usable width is 136 mm.');
    expect(issue.message.he).toContain('רוחב מינימלי שמיש: 136 מ"מ.');
  });

  it('uses the 18 mm fallback when validating an unknown carcass material', () => {
    const issue = getIssue(
      validateConfig(cfg({ width: 135, carcassMaterial: 'unknown-material' })),
      'CARCASS_TOO_NARROW',
    );
    expect(issue?.suggestedValue).toBe(136);
  });

  it('rejects pocket-screw joinery for material thinner than 15 mm', () => {
    const issue = getIssue(
      validateConfig(cfg({ carcassMaterial: 'mdf-3', joineryType: 'pocket-screw' })),
      'JOINERY_POCKET_SCREW_TOO_THIN',
    );
    expect(issue?.severity).toBe('error');
    expect(issue?.field).toBe('carcassMaterial');
    expect(issue?.fix?.patch?.joineryType).toBe('screw');
    expect(issue?.fix?.labelKey).toBe('validation.fixSwitchJoinery');
  });

  it('clears the wide-span warning after applying its centre-support repair', () => {
    const issue = getIssue(validateConfig(cfg({ width: 1300 })), 'SPAN_TOO_WIDE');
    const shelfCentreSupports = issue?.fix?.patch?.shelfCentreSupports;
    expect(shelfCentreSupports).toBe(1);
    expect(hasCode(validateConfig(cfg({ width: 1300, shelfCentreSupports })), 'SPAN_TOO_WIDE')).toBe(false);
  });

  it('raises CARCASS_TOO_SHORT error when height is too small', () => {
    const issue = getIssue(validateConfig(cfg({ height: 100, carcassMaterial: 'plywood-18' })), 'CARCASS_TOO_SHORT')!;
    expect(issue.severity).toBe('error');
    expect(issue.field).toBe('height');
    expect(issue.suggestedValue).toBe(136);
    expect(issue.message.en).toContain('Minimum usable height is 136 mm.');
    expect(issue.message.he).toContain('גובה מינימלי: 136 מ"מ.');
  });

  it.each([
    ['minimum width', { width: 136 }, 'CARCASS_TOO_NARROW'],
    ['minimum height', { height: 136 }, 'CARCASS_TOO_SHORT'],
  ] as const)('accepts a cabinet at the exact %s', (_, dimensions, code) => {
    expect(hasCode(validateConfig(cfg({ ...dimensions, carcassMaterial: 'plywood-18' })), code)).toBe(false);
  });

  it.each([
    ['width', { width: 110 }, 'CARCASS_TOO_NARROW'],
    ['height', { height: 110 }, 'CARCASS_TOO_SHORT'],
  ] as const)('rejects a cabinet with %s just below the minimum', (_, dimensions, code) => {
    expect(hasCode(validateConfig(cfg({ ...dimensions, carcassMaterial: 'plywood-18' })), code)).toBe(true);
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
    const issue = getIssue(validateConfig(cfg({ height: 600, kickHeight: 350 })), 'KICK_TOO_TALL');
    expect(issue?.severity).toBe('warning');
    expect(issue?.field).toBe('kickHeight');
    expect(issue?.suggestedValue).toBe(270);
    expect(issue?.message.en).toContain('more than 50%');
    expect(issue?.message.he).toContain('50%');
  });

  it.each([
    [299, false],
    [300, false],
    [301, true],
  ])('reports KICK_TOO_TALL at %i mm for a 600 mm cabinet: %s', (kickHeight, shouldReport) => {
    expect(hasCode(validateConfig(cfg({ height: 600, kickHeight })), 'KICK_TOO_TALL')).toBe(shouldReport);
  });

  it('recommends a toe-kick for a wardrobe without one', () => {
    const issue = getIssue(
      validateConfig(cfg({ furnitureType: 'wardrobe', kickHeight: 0 })),
      'WARDROBE_MISSING_TOEKICK',
    );
    expect(issue?.severity).toBe('info');
    expect(issue?.field).toBe('kickHeight');
    expect(issue?.suggestedValue).toBe(80);
    expect(issue?.message.en).toContain('80–100 mm toe-kick');
    expect(issue?.message.he).toContain('80–100 מ"מ');
  });

  it.each([
    ['a cabinet without a toe-kick', { furnitureType: 'cabinet' as const, kickHeight: 0 }],
    ['a wardrobe with a toe-kick', { furnitureType: 'wardrobe' as const, kickHeight: 1 }],
  ])('does not recommend a wardrobe toe-kick for %s', (_, overrides) => {
    expect(hasCode(validateConfig(cfg(overrides)), 'WARDROBE_MISSING_TOEKICK')).toBe(false);
  });

  it('raises SHELF_CLEARANCE_TOO_SMALL when too many shelves in short cabinet', () => {
    const issue = getIssue(validateConfig(cfg({ height: 600, shelfCount: 10 })), 'SHELF_CLEARANCE_TOO_SMALL')!;
    expect(issue.severity).toBe('warning');
    expect(issue.suggestedValue).toBeTypeOf('number');
  });

  it('raises DRAWERS_TOO_MANY warning when drawers crowd shelves', () => {
    expect(hasCode(validateConfig(cfg({ height: 500, shelfCount: 2, drawerCount: 3 })), 'DRAWERS_TOO_MANY')).toBe(true);
  });

  it('provides a repair when drawers leave too little height for shelves', () => {
    const issue = getIssue(
      validateConfig(cfg({ height: 555, carcassMaterial: 'plywood-18', shelfCount: 1, drawerCount: 2 })),
      'DRAWERS_TOO_MANY',
    );
    expect(issue?.severity).toBe('warning');
    expect(issue?.field).toBe('drawerCount');
    expect(issue?.fix?.patch?.shelfCount).toBe(0);
    expect(issue?.fix?.labelKey).toBe('validation.fixRemoveShelves');
    expect(issue?.message.en).toContain('leave only 199 mm');
    expect(issue?.message.he).toContain('199 מ"מ');
  });

  it.each([
    ['exactly 200 mm above the drawers', 556, 1, false],
    ['1 mm below the minimum above the drawers', 555, 1, true],
    ['no shelves to clear', 555, 0, false],
  ])('reports DRAWERS_TOO_MANY when %s', (_, height, shelfCount, shouldReport) => {
    expect(
      hasCode(
        validateConfig(cfg({ height, carcassMaterial: 'plywood-18', shelfCount, drawerCount: 2 })),
        'DRAWERS_TOO_MANY',
      ),
    ).toBe(shouldReport);
  });

  it('reports high drawer density above the interior-height threshold', () => {
    const issue = getIssue(
      validateConfig(cfg({ height: 636, carcassMaterial: 'plywood-18', shelfCount: 0, drawerCount: 4 })),
      'DRAWER_DENSITY_HIGH',
    );
    expect(issue?.severity).toBe('info');
    expect(issue?.field).toBe('drawerCount');
    expect(issue?.suggestedValue).toBe(3);
    expect(issue?.message.en).toContain('High drawer density: 4 drawers in a 636 mm cabinet');
    expect(issue?.message.he).toContain('4 מגירות בארון של 636 מ"מ');
  });

  it.each([
    [2, false],
    [3, false],
    [4, true],
  ])('reports DRAWER_DENSITY_HIGH for %i drawers in a 636 mm cabinet: %s', (drawerCount, shouldReport) => {
    expect(
      hasCode(
        validateConfig(cfg({ height: 636, carcassMaterial: 'plywood-18', shelfCount: 0, drawerCount })),
        'DRAWER_DENSITY_HIGH',
      ),
    ).toBe(shouldReport);
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
    expect(issue.field).toBe('drawerCount');
    expect(issue.suggestedValue).toBe(100);
    expect(issue.message.en).toContain('Drawer 2 height (60 mm)');
    expect(issue.message.he).toContain('מגירה 2 (60 מ"מ)');
  });

  it.each([
    [99, true],
    [100, false],
    [101, false],
  ])('reports DRAWER_HEIGHT_TOO_SMALL for a single drawer of %i mm: %s', (height, shouldReport) => {
    expect(hasCode(validateConfig(cfg({ drawerCount: 1, drawerHeights: [height] })), 'DRAWER_HEIGHT_TOO_SMALL')).toBe(
      shouldReport,
    );
  });

  it('raises DRAWER_STACK_OVERFLOW when total drawer stack exceeds interior height', () => {
    const issue = getIssue(
      validateConfig(
        cfg({
          height: 600,
          carcassMaterial: 'plywood-18',
          drawerCount: 3,
          drawerHeights: [200, 200, 200],
          shelfCount: 0,
        }),
      ),
      'DRAWER_STACK_OVERFLOW',
    );
    expect(issue?.severity).toBe('error');
    expect(issue?.field).toBe('drawerCount');
    expect(issue?.suggestedValue).toBe(3);
    expect(issue?.message.en).toContain(
      'Total drawer stack height (620 mm) exceeds the available interior height (564 mm).',
    );
    expect(issue?.message.he).toContain('סך גובה המגירות (620 מ"מ) חורג מגובה הפנים הזמין (564 מ"מ).');
  });

  it.each([
    ['exactly fills the interior', 378, false],
    ['exceeds the interior by 1 mm', 379, true],
  ])('handles a drawer stack that %s', (_, firstDrawerHeight, shouldReport) => {
    expect(
      hasCode(
        validateConfig(cfg({ height: 800, drawerCount: 2, drawerHeights: [firstDrawerHeight, 378], shelfCount: 0 })),
        'DRAWER_STACK_OVERFLOW',
      ),
    ).toBe(shouldReport);
  });

  it('recommends reducing drawer count below the 100 mm per-drawer minimum', () => {
    const issue = getIssue(
      validateConfig(cfg({ height: 235, carcassMaterial: 'plywood-18', drawerCount: 2 })),
      'EXCESSIVE_DRAWER_COUNT',
    );
    expect(issue?.severity).toBe('error');
    expect(issue?.field).toBe('drawerCount');
    expect(issue?.suggestedValue).toBe(1);
    expect(issue?.message.en).toContain('Reduce to at most 1 drawer.');
    expect(issue?.message.en).toContain('gives only 100 mm per drawer');
    expect(issue?.message.he).toContain('הפחת ל-1 מגירות לכל היותר');
    expect(issue?.message.he).toContain('100 מ"מ למגירה');
  });

  it('does not report excessive drawers when a short cabinet has no drawers', () => {
    expect(hasCode(validateConfig(cfg({ height: 230, drawerCount: 0, shelfCount: 1 })), 'DRAWERS_TOO_MANY')).toBe(
      false,
    );
  });

  it('pluralizes the recommended drawer count when more than one can fit', () => {
    const issue = getIssue(
      validateConfig(cfg({ height: 335, carcassMaterial: 'plywood-18', drawerCount: 3 })),
      'EXCESSIVE_DRAWER_COUNT',
    );
    expect(issue?.suggestedValue).toBe(2);
    expect(issue?.message.en).toContain('Reduce to at most 2 drawers.');
  });

  it.each([
    ['exactly 100 mm per drawer', 236, false],
    ['below 100 mm per drawer', 235, true],
  ])('reports EXCESSIVE_DRAWER_COUNT when %s', (_, height, shouldReport) => {
    expect(
      hasCode(validateConfig(cfg({ height, carcassMaterial: 'plywood-18', drawerCount: 2 })), 'EXCESSIVE_DRAWER_COUNT'),
    ).toBe(shouldReport);
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
