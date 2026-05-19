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
 * Minimum internal clearance above the drawer stack (mm).
 */
const MIN_ABOVE_DRAWERS_MM = 200;

/**
 * Minimum drawer box height in mm — below this, standard side-mount runner
 * hardware cannot be reliably installed.
 */
const MIN_DRAWER_HEIGHT_MM = 100;

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
 * Minimum practical load capacity per shelf (kg) at the L/360 deflection limit.
 * Below this a shelf cannot hold even a light row of books without visible sag.
 */
const MIN_SHELF_LOAD_KG = 15;

// ── Manufacturing constraint constants (Phase 5, Sprint 7) ─────────────────

/**
 * Dado joints must be at least 1/3 of the panel thickness deep to achieve
 * structural strength; shallower dados pull out under load.
 */
const MIN_DADO_DEPTH_FRACTION = 1 / 3;

/**
 * Standard soft-close side-mount drawer runners (e.g. Blum Tandem) require
 * at least 12 mm of clearance on each side of the drawer box.  Below this,
 * runners cannot be fitted without machining the carcass sides.
 */
const MIN_RUNNER_SIDE_CLEARANCE_MM = 12;

/**
 * Minimum rebate depth for a back panel (mm).  Shallower rebates allow the
 * back panel to rattle and can pop out under racking loads.
 */
const MIN_BACK_REBATE_DEPTH_MM = 8;

/**
 * Euro-style hinge cups require a minimum boring distance from the inner edge
 * of the door to the centre of the cup (typically 22.5 mm for a 35 mm cup).
 * If the door panel is too narrow for even one cup plus this clearance on each
 * side the cup boring is structurally unsafe.
 */
const MIN_HINGE_CUP_EDGE_DISTANCE_MM = 22;

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
      suggestedValue: 'true',
    });
  }

  // ── Shelf maximum safe load capacity (Sprint 30) ─────────────────────────
  // Derive maximum load at L/360 limit by linear-scaling the standard
  // 0.05 N/mm test load that computeShelfDeflection uses internally.
  if (config.shelfCount > 0 && dims.shelfDeflections.length > 0) {
    const { deflectionMm } = dims.shelfDeflections[0];
    if (deflectionMm > 0) {
      const L = dims.shelfWidth;
      const wMaxNperMm = (0.05 * (L / 360)) / deflectionMm;
      const maxLoadKg = Math.round((wMaxNperMm * L) / 9.81);
      if (maxLoadKg < MIN_SHELF_LOAD_KG) {
        issues.push({
          code: 'SHELF_LOAD_CAPACITY_LOW',
          severity: 'warning',
          message: {
            en: `Maximum safe shelf load is only ~${maxLoadKg} kg (L/360 limit). Reduce span, increase panel thickness, or add a centre support to achieve at least ${MIN_SHELF_LOAD_KG} kg per shelf.`,
            he: `עומס מדף בטוח מרבי הוא ~${maxLoadKg} ק"ג (מגבלת L/360). הקטן ספן, הגדל עובי הלוח, או הוסף תמיכת אמצע כדי לשאת לפחות ${MIN_SHELF_LOAD_KG} ק"ג למדף.`,
          },
          field: 'shelfCount',
        });
      }
    }
  }

  // ── Manufacturing constraints (Phase 5, Sprint 7) ─────────────────────────

  // 1. Dado depth: shelf dadoes must be ≥ 1/3 of panel thickness to resist
  //    pullout under load.  Flag when t is so thin that 1/3 × t < 5 mm.
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
    });
  }

  // 2. Drawer runner clearance: standard side-mount runners need ≥ 12 mm each
  //    side.  Warn when the interior width leaves less than 2 × 12 mm for a
  //    full-extension runner pair.
  if (config.drawerCount > 0) {
    const runnerClearanceNeeded = 2 * MIN_RUNNER_SIDE_CLEARANCE_MM;
    const internalWidth = config.width - 2 * t;
    if (internalWidth < runnerClearanceNeeded + 150) {
      // Drawer box + two runners: box must be > 0, and runners take 24 mm total
      issues.push({
        code: 'DRAWER_RUNNER_CLEARANCE_INSUFFICIENT',
        severity: 'warning',
        message: {
          en: `Interior width (${Math.round(internalWidth)} mm) may be too narrow for standard side-mount drawer runners, which need ${runnerClearanceNeeded} mm total clearance plus a minimum drawer box width. Minimum interior width for runners: ${runnerClearanceNeeded + 150} mm.`,
          he: `הרוחב הפנימי (${Math.round(internalWidth)} מ"מ) עלול להיות צר מדי למנגנוני מגירה צדדיים הדורשים ${runnerClearanceNeeded} מ"מ פינוי. רוחב פנימי מינימלי: ${runnerClearanceNeeded + 150} מ"מ.`,
        },
        field: 'width',
      });
    }
  }

  // 3. Back panel rebate depth: a back panel rebated into the carcass sides needs
  //    a groove of at least MIN_BACK_REBATE_DEPTH_MM.  When panel thickness is so
  //    thin that a 1/2-depth rabbet would fall below this, flag it.
  if (config.hasBack !== false && t / 2 < MIN_BACK_REBATE_DEPTH_MM) {
    issues.push({
      code: 'BACK_REBATE_TOO_SHALLOW',
      severity: 'info',
      message: {
        en: `Panel thickness (${t} mm) is thin enough that a standard half-depth back rebate would be only ${(t / 2).toFixed(1)} mm — below the recommended ${MIN_BACK_REBATE_DEPTH_MM} mm minimum. Consider increasing panel thickness or using a face-frame attachment instead.`,
        he: `עובי הלוח (${t} מ"מ) גורם לחריץ גב בעומק חצי להיות רק ${(t / 2).toFixed(1)} מ"מ — מתחת למינימום המומלץ ${MIN_BACK_REBATE_DEPTH_MM} מ"מ. שקול הגדלת עובי או שיטת חיבור אחרת לגב.`,
      },
      field: 'carcassMaterial',
    });
  }

  // 4. Hinge cup edge distance: a 35mm Euro cup needs at least MIN_HINGE_CUP_EDGE_DISTANCE_MM
  //    from the inner door edge to the cup centre. Flag if door width < 2 × that distance.
  if (config.doorStyle !== 'none' && dims.doorWidth < 2 * MIN_HINGE_CUP_EDGE_DISTANCE_MM) {
    issues.push({
      code: 'HINGE_CUP_EDGE_DISTANCE_UNSAFE',
      severity: 'error',
      message: {
        en: `Door width (${Math.round(dims.doorWidth)} mm) is too narrow to safely bore 35 mm hinge cups. The minimum edge-to-cup-centre distance is ${MIN_HINGE_CUP_EDGE_DISTANCE_MM} mm, requiring a door width of at least ${2 * MIN_HINGE_CUP_EDGE_DISTANCE_MM} mm.`,
        he: `רוחב הדלת (${Math.round(dims.doorWidth)} מ"מ) צר מדי לקידוח ציר 35 מ"מ בבטחה. מרחק מינימלי מקצה לציר: ${MIN_HINGE_CUP_EDGE_DISTANCE_MM} מ"מ, דורש רוחב דלת ≥ ${2 * MIN_HINGE_CUP_EDGE_DISTANCE_MM} מ"מ.`,
      },
      field: 'doorCount',
    });
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
