import type { CabinetConfig, ValidationIssue } from './types';
import { getMaterial } from './materials';
import { computeDimensions } from './dimensions';

/**
 * Minimum door panel width to avoid warping or binding on hinges (mm).
 * Below this limit, door installation becomes unreliable.
 */
const MIN_DOOR_WIDTH_MM = 200;

/**
 * Maximum door height-to-width aspect ratio before warp risk becomes significant
 * (taller-than-wide is fine; > 4:1 becomes problematic in solid-wood panels).
 */
const MAX_DOOR_ASPECT_RATIO = 5;

/**
 * Minimum shelf clearance (mm) between adjacent shelves or between a shelf
 * and the bottom/top of the carcass interior. Less than this makes items
 * impossible to retrieve without removing the shelf.
 */
const MIN_SHELF_CLEARANCE_MM = 60;

/**
 * Maximum fraction of cabinet height the toe-kick can occupy.
 * A kick > 50% of height looks wrong and wastes usable space.
 */
const MAX_KICK_FRACTION = 0.5;

/**
 * Shelf span beyond which deflection under typical load (40 kg/m) almost
 * certainly exceeds L/360 for chipboard/MDF, even at 18 mm. We flag this
 * as a structural warning regardless of the material's individual modulus
 * calculation, because our elastic-modulus table only covers known materials.
 */
const SAFE_SPAN_CHIPBOARD_MM = 900;

/**
 * Minimum door width for reliable Euro-style hinge cup mounting.
 * A 35 mm hinge cup needs ~32 mm from the edge; less than this makes
 * boring too close to the edge and risks splitting the door panel.
 */
const MIN_HINGE_OVERLAY_WIDTH_MM = 300;

/**
 * Maximum practical height for a single door leaf without heavy-duty hinges.
 * Above this threshold, door mass and leverage cause rapid wear on standard hinges.
 */
const MAX_SINGLE_DOOR_HEIGHT_MM = 2200;

/**
 * Maximum width for a single-door cabinet before warping/sagging risk becomes
 * significant. Wide doors need a thicker panel or an intermediate rail.
 */
const MAX_SINGLE_DOOR_WIDTH_MM = 800;

/**
 * Minimum door height for a sensible two-hinge layout.
 * Below this, hinge spacing becomes impractical (<50 mm from each end).
 */
const MIN_PRACTICAL_DOOR_HEIGHT_MM = 200;

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
  const dims = computeDimensions(config);

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

  if (config.doorStyle !== 'none') {
    if (dims.doorWidth < MIN_DOOR_WIDTH_MM) {
      issues.push({
        code: 'DOOR_TOO_NARROW',
        severity: 'error',
        message: {
          en: `Calculated door width (${Math.round(dims.doorWidth)} mm) is below the minimum of ${MIN_DOOR_WIDTH_MM} mm. Increase cabinet width or reduce door reveal.`,
          he: `רוחב הדלת המחושב (${Math.round(dims.doorWidth)} מ"מ) קטן מהמינימום (${MIN_DOOR_WIDTH_MM} מ"מ). הגדל את רוחב הארון או הפחת את הסף.`,
        },
        field: 'doorCount',
      });
    }

    if (dims.doorHeight > 0 && dims.doorWidth > 0) {
      const ratio = dims.doorHeight / dims.doorWidth;
      if (ratio > MAX_DOOR_ASPECT_RATIO) {
        issues.push({
          code: 'DOOR_ASPECT_RATIO',
          severity: 'warning',
          message: {
            en: `Door aspect ratio ${ratio.toFixed(1)}:1 (height:width) exceeds ${MAX_DOOR_ASPECT_RATIO}:1. Tall narrow doors are prone to warping — consider adding a centre rail or using a stiffer material.`,
            he: `יחס גובה-רוחב הדלת ${ratio.toFixed(1)}:1 חורג מ-${MAX_DOOR_ASPECT_RATIO}:1. דלתות גבוהות וצרות עלולות להתעוות — שקול הוספת פסת ביניים או חומר קשיח יותר.`,
          },
          field: 'doorCount',
        });
      }
    }

    // ── Hinge clearance checks (Sprint 12) ──

    if (dims.doorWidth < MIN_HINGE_OVERLAY_WIDTH_MM) {
      issues.push({
        code: 'HINGE_CLEARANCE_INSUFFICIENT',
        severity: 'warning',
        message: {
          en: `Door width (${Math.round(dims.doorWidth)} mm) is below ${MIN_HINGE_OVERLAY_WIDTH_MM} mm. Standard 35 mm Euro-hinge cups require at least ${MIN_HINGE_OVERLAY_WIDTH_MM} mm for reliable boring without splitting the door panel.`,
          he: `רוחב הדלת (${Math.round(dims.doorWidth)} מ"מ) קטן מ-${MIN_HINGE_OVERLAY_WIDTH_MM} מ"מ. צירי Euro בקוטר 35 מ"מ דורשים לפחות ${MIN_HINGE_OVERLAY_WIDTH_MM} מ"מ לקידוח בטוח ללא סיכון לפיצול.`,
        },
        field: 'doorCount',
      });
    }

    if (dims.doorHeight < MIN_PRACTICAL_DOOR_HEIGHT_MM) {
      issues.push({
        code: 'DOOR_TOO_SHORT_FOR_HINGES',
        severity: 'warning',
        message: {
          en: `Door height (${Math.round(dims.doorHeight)} mm) is below ${MIN_PRACTICAL_DOOR_HEIGHT_MM} mm. At this size, two-hinge spacing leaves insufficient clearance from the door edges.`,
          he: `גובה הדלת (${Math.round(dims.doorHeight)} מ"מ) קטן מ-${MIN_PRACTICAL_DOOR_HEIGHT_MM} מ"מ. במידה זו, מרווח שני הצירים קצר מדי מקצות הדלת.`,
        },
        field: 'height',
      });
    }

    if (dims.doorHeight > MAX_SINGLE_DOOR_HEIGHT_MM) {
      issues.push({
        code: 'DOOR_EXCEEDS_STANDARD_HINGE_RATING',
        severity: 'warning',
        message: {
          en: `Door height (${Math.round(dims.doorHeight)} mm) exceeds ${MAX_SINGLE_DOOR_HEIGHT_MM} mm. At this size the door panel is heavy enough to require heavy-duty hinges (e.g. Blum Clip Top 170°) rated for ≥ 25 kg per door.`,
          he: `גובה הדלת (${Math.round(dims.doorHeight)} מ"מ) עולה על ${MAX_SINGLE_DOOR_HEIGHT_MM} מ"מ. במשקל זה נדרשים צירים כבדי עומס (לדוגמה Blum Clip Top 170°) לפחות 25 ק"ג לדלת.`,
        },
        field: 'height',
      });
    }

    if (config.doorCount === 1 && dims.doorWidth > MAX_SINGLE_DOOR_WIDTH_MM) {
      issues.push({
        code: 'WIDE_SINGLE_DOOR',
        severity: 'warning',
        message: {
          en: `Single door width (${Math.round(dims.doorWidth)} mm) exceeds ${MAX_SINGLE_DOOR_WIDTH_MM} mm. Wide single-panel doors are prone to warping under humidity changes — consider two doors or a thicker door material.`,
          he: `רוחב דלת בודדת (${Math.round(dims.doorWidth)} מ"מ) עולה על ${MAX_SINGLE_DOOR_WIDTH_MM} מ"מ. דלתות רחבות עלולות להתעוות עקב שינויי לחות — שקול שתי דלתות או חומר עבה יותר.`,
        },
        field: 'doorCount',
        suggestedValue: 2,
      });
    }
  }

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
      });
    }
  }

  // ── Shelf spacing / clearance checks ──

  if (config.shelfCount > 0) {
    const availableH = dims.internalHeight;
    const clearancePerSlot = availableH / (config.shelfCount + 1);

    if (clearancePerSlot < MIN_SHELF_CLEARANCE_MM) {
      issues.push({
        code: 'SHELF_CLEARANCE_TOO_SMALL',
        severity: 'warning',
        message: {
          en: `Average shelf clearance (${Math.round(clearancePerSlot)} mm) is below ${MIN_SHELF_CLEARANCE_MM} mm. Items will be hard to access. Reduce shelf count or increase cabinet height.`,
          he: `מרווח ממוצע בין מדפים (${Math.round(clearancePerSlot)} מ"מ) פחות מ-${MIN_SHELF_CLEARANCE_MM} מ"מ. הפחת מדפים או הגדל גובה.`,
        },
        field: 'shelfCount',
        suggestedValue: Math.floor(availableH / MIN_SHELF_CLEARANCE_MM) - 1,
      });
    }

    // Deflection warnings — escalate the span issue from per-shelf to config level
    const dangerCount = dims.shelfDeflections.filter((d) => d.deflectionRating === 'danger').length;
    const warnCount = dims.shelfDeflections.filter((d) => d.deflectionRating === 'warning').length;

    if (dangerCount > 0) {
      issues.push({
        code: 'SHELF_DEFLECTION_DANGER',
        severity: 'error',
        message: {
          en: `${dangerCount} shelf${dangerCount > 1 ? 's' : ''} exceed${dangerCount === 1 ? 's' : ''} the L/240 deflection limit under typical load. Add centre supports, use a stiffer material (e.g. plywood instead of MDF), or increase thickness.`,
          he: `${dangerCount} מדף/ים חורגים ממגבלת הכפיפה L/240 תחת עומס טיפוסי. הוסף תמיכות אמצע, עבור לחומר קשיח יותר, או הגדל עובי.`,
        },
        field: 'shelfCount',
      });
    } else if (warnCount > 0) {
      issues.push({
        code: 'SHELF_DEFLECTION_WARNING',
        severity: 'warning',
        message: {
          en: `${warnCount} shelf${warnCount > 1 ? 's' : ''} exceed${warnCount === 1 ? 's' : ''} the L/360 deflection guideline. Consider adding a centre support or switching to plywood.`,
          he: `${warnCount} מדף/ים חורגים מהמלצת הכפיפה L/360. שקול הוספת תמיכת אמצע או מעבר לדיקט.`,
        },
        field: 'shelfCount',
      });
    } else if (
      dims.shelfWidth > SAFE_SPAN_CHIPBOARD_MM &&
      mat &&
      ['chipboard-16', 'chipboard-18', 'mdf-16', 'mdf-18'].includes(mat.key)
    ) {
      issues.push({
        code: 'SHELF_SPAN_CHIPBOARD',
        severity: 'warning',
        message: {
          en: `Shelf span ${Math.round(dims.shelfWidth)} mm with ${mat.name.en} may deflect visibly over time under load. Consider plywood or a centre support.`,
          he: `ספן מדף ${Math.round(dims.shelfWidth)} מ"מ עם ${mat.name.he} עלול להתכופף עם הזמן. שקול דיקט או תמיכת אמצע.`,
        },
        field: 'carcassMaterial',
      });
    }
  }

  // ── Structural back panel warning ──

  if (!config.hasBack && config.height > 1200 && config.furnitureType !== 'panel') {
    issues.push({
      code: 'NO_BACK_TALL_CABINET',
      severity: 'warning',
      message: {
        en: `Cabinet without back panel at ${config.height} mm height may lack sufficient racking resistance. Consider adding a back panel or wall-fixing cleats.`,
        he: `ארון ללא פנל גב בגובה ${config.height} מ"מ עלול לחסר יציבות. שקול הוספת גב או פסי קיבוע לקיר.`,
      },
      field: 'hasBack',
      suggestedValue: 'true',
    });
  }

  // Sort: errors → warnings → info
  const order: Record<string, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return issues;
}

/** Safe wrapper so validation never throws on unknown materials. */
function safeGetMaterial(
  key: string,
  extraMaterials?: Parameters<typeof getMaterial>[1],
) {
  try {
    return getMaterial(key, extraMaterials);
  } catch {
    return null;
  }
}
