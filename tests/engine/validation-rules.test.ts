import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/engine/validation';
import { cfg } from '../helpers';

/** Returns true when at least one issue has the given code. */
const hasCode = (issues: ReturnType<typeof validateConfig>, code: string): boolean =>
  issues.some((i) => i.code === code);

/** Returns the first issue matching the given code, or undefined. */
const getIssue = (issues: ReturnType<typeof validateConfig>, code: string) => issues.find((i) => i.code === code);

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

describe('validateConfig — Sprint 56–79 rules', () => {
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
