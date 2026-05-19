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
    const issues = validateConfig(cfg({ width: 300, height: 2000, doorCount: 1, doorStyle: 'flat' }));
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
    const issues = validateConfig(cfg({ width: 100, height: 600, shelfCount: 10, kickHeight: 400 }));
    const severities = issues.map((i) => i.severity);
    const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]]);
    }
  });

  it('raises a span warning for wide chipboard span', () => {
    // width=1200 → shelfWidth ≈ 1162mm, chipboard-18 has low modulus
    // May emit SHELF_DEFLECTION_WARNING, SHELF_DEFLECTION_DANGER, or SHELF_SPAN_CHIPBOARD
    const issues = validateConfig(cfg({ width: 1200, carcassMaterial: 'chipboard-18', shelfCount: 2 }));
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
    const issues = validateConfig(cfg({ width: 800, carcassMaterial: 'plywood-17', shelfCount: 2 }));
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

  // ── Drawer height rules (Sprint 13) ──

  it('raises DRAWER_HEIGHT_TOO_SMALL when drawerHeights contains a value < 100 mm', () => {
    const issues = validateConfig(cfg({ drawerCount: 2, drawerHeights: [150, 60] }));
    expect(issues.some((i) => i.code === 'DRAWER_HEIGHT_TOO_SMALL')).toBe(true);
    const issue = issues.find((i) => i.code === 'DRAWER_HEIGHT_TOO_SMALL')!;
    expect(issue.severity).toBe('error');
    expect(issue.suggestedValue).toBe(100);
  });

  it('does not raise DRAWER_HEIGHT_TOO_SMALL for adequate drawer heights', () => {
    const issues = validateConfig(cfg({ drawerCount: 3, drawerHeights: [150, 150, 120] }));
    expect(issues.some((i) => i.code === 'DRAWER_HEIGHT_TOO_SMALL')).toBe(false);
  });

  it('raises DRAWER_STACK_OVERFLOW when total drawer stack exceeds interior height', () => {
    // height=600, plywood-17 → internalH ≈ 566, 3 drawers × 200mm + 2 gaps × 10 = 620mm > 566mm
    const issues = validateConfig(cfg({ height: 600, drawerCount: 3, drawerHeights: [200, 200, 200], shelfCount: 0 }));
    expect(issues.some((i) => i.code === 'DRAWER_STACK_OVERFLOW')).toBe(true);
    expect(issues.find((i) => i.code === 'DRAWER_STACK_OVERFLOW')!.severity).toBe('error');
  });

  it('does not raise DRAWER_STACK_OVERFLOW when stack fits', () => {
    // height=900, drawerCount=2 × 150mm + 10mm gap = 310mm, internalH ≈ 866mm — fine
    const issues = validateConfig(cfg({ height: 900, drawerCount: 2 }));
    expect(issues.some((i) => i.code === 'DRAWER_STACK_OVERFLOW')).toBe(false);
  });

  // ── Sprint 17: Wide-span and tall-cabinet structural checks ──

  it('raises SPAN_TOO_WIDE warning when width > 1200 mm', () => {
    const issues = validateConfig(cfg({ width: 1400, furnitureType: 'cabinet' }));
    expect(issues.some((i) => i.code === 'SPAN_TOO_WIDE')).toBe(true);
    expect(issues.find((i) => i.code === 'SPAN_TOO_WIDE')!.severity).toBe('warning');
    expect(issues.find((i) => i.code === 'SPAN_TOO_WIDE')!.field).toBe('width');
  });

  it('does not raise SPAN_TOO_WIDE when width <= 1200 mm', () => {
    const issues = validateConfig(cfg({ width: 1200 }));
    expect(issues.some((i) => i.code === 'SPAN_TOO_WIDE')).toBe(false);
  });

  it('does not raise SPAN_TOO_WIDE for panel furniture type', () => {
    // Panel type is exempt from SPAN_TOO_WIDE (it IS a single panel)
    const issues = validateConfig(
      cfg({ width: 1800, furnitureType: 'panel', doorStyle: 'none', kickHeight: 0, depth: 18 }),
    );
    expect(issues.some((i) => i.code === 'SPAN_TOO_WIDE')).toBe(false);
  });

  it('raises CARCASS_HEIGHT_CRITICAL warning when height > 2400 mm', () => {
    const issues = validateConfig(cfg({ height: 2500, furnitureType: 'wardrobe' }));
    expect(issues.some((i) => i.code === 'CARCASS_HEIGHT_CRITICAL')).toBe(true);
    expect(issues.find((i) => i.code === 'CARCASS_HEIGHT_CRITICAL')!.severity).toBe('warning');
    expect(issues.find((i) => i.code === 'CARCASS_HEIGHT_CRITICAL')!.field).toBe('height');
  });

  it('does not raise CARCASS_HEIGHT_CRITICAL when height <= 2400 mm', () => {
    const issues = validateConfig(cfg({ height: 2400 }));
    expect(issues.some((i) => i.code === 'CARCASS_HEIGHT_CRITICAL')).toBe(false);
  });

  it('does not raise CARCASS_HEIGHT_CRITICAL for panel furniture type', () => {
    const issues = validateConfig(
      cfg({ height: 2800, furnitureType: 'panel', doorStyle: 'none', kickHeight: 0, depth: 18 }),
    );
    expect(issues.some((i) => i.code === 'CARCASS_HEIGHT_CRITICAL')).toBe(false);
  });
});

describe('validateConfig — SHELF_LOAD_CAPACITY_LOW (Sprint 30)', () => {
  it('raises SHELF_LOAD_CAPACITY_LOW for a very wide span with chipboard', () => {
    // 1600 mm span with chipboard-18 has very low stiffness → < 15 kg safe load
    const issues = validateConfig(
      cfg({
        width: 1700,
        shelfCount: 2,
        carcassMaterial: 'chipboard-18',
        doorStyle: 'none',
      }),
    );
    expect(issues.some((i) => i.code === 'SHELF_LOAD_CAPACITY_LOW')).toBe(true);
  });

  it('does not raise SHELF_LOAD_CAPACITY_LOW for a normal span with plywood', () => {
    const issues = validateConfig(
      cfg({
        width: 800,
        shelfCount: 2,
        carcassMaterial: 'plywood-18',
        doorStyle: 'none',
      }),
    );
    expect(issues.some((i) => i.code === 'SHELF_LOAD_CAPACITY_LOW')).toBe(false);
  });

  it('does not raise SHELF_LOAD_CAPACITY_LOW when there are no shelves', () => {
    const issues = validateConfig(cfg({ shelfCount: 0 }));
    expect(issues.some((i) => i.code === 'SHELF_LOAD_CAPACITY_LOW')).toBe(false);
  });

  it('SHELF_LOAD_CAPACITY_LOW points to shelfCount field', () => {
    const issues = validateConfig(
      cfg({
        width: 1700,
        shelfCount: 1,
        carcassMaterial: 'chipboard-18',
        doorStyle: 'none',
      }),
    );
    const issue = issues.find((i) => i.code === 'SHELF_LOAD_CAPACITY_LOW');
    expect(issue?.field).toBe('shelfCount');
    expect(issue?.severity).toBe('warning');
  });

  // ── Phase 5 Sprint 7: Manufacturing constraint checks ──

  it('raises DADO_DEPTH_TOO_SHALLOW when panel is very thin with shelves', () => {
    // plywood-4 has t=4 mm; dado depth = 4×(1/3) = 1.33 mm < 5 mm threshold
    const issues = validateConfig(cfg({ shelfCount: 2, carcassMaterial: 'plywood-4' }));
    expect(issues.some((i) => i.code === 'DADO_DEPTH_TOO_SHALLOW')).toBe(true);
    const issue = issues.find((i) => i.code === 'DADO_DEPTH_TOO_SHALLOW')!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('carcassMaterial');
  });

  it('does not raise DADO_DEPTH_TOO_SHALLOW for a standard 18mm panel', () => {
    const issues = validateConfig(cfg({ shelfCount: 3, carcassMaterial: 'plywood-18' }));
    expect(issues.some((i) => i.code === 'DADO_DEPTH_TOO_SHALLOW')).toBe(false);
  });

  it('does not raise DADO_DEPTH_TOO_SHALLOW when there are no shelves', () => {
    const issues = validateConfig(cfg({ shelfCount: 0 }));
    expect(issues.some((i) => i.code === 'DADO_DEPTH_TOO_SHALLOW')).toBe(false);
  });

  it('raises DRAWER_RUNNER_CLEARANCE_INSUFFICIENT for very narrow cabinet with drawers', () => {
    // width=200, t≈17 → internalWidth=166, need 174 (24+150) → flag
    const issues = validateConfig(cfg({ width: 200, drawerCount: 1, doorStyle: 'none' }));
    expect(issues.some((i) => i.code === 'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT')).toBe(true);
    const issue = issues.find((i) => i.code === 'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT')!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('width');
  });

  it('does not raise DRAWER_RUNNER_CLEARANCE_INSUFFICIENT for standard-width cabinet', () => {
    // width=600, t≈17 → internalWidth=566 >> 174 — fine
    const issues = validateConfig(cfg({ width: 600, drawerCount: 2, doorStyle: 'none' }));
    expect(issues.some((i) => i.code === 'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT')).toBe(false);
  });

  it('does not raise DRAWER_RUNNER_CLEARANCE_INSUFFICIENT when drawerCount is 0', () => {
    const issues = validateConfig(cfg({ width: 200, drawerCount: 0, doorStyle: 'none' }));
    expect(issues.some((i) => i.code === 'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT')).toBe(false);
  });

  it('raises BACK_REBATE_TOO_SHALLOW for a very thin panel with back', () => {
    // plywood-4 has t=4 mm; 4/2 = 2 mm < 8 mm threshold
    const issues = validateConfig(cfg({ carcassMaterial: 'plywood-4', hasBack: true }));
    expect(issues.some((i) => i.code === 'BACK_REBATE_TOO_SHALLOW')).toBe(true);
    const issue = issues.find((i) => i.code === 'BACK_REBATE_TOO_SHALLOW')!;
    expect(issue.severity).toBe('info');
  });

  it('does not raise BACK_REBATE_TOO_SHALLOW for standard 18mm panel', () => {
    const issues = validateConfig(cfg({ carcassMaterial: 'plywood-18', hasBack: true }));
    expect(issues.some((i) => i.code === 'BACK_REBATE_TOO_SHALLOW')).toBe(false);
  });

  it('does not raise BACK_REBATE_TOO_SHALLOW when hasBack is false', () => {
    // Even with thin material, no back → no rebate warning
    const issues = validateConfig(cfg({ carcassMaterial: 'plywood-4', hasBack: false }));
    expect(issues.some((i) => i.code === 'BACK_REBATE_TOO_SHALLOW')).toBe(false);
  });

  it('raises HINGE_CUP_EDGE_DISTANCE_UNSAFE for extremely narrow door cabinet', () => {
    // width=80, doorCount=2, doorReveal=3 → doorWidth=(80-6)/2=37mm < 44mm (2×22)
    const issues = validateConfig(cfg({ width: 80, doorCount: 2, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'HINGE_CUP_EDGE_DISTANCE_UNSAFE')).toBe(true);
    const issue = issues.find((i) => i.code === 'HINGE_CUP_EDGE_DISTANCE_UNSAFE')!;
    expect(issue.severity).toBe('error');
  });

  it('does not raise HINGE_CUP_EDGE_DISTANCE_UNSAFE for a normal door width', () => {
    const issues = validateConfig(cfg({ width: 600, doorCount: 1, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'HINGE_CUP_EDGE_DISTANCE_UNSAFE')).toBe(false);
  });

  it('does not raise HINGE_CUP_EDGE_DISTANCE_UNSAFE when doorStyle is none', () => {
    const issues = validateConfig(cfg({ width: 100, doorStyle: 'none' }));
    expect(issues.some((i) => i.code === 'HINGE_CUP_EDGE_DISTANCE_UNSAFE')).toBe(false);
  });

  // ── Assembly-risk: tall carcass without shelf (Sprint 7) ──

  it('raises TALL_CARCASS_NO_SHELF for tall open carcass without shelves or drawers', () => {
    const issues = validateConfig(
      cfg({ height: 1800, shelfCount: 0, drawerCount: 0, doorStyle: 'none', furnitureType: 'cabinet' }),
    );
    expect(issues.some((i) => i.code === 'TALL_CARCASS_NO_SHELF')).toBe(true);
    const issue = issues.find((i) => i.code === 'TALL_CARCASS_NO_SHELF')!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('shelfCount');
    expect(issue.suggestedValue).toBe(1);
  });

  it('does not raise TALL_CARCASS_NO_SHELF when shelves are present', () => {
    const issues = validateConfig(cfg({ height: 1800, shelfCount: 2, furnitureType: 'cabinet' }));
    expect(issues.some((i) => i.code === 'TALL_CARCASS_NO_SHELF')).toBe(false);
  });

  it('does not raise TALL_CARCASS_NO_SHELF when drawers are present', () => {
    const issues = validateConfig(
      cfg({ height: 1800, shelfCount: 0, drawerCount: 3, doorStyle: 'none', furnitureType: 'cabinet' }),
    );
    expect(issues.some((i) => i.code === 'TALL_CARCASS_NO_SHELF')).toBe(false);
  });

  it('does not raise TALL_CARCASS_NO_SHELF for short cabinet without shelves', () => {
    const issues = validateConfig(
      cfg({ height: 800, shelfCount: 0, drawerCount: 0, doorStyle: 'none', furnitureType: 'cabinet' }),
    );
    expect(issues.some((i) => i.code === 'TALL_CARCASS_NO_SHELF')).toBe(false);
  });

  it('does not raise TALL_CARCASS_NO_SHELF for panel type', () => {
    const issues = validateConfig(cfg({ height: 1800, shelfCount: 0, drawerCount: 0, furnitureType: 'panel' }));
    expect(issues.some((i) => i.code === 'TALL_CARCASS_NO_SHELF')).toBe(false);
  });

  // ── Hinge-shelf interference checks (Phase 5 assembly risk) ──

  it('raises HINGE_SHELF_INTERFERENCE when middle hinge aligns with a shelf (1000mm cabinet, 3 shelves)', () => {
    // height=1000, plywood-17, 3 shelves, flat door:
    // hingesPerDoor=3, middle hinge ~497 from door top → arm at ~483mm from interior bottom
    // 3 shelves equal → middle shelf also at ~483mm → gap 0 < 35mm
    const issues = validateConfig(cfg({ height: 1000, shelfCount: 3, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'HINGE_SHELF_INTERFERENCE')).toBe(true);
    const issue = issues.find((i) => i.code === 'HINGE_SHELF_INTERFERENCE')!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('shelfCount');
  });

  it('does not raise HINGE_SHELF_INTERFERENCE when doorStyle is none', () => {
    const issues = validateConfig(cfg({ height: 1000, shelfCount: 3, doorStyle: 'none' }));
    expect(issues.some((i) => i.code === 'HINGE_SHELF_INTERFERENCE')).toBe(false);
  });

  it('does not raise HINGE_SHELF_INTERFERENCE when shelfCount is 0', () => {
    const issues = validateConfig(cfg({ height: 1000, shelfCount: 0, doorStyle: 'flat' }));
    expect(issues.some((i) => i.code === 'HINGE_SHELF_INTERFERENCE')).toBe(false);
  });

  it('does not raise HINGE_SHELF_INTERFERENCE for the default 2000mm 4-shelf cabinet', () => {
    // 5 hinges spread over 1994mm; 4 shelves at ~393, 786, 1180, 1573mm — all > 35mm from any hinge arm
    const issues = validateConfig(cfg());
    expect(issues.some((i) => i.code === 'HINGE_SHELF_INTERFERENCE')).toBe(false);
  });

  it('HINGE_SHELF_INTERFERENCE message contains both en and he text', () => {
    const issues = validateConfig(cfg({ height: 1000, shelfCount: 3, doorStyle: 'flat' }));
    const issue = issues.find((i) => i.code === 'HINGE_SHELF_INTERFERENCE');
    expect(issue).toBeDefined();
    expect(issue!.message.en).toContain('mm');
    expect(issue!.message.he).toContain('מ"מ');
  });
});

describe('validateConfig — NARROW_BACK_OMITTED (Sprint 34)', () => {
  it('raises NARROW_BACK_OMITTED warning for narrow open-back cabinet', () => {
    const issues = validateConfig(cfg({ hasBack: false, width: 350, furnitureType: 'cabinet' }));
    expect(issues.some((i) => i.code === 'NARROW_BACK_OMITTED')).toBe(true);
    const issue = issues.find((i) => i.code === 'NARROW_BACK_OMITTED')!;
    expect(issue.severity).toBe('warning');
    expect(issue.field).toBe('hasBack');
  });

  it('does not raise NARROW_BACK_OMITTED when cabinet has a back panel', () => {
    const issues = validateConfig(cfg({ hasBack: true, width: 350, furnitureType: 'cabinet' }));
    expect(issues.some((i) => i.code === 'NARROW_BACK_OMITTED')).toBe(false);
  });

  it('does not raise NARROW_BACK_OMITTED when width >= 400 mm', () => {
    const issues = validateConfig(cfg({ hasBack: false, width: 450, furnitureType: 'cabinet' }));
    expect(issues.some((i) => i.code === 'NARROW_BACK_OMITTED')).toBe(false);
  });

  it('does not raise NARROW_BACK_OMITTED for panel furniture type', () => {
    const issues = validateConfig(cfg({ hasBack: false, width: 300, furnitureType: 'panel', doorStyle: 'none', kickHeight: 0, depth: 18 }));
    expect(issues.some((i) => i.code === 'NARROW_BACK_OMITTED')).toBe(false);
  });

  it('NARROW_BACK_OMITTED fires at exactly 399 mm (boundary)', () => {
    const issues = validateConfig(cfg({ hasBack: false, width: 399, furnitureType: 'bookshelf' }));
    expect(issues.some((i) => i.code === 'NARROW_BACK_OMITTED')).toBe(true);
  });

  it('NARROW_BACK_OMITTED message has both en and he text', () => {
    const issues = validateConfig(cfg({ hasBack: false, width: 300 }));
    const issue = issues.find((i) => i.code === 'NARROW_BACK_OMITTED')!;
    expect(issue.message.en).toBeTruthy();
    expect(issue.message.he).toBeTruthy();
  });
});
