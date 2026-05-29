import type { CabinetConfig, DrawerSlideType } from '../engine/types';
import { DEFAULT_CONFIG, CONSTRAINTS } from '../engine/materials';
import { getTemplate } from '../engine/templates';
import { getQueryValue, parseQueryString, serializeQueryRecord, type QueryRecord } from './browser-compat';

/**
 * Encode a CabinetConfig into URL search params.
 * Only encodes values that differ from DEFAULT_CONFIG to keep URLs short.
 */
export function configToParams(cfg: CabinetConfig): QueryRecord {
  const params: QueryRecord = {};
  const def = DEFAULT_CONFIG;

  if (cfg.width !== def.width) params.w = String(cfg.width);
  if (cfg.height !== def.height) params.h = String(cfg.height);
  if (cfg.depth !== def.depth) params.d = String(cfg.depth);
  if (cfg.furnitureType !== def.furnitureType) params.ft = cfg.furnitureType;
  if (cfg.shelfCount !== def.shelfCount) params.sc = String(cfg.shelfCount);
  if (cfg.shelfSpacing !== def.shelfSpacing) params.ss = cfg.shelfSpacing;
  if (cfg.shelfSpacing === 'custom' && cfg.customShelfPositions.length > 0) {
    params.csp = cfg.customShelfPositions.join(',');
  }
  if ((cfg.shelfCentreSupports ?? 0) !== (def.shelfCentreSupports ?? 0))
    params.scs = String(cfg.shelfCentreSupports ?? 0);
  if (cfg.carcassMaterial !== def.carcassMaterial) params.cm = cfg.carcassMaterial;
  if (cfg.backPanelMaterial !== def.backPanelMaterial) params.bm = cfg.backPanelMaterial;
  if ((cfg.hasBack ?? true) !== (def.hasBack ?? true)) params.hb = cfg.hasBack === false ? '0' : '1';
  if (cfg.doorCount !== def.doorCount) params.dc = String(cfg.doorCount);
  if (cfg.doorStyle !== def.doorStyle) params.ds = cfg.doorStyle;
  if (cfg.doorReveal !== def.doorReveal) params.dr = String(cfg.doorReveal);
  if (cfg.handleStyle !== def.handleStyle) params.hs = cfg.handleStyle;
  if (cfg.drawerCount !== def.drawerCount) params.drc = String(cfg.drawerCount);
  if (cfg.drawerHeights && cfg.drawerHeights.length > 0) params.dh = cfg.drawerHeights.join(',');
  if ((cfg.kickHeight ?? 0) !== (def.kickHeight ?? 0)) params.kh = String(cfg.kickHeight ?? 0);
  if ((cfg.drawerSlideType ?? 'standard') !== (def.drawerSlideType ?? 'standard'))
    params.dst = cfg.drawerSlideType ?? 'standard';
  if (cfg.edgeBanding !== def.edgeBanding) params.eb = cfg.edgeBanding;
  if (cfg.lang !== def.lang) params.lang = cfg.lang;
  if ((cfg.panelMaterialSource ?? 'carcass') !== 'carcass') params.pms = cfg.panelMaterialSource!;

  return params;
}

/**
 * Decode URL search params into a partial CabinetConfig.
 * Returns only the fields present in the URL; merge with DEFAULT_CONFIG.
 * v3.29.0: numeric params are clamped to CONSTRAINTS to prevent invalid configs from URLs.
 */
export function paramsToConfig(params: QueryRecord): Partial<CabinetConfig> {
  const patch: Partial<CabinetConfig> = {};

  const w = params.w;
  if (w) patch.width = Math.max(CONSTRAINTS.minWidth, Math.min(CONSTRAINTS.maxWidth, Number(w)));
  const h = params.h;
  if (h) patch.height = Math.max(CONSTRAINTS.minHeight, Math.min(CONSTRAINTS.maxHeight, Number(h)));
  const d = params.d;
  if (d) patch.depth = Math.max(CONSTRAINTS.minDepth, Math.min(CONSTRAINTS.maxDepth, Number(d)));
  const ft = params.ft;
  if (ft === 'cabinet' || ft === 'bookshelf' || ft === 'desk' || ft === 'wardrobe' || ft === 'panel')
    patch.furnitureType = ft;
  const sc = params.sc;
  if (sc) patch.shelfCount = Math.max(0, Math.min(12, Number(sc)));
  const ss = params.ss;
  if (ss === 'equal' || ss === 'custom') patch.shelfSpacing = ss;
  const csp = params.csp;
  if (csp)
    patch.customShelfPositions = csp
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n));
  const scs = params.scs;
  if (scs !== null) patch.shelfCentreSupports = Math.max(0, Math.min(5, Number(scs) || 0));
  const cm = params.cm;
  if (cm) patch.carcassMaterial = cm;
  const bm = params.bm;
  if (bm) patch.backPanelMaterial = bm;
  const hb = params.hb;
  if (hb === '0' || hb === '1') patch.hasBack = hb === '1';
  const dc = params.dc;
  if (dc === '1' || dc === '2') patch.doorCount = Number(dc) as 1 | 2;
  const ds = params.ds;
  if (ds === 'flat' || ds === 'none' || ds === 'shaker' || ds === 'glass') patch.doorStyle = ds;
  const dr = params.dr;
  if (dr) patch.doorReveal = Math.max(0, Math.min(20, Number(dr)));
  const hs = params.hs;
  if (hs === 'bar' || hs === 'knob' || hs === 'cup' || hs === 'none') patch.handleStyle = hs;
  const drc = params.drc;
  if (drc) patch.drawerCount = Math.max(0, Math.min(6, Number(drc)));
  const dh = params.dh;
  if (dh)
    patch.drawerHeights = dh
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
  const kh = params.kh;
  if (kh !== null) patch.kickHeight = Math.max(0, Math.min(200, Number(kh)));
  const dst = params.dst;
  if (dst === 'standard' || dst === 'soft-close' || dst === 'full-extension')
    patch.drawerSlideType = dst as DrawerSlideType;
  const eb = params.eb;
  if (eb === 'all-visible' || eb === 'doors-only' || eb === 'none') patch.edgeBanding = eb;
  const lang = params.lang;
  if (lang === 'en' || lang === 'he') patch.lang = lang;
  const pms = params.pms;
  if (pms === 'carcass' || pms === 'back') patch.panelMaterialSource = pms;

  return patch;
}

/** Build a shareable URL from config. Preserves the current ?pn= project name if set. */
export function configToUrl(cfg: CabinetConfig, projectName?: string): string {
  const params = configToParams(cfg);
  // v3.29.0: preserve project name in shareable link
  const pn = projectName ?? getQueryValue(window.location.search, 'pn');
  if (pn) params.pn = pn;
  const qs = serializeQueryRecord(params);
  return qs
    ? `${window.location.origin}${window.location.pathname}?${qs}`
    : window.location.origin + window.location.pathname;
}

/** Read config from current URL, merging ?tpl= template if present */
export function readConfigFromUrl(): Partial<CabinetConfig> {
  const params = parseQueryString(window.location.search);
  const tplId = params.tpl;
  if (tplId) {
    const tpl = getTemplate(tplId);
    if (tpl) {
      // Template provides the full config; URL params then override individual fields
      const urlOverrides = paramsToConfig(params);
      return { ...tpl.config, ...urlOverrides };
    }
  }
  return paramsToConfig(params);
}

/** Update browser URL without reload */
export function pushConfigToUrl(cfg: CabinetConfig): void {
  const params = configToParams(cfg);
  // Preserve projectName param so it survives config changes (Sprint 157)
  const currentPn = getQueryValue(window.location.search, 'pn');
  if (currentPn) params.pn = currentPn;
  const qs = serializeQueryRecord(params);
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

/** Read project name from current URL (Sprint 157) */
export function readProjectNameFromUrl(): string {
  return getQueryValue(window.location.search, 'pn') ?? '';
}

/**
 * Write project name into the current URL without discarding other params (Sprint 157).
 * Truncated to 60 characters. Removes the param when name is empty.
 */
export function pushProjectNameToUrl(name: string): void {
  const params = parseQueryString(window.location.search);
  const trimmed = name.trim().slice(0, 60);
  if (trimmed) {
    params.pn = trimmed;
  } else {
    delete params.pn;
  }
  const qs = serializeQueryRecord(params);
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

// ── Compact serialisation (Sprint 35) ────────────────────────────────────────
//
// `compressConfigToBase64` produces a URL-safe base64 string encoding the
// minimal JSON diff of a config from DEFAULT_CONFIG.  The result fits in a
// single `?c=` URL parameter and is ~30–50% shorter than the expanded form
// for configs that differ on many fields (e.g. custom shelf positions, many
// drawers, non-default materials).
//
// Encoding: JSON → UTF-8 bytes → base64url (RFC 4648 §5 — no +/=).
// This avoids external dependencies (no lz-string, no zlib).

/**
 * Serialise a cabinet config to a URL-safe base64 string.
 *
 * Only fields that differ from DEFAULT_CONFIG are included, keeping the
 * string compact.  The output uses base64url encoding (no `+`, `/`, or `=`).
 */
export function compressConfigToBase64(config: CabinetConfig): string {
  // Build the diff object manually from configToParams so we reuse the
  // existing diff logic without duplicating it.
  const params = configToParams(config);
  const diff: Record<string, string> = { ...params };
  const json = JSON.stringify(diff);
  // btoa operates on Latin-1; encode UTF-8 first via encodeURIComponent
  const b64 = btoa(encodeURIComponent(json));
  // Convert to base64url: replace + → -, / → _, strip trailing =
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

/**
 * Decode a base64url-encoded compact config string back to a partial
 * CabinetConfig.  Returns an empty object if the string is malformed.
 *
 * The returned object should be merged with DEFAULT_CONFIG before use.
 */
export function decompressBase64ToConfig(compact: string): Partial<CabinetConfig> {
  try {
    // Restore standard base64 from base64url
    const b64 = compact.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(b64));
    const diff = JSON.parse(json) as QueryRecord;
    return paramsToConfig(diff);
  } catch {
    return {};
  }
}

// ── Phase 13 / Sprint 6 — Offline-capable URL share ──────────────────────────
// When the compact base64 config string exceeds URL_REF_THRESHOLD bytes, the
// config is stored in IndexedDB under a short random key and the URL is
// shortened to `?ref=<key>`.  On load, `readConfigFromUrlAsync` resolves the
// ref back to a config.  If the ref is not found (different device / cleared
// storage), the app falls back to an empty default config.

import { storeUrlRef, loadUrlRef } from './indexed-db-storage';

/** Maximum bytes for inline `?c=<base64>` before falling back to a short ref. */
export const URL_REF_THRESHOLD = 2048;

/** Length of generated short-ref keys (8 alphanumeric characters = 36^8 ≈ 2.8 trillion combinations). */
export const REF_KEY_LENGTH = 8;

/**
 * Generate a cryptographically random URL-safe short-ref key.
 * Uses `crypto.getRandomValues` — no external dependency, no Math.random().
 */
export function generateShareRefKey(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(REF_KEY_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/**
 * Push the config to the browser URL.  When the compact form exceeds
 * `URL_REF_THRESHOLD` bytes it is stored in IndexedDB and a short `?ref=<key>`
 * URL is used instead.  The `?pn=` project-name param is preserved.
 *
 * Prefer this over `pushConfigToUrl` when IndexedDB is available.
 */
export async function pushConfigToUrlOffline(cfg: CabinetConfig, projectName?: string): Promise<void> {
  const compact = compressConfigToBase64(cfg);
  const pn = projectName ?? getQueryValue(window.location.search, 'pn');
  const params: QueryRecord = {};
  if (pn) params.pn = pn;

  if (compact.length <= URL_REF_THRESHOLD) {
    params.c = compact;
  } else {
    const key = generateShareRefKey();
    await storeUrlRef(key, compact);
    params.ref = key;
  }

  const qs = serializeQueryRecord(params);
  window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
}

/**
 * Resolve a `?ref=<key>` URL parameter to a CabinetConfig by looking it up
 * in IndexedDB.  Returns `null` when the key is not found.
 */
export async function resolveUrlRef(key: string): Promise<Partial<CabinetConfig> | null> {
  const compact = await loadUrlRef(key);
  if (compact === undefined) return null;
  return decompressBase64ToConfig(compact);
}

/**
 * Async variant of `readConfigFromUrl` that additionally handles `?ref=<key>`.
 * Order of precedence: `?ref=` → `?c=` → `?tpl=` → individual params.
 * Returns an empty object (not null) when nothing is decoded.
 */
export async function readConfigFromUrlAsync(): Promise<Partial<CabinetConfig>> {
  const params = parseQueryString(window.location.search);

  const ref = params.ref;
  if (ref) {
    const resolved = await resolveUrlRef(ref);
    if (resolved !== null) return resolved;
    // Ref not found — fall through to other decode strategies
  }

  const compact = params.c;
  if (compact) return decompressBase64ToConfig(compact);

  return readConfigFromUrl();
}
