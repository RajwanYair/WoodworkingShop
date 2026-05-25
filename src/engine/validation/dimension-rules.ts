import type { CabinetConfig, ValidationIssue } from '../types';
import { getMaterial } from '../materials.ts';

// ── Structural and manufacturing constraint constants ────────────────────────

/**
 * Width threshold above which a single-bay carcass may need an intermediate
 * vertical divider or full-height stretcher for racking resistance.
 */
const WIDE_SPAN_CARCASS_MM = 1200;

/**
 * Height threshold above which a freestanding carcass requires a dedicated
 * anti-tip wall anchor or floor-to-ceiling fixing cleat.
 */
const CRITICAL_HEIGHT_MM = 2400;

/**
 * Dado joints must be at least 1/3 of the panel thickness deep to achieve
 * structural strength; shallower dados pull out under load.
 */
const MIN_DADO_DEPTH_FRACTION = 1 / 3;

/**
 * Standard soft-close side-mount drawer runners (e.g. Blum Tandem) require
 * at least 12 mm of clearance on each side of the drawer box.
 */
const MIN_RUNNER_SIDE_CLEARANCE_MM = 12;

/**
 * Minimum rebate depth for a back panel (mm). Shallower rebates allow the
 * back panel to rattle and can pop out under racking loads.
 */
const MIN_BACK_REBATE_DEPTH_MM = 8;

/** Below this width, an open-back carcass has poor diagonal racking resistance. */
const NARROW_OPEN_BACK_MM = 400;

// ── Dimension / structural rule functions ────────────────────────────────────

/**
 * Structural, manufacturing, and dimensional constraint checks that operate on
 * the whole cabinet shape (independent of door or shelf geometry).
 *
 * Covers: span/height limits, back-panel racking, assembly risk,
 * manufacturing constraints (dado depth, runner clearance, back rebate),
 * Sprint 56 proportion rules, and back-panel oversized check.
 */
export function checkDimensionRules(
  config: CabinetConfig,
  t: number,
  extraMaterials?: Parameters<typeof getMaterial>[1],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // ── Wide-span and tall-cabinet structural checks (Sprint 17) ──

  if (config.width > WIDE_SPAN_CARCASS_MM && config.furnitureType !== 'panel') {
    issues.push({
      code: 'SPAN_TOO_WIDE',
      severity: 'warning',
      message: {
        en: `Cabinet width (${config.width} mm) exceeds ${WIDE_SPAN_CARCASS_MM} mm. A single-bay carcass this wide may rack under load — consider adding an intermediate vertical divider or full-height stretcher.`,
        he: `רוחב הארון (${config.width} מ"מ) עולה על ${WIDE_SPAN_CARCASS_MM} מ"מ. תא בודד ברוחב זה עלול לאבד יציבות — שקול הוספת מחיצה אנכית או תמיכת-גובה.`,
      },
      field: 'width',
      fix: {
        patch: {
          shelfCentreSupports: Math.min(
            5,
            Math.max((config.shelfCentreSupports ?? 0) + 1, Math.ceil(config.width / WIDE_SPAN_CARCASS_MM) - 1),
          ),
        },
        labelKey: 'validation.fixAddCentreSupport',
      },
    });
  }

  if (config.height > CRITICAL_HEIGHT_MM && config.furnitureType !== 'panel') {
    issues.push({
      code: 'CARCASS_HEIGHT_CRITICAL',
      severity: 'warning',
      message: {
        en: `Cabinet height (${config.height} mm) exceeds ${CRITICAL_HEIGHT_MM} mm. A freestanding unit this tall has a high tip-over risk — a wall anchor or floor-to-ceiling fixing cleat is required.`,
        he: `גובה הארון (${config.height} מ"מ) עולה על ${CRITICAL_HEIGHT_MM} מ"מ. יחידה עצמאית בגובה זה מסוכנת להתהפכות — נדרש עוגן קיר או פס קיבוע רצפה-תקרה.`,
      },
      field: 'height',
      suggestedValue: CRITICAL_HEIGHT_MM,
    });
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
      fix: { patch: { hasBack: true }, labelKey: 'validation.fixEnableBack' },
    });
  }

  // ── Assembly-risk: tall open carcass without intermediate shelf ──

  if (config.height > 1200 && config.shelfCount === 0 && config.drawerCount === 0 && config.furnitureType !== 'panel') {
    issues.push({
      code: 'TALL_CARCASS_NO_SHELF',
      severity: 'warning',
      message: {
        en: `Carcass height (${config.height} mm) exceeds 1 200 mm with no shelves or drawers. Without an intermediate horizontal element the carcass has poor racking resistance. Add at least one fixed shelf or a horizontal stretcher.`,
        he: `גובה הכיסא (${config.height} מ"מ) עולה על 1200 מ"מ ללא מדפים או מגירות. ללא אלמנט אופקי ביניים החיבור עמיד בפני עיוות אנכי. הוסף לפחות מדף אחד קבוע.`,
      },
      field: 'shelfCount',
      suggestedValue: 1,
    });
  }

  // ── Manufacturing constraints (Phase 5, Sprint 7) ──

  const dadoDepth = t * MIN_DADO_DEPTH_FRACTION;
  if (config.shelfCount > 0 && dadoDepth < 5) {
    issues.push({
      code: 'DADO_DEPTH_TOO_SHALLOW',
      severity: 'warning',
      message: {
        en: `Panel thickness (${t} mm) is too thin for adequate shelf dado joints. A 1/3-depth dado would be only ${dadoDepth.toFixed(1)} mm — not enough to resist pullout. Use ≥ 15 mm panels for fixed shelves.`,
        he: `עובי הלוח (${t} מ"מ) דק מדי לחריצי מדף יציבים. חריץ עומק 1/3 יהיה רק ${dadoDepth.toFixed(1)} מ"מ — לא מספיק לחוזק. השתמש בלוחות ≥ 15 מ"מ למדפים קבועים.`,
      },
      field: 'carcassMaterial',
      fix: { patch: { carcassMaterial: 'plywood-18' }, labelKey: 'validation.fixUsePlywood18' },
    });
  }

  if (config.drawerCount > 0) {
    const runnerClearanceNeeded = 2 * MIN_RUNNER_SIDE_CLEARANCE_MM;
    const internalWidth = config.width - 2 * t;
    if (internalWidth < runnerClearanceNeeded + 150) {
      issues.push({
        code: 'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT',
        severity: 'warning',
        message: {
          en: `Interior width (${Math.round(internalWidth)} mm) may be too narrow for standard side-mount drawer runners, which need ${runnerClearanceNeeded} mm total clearance plus a minimum drawer box width. Minimum interior width for runners: ${runnerClearanceNeeded + 150} mm.`,
          he: `הרוחב הפנימי (${Math.round(internalWidth)} מ"מ) עלול להיות צר מדי למנגנוני מגירה צדדיים הדורשים ${runnerClearanceNeeded} מ"מ פינוי. רוחב פנימי מינימלי: ${runnerClearanceNeeded + 150} מ"מ.`,
        },
        field: 'width',
        suggestedValue: runnerClearanceNeeded + 150 + 2 * t,
      });
    }
  }

  if (config.hasBack !== false && t / 2 < MIN_BACK_REBATE_DEPTH_MM) {
    issues.push({
      code: 'BACK_REBATE_TOO_SHALLOW',
      severity: 'info',
      message: {
        en: `Panel thickness (${t} mm) is thin enough that a standard half-depth back rebate would be only ${(t / 2).toFixed(1)} mm — below the recommended ${MIN_BACK_REBATE_DEPTH_MM} mm minimum. Consider increasing panel thickness or using a face-frame attachment instead.`,
        he: `עובי הלוח (${t} מ"מ) גורם לחריץ גב בעומק חצי להיות רק ${(t / 2).toFixed(1)} מ"מ — מתחת למינימום המומלץ ${MIN_BACK_REBATE_DEPTH_MM} מ"מ. שקול הגדלת עובי או שיטת חיבור אחרת לגב.`,
      },
      field: 'carcassMaterial',
      fix: { patch: { carcassMaterial: 'plywood-18' }, labelKey: 'validation.fixUsePlywood18' },
    });
  }

  // ── Narrow open-back cabinet (Phase 5, Sprint 34) ──

  if (config.hasBack === false && config.width < NARROW_OPEN_BACK_MM && config.furnitureType !== 'panel') {
    issues.push({
      code: 'NARROW_BACK_OMITTED',
      severity: 'warning',
      message: {
        en: `Narrow cabinet (${config.width} mm wide) without a back panel has poor racking resistance. Add a back panel or fix the carcass to a wall stud to prevent racking.`,
        he: `ארון צר (${config.width} מ"מ רוחב) ללא פנל גב עמיד בפני עיוות ירוד. הוסף פנל גב או קבע את הארון לקיר.`,
      },
      field: 'hasBack',
      fix: { patch: { hasBack: true }, labelKey: 'validation.fixEnableBack' },
    });
  }

  // ── Sprint 56: proportion and back-panel checks ──

  if (config.depth > config.width && config.furnitureType !== 'panel') {
    issues.push({
      code: 'DEPTH_EXCEEDS_WIDTH',
      severity: 'warning',
      message: {
        en: `Cabinet depth (${config.depth} mm) exceeds width (${config.width} mm). This unusual proportion may indicate a measurement error and increases tip-over risk for tall units.`,
        he: `עומק הארון (${config.depth} מ"מ) גדול מרוחבו (${config.width} מ"מ). פרופורציה לא שגרתית זו עלולה להצביע על שגיאת מידה וליצור סיכון התהפכות ביחידות גבוהות.`,
      },
      field: 'depth',
      suggestedValue: config.width,
    });
  }

  // ── Back panel oversized (Sprint 69) ──

  if (config.hasBack !== false) {
    let backMat: ReturnType<typeof getMaterial> | null = null;
    try {
      backMat = getMaterial(config.backPanelMaterial ?? '', extraMaterials);
    } catch {
      // backMat stays null — material not found
    }
    if (backMat && backMat.thickness > 9) {
      issues.push({
        code: 'BACK_PANEL_OVERSIZED',
        severity: 'info',
        message: {
          en: `Back panel material "${backMat.name}" is ${backMat.thickness} mm thick. Consider a thin 4–6 mm HDF sheet to save weight and cost.`,
          he: `חומר הגב "${backMat.name}" עבה ${backMat.thickness} מ"מ. שקול לוח HDF דק של 4–6 מ"מ לחיסכון במשקל ובעלות.`,
        },
        field: 'backPanelMaterial',
      });
    }
  }

  return issues;
}
