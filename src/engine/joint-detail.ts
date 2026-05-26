/**
 * Sprint 31 — Construction joint detail engine.
 *
 * Models the different joinery methods used to assemble cabinet carcasses.
 * Returns dimensional adjustments (groove depth, pocket offset, etc.) and
 * generates the DXF markup strings for each joint type.
 *
 * Supported joint types (matches `JoineryType` in types.ts):
 *   - `screw`         : Through-screw, no panel adjustment needed.
 *   - `pocket-screw`  : Kreg-style pocket screw; requires ≥ 15 mm stock.
 *   - `dado`          : Dado / housing groove; panel seats into opposite panel.
 *   - `dowel`         : Wooden dowel; requires ≥ 12 mm stock, ≥ 20 mm face width.
 *   - `biscuit`       : Plate (biscuit) joinery; same stock + face constraints as dowel.
 *
 * Pure function — no React, no side effects.
 */

import type { JoineryType } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JointDimensions {
  /** Groove or pocket depth (mm). 0 for joint types that don't alter parts. */
  grooveDepthMm: number;
  /** Groove or pocket width (mm). */
  grooveWidthMm: number;
  /** Offset from panel face to pocket hole centre (pocket-screw only, mm). */
  pocketOffsetMm: number;
  /** Dowel / biscuit diameter (mm). 0 for non-dowel joints. */
  dowelDiameterMm: number;
  /** Dowel / biscuit depth per panel (mm). Half the total joint depth. */
  dowelDepthMm: number;
}

export interface JointConstraints {
  /** Minimum panel thickness (mm) required for this joint. */
  minThicknessMm: number;
  /** Minimum face width (mm) required (for biscuit / dowel). */
  minFaceWidthMm: number;
  /** True when this joint type locks the panels against racking. */
  rigidAgainstRacking: boolean;
  /** True when a power tool is mandatory (pocket-screw jig, router, drill press). */
  requiresPowerTool: boolean;
}

export interface JointSpec {
  type: JoineryType;
  name: { en: string; he: string };
  description: { en: string; he: string };
  dimensions: JointDimensions;
  constraints: JointConstraints;
  /** DXF entity line(s) that mark this joint on the part face.
   *  Expressed as relative coordinate templates (use $x/$y for insertion point). */
  dxfMarkup: string;
}

// ─── Joint catalogue ──────────────────────────────────────────────────────────

/**
 * Return the complete joint spec for a given joinery type.
 * `materialThicknessMm` is used to compute groove / pocket proportional depths.
 */
export function getJointSpec(type: JoineryType, materialThicknessMm: number): JointSpec {
  // Dado groove depth: 1/3 of material thickness, rounded to 0.5 mm
  const dadoDepth = Math.round((materialThicknessMm / 3) * 2) / 2;
  const dadoWidth = materialThicknessMm; // groove width = mating panel thickness

  switch (type) {
    case 'screw':
      return {
        type,
        name: { en: 'Through Screw', he: 'ברגים רגילים' },
        description: {
          en: 'Standard countersunk through-screw assembly.  No panel modification required.',
          he: 'הרכבה בברגים רגילים משוקעים.  ללא שינוי לוח.',
        },
        dimensions: {
          grooveDepthMm: 0,
          grooveWidthMm: 0,
          pocketOffsetMm: 0,
          dowelDiameterMm: 0,
          dowelDepthMm: 0,
        },
        constraints: {
          minThicknessMm: 12,
          minFaceWidthMm: 0,
          rigidAgainstRacking: false,
          requiresPowerTool: false,
        },
        dxfMarkup: '',
      };

    case 'pocket-screw':
      return {
        type,
        name: { en: 'Pocket Screw (Kreg)', he: 'ברג כיס (קרג)' },
        description: {
          en: 'Angled pocket-screw joint using a Kreg jig.  Fast and strong for face-frame construction.',
          he: 'חיבור ברג כיס בזווית בעזרת מברגת קרג.  מהיר וחזק לבנייה עם מסגרת פנים.',
        },
        dimensions: {
          grooveDepthMm: 0,
          grooveWidthMm: 0,
          pocketOffsetMm: Math.round(materialThicknessMm * 0.4 * 2) / 2, // ~40% from face
          dowelDiameterMm: 0,
          dowelDepthMm: 0,
        },
        constraints: {
          minThicknessMm: 15,
          minFaceWidthMm: 19,
          rigidAgainstRacking: true,
          requiresPowerTool: true,
        },
        dxfMarkup: '',
      };

    case 'dado':
      return {
        type,
        name: { en: 'Dado / Housing', he: 'ניתוב (דאדו)' },
        description: {
          en: `Dado (housing) groove — ${dadoDepth} mm deep × ${dadoWidth} mm wide.  Panel seats into the groove, increasing racking resistance.`,
          he: `ניתוב עומק ${dadoDepth} מ"מ × רוחב ${dadoWidth} מ"מ.  לוח ישב בתוך הנקיק לחיזוק.`,
        },
        dimensions: {
          grooveDepthMm: dadoDepth,
          grooveWidthMm: dadoWidth,
          pocketOffsetMm: 0,
          dowelDiameterMm: 0,
          dowelDepthMm: 0,
        },
        constraints: {
          minThicknessMm: 12,
          minFaceWidthMm: 0,
          rigidAgainstRacking: true,
          requiresPowerTool: true,
        },
        dxfMarkup: `; DADO groove ${dadoDepth} × ${dadoWidth} mm\n`,
      };

    case 'dowel': {
      const dowelDiameter = materialThicknessMm >= 18 ? 10 : 8;
      return {
        type,
        name: { en: 'Wooden Dowel', he: 'דיבלים עץ' },
        description: {
          en: `Ø${dowelDiameter} mm wooden dowels at 32 mm system pitch.  Clean joint, no exposed hardware.`,
          he: `דיבלי עץ Ø${dowelDiameter} מ"מ במרווחי 32 מ"מ.  חיבור נקי, ללא חומרה גלויה.`,
        },
        dimensions: {
          grooveDepthMm: 0,
          grooveWidthMm: 0,
          pocketOffsetMm: 0,
          dowelDiameterMm: dowelDiameter,
          dowelDepthMm: Math.round(materialThicknessMm * 0.45),
        },
        constraints: {
          minThicknessMm: 12,
          minFaceWidthMm: 20,
          rigidAgainstRacking: true,
          requiresPowerTool: true,
        },
        dxfMarkup: `; DOWEL Ø${dowelDiameter} mm × depth ${Math.round(materialThicknessMm * 0.45)} mm\n`,
      };
    }

    case 'biscuit': {
      return {
        type,
        name: { en: 'Biscuit / Plate Joinery', he: 'ביסקוויט' },
        description: {
          en: 'No. 20 biscuit slots at 100 mm pitch.  Fast alignment; lower strength than dado or dowel.',
          he: 'חריצי ביסקוויט מס׳ 20 במרווחי 100 מ"מ.  יישור מהיר; חוזק נמוך מדאדו/דיבל.',
        },
        dimensions: {
          grooveDepthMm: 10, // No. 20 biscuit slot depth per face
          grooveWidthMm: 24, // No. 20 biscuit width
          pocketOffsetMm: 0,
          dowelDiameterMm: 0,
          dowelDepthMm: 10,
        },
        constraints: {
          minThicknessMm: 12,
          minFaceWidthMm: 50,
          rigidAgainstRacking: false,
          requiresPowerTool: true,
        },
        dxfMarkup: '; BISCUIT No.20 slot 10 × 24 mm\n',
      };
    }

    case 'mortise-tenon': {
      // Tenon thickness: 1/3 of panel thickness; tenon length: 2/3 panel thickness
      const tenonThickness = Math.round((materialThicknessMm / 3) * 2) / 2;
      const tenonLength = Math.round((materialThicknessMm * 2) / 3);
      const mortiseDepth = tenonLength + 2; // 2 mm clearance
      return {
        type,
        name: { en: 'Mortise & Tenon', he: 'חריץ ובליטה' },
        description: {
          en: `Mortise ${mortiseDepth} mm deep × ${tenonThickness} mm wide; tenon ${tenonLength} mm long × ${tenonThickness} mm thick. Strongest frame joint.`,
          he: `חריץ ${mortiseDepth} מ"מ עומק × ${tenonThickness} מ"מ רוחב; בליטה ${tenonLength} מ"מ אורך × ${tenonThickness} מ"מ עובי. החיבור החזק ביותר למסגרות.`,
        },
        dimensions: {
          grooveDepthMm: mortiseDepth,
          grooveWidthMm: tenonThickness,
          pocketOffsetMm: 0,
          dowelDiameterMm: 0,
          dowelDepthMm: 0,
        },
        constraints: {
          minThicknessMm: 18,
          minFaceWidthMm: 40,
          rigidAgainstRacking: true,
          requiresPowerTool: true,
        },
        dxfMarkup: `; MORTISE-TENON ${mortiseDepth} × ${tenonThickness} mm, tenon ${tenonLength} mm\n`,
      };
    }

    case 'dovetail': {
      // Tail angle: 1:8 for hardwood, pin width = 1/2 thickness
      const tailLength = Math.round(materialThicknessMm * 0.8);
      const pinWidth = Math.round(materialThicknessMm / 2);
      return {
        type,
        name: { en: 'Dovetail', he: 'זנב סנונית' },
        description: {
          en: `Through dovetail — tail length ${tailLength} mm, pin width ${pinWidth} mm, 1:8 angle ratio. Exceptional mechanical lock for drawer boxes.`,
          he: `זנב סנונית חוצה — אורך זנב ${tailLength} מ"מ, רוחב סיכה ${pinWidth} מ"מ, יחס זווית 1:8. נעילה מכנית מצוינת לתיבות מגירות.`,
        },
        dimensions: {
          grooveDepthMm: tailLength,
          grooveWidthMm: pinWidth,
          pocketOffsetMm: 0,
          dowelDiameterMm: 0,
          dowelDepthMm: 0,
        },
        constraints: {
          minThicknessMm: 12,
          minFaceWidthMm: 30,
          rigidAgainstRacking: true,
          requiresPowerTool: true,
        },
        dxfMarkup: `; DOVETAIL through, tail ${tailLength} mm, pin ${pinWidth} mm, 1:8\n`,
      };
    }

    default: {
      // Exhaustive check — TypeScript will error if JoineryType gains a new variant
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/**
 * Validate that a joint type is compatible with the given panel thickness.
 * Returns null when compatible, or a bilingual error string when not.
 */
export function validateJointCompatibility(
  type: JoineryType,
  materialThicknessMm: number,
  facePanelWidthMm: number,
): { en: string; he: string } | null {
  const spec = getJointSpec(type, materialThicknessMm);
  if (materialThicknessMm < spec.constraints.minThicknessMm) {
    return {
      en: `${spec.name.en} requires minimum ${spec.constraints.minThicknessMm} mm panel thickness (current: ${materialThicknessMm} mm).`,
      he: `${spec.name.he} דורש עובי לוח מינימלי ${spec.constraints.minThicknessMm} מ"מ (נוכחי: ${materialThicknessMm} מ"מ).`,
    };
  }
  if (spec.constraints.minFaceWidthMm > 0 && facePanelWidthMm < spec.constraints.minFaceWidthMm) {
    return {
      en: `${spec.name.en} requires minimum ${spec.constraints.minFaceWidthMm} mm face width (current: ${facePanelWidthMm} mm).`,
      he: `${spec.name.he} דורש רוחב פנים מינימלי ${spec.constraints.minFaceWidthMm} מ"מ (נוכחי: ${facePanelWidthMm} מ"מ).`,
    };
  }
  return null;
}

/** Return all joinery types with their specs for the given material thickness. */
export function getAllJointSpecs(materialThicknessMm: number): JointSpec[] {
  const types: JoineryType[] = ['screw', 'pocket-screw', 'dado', 'dowel', 'biscuit', 'mortise-tenon', 'dovetail'];
  return types.map((t) => getJointSpec(t, materialThicknessMm));
}
