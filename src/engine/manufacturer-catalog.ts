/**
 * Sprint 153 — Manufacturer Embedding API.
 *
 * Allows manufacturers to embed their product catalogs into the Cabinet Planner
 * via a typed JSON API. The API supports:
 *   - Registering a manufacturer with branding metadata
 *   - Submitting material catalogs with regional pricing
 *   - Versioned schema validation
 *   - Filtering by region, thickness, material type
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Schema version ───────────────────────────────────────────────────────────

/** Current manufacturer API schema version. */
export const MANUFACTURER_API_VERSION = '2.0' as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Manufacturer branding and contact information. */
export interface ManufacturerInfo {
  /** Unique manufacturer slug (e.g. 'egger', 'kronospan', 'kaindl'). */
  id: string;
  /** Display name. */
  name: string;
  /** Optional logo URL (https only). */
  logoUrl?: string;
  /** ISO 3166-1 alpha-2 country code of headquarters. */
  country: string;
  /** Optional website URL. */
  website?: string;
  /** Support email contact. */
  email?: string;
}

/** Material category for filtering. */
export type MaterialCategory = 'panel' | 'solid' | 'veneer' | 'laminate' | 'edge-banding' | 'composite';

/** A single material product from a manufacturer. */
export interface ManufacturerMaterial {
  /** Unique SKU / product code. */
  sku: string;
  /** Human-readable product name. */
  name: string;
  /** Material category. */
  category: MaterialCategory;
  /** Nominal thickness in millimetres. */
  thickness: number;
  /** Sheet width in mm (for panel materials). */
  sheetWidth?: number;
  /** Sheet length in mm (for panel materials). */
  sheetLength?: number;
  /** Price per square metre. */
  pricePerSqM: number;
  /** ISO 4217 currency code. */
  currency: string;
  /** ISO 3166-1 alpha-2 region codes where available. */
  regions: string[];
  /** Approximate surface colour hex code. */
  color?: string;
  /** Whether the material has a visible grain direction. */
  hasGrain: boolean;
  /** Density in kg/m³ (for weight calculation). */
  densityKgM3?: number;
  /** Optional product page URL (https only). */
  productUrl?: string;
  /** Whether the product is currently in stock / orderable. */
  available: boolean;
}

/** The complete manufacturer catalog submission envelope. */
export interface ManufacturerCatalog {
  /** Must equal {@link MANUFACTURER_API_VERSION}. */
  apiVersion: string;
  /** ISO 8601 generated-at timestamp. */
  generatedAt: string;
  /** Manufacturer information. */
  manufacturer: ManufacturerInfo;
  /** Materials provided by this manufacturer. */
  materials: ManufacturerMaterial[];
}

/** Filter options for querying materials. */
export interface MaterialFilter {
  /** Filter by region (case-insensitive). */
  region?: string;
  /** Filter by minimum/maximum thickness. */
  minThickness?: number;
  maxThickness?: number;
  /** Filter by category. */
  category?: MaterialCategory;
  /** Only show available materials. */
  availableOnly?: boolean;
  /** Filter by manufacturer ID. */
  manufacturerId?: string;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

const VALID_CATEGORIES: MaterialCategory[] = ['panel', 'solid', 'veneer', 'laminate', 'edge-banding', 'composite'];

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a manufacturer info object.
 *
 * @param raw Unknown input to validate.
 * @returns Validated ManufacturerInfo or null if invalid.
 */
export function validateManufacturerInfo(raw: unknown): ManufacturerInfo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (!isString(r['id']) || !isString(r['name']) || !isString(r['country'])) return null;
  if (r['country'].length !== 2) return null;

  const info: ManufacturerInfo = {
    id: r['id'] as string,
    name: r['name'] as string,
    country: (r['country'] as string).toLowerCase(),
  };

  if (isString(r['logoUrl']) && (r['logoUrl'] as string).startsWith('https://')) {
    info.logoUrl = r['logoUrl'] as string;
  }
  if (isString(r['website'])) info.website = r['website'] as string;
  if (isString(r['email'])) info.email = r['email'] as string;

  return info;
}

/**
 * Validate a single manufacturer material entry.
 *
 * @param raw Unknown input.
 * @returns Validated ManufacturerMaterial or null if invalid.
 */
export function validateManufacturerMaterial(raw: unknown): ManufacturerMaterial | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (
    !isString(r['sku']) ||
    !isString(r['name']) ||
    !isString(r['category']) ||
    !VALID_CATEGORIES.includes(r['category'] as MaterialCategory) ||
    !isNumber(r['thickness']) ||
    (r['thickness'] as number) <= 0 ||
    !isNumber(r['pricePerSqM']) ||
    (r['pricePerSqM'] as number) < 0 ||
    !isString(r['currency']) ||
    !Array.isArray(r['regions']) ||
    !isBoolean(r['hasGrain']) ||
    !isBoolean(r['available'])
  ) {
    return null;
  }

  const mat: ManufacturerMaterial = {
    sku: r['sku'] as string,
    name: r['name'] as string,
    category: r['category'] as MaterialCategory,
    thickness: r['thickness'] as number,
    pricePerSqM: r['pricePerSqM'] as number,
    currency: r['currency'] as string,
    regions: (r['regions'] as unknown[]).filter((v): v is string => typeof v === 'string'),
    hasGrain: r['hasGrain'] as boolean,
    available: r['available'] as boolean,
  };

  if (isNumber(r['sheetWidth']) && (r['sheetWidth'] as number) > 0) mat.sheetWidth = r['sheetWidth'] as number;
  if (isNumber(r['sheetLength']) && (r['sheetLength'] as number) > 0) mat.sheetLength = r['sheetLength'] as number;
  if (isString(r['color'])) mat.color = r['color'] as string;
  if (isNumber(r['densityKgM3']) && (r['densityKgM3'] as number) > 0) mat.densityKgM3 = r['densityKgM3'] as number;
  if (isString(r['productUrl']) && (r['productUrl'] as string).startsWith('https://')) {
    mat.productUrl = r['productUrl'] as string;
  }

  return mat;
}

/**
 * Validate a complete manufacturer catalog submission.
 *
 * @param raw Unknown JSON input.
 * @returns Validated ManufacturerCatalog or null if invalid.
 */
export function validateManufacturerCatalog(raw: unknown): ManufacturerCatalog | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (!isString(r['apiVersion']) || !isString(r['generatedAt'])) return null;

  const manufacturer = validateManufacturerInfo(r['manufacturer']);
  if (!manufacturer) return null;

  if (!Array.isArray(r['materials'])) return null;

  const materials: ManufacturerMaterial[] = [];
  for (const entry of r['materials'] as unknown[]) {
    const parsed = validateManufacturerMaterial(entry);
    if (parsed) materials.push(parsed);
  }

  // At least one valid material required
  if (materials.length === 0) return null;

  return {
    apiVersion: r['apiVersion'] as string,
    generatedAt: r['generatedAt'] as string,
    manufacturer,
    materials,
  };
}

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Filter materials by the given criteria.
 *
 * @param materials Array of manufacturer materials.
 * @param filter    Filter options.
 * @returns Filtered array (does not mutate input).
 */
export function filterMaterials(materials: ManufacturerMaterial[], filter: MaterialFilter): ManufacturerMaterial[] {
  return materials.filter((m) => {
    if (filter.region && !m.regions.some((r) => r.toLowerCase() === filter.region!.toLowerCase())) return false;
    if (filter.minThickness != null && m.thickness < filter.minThickness) return false;
    if (filter.maxThickness != null && m.thickness > filter.maxThickness) return false;
    if (filter.category && m.category !== filter.category) return false;
    if (filter.availableOnly && !m.available) return false;
    return true;
  });
}

/**
 * Merge multiple manufacturer catalogs into a unified material list.
 *
 * @param catalogs Array of validated catalogs.
 * @returns Flattened material array with manufacturer ID attached via SKU prefix.
 */
export function mergeCatalogs(catalogs: ManufacturerCatalog[]): ManufacturerMaterial[] {
  return catalogs.flatMap((cat) =>
    cat.materials.map((m) => ({
      ...m,
      sku: `${cat.manufacturer.id}/${m.sku}`,
    })),
  );
}
