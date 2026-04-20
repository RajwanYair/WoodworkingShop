import type { CabinetConfig } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/materials';

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
  if (cfg.shelfCount !== def.shelfCount) params.set('sc', String(cfg.shelfCount));
  if (cfg.shelfSpacing !== def.shelfSpacing) params.set('ss', cfg.shelfSpacing);
  if (cfg.shelfSpacing === 'custom' && cfg.customShelfPositions.length > 0) {
    params.set('csp', cfg.customShelfPositions.join(','));
  }
  if (cfg.carcassMaterial !== def.carcassMaterial) params.set('cm', cfg.carcassMaterial);
  if (cfg.backPanelMaterial !== def.backPanelMaterial) params.set('bm', cfg.backPanelMaterial);
  if (cfg.doorCount !== def.doorCount) params.set('dc', String(cfg.doorCount));
  if (cfg.doorStyle !== def.doorStyle) params.set('ds', cfg.doorStyle);
  if (cfg.doorReveal !== def.doorReveal) params.set('dr', String(cfg.doorReveal));
  if (cfg.handleStyle !== def.handleStyle) params.set('hs', cfg.handleStyle);
  if (cfg.edgeBanding !== def.edgeBanding) params.set('eb', cfg.edgeBanding);
  if (cfg.lang !== def.lang) params.set('lang', cfg.lang);

  return params;
}

/**
 * Decode URL search params into a partial CabinetConfig.
 * Returns only the fields present in the URL; merge with DEFAULT_CONFIG.
 */
export function paramsToConfig(params: URLSearchParams): Partial<CabinetConfig> {
  const patch: Partial<CabinetConfig> = {};

  const w = params.get('w');
  if (w) patch.width = Number(w);
  const h = params.get('h');
  if (h) patch.height = Number(h);
  const d = params.get('d');
  if (d) patch.depth = Number(d);
  const sc = params.get('sc');
  if (sc) patch.shelfCount = Number(sc);
  const ss = params.get('ss');
  if (ss === 'equal' || ss === 'custom') patch.shelfSpacing = ss;
  const csp = params.get('csp');
  if (csp) patch.customShelfPositions = csp.split(',').map(Number).filter((n) => !isNaN(n));
  const cm = params.get('cm');
  if (cm) patch.carcassMaterial = cm;
  const bm = params.get('bm');
  if (bm) patch.backPanelMaterial = bm;
  const dc = params.get('dc');
  if (dc === '1' || dc === '2') patch.doorCount = Number(dc) as 1 | 2;
  const ds = params.get('ds');
  if (ds === 'flat' || ds === 'none') patch.doorStyle = ds;
  const dr = params.get('dr');
  if (dr) patch.doorReveal = Number(dr);
  const hs = params.get('hs');
  if (hs === 'bar' || hs === 'knob' || hs === 'cup' || hs === 'none') patch.handleStyle = hs;
  const eb = params.get('eb');
  if (eb === 'all-visible' || eb === 'doors-only' || eb === 'none') patch.edgeBanding = eb;
  const lang = params.get('lang');
  if (lang === 'en' || lang === 'he') patch.lang = lang;

  return patch;
}

/** Build a shareable URL from config */
export function configToUrl(cfg: CabinetConfig): string {
  const params = configToParams(cfg);
  const qs = params.toString();
  return qs ? `${window.location.origin}${window.location.pathname}?${qs}` : window.location.origin + window.location.pathname;
}

/** Read config from current URL */
export function readConfigFromUrl(): Partial<CabinetConfig> {
  return paramsToConfig(new URLSearchParams(window.location.search));
}

/** Update browser URL without reload */
export function pushConfigToUrl(cfg: CabinetConfig): void {
  const params = configToParams(cfg);
  const qs = params.toString();
  const url = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState(null, '', url);
}
