/**
 * Sprint 35 — Enhanced BOM filter engine.
 *
 * Provides composable, type-safe filter predicates for slicing a Bill of
 * Materials (BOM) list by material, part type, cabinet zone, grain
 * direction, thickness, or any combination thereof.
 *
 * The engine works on `BomFilterablePart` — a minimal interface extracted
 * from the existing Part type so this module stays independent of the full
 * type hierarchy.
 *
 * Pure function — no React, no side effects.
 */

// ─── Minimal input type ───────────────────────────────────────────────────────

/** Subset of Part fields needed for BOM filtering. */
export interface BomFilterablePart {
  id: string;
  name: { en: string; he: string };
  material: string;
  /** Part type tag, e.g. "panel", "shelf", "door", "drawer-front". */
  type: string;
  /** Cabinet zone, e.g. "base", "wall", "tall". */
  zone?: string;
  /** Grain direction — true when grain runs along the length. */
  grainAlongLength: boolean;
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
  quantity: number;
}

// ─── Filter criteria ──────────────────────────────────────────────────────────

export interface BomFilterCriteria {
  /** Filter by one or more material names (case-insensitive, partial match). */
  materials?: string[];
  /** Filter by part types (exact, case-insensitive). */
  types?: string[];
  /** Filter by cabinet zones (exact, case-insensitive). */
  zones?: string[];
  /** Filter by grain direction. */
  grainAlongLength?: boolean;
  /** Keep only parts with thickness in [minMm, maxMm] (inclusive). */
  minThicknessMm?: number;
  maxThicknessMm?: number;
  /** Free-text search against part name (en or he). */
  nameSearch?: string;
}

// ─── Core filter ─────────────────────────────────────────────────────────────

function lc(s: string): string {
  return s.toLowerCase();
}

/**
 * Filter an array of BOM parts according to the given criteria.
 * All non-empty criteria are ANDed together.
 */
export function filterBomParts(parts: BomFilterablePart[], criteria: BomFilterCriteria): BomFilterablePart[] {
  return parts.filter((part) => {
    // Material
    if (criteria.materials && criteria.materials.length > 0) {
      const match = criteria.materials.some((m) => lc(part.material).includes(lc(m)));
      if (!match) return false;
    }
    // Type
    if (criteria.types && criteria.types.length > 0) {
      if (!criteria.types.some((t) => lc(t) === lc(part.type))) return false;
    }
    // Zone
    if (criteria.zones && criteria.zones.length > 0) {
      if (!criteria.zones.some((z) => lc(z) === lc(part.zone ?? ''))) return false;
    }
    // Grain
    if (criteria.grainAlongLength !== undefined) {
      if (part.grainAlongLength !== criteria.grainAlongLength) return false;
    }
    // Thickness range
    if (criteria.minThicknessMm !== undefined && part.thicknessMm < criteria.minThicknessMm) return false;
    if (criteria.maxThicknessMm !== undefined && part.thicknessMm > criteria.maxThicknessMm) return false;
    // Name search
    if (criteria.nameSearch && criteria.nameSearch.trim().length > 0) {
      const q = lc(criteria.nameSearch.trim());
      if (!lc(part.name.en).includes(q) && !lc(part.name.he).includes(q)) return false;
    }
    return true;
  });
}

/**
 * Return a de-duplicated list of all material values present in the BOM.
 * Useful for populating a filter dropdown.
 */
export function getBomMaterials(parts: BomFilterablePart[]): string[] {
  return [...new Set(parts.map((p) => p.material))].sort();
}

/**
 * Return a de-duplicated list of all part types present in the BOM.
 */
export function getBomPartTypes(parts: BomFilterablePart[]): string[] {
  return [...new Set(parts.map((p) => p.type))].sort();
}

/**
 * Return a de-duplicated list of all zones present in the BOM.
 */
export function getBomZones(parts: BomFilterablePart[]): string[] {
  return [...new Set(parts.filter((p) => p.zone).map((p) => p.zone!))].sort();
}

/** Sum the total quantity of all parts in an (optionally filtered) list. */
export function totalPartCount(parts: BomFilterablePart[]): number {
  return parts.reduce((s, p) => s + p.quantity, 0);
}
