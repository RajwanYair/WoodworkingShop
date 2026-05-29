export type CrownCutMethod = 'flat' | 'in_position';

export interface CrownMouldingInput {
  cornerAngleDeg: number;
  springAngleDeg: number;
  cuttingMethod: CrownCutMethod;
}

export interface CrownMouldingResult {
  miterAngleDeg: number;
  bevelAngleDeg: number;
  cuttingMethod: CrownCutMethod;
}

export function calculateCrownMoulding(input: CrownMouldingInput): CrownMouldingResult {
  const { cornerAngleDeg, springAngleDeg, cuttingMethod } = input;

  if (cornerAngleDeg <= 0 || cornerAngleDeg >= 180) {
    throw new RangeError('cornerAngleDeg must be between 0° and 180° (exclusive)');
  }
  if (springAngleDeg <= 0 || springAngleDeg >= 90) {
    throw new RangeError('springAngleDeg must be between 0° and 90° (exclusive)');
  }

  if (cuttingMethod === 'in_position') {
    const miterAngleDeg = Math.round(((180 - cornerAngleDeg) / 2) * 10) / 10;
    return {
      miterAngleDeg,
      bevelAngleDeg: 0,
      cuttingMethod,
    };
  }

  // flat cut — compound angle formulas
  const halfCornerRad = ((cornerAngleDeg / 2) * Math.PI) / 180;
  const springRad = (springAngleDeg * Math.PI) / 180;

  const miterRad = Math.atan(Math.cos(springRad) * Math.tan(halfCornerRad));
  const sinBevel = Math.sin(springRad) * Math.sin(halfCornerRad);

  if (Math.abs(sinBevel) > 1) {
    throw new RangeError('Invalid combination of cornerAngleDeg and springAngleDeg');
  }

  const bevelRad = Math.asin(sinBevel);
  const miterAngleDeg = Math.round(((miterRad * 180) / Math.PI) * 10) / 10;
  const bevelAngleDeg = Math.round(((bevelRad * 180) / Math.PI) * 10) / 10;

  return {
    miterAngleDeg,
    bevelAngleDeg,
    cuttingMethod,
  };
}
