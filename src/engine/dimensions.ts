import type { CabinetConfig, DerivedDimensions } from './types';
import { getMaterial } from './materials';

/**
 * Compute all derived internal dimensions from the external config.
 * Formulas ported from the legacy Python generators (Plan A/B/C).
 */
export function computeDimensions(cfg: CabinetConfig): DerivedDimensions {
  const t = getMaterial(cfg.carcassMaterial).thickness;
  const r = cfg.doorReveal;

  const internalWidth  = cfg.width  - 2 * t;
  const internalHeight = cfg.height - 2 * t;
  const shelfDepth     = cfg.depth  - 20;           // 20 mm front setback
  const shelfWidth     = internalWidth - 2;          // 1 mm clearance per side
  const doorHeight     = cfg.height - r - r;         // top + bottom reveal
  const doorWidth      = cfg.doorCount === 2
    ? (cfg.width - r - r - (r - 1)) / 2             // outer reveals + center gap
    : cfg.width - r - r;                             // single door
  const backPanelHeight = cfg.height - 20;           // 10 mm inset per edge
  const backPanelWidth  = cfg.width  - 20;

  const hingesPerDoor = computeHingesPerDoor(doorHeight);
  const hingePositions = computeHingePositions(doorHeight, hingesPerDoor);

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
  };
}

/** Auto-calculate number of hinges based on door height. */
export function computeHingesPerDoor(doorHeight: number): number {
  if (doorHeight <= 600)  return 2;
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
export function computeEqualShelfPositions(
  internalHeight: number,
  shelfCount: number,
): number[] {
  if (shelfCount <= 0) return [];
  const spacing = internalHeight / (shelfCount + 1);
  return Array.from({ length: shelfCount }, (_, i) =>
    Math.round(spacing * (i + 1)),
  );
}
