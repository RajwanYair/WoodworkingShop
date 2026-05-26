import type { CabinetConfig, ValidationIssue } from '../types';
import { computeDimensions } from '../dimensions';
import { VENDOR_HINGE_PROFILES } from '../hardware';

// ── Door geometry constants ──────────────────────────────────────────────────

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
 * Euro-style hinge cups require a minimum boring distance from the inner edge
 * of the door to the centre of the cup (typically 22.5 mm for a 35 mm cup).
 * If the door panel is too narrow for even one cup plus this clearance on each
 * side the cup boring is structurally unsafe.
 */
const MIN_HINGE_CUP_EDGE_DISTANCE_MM = 22;

/**
 * Minimum clearance (mm) between a hinge arm mounting point and the nearest
 * shelf panel.  The hinge arm projects ~30 mm into the carcass; a shelf within
 * this radius obstructs the arm and must be notched or repositioned.
 */
const HINGE_ARM_CLEARANCE_MM = 35;

/** Minimum cabinet depth for a door-hung carcass (Sprint 75). */
const MIN_DEPTH_FOR_DOORS_MM = 250;

/** mm of material that must remain behind the hinge cup bore. */
const MIN_WALL_BEHIND_CUP_MM = 2;

/** Hinges rated ≥ this opening angle (°) handle heavy tall doors reliably. */
const WIDE_ANGLE_THRESHOLD_DEG = 155;

// ── Door check functions ─────────────────────────────────────────────────────

/** All door geometry and hinge checks (skips early when doorStyle === 'none'). */
export function checkDoors(config: CabinetConfig, dims: ReturnType<typeof computeDimensions>): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  if (config.doorStyle === 'none') return out;

  if (dims.doorWidth < MIN_DOOR_WIDTH_MM) {
    out.push({
      code: 'DOOR_TOO_NARROW',
      severity: 'error',
      message: {
        en: `Calculated door width (${Math.round(dims.doorWidth)} mm) is below the minimum of ${MIN_DOOR_WIDTH_MM} mm. Increase cabinet width or reduce door reveal.`,
        he: `רוחב הדלת המחושב (${Math.round(dims.doorWidth)} מ"מ) קטן מהמינימום (${MIN_DOOR_WIDTH_MM} מ"מ). הגדל את רוחב הארון או הפחת את הסף.`,
      },
      field: 'doorCount',
      fix:
        config.doorCount > 1
          ? { patch: { doorCount: 1 }, labelKey: 'validation.fixMergeToOneDoor' }
          : { patch: { doorStyle: 'none' }, labelKey: 'validation.fixRemoveDoors' },
    });
  }

  if (dims.doorHeight > 0 && dims.doorWidth > 0) {
    const ratio = dims.doorHeight / dims.doorWidth;
    if (ratio > MAX_DOOR_ASPECT_RATIO) {
      out.push({
        code: 'DOOR_ASPECT_RATIO',
        severity: 'warning',
        message: {
          en: `Door aspect ratio ${ratio.toFixed(1)}:1 (height:width) exceeds ${MAX_DOOR_ASPECT_RATIO}:1. Tall narrow doors are prone to warping — consider adding a centre rail or using a stiffer material.`,
          he: `יחס גובה-רוחב הדלת ${ratio.toFixed(1)}:1 חורג מ-${MAX_DOOR_ASPECT_RATIO}:1. דלתות גבוהות וצרות עלולות להתעוות — שקול הוספת פסת ביניים או חומר קשיח יותר.`,
        },
        field: 'doorCount',
        fix: config.doorCount === 1 ? { patch: { doorCount: 2 }, labelKey: 'validation.fixSplitToDoors' } : undefined,
      });
    }
  }

  if (dims.doorWidth < MIN_HINGE_OVERLAY_WIDTH_MM) {
    out.push({
      code: 'HINGE_CLEARANCE_INSUFFICIENT',
      severity: 'warning',
      message: {
        en: `Door width (${Math.round(dims.doorWidth)} mm) is below ${MIN_HINGE_OVERLAY_WIDTH_MM} mm. Standard 35 mm Euro-hinge cups require at least ${MIN_HINGE_OVERLAY_WIDTH_MM} mm for reliable boring without splitting the door panel.`,
        he: `רוחב הדלת (${Math.round(dims.doorWidth)} מ"מ) קטן מ-${MIN_HINGE_OVERLAY_WIDTH_MM} מ"מ. צירי Euro בקוטר 35 מ"מ דורשים לפחות ${MIN_HINGE_OVERLAY_WIDTH_MM} מ"מ לקידוח בטוח ללא סיכון לפיצול.`,
      },
      field: 'doorCount',
      fix:
        config.doorCount > 1
          ? { patch: { doorCount: 1 }, labelKey: 'validation.fixMergeToOneDoor' }
          : { patch: { doorStyle: 'none' }, labelKey: 'validation.fixRemoveDoors' },
    });
  }

  if (dims.doorHeight < MIN_PRACTICAL_DOOR_HEIGHT_MM) {
    out.push({
      code: 'DOOR_TOO_SHORT_FOR_HINGES',
      severity: 'warning',
      message: {
        en: `Door height (${Math.round(dims.doorHeight)} mm) is below ${MIN_PRACTICAL_DOOR_HEIGHT_MM} mm. At this size, two-hinge spacing leaves insufficient clearance from the door edges.`,
        he: `גובה הדלת (${Math.round(dims.doorHeight)} מ"מ) קטן מ-${MIN_PRACTICAL_DOOR_HEIGHT_MM} מ"מ. במידה זו, מרווח שני הצירים קצר מדי מקצות הדלת.`,
      },
      field: 'height',
      suggestedValue: MIN_PRACTICAL_DOOR_HEIGHT_MM,
    });
  }

  if (dims.doorHeight > MAX_SINGLE_DOOR_HEIGHT_MM) {
    out.push({
      code: 'DOOR_EXCEEDS_STANDARD_HINGE_RATING',
      severity: 'warning',
      message: {
        en: `Door height (${Math.round(dims.doorHeight)} mm) exceeds ${MAX_SINGLE_DOOR_HEIGHT_MM} mm. At this size the door panel is heavy enough to require heavy-duty hinges (e.g. Blum Clip Top 170°) rated for ≥ 25 kg per door.`,
        he: `גובה הדלת (${Math.round(dims.doorHeight)} מ"מ) עולה על ${MAX_SINGLE_DOOR_HEIGHT_MM} מ"מ. במשקל זה נדרשים צירים כבדי עומס (לדוגמה Blum Clip Top 170°) לפחות 25 ק"ג לדלת.`,
      },
      field: 'height',
      fix: { patch: { hingeProfile: 'blum-clip-top-165' }, labelKey: 'validation.fixSwitchWideAngleHinge' },
    });
  }

  if (config.doorCount === 1 && dims.doorWidth > MAX_SINGLE_DOOR_WIDTH_MM) {
    out.push({
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

  if (dims.doorWidth < 2 * MIN_HINGE_CUP_EDGE_DISTANCE_MM) {
    out.push({
      code: 'HINGE_CUP_EDGE_DISTANCE_UNSAFE',
      severity: 'error',
      message: {
        en: `Door width (${Math.round(dims.doorWidth)} mm) is too narrow to safely bore 35 mm hinge cups. The minimum edge-to-cup-centre distance is ${MIN_HINGE_CUP_EDGE_DISTANCE_MM} mm, requiring a door width of at least ${2 * MIN_HINGE_CUP_EDGE_DISTANCE_MM} mm.`,
        he: `רוחב הדלת (${Math.round(dims.doorWidth)} מ"מ) צר מדי לקידוח ציר 35 מ"מ בבטחה. מרחק מינימלי מקצה לציר: ${MIN_HINGE_CUP_EDGE_DISTANCE_MM} מ"מ, דורש רוחב דלת ≥ ${2 * MIN_HINGE_CUP_EDGE_DISTANCE_MM} מ"מ.`,
      },
      field: 'doorCount',
      fix:
        config.doorCount > 1
          ? { patch: { doorCount: 1 }, labelKey: 'validation.fixMergeToOneDoor' }
          : { patch: { doorStyle: 'none' }, labelKey: 'validation.fixRemoveDoors' },
    });
  }

  return out;
}

/** Hinge arm / shelf clearance check — exported separately to keep checkDoors focused. */
export function checkHingeShelfInterference(
  config: CabinetConfig,
  dims: ReturnType<typeof computeDimensions>,
  t: number,
): ValidationIssue[] {
  if (config.doorStyle === 'none' || config.shelfCount === 0 || dims.hingePositions.length === 0) {
    return [];
  }
  const doorTopInsetMm = Math.max(0, t - config.doorReveal);
  const hingeArmsFromBottom = dims.hingePositions.map((pos) => dims.internalHeight - (pos - doorTopInsetMm));
  const shelfPositions: number[] =
    config.shelfSpacing === 'custom' && config.customShelfPositions.length === config.shelfCount
      ? config.customShelfPositions
      : Array.from({ length: config.shelfCount }, (_, i) =>
          Math.round((dims.internalHeight * (i + 1)) / (config.shelfCount + 1)),
        );

  for (const hPos of hingeArmsFromBottom) {
    for (const sPos of shelfPositions) {
      const gap = Math.abs(hPos - sPos);
      if (gap < HINGE_ARM_CLEARANCE_MM) {
        return [
          {
            code: 'HINGE_SHELF_INTERFERENCE',
            severity: 'warning',
            message: {
              en: `A hinge arm (~${Math.round(hPos)} mm from interior bottom) is within ${Math.round(gap)} mm of a shelf — less than the ${HINGE_ARM_CLEARANCE_MM} mm clearance needed to mount the hinge arm without notching the shelf. Adjust shelf count or spacing.`,
              he: `זרוע ציר (~${Math.round(hPos)} מ"מ מתחתית הפנים) נמצאת ב-${Math.round(gap)} מ"מ ממדף — פחות מ-${HINGE_ARM_CLEARANCE_MM} מ"מ הנדרש לקיבוע הזרוע ללא חיתוך המדף. התאם מספר מדפים או ריווחם.`,
            },
            field: 'shelfCount',
            fix:
              config.shelfCount > 1
                ? { patch: { shelfCount: config.shelfCount - 1 }, labelKey: 'validation.fixReduceShelves' }
                : { patch: { shelfCount: 0 }, labelKey: 'validation.fixRemoveShelves' },
          },
        ];
      }
    }
  }
  return [];
}

/** Depth-too-shallow-for-door-hinges check (Sprint 75). */
export function checkDoorDepth(config: CabinetConfig): ValidationIssue[] {
  if (config.doorStyle === 'none' || config.depth >= MIN_DEPTH_FOR_DOORS_MM) return [];
  return [
    {
      code: 'DEPTH_TOO_SHALLOW_FOR_DOORS',
      severity: 'warning',
      message: {
        en: `Cabinet depth (${config.depth} mm) may be too shallow for door hinges — ${MIN_DEPTH_FOR_DOORS_MM} mm minimum recommended.`,
        he: `עומק הארון (${config.depth} מ"מ) עשוי להיות רדוד מדי לצירי הדלת — מינימום ${MIN_DEPTH_FOR_DOORS_MM} מ"מ מומלץ.`,
      },
      field: 'depth',
      suggestedValue: MIN_DEPTH_FOR_DOORS_MM,
    },
  ];
}

/**
 * Vendor hinge profile compatibility checks (Phase 13 / Sprint 2).
 * Validates the selected hinge profile against door panel thickness and height.
 */
export function checkVendorHingeProfile(
  config: CabinetConfig,
  dims: ReturnType<typeof computeDimensions>,
  t: number,
): ValidationIssue[] {
  if (!config.hingeProfile || config.doorStyle === 'none') return [];
  const out: ValidationIssue[] = [];
  const hingeProf = VENDOR_HINGE_PROFILES.find((p) => p.id === config.hingeProfile);

  if (!hingeProf) {
    out.push({
      code: 'VENDOR_HINGE_PROFILE_UNKNOWN',
      severity: 'warning',
      message: {
        en: `Hinge profile id "${config.hingeProfile}" is not in the hardware catalog. Remove the profile or select a supported one.`,
        he: `מזהה פרופיל ציר "${config.hingeProfile}" אינו קיים בקטלוג החומרה. הסר את הפרופיל או בחר אחד נתמך.`,
      },
      field: 'hingeProfile',
      fix: { patch: { hingeProfile: undefined }, labelKey: 'validation.fixRemoveHingeProfile' },
    });
    return out;
  }

  const requiredThickness = hingeProf.mountingDepth + MIN_WALL_BEHIND_CUP_MM;
  if (t < requiredThickness) {
    out.push({
      code: 'VENDOR_HINGE_BORE_TOO_DEEP',
      severity: 'error',
      message: {
        en: `Hinge "${hingeProf.name.en}" needs a ${hingeProf.mountingDepth} mm cup bore, but the panel is only ${t} mm thick (minimum ${Math.ceil(requiredThickness)} mm). Use a thicker panel or a shallower hinge. Product: ${hingeProf.supplierUrl}`,
        he: `ציר "${hingeProf.name.he}" דורש קידוח כוס בעומק ${hingeProf.mountingDepth} מ"מ, אך הלוח עובי ${t} מ"מ בלבד (נדרש לפחות ${Math.ceil(requiredThickness)} מ"מ). השתמש בלוח עבה יותר או בציר רדוד יותר. מוצר: ${hingeProf.supplierUrl}`,
      },
      field: 'carcassMaterial',
      fix: { patch: { carcassMaterial: 'plywood-18' }, labelKey: 'validation.fixUsePlywood18' },
    });
  }

  if (dims.doorHeight > MAX_SINGLE_DOOR_HEIGHT_MM && hingeProf.openingAngle < WIDE_ANGLE_THRESHOLD_DEG) {
    out.push({
      code: 'VENDOR_HINGE_NOT_RATED_FOR_TALL_DOOR',
      severity: 'warning',
      message: {
        en: `Hinge "${hingeProf.name.en}" (${hingeProf.openingAngle}°) is not rated for doors taller than ${MAX_SINGLE_DOOR_HEIGHT_MM} mm. Choose a wide-angle (≥ ${WIDE_ANGLE_THRESHOLD_DEG}°) heavy-duty hinge for reliable long-term operation. Product: ${hingeProf.supplierUrl}`,
        he: `ציר "${hingeProf.name.he}" (${hingeProf.openingAngle}°) אינו מדורג לדלתות גבוהות מ-${MAX_SINGLE_DOOR_HEIGHT_MM} מ"מ. בחר ציר זווית רחבה (≥ ${WIDE_ANGLE_THRESHOLD_DEG}°) כבד-עומס לתפקוד אמין לאורך זמן. מוצר: ${hingeProf.supplierUrl}`,
      },
      field: 'hingeProfile',
      fix: { patch: { hingeProfile: 'blum-clip-top-165' }, labelKey: 'validation.fixSwitchWideAngleHinge' },
    });
  }

  return out;
}
