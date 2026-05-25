import type { CabinetConfig, ValidationIssue } from '../types';
import { computeDimensions } from '../dimensions';
import { getMaterial } from '../materials.ts';

// ── Shelf and joinery constraint constants ───────────────────────────────────

/**
 * Minimum shelf clearance (mm) between adjacent shelves or between a shelf
 * and the bottom/top of the carcass interior.
 */
const MIN_SHELF_CLEARANCE_MM = 60;

/**
 * Minimum practical load capacity per shelf (kg) at the L/360 deflection limit.
 */
const MIN_SHELF_LOAD_KG = 15;

/**
 * Shelf span beyond which deflection under typical load (40 kg/m) almost
 * certainly exceeds L/360 for chipboard/MDF, even at 18 mm.
 */
const SAFE_SPAN_CHIPBOARD_MM = 900;

/** Shelf span upper limit for joinery-max-span checks (Sprint 45). */
const JOINERY_SPAN_LIMIT_MM = 900;

/** Adjacent shelf pin spacing minimum for reliable boring (Sprint 45). */
const JOINERY_MIN_SHELF_GAP_MM = 150;

/** Materials that are considered weak-core for span checks. */
const WEAK_CORE_MATERIALS = ['chipboard-16', 'chipboard-18', 'mdf-16', 'mdf-18', 'melamine-16', 'melamine-18'];

/** Minimum panel thickness (mm) for safe 5 mm shelf-pin bores (Sprint 83). */
const MIN_SHELF_PIN_THICKNESS_MM = 12;

/** Pocket-screw joinery minimum thickness (Sprint 12). */
const MIN_POCKET_SCREW_THICKNESS_MM = 15;

/** Dado/housing groove minimum thickness (Sprint 12). */
const MIN_DADO_THICKNESS_MM = 12;

/** Dowel joinery minimum thickness (Sprint 12). */
const MIN_DOWEL_THICKNESS_MM = 12;

/** Biscuit/plate joinery minimum thickness (Sprint 12). */
const MIN_BISCUIT_THICKNESS_MM = 12;

/** Biscuit joinery minimum face width for a #0 slot (Sprint 12). */
const MIN_BISCUIT_FACE_WIDTH_MM = 50;

// ── Shelf rule functions ─────────────────────────────────────────────────────

/**
 * Shelf clearance, deflection, joinery span, shelf-pin thickness, and wardrobe
 * completeness checks.  Requires the derived dimensions and computed material.
 */
export function checkShelfRules(
  config: CabinetConfig,
  dims: ReturnType<typeof computeDimensions>,
  mat: ReturnType<typeof getMaterial> | null,
  t: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

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

    const dangerCount = dims.shelfDeflections.filter((d) => d.deflectionRating === 'danger').length;
    const warnCount = dims.shelfDeflections.filter((d) => d.deflectionRating === 'warning').length;

    const currentSupports = Math.max(0, config.shelfCentreSupports ?? 0);
    const supportsNeededForSafeSpan = Math.max(1, Math.ceil(dims.shelfWidth / SAFE_SPAN_CHIPBOARD_MM)) - 1;
    const recommendedCentreSupports = Math.min(5, Math.max(currentSupports + 1, supportsNeededForSafeSpan));

    if (dangerCount > 0) {
      issues.push({
        code: 'SHELF_DEFLECTION_DANGER',
        severity: 'error',
        message: {
          en: `${dangerCount} shelf${dangerCount > 1 ? 's' : ''} exceed${dangerCount === 1 ? 's' : ''} the L/240 deflection limit under typical load. Add centre supports, use a stiffer material (e.g. plywood instead of MDF), or increase thickness.`,
          he: `${dangerCount} מדף/ים חורגים ממגבלת הכפיפה L/240 תחת עומס טיפוסי. הוסף תמיכות אמצע, עבור לחומר קשיח יותר, או הגדל עובי.`,
        },
        field: 'shelfCount',
        fix: { patch: { shelfCentreSupports: recommendedCentreSupports }, labelKey: 'validation.fixAddCentreSupport' },
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
        fix: { patch: { shelfCentreSupports: recommendedCentreSupports }, labelKey: 'validation.fixAddCentreSupport' },
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
        fix: { patch: { shelfCentreSupports: recommendedCentreSupports }, labelKey: 'validation.fixAddCentreSupport' },
      });
    }
  }

  // ── Shelf max safe load capacity (Sprint 8) ──

  if (config.shelfCount > 0 && dims.shelfDeflections.length > 0) {
    const { maxLoadKg } = dims.shelfDeflections[0];
    if (maxLoadKg < MIN_SHELF_LOAD_KG) {
      const curCs = Math.max(0, config.shelfCentreSupports ?? 0);
      const needCs = Math.min(5, Math.max(curCs + 1, Math.ceil(dims.shelfWidth / SAFE_SPAN_CHIPBOARD_MM) - 1));
      issues.push({
        code: 'SHELF_LOAD_CAPACITY_LOW',
        severity: 'warning',
        message: {
          en: `Maximum safe shelf load is only ~${maxLoadKg} kg (L/360 limit). Reduce span, increase panel thickness, or add a centre support to achieve at least ${MIN_SHELF_LOAD_KG} kg per shelf.`,
          he: `עומס מדף בטוח מרבי הוא ~${maxLoadKg} ק"ג (מגבלת L/360). הקטן ספן, הגדל עובי הלוח, או הוסף תמיכת אמצע כדי לשאת לפחות ${MIN_SHELF_LOAD_KG} ק"ג למדף.`,
        },
        field: 'shelfCount',
        fix: { patch: { shelfCentreSupports: needCs }, labelKey: 'validation.fixAddCentreSupport' },
      });
    }
  }

  // ── Joinery rules (Sprint 45) ──

  if (
    config.shelfCount > 0 &&
    dims.shelfWidth > JOINERY_SPAN_LIMIT_MM &&
    mat &&
    WEAK_CORE_MATERIALS.includes(mat.key)
  ) {
    const cur = Math.max(0, config.shelfCentreSupports ?? 0);
    const need = Math.max(1, Math.ceil(dims.shelfWidth / JOINERY_SPAN_LIMIT_MM) - 1);
    issues.push({
      code: 'JOINERY_MAX_SPAN',
      severity: 'warning',
      message: {
        en: `Shelf span ${Math.round(dims.shelfWidth)} mm exceeds the ${JOINERY_SPAN_LIMIT_MM} mm joinery limit for ${mat.name.en}. Add a centre support or use a stronger panel material (e.g. plywood or solid-wood edging).`,
        he: `ספן מדף ${Math.round(dims.shelfWidth)} מ"מ חורג ממגבלת חיבורי הנגרות ${JOINERY_SPAN_LIMIT_MM} מ"מ עבור ${mat.name.he}. הוסף תמיכת אמצע או עבור לחומר חזק יותר.`,
      },
      field: 'shelfCount',
      fix: {
        patch: { shelfCentreSupports: Math.min(5, Math.max(cur + 1, need)) },
        labelKey: 'validation.fixAddCentreSupport',
      },
    });
  }

  if (config.shelfCount >= 2) {
    const gapPerSlot = dims.internalHeight / (config.shelfCount + 1);
    if (gapPerSlot < JOINERY_MIN_SHELF_GAP_MM) {
      issues.push({
        code: 'JOINERY_MIN_SHELF_GAP',
        severity: 'warning',
        message: {
          en: `Shelf pin spacing (${Math.round(gapPerSlot)} mm) is below the ${JOINERY_MIN_SHELF_GAP_MM} mm minimum for reliable shelf-pin drilling. Reduce shelf count or increase cabinet height.`,
          he: `מרווח סיכות המדף (${Math.round(gapPerSlot)} מ"מ) פחות מהמינימום ${JOINERY_MIN_SHELF_GAP_MM} מ"מ לקדיחת סיכות מדף אמינה. הפחת מדפים או הגדל גובה.`,
        },
        field: 'shelfCount',
        suggestedValue: Math.floor(dims.internalHeight / JOINERY_MIN_SHELF_GAP_MM) - 1,
      });
    }
  }

  // ── Panel too thin for shelf pins (Sprint 83) ──

  if (config.shelfCount > 0 && t < MIN_SHELF_PIN_THICKNESS_MM) {
    issues.push({
      code: 'PANEL_TOO_THIN_FOR_SHELF_PINS',
      severity: 'info',
      message: {
        en: `Panel thickness (${t} mm) is very thin for 5 mm shelf-pin bores — the hole is within 3–4 mm of the panel face, which can split veneered or laminated surfaces under load. Use panels ≥ ${MIN_SHELF_PIN_THICKNESS_MM} mm for pin-mounted shelves, or use fixed dado shelves instead.`,
        he: `עובי הלוח (${t} מ"מ) דק מדי לקידוחי סיכות מדף 5 מ"מ — הקדח נמצא 3–4 מ"מ מפני הלוח בלבד, דבר העלול לגרום לסדיקה בקניר או בציפוי. השתמש בלוחות ≥ ${MIN_SHELF_PIN_THICKNESS_MM} מ"מ למדפים ניידים, או בחר מדפים קבועים בחריץ.`,
      },
      field: 'carcassMaterial',
      fix: { patch: { carcassMaterial: 'plywood-18' }, labelKey: 'validation.fixUsePlywood18' },
    });
  }

  // ── Wardrobe with no shelves or drawers (Sprint 88) ──

  if (config.furnitureType === 'wardrobe' && config.shelfCount === 0 && config.drawerCount === 0) {
    issues.push({
      code: 'SHELF_COUNT_WARDROBE_BARE',
      severity: 'info',
      message: {
        en: 'Wardrobe with no shelves or drawers provides no organised storage. Add at least one shelf for usable interior space.',
        he: 'ארון ללא מדפים או מגירות לא מספק אחסון מסודר. הוסף לפחות מדף אחד לשטח פנים שמיש.',
      },
      field: 'shelfCount',
      suggestedValue: 1,
    });
  }

  return issues;
}

/**
 * Joinery type compatibility checks against panel thickness and width
 * (Phase 12 / Sprint 12).
 */
export function checkJoineryConstraints(config: CabinetConfig, t: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const joinery = config.joineryType ?? 'screw';

  if (joinery === 'pocket-screw' && t < MIN_POCKET_SCREW_THICKNESS_MM) {
    issues.push({
      code: 'JOINERY_POCKET_SCREW_TOO_THIN',
      severity: 'error',
      message: {
        en: `Pocket-screw joinery requires panel thickness ≥ ${MIN_POCKET_SCREW_THICKNESS_MM} mm (current: ${t} mm). Increase material thickness or switch joinery type.`,
        he: `חיבור בברגי כיס דורש עובי לוח ≥ ${MIN_POCKET_SCREW_THICKNESS_MM} מ"מ (נוכחי: ${t} מ"מ). הגדל עובי חומר או שנה סוג חיבור.`,
      },
      field: 'carcassMaterial',
      fix: { patch: { joineryType: 'screw' }, labelKey: 'validation.fixSwitchJoinery' },
    });
  }

  if (joinery === 'dado' && t < MIN_DADO_THICKNESS_MM) {
    issues.push({
      code: 'JOINERY_DADO_TOO_THIN',
      severity: 'error',
      message: {
        en: `Dado-groove joinery requires panel thickness ≥ ${MIN_DADO_THICKNESS_MM} mm (current: ${t} mm). A shallow dado in thin stock pulls out under load.`,
        he: `חיבור בחריץ דדו דורש עובי לוח ≥ ${MIN_DADO_THICKNESS_MM} מ"מ (נוכחי: ${t} מ"מ). חריץ רדוד בחומר דק נשלף בעומס.`,
      },
      field: 'carcassMaterial',
      fix: { patch: { joineryType: 'screw' }, labelKey: 'validation.fixSwitchJoinery' },
    });
  }

  if (joinery === 'dowel' && t < MIN_DOWEL_THICKNESS_MM) {
    issues.push({
      code: 'JOINERY_DOWEL_TOO_THIN',
      severity: 'warning',
      message: {
        en: `Dowel joinery is marginal at ${t} mm — minimum ${MIN_DOWEL_THICKNESS_MM} mm is needed for adequate wall coverage around a 6 mm dowel.`,
        he: `חיבור בסיכות עץ בעובי ${t} מ"מ הוא גבולי — נדרשים לפחות ${MIN_DOWEL_THICKNESS_MM} מ"מ לכיסוי מספיק סביב סיכה 6 מ"מ.`,
      },
      field: 'carcassMaterial',
      fix: { patch: { joineryType: 'screw' }, labelKey: 'validation.fixSwitchJoinery' },
    });
  }

  if (joinery === 'biscuit' && t < MIN_BISCUIT_THICKNESS_MM) {
    issues.push({
      code: 'JOINERY_BISCUIT_TOO_THIN',
      severity: 'error',
      message: {
        en: `Biscuit joinery requires panel thickness ≥ ${MIN_BISCUIT_THICKNESS_MM} mm (current: ${t} mm). Even the smallest #0 biscuit slot will break through thin stock.`,
        he: `חיבור בביסקוויטים דורש עובי לוח ≥ ${MIN_BISCUIT_THICKNESS_MM} מ"מ (נוכחי: ${t} מ"מ). חריץ ביסקוויט #0 יחדור דרך חומר דק.`,
      },
      field: 'carcassMaterial',
      fix: { patch: { joineryType: 'screw' }, labelKey: 'validation.fixSwitchJoinery' },
    });
  }

  if (joinery === 'biscuit' && config.width > 0 && config.width < MIN_BISCUIT_FACE_WIDTH_MM) {
    issues.push({
      code: 'JOINERY_BISCUIT_FACE_TOO_NARROW',
      severity: 'error',
      message: {
        en: `Biscuit joinery requires panel face width ≥ ${MIN_BISCUIT_FACE_WIDTH_MM} mm. Cabinet width (${config.width} mm) is too narrow for even a #0 biscuit slot.`,
        he: `חיבור בביסקוויטים דורש רוחב פנים לוח ≥ ${MIN_BISCUIT_FACE_WIDTH_MM} מ"מ. רוחב הארון (${config.width} מ"מ) צר מדי.`,
      },
      field: 'width',
      fix: { patch: { joineryType: 'screw' }, labelKey: 'validation.fixSwitchJoinery' },
    });
  }

  return issues;
}
