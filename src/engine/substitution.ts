import type { CabinetConfig, Material, MaterialSubstitution } from './types';
import { getMaterial, MATERIALS } from './materials';

/** Maximum shelf width (mm) considered safe for non-plywood panels. */
const DEFLECTION_SPAN_THRESHOLD_MM = 900;

/** Density threshold (kg/m³) above which a material is considered "heavy". */
const HEAVY_DENSITY_KG_M3 = 750;

/**
 * Find material substitution recommendations for the current cabinet config.
 * Returns an array of MaterialSubstitution objects, each suggesting a better
 * alternative material with a reason and benefit category.
 *
 * This is a pure function — no side effects, no React imports.
 */
export function findSubstitutions(config: CabinetConfig, extraMaterials?: Material[]): MaterialSubstitution[] {
  const results: MaterialSubstitution[] = [];
  const all = extraMaterials ? [...MATERIALS, ...extraMaterials] : MATERIALS;
  const panelMats = all.filter((m) => m.category === 'panel');

  let current: Material;
  try {
    current = getMaterial(config.carcassMaterial, extraMaterials);
  } catch {
    return results;
  }

  // ── Rule 1: Deflection risk — wide span with weak material ───────────────
  // If the shelf width exceeds the threshold and the material is chipboard or
  // MDF, recommend switching to plywood (better stiffness).
  const shelfSpan = config.width - 36; // approximate internal width (2 × 18 mm sides)
  const isWeakPanel =
    current.key.startsWith('chipboard') || current.key.startsWith('mdf') || current.key.startsWith('melamine');

  if (shelfSpan > DEFLECTION_SPAN_THRESHOLD_MM && isWeakPanel) {
    // Find a plywood alternative of similar or greater thickness
    const plywoodAlt = panelMats.find(
      (m) => m.key.startsWith('plywood') && m.thickness >= current.thickness && m.key !== current.key,
    );
    if (plywoodAlt) {
      results.push({
        currentKey: current.key,
        suggestedKey: plywoodAlt.key,
        reason: {
          en: `Shelf span ${Math.round(shelfSpan)} mm exceeds ${DEFLECTION_SPAN_THRESHOLD_MM} mm — ${plywoodAlt.name.en} has higher stiffness and sags less.`,
          he: `מוטת מדף ${Math.round(shelfSpan)} מ"מ עולה על ${DEFLECTION_SPAN_THRESHOLD_MM} מ"מ — ל${plywoodAlt.name.he} קשיחות גבוהה יותר ופחות כיפוף.`,
        },
        benefit: 'deflection',
      });
    }
  }

  // ── Rule 2: Weight reduction — heavy material for wide/tall cabinet ───────
  // If the material density exceeds the heavy threshold on a tall (≥ 2000 mm)
  // or wide (≥ 1200 mm) cabinet, suggest a lighter alternative.
  const isLargeCabinet = config.height >= 2000 || config.width >= 1200;
  const isHeavy = current.densityKgM3 >= HEAVY_DENSITY_KG_M3;

  if (isHeavy && isLargeCabinet) {
    const lighterAlt = panelMats
      .filter(
        (m) =>
          m.key !== current.key &&
          m.densityKgM3 < current.densityKgM3 &&
          m.thickness >= current.thickness - 2 &&
          m.thickness <= current.thickness + 2,
      )
      .sort((a, b) => a.densityKgM3 - b.densityKgM3)[0];

    if (lighterAlt) {
      const weightSavingPct = Math.round(((current.densityKgM3 - lighterAlt.densityKgM3) / current.densityKgM3) * 100);
      results.push({
        currentKey: current.key,
        suggestedKey: lighterAlt.key,
        reason: {
          en: `${lighterAlt.name.en} is ~${weightSavingPct}% lighter than ${current.name.en} — easier to handle for a large cabinet.`,
          he: `${lighterAlt.name.he} קל בכ-${weightSavingPct}% מ${current.name.he} — קל יותר לטיפול בארון גדול.`,
        },
        benefit: 'weight',
      });
    }
  }

  // ── Rule 3: Cost reduction — expensive material with a cheaper alternative ─
  // If there is a panel material in the same category that costs less AND has
  // equal or better stiffness characteristics, suggest it.
  if (current.pricePerSheet !== undefined) {
    const currentPrice = current.pricePerSheet;
    const cheaperAlt = panelMats
      .filter(
        (m) =>
          m.key !== current.key &&
          m.pricePerSheet !== undefined &&
          m.pricePerSheet < currentPrice * 0.75 && // at least 25% cheaper
          m.thickness >= current.thickness &&
          m.category === current.category &&
          // Don't recommend a deflection-unsafe substitution
          !(shelfSpan > DEFLECTION_SPAN_THRESHOLD_MM && (m.key.startsWith('chipboard') || m.key.startsWith('mdf'))),
      )
      .sort((a, b) => (a.pricePerSheet ?? 0) - (b.pricePerSheet ?? 0))[0];

    if (cheaperAlt && cheaperAlt.pricePerSheet !== undefined) {
      const savingPct = Math.round(((currentPrice - cheaperAlt.pricePerSheet) / currentPrice) * 100);
      results.push({
        currentKey: current.key,
        suggestedKey: cheaperAlt.key,
        reason: {
          en: `${cheaperAlt.name.en} saves ~${savingPct}% in material cost vs ${current.name.en}.`,
          he: `${cheaperAlt.name.he} חוסך כ-${savingPct}% בעלות חומר לעומת ${current.name.he}.`,
        },
        benefit: 'cost',
      });
    }
  }

  return results;
}
