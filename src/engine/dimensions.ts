import type { CabinetConfig, DerivedDimensions } from './types';
import { getMaterial } from './materials';

/**
 * Elastic moduli (N/mm²) used for shelf deflection calculations.
 * Values are conservative design estimates (lower bound) rather than
 * published nominal values so warnings err on the side of caution.
 */
const ELASTIC_MODULUS_BY_KEY: Record<string, number> = {
  'plywood-17': 6500,
  'plywood-18': 7000,
  'melamine-16': 2800,
  'melamine-18': 2800,
  'mdf-16': 2500,
  'mdf-18': 2500,
  'chipboard-16': 2200,
  'chipboard-18': 2200,
  'osb-18': 3500,
};
/** Default modulus (N/mm²) for materials not in the lookup (e.g. custom). */
const DEFAULT_MODULUS = 3000;

/**
 * Compute all derived internal dimensions from the external config.
 * Formulas ported from the legacy Python generators (Plan A/B/C).
 */
export function computeDimensions(cfg: CabinetConfig): DerivedDimensions {
  const t = getMaterial(cfg.carcassMaterial).thickness;
  const r = cfg.doorReveal;

  const internalWidth = cfg.width - 2 * t;
  const internalHeight = cfg.height - 2 * t;
  const shelfDepth = cfg.depth - 20; // 20 mm front setback
  const shelfWidth = internalWidth - 2; // 1 mm clearance per side
  const doorHeight = cfg.height - r - r; // top + bottom reveal
  const doorWidth =
    cfg.doorCount === 2
      ? (cfg.width - r - r - (r - 1)) / 2 // outer reveals + center gap
      : cfg.width - r - r; // single door
  const backPanelHeight = cfg.height - 20; // 10 mm inset per edge
  const backPanelWidth = cfg.width - 20;

  const hingesPerDoor = computeHingesPerDoor(doorHeight);
  const hingePositions = computeHingePositions(doorHeight, hingesPerDoor);

  // Sprint 173 — per-shelf deflection ratings
  const mat = getMaterial(cfg.carcassMaterial);
  const shelfDeflections = Array.from({ length: cfg.shelfCount }, () =>
    computeShelfDeflection(shelfWidth, mat.thickness, shelfDepth, cfg.carcassMaterial),
  );

  return {
    internalWidth,
    internalHeight,
    shelfDepth,
    shelfWidth,
    doorHeight,
    doorWidth,
    backPanelHeight,
    backPanelWidth,
    hingesPerDoor,
    hingePositions,
    shelfDeflections,
  };
}

/** Auto-calculate number of hinges based on door height. */
export function computeHingesPerDoor(doorHeight: number): number {
  if (doorHeight <= 600) return 2;
  if (doorHeight <= 1200) return 3;
  if (doorHeight <= 1800) return 4;
  if (doorHeight <= 2200) return 5;
  return 6;
}

/** Distribute hinge positions evenly along door height. */
export function computeHingePositions(doorHeight: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [doorHeight / 2];

  const topOffset = Math.min(100, doorHeight * 0.05);
  const bottomOffset = topOffset;
  const span = doorHeight - topOffset - bottomOffset;
  const positions: number[] = [];

  for (let i = 0; i < count; i++) {
    positions.push(Math.round(topOffset + (span * i) / (count - 1)));
  }
  return positions;
}

/** Compute equal shelf positions (mm from cabinet bottom, internal). */
export function computeEqualShelfPositions(internalHeight: number, shelfCount: number): number[] {
  if (shelfCount <= 0) return [];
  const spacing = internalHeight / (shelfCount + 1);
  return Array.from({ length: shelfCount }, (_, i) => Math.round(spacing * (i + 1)));
}

/**
 * Sprint 126 — Shelf span deflection check using the simply-supported beam
 * formula for a uniformly distributed load:
 *   δ = (5 × w × L⁴) / (384 × E × I)
 *
 * where:
 *   w = uniform load intensity (N/mm) — fixed at 0.05 N/mm ≈ 5 kg/m (light bookshelf load)
 *   L = clear shelf span (mm)
 *   E = elastic modulus of the sheet material (N/mm²)
 *   I = second moment of area = (shelfDepth × thickness³) / 12   (mm⁴)
 *
 * The serviceability limit is L/360 per common furniture standards.
 *
 * @returns deflection in mm, allowed limit in mm, and whether it exceeds the limit.
 */
export interface ShelfDeflectionResult {
  /** Mid-span deflection under design load (mm). */
  deflectionMm: number;
  /** Serviceability limit = span / 360 (mm). */
  limitMm: number;
  /** true when deflection > limit — show a warning. */
  overLimit: boolean;
  /**
   * Sprint 173 — three-tier colour-coded rating:
   *   'safe'    — deflectionMm ≤ L/360
   *   'warning' — L/360 < deflectionMm ≤ L/240  (amber)
   *   'danger'  — deflectionMm > L/240            (red)
   */
  deflectionRating: 'safe' | 'warning' | 'danger';
  /**
   * Sprint 8 — Maximum safe uniformly-distributed load the shelf can carry
   * before mid-span deflection reaches the L/360 serviceability limit (kg).
   * Derived by scaling the design load proportionally to the limit.
   */
  maxLoadKg: number;
}

export function computeShelfDeflection(
  spanMm: number,
  thicknessMm: number,
  shelfDepthMm: number,
  materialKey: string,
): ShelfDeflectionResult {
  const E = ELASTIC_MODULUS_BY_KEY[materialKey] ?? DEFAULT_MODULUS;
  // Second moment of area for a rectangular section
  const I = (shelfDepthMm * Math.pow(thicknessMm, 3)) / 12;
  // Uniform load intensity (N/mm)
  const w = 0.05;
  const L = spanMm;
  const deflectionMm = (5 * w * Math.pow(L, 4)) / (384 * E * I);
  const limitMm = L / 360;
  const warnLimitMm = L / 240;
  const deflectionRating: 'safe' | 'warning' | 'danger' =
    deflectionMm <= limitMm ? 'safe' : deflectionMm <= warnLimitMm ? 'warning' : 'danger';
  // Maximum safe load: scale 0.05 N/mm design load so that deflection == limitMm.
  // If deflectionMm is zero (theoretically impossible for real material) return a
  // large safe value to avoid division by zero.
  const maxLoadKg = deflectionMm > 0 ? Math.round((0.05 * limitMm * L) / deflectionMm / 9.81) : 9999;
  return {
    deflectionMm: Math.round(deflectionMm * 100) / 100,
    limitMm: Math.round(limitMm * 100) / 100,
    overLimit: deflectionMm > limitMm,
    deflectionRating,
    maxLoadKg,
  };
}
