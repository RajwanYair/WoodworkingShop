import type { CabinetConfig, ValidationIssue, ValidationRule, ValidationContext } from './types';
import { getMaterial } from './materials.ts';
import { computeDimensions } from './dimensions';
import { checkDoors, checkHingeShelfInterference, checkDoorDepth, checkVendorHingeProfile } from './validation/door-rules';
import { checkDimensionRules } from './validation/dimension-rules';
import { checkShelfRules, checkJoineryConstraints } from './validation/shelf-rules';

// ── Phase 12 / Sprint 9 — Custom rule registry ───────────────────────────────

const _customRules: ValidationRule[] = [];

/**
 * Register a custom validation rule. The rule will be invoked at the end of
 * every `validateConfig()` call, after all built-in rules have run.
 *
 * Re-registering a rule with the same `id` is a no-op (idempotent).
 */
export function registerRule(rule: ValidationRule): void {
  if (_customRules.some((r) => r.id === rule.id)) return;
  _customRules.push(rule);
}

/**
 * Remove a previously registered custom rule by `id`. No-op if not found.
 * Useful for testing teardown and dynamic feature flags.
 */
export function unregisterRule(id: string): void {
  const idx = _customRules.findIndex((r) => r.id === id);
  if (idx >= 0) _customRules.splice(idx, 1);
}

/** Return a read-only snapshot of all currently registered custom rules. */
export function getCustomRules(): readonly ValidationRule[] {
  return _customRules;
}

// ── Remaining configuration constants ────────────────────────────────────────

/** Maximum fraction of cabinet height the toe-kick can occupy. */
const MAX_KICK_FRACTION = 0.5;

/** Minimum internal clearance above the drawer stack (mm). */
const MIN_ABOVE_DRAWERS_MM = 200;

/**
 * Minimum drawer box height in mm — below this, standard side-mount runner
 * hardware cannot be reliably installed.
 */
const MIN_DRAWER_HEIGHT_MM = 100;

// ── Main validation entry point ───────────────────────────────────────────────

/**
 * Run all manufacturing constraint checks on a cabinet configuration.
 *
 * @returns Array of ValidationIssue. Empty array means the config is valid.
 *          Issues are sorted: errors first, then warnings, then info.
 */
export function validateConfig(
  config: CabinetConfig,
  extraMaterials?: Parameters<typeof getMaterial>[1],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const mat = safeGetMaterial(config.carcassMaterial, extraMaterials);
  const t = mat?.thickness ?? 18;
  const dims = computeDimensions(config, extraMaterials);

  // ── Dimension sanity checks ──

  if (config.width < 2 * t + 100) {
    issues.push({
      code: 'CARCASS_TOO_NARROW',
      severity: 'error',
      message: {
        en: `Cabinet width (${config.width} mm) is too small for the chosen material thickness (${t} mm sides). Minimum usable width is ${2 * t + 100} mm.`,
        he: `רוחב הארון (${config.width} מ"מ) קטן מדי לעובי החומר הנבחר (${t} מ"מ לדפנות). רוחב מינימלי שמיש: ${2 * t + 100} מ"מ.`,
      },
      field: 'width',
      suggestedValue: 2 * t + 100,
    });
  }

  if (config.height < 2 * t + 100) {
    issues.push({
      code: 'CARCASS_TOO_SHORT',
      severity: 'error',
      message: {
        en: `Cabinet height (${config.height} mm) is too small for the chosen material thickness (${t} mm top/bottom). Minimum usable height is ${2 * t + 100} mm.`,
        he: `גובה הארון (${config.height} מ"מ) קטן מדי לעובי החומר. גובה מינימלי: ${2 * t + 100} מ"מ.`,
      },
      field: 'height',
      suggestedValue: 2 * t + 100,
    });
  }

  // ── Door checks ──
  issues.push(...checkDoors(config, dims));

  // ── Toe-kick check ──

  if (config.kickHeight > config.height * MAX_KICK_FRACTION) {
    issues.push({
      code: 'KICK_TOO_TALL',
      severity: 'warning',
      message: {
        en: `Toe-kick height (${config.kickHeight} mm) is more than ${Math.round(MAX_KICK_FRACTION * 100)}% of cabinet height (${config.height} mm). This wastes usable interior space.`,
        he: `גובה הפלינתה (${config.kickHeight} מ"מ) עולה על ${Math.round(MAX_KICK_FRACTION * 100)}% מגובה הארון. שקול הפחתה.`,
      },
      field: 'kickHeight',
      suggestedValue: Math.round(config.height * MAX_KICK_FRACTION * 0.9),
    });
  }

  // ── Wardrobe missing toe-kick (Sprint 68) ──

  if (config.furnitureType === 'wardrobe' && config.kickHeight === 0) {
    issues.push({
      code: 'WARDROBE_MISSING_TOEKICK',
      severity: 'info',
      message: {
        en: 'Wardrobes benefit from an 80–100 mm toe-kick for ergonomic access to the bottom shelf.',
        he: 'לארון בגדים מומלץ פלינתה של 80–100 מ"מ לנוחות גישה למדף התחתון.',
      },
      field: 'kickHeight',
      suggestedValue: 80,
    });
  }

  // ── Drawer vs cabinet height checks ──

  if (config.drawerCount > 0) {
    const defaultDrawerH = 150;
    const drawerStackH = config.drawerCount * (defaultDrawerH + 10); // 10 mm gaps
    const remainingH = dims.internalHeight - drawerStackH;

    if (remainingH < MIN_ABOVE_DRAWERS_MM && config.shelfCount > 0) {
      issues.push({
        code: 'DRAWERS_TOO_MANY',
        severity: 'warning',
        message: {
          en: `${config.drawerCount} drawers leave only ${Math.round(remainingH)} mm of interior height above them — too little room for ${config.shelfCount} shelf(ves). Reduce drawer count or increase cabinet height.`,
          he: `${config.drawerCount} מגירות משאירות רק ${Math.round(remainingH)} מ"מ גובה פנים לתכולה מעל המגירות. הפחת מגירות או הגדל גובה.`,
        },
        field: 'drawerCount',
        fix: {
          patch: { shelfCount: 0 },
          labelKey: 'validation.fixRemoveShelves',
        },
      });
    }

    if (config.drawerCount > dims.internalHeight / 200) {
      issues.push({
        code: 'DRAWER_DENSITY_HIGH',
        severity: 'info',
        message: {
          en: `High drawer density: ${config.drawerCount} drawers in a ${config.height} mm cabinet. Verify that each drawer has at least 150 mm clear opening height.`,
          he: `צפיפות מגירות גבוהה: ${config.drawerCount} מגירות בארון של ${config.height} מ"מ. ודא שגובה הפתיחה של כל מגירה לפחות 150 מ"מ.`,
        },
        field: 'drawerCount',
        suggestedValue: Math.max(1, Math.floor(dims.internalHeight / 200)),
      });
    }

    // ── Per-drawer height checks (Sprint 13) ──

    const drawerGapMm = 10; // clearance between drawer faces
    const heights: number[] = Array.from({ length: config.drawerCount }, (_, i) => config.drawerHeights?.[i] ?? 150);
    const totalStackH = heights.reduce((s, h) => s + h, 0) + (config.drawerCount - 1) * drawerGapMm;

    const tooShallowIdx = heights.findIndex((h) => h < MIN_DRAWER_HEIGHT_MM);
    if (tooShallowIdx >= 0) {
      issues.push({
        code: 'DRAWER_HEIGHT_TOO_SMALL',
        severity: 'error',
        message: {
          en: `Drawer ${tooShallowIdx + 1} height (${heights[tooShallowIdx]} mm) is below the minimum of ${MIN_DRAWER_HEIGHT_MM} mm. Standard side-mount runners need at least ${MIN_DRAWER_HEIGHT_MM} mm of box height.`,
          he: `גובה מגירה ${tooShallowIdx + 1} (${heights[tooShallowIdx]} מ"מ) קטן מהמינימום ${MIN_DRAWER_HEIGHT_MM} מ"מ. מנגנוני הזזה סטנדרטיים דורשים לפחות ${MIN_DRAWER_HEIGHT_MM} מ"מ.`,
        },
        field: 'drawerCount',
        suggestedValue: MIN_DRAWER_HEIGHT_MM,
      });
    }

    if (totalStackH > dims.internalHeight) {
      issues.push({
        code: 'DRAWER_STACK_OVERFLOW',
        severity: 'error',
        message: {
          en: `Total drawer stack height (${Math.round(totalStackH)} mm) exceeds the available interior height (${Math.round(dims.internalHeight)} mm). Reduce drawer heights or increase cabinet height.`,
          he: `סך גובה המגירות (${Math.round(totalStackH)} מ"מ) חורג מגובה הפנים הזמין (${Math.round(dims.internalHeight)} מ"מ). הפחת גבהי מגירות או הגדל גובה הארון.`,
        },
        field: 'drawerCount',
        suggestedValue: Math.max(1, Math.floor(dims.internalHeight / 160)),
      });
    }

    // ── Sprint 56: Excessive drawer count ──

    if (dims.internalHeight / config.drawerCount < MIN_DRAWER_HEIGHT_MM) {
      const maxDrawers = Math.floor(dims.internalHeight / MIN_DRAWER_HEIGHT_MM);
      issues.push({
        code: 'EXCESSIVE_DRAWER_COUNT',
        severity: 'error',
        message: {
          en: `${config.drawerCount} drawers in ${Math.round(dims.internalHeight)} mm internal height gives only ${Math.round(dims.internalHeight / config.drawerCount)} mm per drawer — below the ${MIN_DRAWER_HEIGHT_MM} mm minimum for standard side-mount hardware. Reduce to at most ${maxDrawers} drawer${maxDrawers !== 1 ? 's' : ''}.`,
          he: `${config.drawerCount} מגירות בגובה פנימי ${Math.round(dims.internalHeight)} מ"מ נותנות רק ${Math.round(dims.internalHeight / config.drawerCount)} מ"מ למגירה — מתחת למינימום ${MIN_DRAWER_HEIGHT_MM} מ"מ לחומרה סטנדרטית. הפחת ל-${maxDrawers} מגירות לכל היותר.`,
        },
        field: 'drawerCount',
        suggestedValue: maxDrawers,
      });
    }
  }

  // ── Shelf / deflection / joinery span checks ──
  issues.push(...checkShelfRules(config, dims, mat, t));

  // ── Structural / manufacturing / dimension rules ──
  issues.push(...checkDimensionRules(config, t, extraMaterials));

  // ── Hinge arm / shelf clearance (Phase 5 assembly risk) ──
  issues.push(...checkHingeShelfInterference(config, dims, t));

  // ── Depth too shallow for door hinges (Sprint 75) ──
  issues.push(...checkDoorDepth(config));

  // ── Vendor hinge profile compatibility (Phase 13 / Sprint 2) ──
  issues.push(...checkVendorHingeProfile(config, dims, t));

  // ── Joinery constraint checks (Phase 12 / Sprint 12) ──
  issues.push(...checkJoineryConstraints(config, t));

  // ── Phase 12 / Sprint 9 — Custom rules from the registry ────────────────
  const _backMat = safeGetMaterial(config.backPanelMaterial ?? '', extraMaterials);
  const ctx: ValidationContext = { dims, mat: mat ?? undefined, backMat: _backMat ?? undefined };
  for (const rule of _customRules) {
    if (rule.furnitureTypes && !rule.furnitureTypes.includes(config.furnitureType)) continue;
    issues.push(...rule.check(config, ctx));
  }

  // Sort: errors → warnings → info
  const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return issues;
}

/** Safe wrapper so validation never throws on unknown materials. */
function safeGetMaterial(key: string, extraMaterials?: Parameters<typeof getMaterial>[1]) {
  try {
    return getMaterial(key, extraMaterials);
  } catch {
    return null;
  }
}