import type { BandedEdge, EdgeBandingProcess } from './types';

export interface RawStockDimensions {
  length: number;
  width: number;
}

/**
 * Derive substrate blank dimensions from finished dimensions and selected banded edges.
 *
 * @param length Finished part length in mm.
 * @param width Finished part width in mm.
 * @param edges Banded edges in the part's unrotated local coordinate system.
 * @param process Optional process settings; absent or disabled preserves dimensions.
 * @returns Raw substrate dimensions for cutting and sheet-yield calculation.
 * @throws RangeError When dimensions or enabled process allowances are invalid.
 */
export function deriveRawStockDimensions(
  length: number,
  width: number,
  edges: readonly BandedEdge[] = [],
  process?: EdgeBandingProcess,
): RawStockDimensions {
  if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
    throw new RangeError(
      `deriveRawStockDimensions: dimensions must be positive finite numbers, got ${length}×${width}`,
    );
  }
  if (!process?.enabled) return { length, width };
  if (
    !Number.isFinite(process.bandThicknessMm) ||
    process.bandThicknessMm < 0 ||
    !Number.isFinite(process.trimAllowanceMm) ||
    process.trimAllowanceMm < 0
  ) {
    throw new RangeError('deriveRawStockDimensions: enabled process allowances must be finite and non-negative');
  }

  const lengthEdgeCount = edges.filter((edge) => edge.startsWith('length-')).length;
  const widthEdgeCount = edges.length - lengthEdgeCount;
  const lengthAllowance = lengthEdgeCount * (process.bandThicknessMm - process.trimAllowanceMm);
  const widthAllowance = widthEdgeCount * (process.bandThicknessMm - process.trimAllowanceMm);
  const rawLength = length - lengthAllowance;
  const rawWidth = width - widthAllowance;
  if (rawLength <= 0 || rawWidth <= 0) {
    throw new RangeError(
      `deriveRawStockDimensions: allowances exceed finished dimensions, got ${rawLength}×${rawWidth}`,
    );
  }
  return { length: rawLength, width: rawWidth };
}
