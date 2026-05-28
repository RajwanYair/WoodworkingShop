/**
 * Frame and Panel Calculator — Sprint 229
 *
 * Calculates the floating panel dimensions for a frame-and-panel door or wainscoting.
 *
 * Panel sits in a groove routed or cut into the inner edges of the stiles and rails.
 * The panel must be narrower than the groove opening to allow for seasonal wood movement.
 *
 * panelWidth  = frameWidth  - 2 × stileWidth + 2 × grooveDepth - 2 × float
 * panelHeight = frameHeight - 2 × railWidth  + 2 × grooveDepth - 2 × float
 */

export interface FramePanelInput {
  /** Outer frame width in mm */
  frameWidthMm: number;
  /** Outer frame height in mm */
  frameHeightMm: number;
  /** Width of each stile (left/right vertical members) in mm */
  stileWidthMm: number;
  /** Width of each rail (top/bottom horizontal members) in mm */
  railWidthMm: number;
  /** Depth the panel sits into the groove in mm (default 9.5 mm — 3/8") */
  grooveDepthMm?: number;
  /** Clearance between panel edge and groove bottom on each side in mm (default 3 mm) */
  panelFloatMm?: number;
  /** Width of the groove cut into the frame members in mm (default 6.35 mm — 1/4") */
  grooveWidthMm?: number;
}

export interface FramePanelResult {
  /** Finished panel width in mm */
  panelWidthMm: number;
  /** Finished panel height in mm */
  panelHeightMm: number;
  /** Total float (expansion space) in the width direction in mm */
  widthFloatMm: number;
  /** Total float (expansion space) in the height direction in mm */
  heightFloatMm: number;
  /** Groove width to use in mm */
  grooveWidthMm: number;
  /** Groove depth to use in mm */
  grooveDepthMm: number;
}

export function calculateFramePanel(input: FramePanelInput): FramePanelResult {
  const {
    frameWidthMm,
    frameHeightMm,
    stileWidthMm,
    railWidthMm,
    grooveDepthMm = 9.5,
    panelFloatMm = 3,
    grooveWidthMm = 6.35,
  } = input;

  if (frameWidthMm <= 0) throw new RangeError('frameWidthMm must be positive');
  if (frameHeightMm <= 0) throw new RangeError('frameHeightMm must be positive');
  if (stileWidthMm <= 0) throw new RangeError('stileWidthMm must be positive');
  if (railWidthMm <= 0) throw new RangeError('railWidthMm must be positive');
  if (grooveDepthMm <= 0) throw new RangeError('grooveDepthMm must be positive');
  if (panelFloatMm < 0) throw new RangeError('panelFloatMm must be non-negative');

  // Opening between the inner edges of the stiles / rails
  const openingWidthMm = frameWidthMm - 2 * stileWidthMm;
  const openingHeightMm = frameHeightMm - 2 * railWidthMm;

  if (openingWidthMm <= 0) throw new RangeError('stiles are wider than the frame allows');
  if (openingHeightMm <= 0) throw new RangeError('rails are taller than the frame allows');

  // Panel spans opening + 2 × groove depth, then subtract float on both sides
  const panelWidthMm = openingWidthMm + 2 * grooveDepthMm - 2 * panelFloatMm;
  const panelHeightMm = openingHeightMm + 2 * grooveDepthMm - 2 * panelFloatMm;

  return {
    panelWidthMm: Math.round(panelWidthMm * 10) / 10,
    panelHeightMm: Math.round(panelHeightMm * 10) / 10,
    widthFloatMm: 2 * panelFloatMm,
    heightFloatMm: 2 * panelFloatMm,
    grooveWidthMm,
    grooveDepthMm,
  };
}
