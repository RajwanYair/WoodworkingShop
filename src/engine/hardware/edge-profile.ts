/**
 * Sprint 43 — Panel edge profile engine.
 *
 * Assigns edge banding / edge treatment profiles to the four edges of each
 * cabinet panel and calculates the total linear metres of edge banding
 * required per material/colour combination.
 *
 * Edge profiles:
 *   - `none`        : raw edge (inside cabinet, not visible)
 *   - `iron-on`     : iron-on PVC edge band (most common)
 *   - `glue-on`     : pre-glued veneer edge band
 *   - `solid-wood`  : solid wood lipping, glued + planed
 *   - `t-mold`      : T-moulding / ABS edge, router-applied
 *   - `post-form`   : post-formed laminate edge (worktops)
 *
 * Edge banding is specified per panel, per edge (top, bottom, left, right).
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type EdgeProfile = 'none' | 'iron-on' | 'glue-on' | 'solid-wood' | 't-mold' | 'post-form';

export interface PanelEdges {
  top: EdgeProfile;
  bottom: EdgeProfile;
  left: EdgeProfile;
  right: EdgeProfile;
}

export interface EdgeBandPanel {
  id: string;
  /** Panel dimensions in mm. */
  widthMm: number;
  lengthMm: number;
  /** Edge profile per side. */
  edges: PanelEdges;
  /** Edge banding material / colour code (for grouping in BOM). */
  edgeMaterial: string;
}

/** Summary per edge material + profile combination. */
export interface EdgeBandBomLine {
  edgeMaterial: string;
  profile: EdgeProfile;
  totalLengthMm: number;
  /** Convenience value in metres, rounded to 2 decimal places. */
  totalLengthM: number;
}

// ─── Profile properties ───────────────────────────────────────────────────────

export interface EdgeProfileSpec {
  profile: EdgeProfile;
  name: { en: string; he: string };
  /** Standard thickness of the edge treatment (mm). 0 for none. */
  thicknessMm: number;
  /** Whether this profile requires a router / power tool. */
  requiresPowerTool: boolean;
}

/** Specification lookup for every {@link EdgeProfile} variant. */
export const EDGE_PROFILE_SPECS: Record<EdgeProfile, EdgeProfileSpec> = {
  none: {
    profile: 'none',
    name: { en: 'No edge treatment', he: 'ללא עיבוד שפה' },
    thicknessMm: 0,
    requiresPowerTool: false,
  },
  'iron-on': {
    profile: 'iron-on',
    name: { en: 'Iron-on PVC edge band', he: 'סרט שפה PVC בגיהוץ' },
    thicknessMm: 0.4,
    requiresPowerTool: false,
  },
  'glue-on': {
    profile: 'glue-on',
    name: { en: 'Glue-on veneer edge band', he: 'סרט שפה פורניר בדבק' },
    thicknessMm: 0.6,
    requiresPowerTool: false,
  },
  'solid-wood': {
    profile: 'solid-wood',
    name: { en: 'Solid wood lipping', he: 'ליפ עץ מלא' },
    thicknessMm: 20,
    requiresPowerTool: true,
  },
  't-mold': {
    profile: 't-mold',
    name: { en: 'T-moulding ABS edge', he: 'מוליך T-ABS' },
    thicknessMm: 3,
    requiresPowerTool: true,
  },
  'post-form': {
    profile: 'post-form',
    name: { en: 'Post-form laminate edge', he: 'שפת למינאט פוסט-פורם' },
    thicknessMm: 1,
    requiresPowerTool: true,
  },
};

// ─── Core ─────────────────────────────────────────────────────────────────────

/** Return the edge length in mm for a given panel edge. */
function edgeLengthMm(panel: EdgeBandPanel, edge: keyof PanelEdges): number {
  return edge === 'top' || edge === 'bottom' ? panel.widthMm : panel.lengthMm;
}

/**
 * Calculate the total edge banding required across a list of panels.
 * Returns one BOM line per unique (edgeMaterial × profile) combination.
 * Lines with profile='none' are omitted.
 */
export function calculateEdgeBandBom(panels: EdgeBandPanel[]): EdgeBandBomLine[] {
  const map = new Map<string, number>(); // key: `${edgeMaterial}::${profile}`

  for (const panel of panels) {
    const edges: (keyof PanelEdges)[] = ['top', 'bottom', 'left', 'right'];
    for (const edge of edges) {
      const profile = panel.edges[edge];
      if (profile === 'none') continue;
      const key = `${panel.edgeMaterial}::${profile}`;
      map.set(key, (map.get(key) ?? 0) + edgeLengthMm(panel, edge));
    }
  }

  return [...map.entries()].map(([key, totalLengthMm]) => {
    const [edgeMaterial, profile] = key.split('::') as [string, EdgeProfile];
    return {
      edgeMaterial,
      profile,
      totalLengthMm,
      totalLengthM: Math.round((totalLengthMm / 1000) * 100) / 100,
    };
  });
}

/** Total linear metres across all edge band BOM lines. */
export function totalEdgeBandMetres(bom: EdgeBandBomLine[]): number {
  return Math.round(bom.reduce((s, l) => s + l.totalLengthM, 0) * 100) / 100;
}

/** Return the spec for a given edge profile. */
export function getEdgeProfileSpec(profile: EdgeProfile): EdgeProfileSpec {
  return EDGE_PROFILE_SPECS[profile];
}
