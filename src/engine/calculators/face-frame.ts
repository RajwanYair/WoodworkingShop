/** Input parameters for the face frame calculator. */
export interface FaceFrameInput {
  /** Overall cabinet width in millimetres (face side). Must be > 0. */
  cabinetWidthMm: number;
  /** Overall cabinet height in millimetres. Must be > 0. */
  cabinetHeightMm: number;
  /** Width of each stile (vertical member) in mm. Defaults to 38 mm. */
  stileWidthMm?: number;
  /** Width of each rail (horizontal member) in mm. Defaults to 38 mm. */
  railWidthMm?: number;
  /**
   * Number of door/drawer openings stacked vertically.
   * Must be an integer in 1–4. Defaults to 1.
   */
  openingCount?: number;
}

/** A single cut part in the face frame. */
export interface FaceFramePart {
  /** Human-readable label for this part. */
  label: string;
  /** Length in millimetres (grain direction for stiles; across-grain for rails). */
  lengthMm: number;
  /** Width in millimetres. */
  widthMm: number;
  /** Quantity of this part. */
  qty: number;
}

/** Result from calculateFaceFrame. */
export interface FaceFrameResult {
  /** Length of each stile — equal to cabinetHeightMm. */
  stileLengthMm: number;
  /** Length of each rail — cabinetWidthMm minus 2 × stileWidthMm. */
  railLengthMm: number;
  /** Height of each individual opening. */
  openingHeightMm: number;
  /** Width of each opening — equals railLengthMm. */
  openingWidthMm: number;
  /** Total glue surface area in mm² across all rail-to-stile joints. */
  totalGlueSurfaceMm2: number;
  /** Ordered list of parts needed to build the face frame. */
  partList: FaceFramePart[];
}

const DEFAULT_STILE_WIDTH_MM = 38;
const DEFAULT_RAIL_WIDTH_MM = 38;

/**
 * Calculate face frame dimensions and cut list for a cabinet.
 *
 * Stiles run the full cabinet height; rails span horizontally between them.
 * For N openings there are N + 1 rails (top, N − 1 middles, bottom).
 *
 * @throws {RangeError} when any dimension is non-positive, openingCount is
 *   outside 1–4, or the frame members leave no room for openings.
 */
export function calculateFaceFrame(input: FaceFrameInput): FaceFrameResult {
  const {
    cabinetWidthMm,
    cabinetHeightMm,
    stileWidthMm = DEFAULT_STILE_WIDTH_MM,
    railWidthMm = DEFAULT_RAIL_WIDTH_MM,
    openingCount = 1,
  } = input;

  if (cabinetWidthMm <= 0) throw new RangeError('cabinetWidthMm must be > 0');
  if (cabinetHeightMm <= 0) throw new RangeError('cabinetHeightMm must be > 0');
  if (stileWidthMm <= 0) throw new RangeError('stileWidthMm must be > 0');
  if (railWidthMm <= 0) throw new RangeError('railWidthMm must be > 0');
  if (!Number.isInteger(openingCount) || openingCount < 1 || openingCount > 4) {
    throw new RangeError('openingCount must be an integer between 1 and 4');
  }

  const railLengthMm = cabinetWidthMm - 2 * stileWidthMm;
  if (railLengthMm <= 0) {
    throw new RangeError('stileWidthMm is too wide — no room for an opening');
  }

  const totalRailWidthUsed = (openingCount + 1) * railWidthMm;
  if (totalRailWidthUsed >= cabinetHeightMm) {
    throw new RangeError('railWidthMm × (openingCount + 1) leaves no room for openings');
  }

  const stileLengthMm = cabinetHeightMm;
  const openingWidthMm = railLengthMm;
  const openingHeightMm = (cabinetHeightMm - totalRailWidthUsed) / openingCount;

  // Each rail has two end joints (one per stile).
  // Contact area per joint ≈ railWidthMm × stileWidthMm (practical approximation).
  const numberOfRails = openingCount + 1;
  const totalGlueSurfaceMm2 = 2 * numberOfRails * railWidthMm * stileWidthMm;

  const partList: FaceFramePart[] = [
    { label: 'Stile', lengthMm: stileLengthMm, widthMm: stileWidthMm, qty: 2 },
    { label: 'Top Rail', lengthMm: railLengthMm, widthMm: railWidthMm, qty: 1 },
    { label: 'Bottom Rail', lengthMm: railLengthMm, widthMm: railWidthMm, qty: 1 },
  ];

  if (openingCount > 1) {
    partList.push({
      label: 'Middle Rail',
      lengthMm: railLengthMm,
      widthMm: railWidthMm,
      qty: openingCount - 1,
    });
  }

  return {
    stileLengthMm,
    railLengthMm,
    openingHeightMm,
    openingWidthMm,
    totalGlueSurfaceMm2,
    partList,
  };
}
