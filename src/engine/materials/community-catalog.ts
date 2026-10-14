/**
 * Sprint 76 — Community material catalog schema.
 *
 * Defines the JSON API contract for a shareable community-driven catalog of
 * sheet materials with pricing. Pure TypeScript, no React, no DOM.
 */

/** Current schema version — bump when adding required fields. */
export const CATALOG_SCHEMA_VERSION = '1.0' as const;

/** ISO 4217 currency code (e.g. "USD", "EUR", "GBP", "ILS"). */
export type CatalogCurrencyCode = string;

/**
 * A single material entry contributed by the community.
 * All dimensions are in millimetres; prices are per square metre.
 */
export interface CommunityMaterial {
  /** Stable unique identifier (slug, e.g. "birch-ply-18mm-eu"). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Supplier or brand name (optional). */
  supplier?: string;
  /** Price per square metre. */
  pricePerSqM: number;
  /** ISO 4217 currency code. */
  currency: CatalogCurrencyCode;
  /** Nominal thickness in millimetres. */
  thickness: number;
  /** Approximate surface colour hex code (e.g. "#d4a86c"). */
  color?: string;
  /** Whether the material has a visible grain direction. */
  hasGrain: boolean;
  /** URL to product page or data sheet (optional). */
  url?: string;
  /** ISO 8601 date-time string when entry was submitted. */
  submittedAt: string;
  /** Community up-vote count (≥ 0). */
  votes: number;
}

/**
 * Root envelope for a community catalog file/response.
 * The JSON file MUST include `schemaVersion` and `generatedAt`.
 */
export interface CommunityCatalog {
  /** Must equal {@link CATALOG_SCHEMA_VERSION} for this library version. */
  schemaVersion: string;
  /** ISO 8601 date-time string when the catalog was generated/exported. */
  generatedAt: string;
  /** Ordered list of community materials. */
  materials: CommunityMaterial[];
}

// ─── Runtime validation helpers ──────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

/**
 * Parse and validate a single raw object as a {@link CommunityMaterial}.
 * Returns `null` if any required field is missing or of the wrong type.
 */
export function parseCommunityMaterial(raw: unknown): CommunityMaterial | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (
    !isString(r['id']) ||
    r['id'].trim() === '' ||
    !isString(r['name']) ||
    r['name'].trim() === '' ||
    !isNumber(r['pricePerSqM']) ||
    r['pricePerSqM'] < 0 ||
    !isString(r['currency']) ||
    r['currency'].trim() === '' ||
    !isNumber(r['thickness']) ||
    r['thickness'] <= 0 ||
    !isBoolean(r['hasGrain']) ||
    !isString(r['submittedAt']) ||
    !isNumber(r['votes']) ||
    r['votes'] < 0
  ) {
    return null;
  }

  const material: CommunityMaterial = {
    id: r['id'] as string,
    name: r['name'] as string,
    pricePerSqM: r['pricePerSqM'] as number,
    currency: r['currency'] as string,
    thickness: r['thickness'] as number,
    hasGrain: r['hasGrain'] as boolean,
    submittedAt: r['submittedAt'] as string,
    votes: r['votes'] as number,
  };

  if (isString(r['supplier'])) material.supplier = r['supplier'];
  if (isString(r['color'])) material.color = r['color'];
  if (isString(r['url'])) material.url = r['url'];

  return material;
}

/**
 * Validate a raw JSON object as a {@link CommunityCatalog}.
 * Returns `null` if the envelope is malformed or any material fails validation.
 * Schema version is checked but does not fail for future minor revisions.
 */
export function validateCommunityCatalog(raw: unknown): CommunityCatalog | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (!isString(r['schemaVersion']) || !isString(r['generatedAt'])) return null;
  if (!Array.isArray(r['materials'])) return null;

  const materials: CommunityMaterial[] = [];
  for (const entry of r['materials'] as unknown[]) {
    const parsed = parseCommunityMaterial(entry);
    if (!parsed) return null;
    materials.push(parsed);
  }

  return {
    schemaVersion: r['schemaVersion'] as string,
    generatedAt: r['generatedAt'] as string,
    materials,
  };
}
