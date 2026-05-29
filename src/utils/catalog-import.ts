/**
 * Sprint 77 — fetch, parse, and merge a community material catalog.
 *
 * Pure utility (no React, no DOM except fetch). Converts CommunityMaterial
 * entries into the app's Material format for addition to the custom-materials store.
 */

import { validateCommunityCatalog, type CommunityCatalog, type CommunityMaterial } from '../engine/community-catalog';
import type { Material } from '../engine/types';
import { getFetch } from './browser-compat';

/** Standard sheet dimensions used when catalog entry lacks explicit size. */
const DEFAULT_SHEET_WIDTH = 1220;
const DEFAULT_SHEET_LENGTH = 2440;

/**
 * Fetch and parse a community catalog from the given URL.
 * Throws on network failure or validation error.
 */
export async function fetchCommunityCatalog(url: string): Promise<CommunityCatalog> {
  let response: Response;
  try {
    const fetchFn = getFetch();
    if (!fetchFn) throw new Error('Fetch API is not available in this browser.');
    response = await fetchFn(url);
  } catch (err) {
    throw new Error(`Network error fetching catalog: ${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }

  if (!response.ok) {
    throw new Error(`Catalog fetch failed: HTTP ${response.status} ${response.statusText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error('Catalog response is not valid JSON.');
  }

  const catalog = validateCommunityCatalog(json);
  if (!catalog) {
    throw new Error('Catalog JSON does not match schema. Check schemaVersion and required fields.');
  }

  return catalog;
}

/**
 * Convert a single {@link CommunityMaterial} to a store {@link Material}.
 * The catalog material ID is used as the key (prefixed with "cat-").
 */
export function communityMaterialToMaterial(cm: CommunityMaterial): Material {
  // price is per-sqM in catalog; convert to per-sheet
  const sheetAreaSqM = (DEFAULT_SHEET_WIDTH / 1000) * (DEFAULT_SHEET_LENGTH / 1000);
  const pricePerSheet = Math.round(cm.pricePerSqM * sheetAreaSqM * 100) / 100;

  return {
    key: `cat-${cm.id}`,
    name: { en: cm.name, he: cm.name },
    thickness: cm.thickness,
    sheetWidth: DEFAULT_SHEET_WIDTH,
    sheetLength: DEFAULT_SHEET_LENGTH,
    pricePerSheet,
    currencyCode: cm.currency,
    category: 'panel',
    color: cm.color ?? '#c8a86b',
    hasGrain: cm.hasGrain,
    densityKgM3: 700, // sensible default; catalog doesn't carry density
  };
}
