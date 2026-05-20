import type { CabinetConfig, DrawerSlideType } from '../engine/types';
import { DEFAULT_CONFIG, CONSTRAINTS } from '../engine/materials';
import { getTemplate } from '../engine/templates';

/**
 * Encode a CabinetConfig into URL search params.
 * Only encodes values that differ from DEFAULT_CONFIG to keep URLs short.
 */
export function configToParams(cfg: CabinetConfig): URLSearchParams {
  const params = new URLSearchParams();
  const def = DEFAULT_CONFIG;

  if (cfg.width !== def.width) params.set('w', String(cfg.width));
  if (cfg.height !== def.height) params.set('h', String(cfg.height));
  if (cfg.depth !== def.depth) params.set('d', String(cfg.depth));
  if (cfg.furnitureType !== def.furnitureType) params.set('ft', cfg.furnitureType);
  if (cfg.shelfCount !== def.shelfCount) params.set('sc', String(cfg.shelfCount));
  if (cfg.shelfSpacing !== def.shelfSpacing) params.set('ss', cfg.shelfSpacing);
  if (cfg.shelfSpacing === 'custom' && cfg.customShelfPositions.length > 0) {
    params.set('csp', cfg.customShelfPositions.join(','));
  }
  if (cfg.carcassMaterial !== def.carcassMaterial) params.set('cm', cfg.carcassMaterial);
  if (cfg.backPanelMaterial !== def.backPanelMaterial) params.set('bm', cfg.backPanelMaterial);
  if ((cfg.hasBack ?? true) !== (def.hasBack ?? true)) params.set('hb', cfg.hasBack === false ? '0' : '1');
  if (cfg.doorCount !== def.doorCount) params.set('dc', String(cfg.doorCount));
  if (cfg.doorStyle !== def.doorStyle) params.set('ds', cfg.doorStyle);
  if (cfg.doorReveal !== def.doorReveal) params.set('dr', String(cfg.doorReveal));
  if (cfg.handleStyle !== def.handleStyle) params.set('hs', cfg.handleStyle);
  if (cfg.drawerCount !== def.drawerCount) params.set('drc', String(cfg.drawerCount));
  if (cfg.drawerHeights && cfg.drawerHeights.length > 0) params.set('dh', cfg.drawerHeights.join(','));
  if ((cfg.kickHeight ?? 0) !== (def.kickHeight ?? 0)) params.set('kh', String(cfg.kickHeight ?? 0));
  if ((cfg.drawerSlideType ?? 'standard') !== (def.drawerSlideType ?? 'standard'))
    params.set('dst', cfg.drawerSlideType ?? 'standard');
  if (cfg.edgeBanding !== def.edgeBanding) params.set('eb', cfg.edgeBanding);
  if (cfg.lang !== def.lang) params.set('lang', cfg.lang);
  if ((cfg.panelMaterialSource ?? 'carcass') !== 'carcass') params.set('pms', cfg.panelMaterialSource!);

  return params;
}

/**
 * Decode URL search params into a partial CabinetConfig.
 * Returns only the fields present in the URL; merge with DEFAULT_CONFIG.
 * v3.29.0: numeric params are clamped to CONSTRAINTS to prevent invalid configs from URLs.
 */
export function paramsToConfig(params: URLSearchParams): Partial<CabinetConfig> {
  const patch: Partial<CabinetConfig> = {};

  const w = params.get('w');
  if (w) patch.width = Math.max(CONSTRAINTS.minWidth, Math.min(CONSTRAINTS.maxWidth, Number(w)));
  const h = params.get('h');
  if (h) patch.height = Math.max(CONSTRAINTS.minHeight, Math.min(CONSTRAINTS.maxHeight, Number(h)));
  const d = params.get('d');
  if (d) patch.depth = Math.max(CONSTRAINTS.minDepth, Math.min(CONSTRAINTS.maxDepth, Number(d)));
  const ft = params.get('ft');
  if (ft === 'cabinet' || ft === 'bookshelf' || ft === 'desk' || ft === 'wardrobe' || ft === 'panel')
    patch.furnitureType = ft;
  const sc = params.get('sc');
  if (sc) patch.shelfCount = Math.max(0, Math.min(12, Number(sc)));
  const ss = params.get('ss');
  if (ss === 'equal' || ss === 'custom') patch.shelfSpacing = ss;
  const csp = params.get('csp');
  if (csp)
    patch.customShelfPositions = csp
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n));
  const cm = params.get('cm');
  if (cm) patch.carcassMaterial = cm;
  const bm = params.get('bm');
  if (bm) patch.backPanelMaterial = bm;
  const hb = params.get('hb');
  if (hb === '0' || hb === '1') patch.hasBack = hb === '1';
  const dc = params.get('dc');
  if (dc === '1' || dc === '2') patch.doorCount = Number(dc) as 1 | 2;
  const ds = params.get('ds');
  if (ds === 'flat' || ds === 'none' || ds === 'shaker' || ds === 'glass') patch.doorStyle = ds;
  const dr = params.get('dr');
  if (dr) patch.doorReveal = Math.max(0, Math.min(20, Number(dr)));
  const hs = params.get('hs');
  if (hs === 'bar' || hs === 'knob' || hs === 'cup' || hs === 'none') patch.handleStyle = hs;
  const drc = params.get('drc');
  if (drc) patch.drawerCount = Math.max(0, Math.min(6, Number(drc)));
  const dh = params.get('dh');
  if (dh)
    patch.drawerHeights = dh
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
  const kh = params.get('kh');
  if (kh !== null) patch.kickHeight = Math.max(0, Math.min(200, Number(kh)));
  const dst = params.get('dst');
  if (dst === 'standard' || dst === 'soft-close' || dst === 'full-extension')
    patch.drawerSlideType = dst as DrawerSlideType;
  const eb = params.get('eb');
  if (eb === 'all-visible' || eb === 'doors-only' || eb === 'none') patch.edgeBanding = eb;
  const lang = params.get('lang');
  if (lang === 'en' || lang === 'he') patch.lang = lang;
  const pms = params.get('pms');
  if (pms === 'carcass' || pms === 'back') patch.panelMaterialSource = pms;

  return patch;
}

/** Build a shareable URL from config. Preserves the current ?pn= project name if set. */
export function configToUrl(cfg: CabinetConfig, projectName?: string): string {
  const params = configToParams(cfg);
  // v3.29.0: preserve project name in shareable link
  const pn = projectName ?? new URLSearchParams(window.location.search).get('pn');
  if (pn) params.set('pn', pn);
  const qs = params.toString();
  return qs
    ? `${window.location.origin}${window.location.pathname}?${qs}`
    : window.location.origin + window.location.pathname;
}

/** Read config from current URL, merging ?tpl= template if present */
export function readConfigFromUrl(): Partial<CabinetConfig> {
  const params = new URLSearchParams(window.location.search);
  const tplId = params.get('tpl');
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
  const currentPn = new URLSearchParams(window.location.search).get('pn');
  if (currentPn) params.set('pn', currentPn);
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

/** Read project name from current URL (Sprint 157) */
export function readProjectNameFromUrl(): string {
  return new URLSearchParams(window.location.search).get('pn') ?? '';
}

/**
 * Write project name into the current URL without discarding other params (Sprint 157).
 * Truncated to 60 characters. Removes the param when name is empty.
 */
export function pushProjectNameToUrl(name: string): void {
  const params = new URLSearchParams(window.location.search);
  const trimmed = name.trim().slice(0, 60);
  if (trimmed) {
    params.set('pn', trimmed);
  } else {
    params.delete('pn');
  }
  const qs = params.toString();
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
  const diff: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    diff[k] = v;
  }
  const json = JSON.stringify(diff);
  // btoa operates on Latin-1; encode UTF-8 first via encodeURIComponent
  const b64 = btoa(encodeURIComponent(json));
  // Convert to base64url: replace + → -, / → _, strip trailing =
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
    const diff = JSON.parse(json) as Record<string, string>;
    const params = new URLSearchParams(diff);
    return paramsToConfig(params);
  } catch {
    return {};
  }
}
