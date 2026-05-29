export type CircleCutMode = 'disc' | 'hole';

export interface RouterCircleInput {
  targetDiameterMm: number;
  bitDiameterMm: number;
  pivotHoleDiameterMm?: number;
  cutMode: CircleCutMode;
}

export interface RouterCircleResult {
  armLengthMm: number;
  circumferenceMm: number;
  areaMm2: number;
  pivotOffsetMm: number;
}

export function calculateRouterCircle(input: RouterCircleInput): RouterCircleResult {
  const { targetDiameterMm, bitDiameterMm, pivotHoleDiameterMm = 6, cutMode } = input;

  if (targetDiameterMm <= 0) {
    throw new RangeError('targetDiameterMm must be greater than 0');
  }
  if (bitDiameterMm <= 0) {
    throw new RangeError('bitDiameterMm must be greater than 0');
  }
  if (bitDiameterMm >= targetDiameterMm) {
    throw new RangeError('bitDiameterMm must be less than targetDiameterMm');
  }
  if (pivotHoleDiameterMm <= 0) {
    throw new RangeError('pivotHoleDiameterMm must be greater than 0');
  }

  const radiusMm = targetDiameterMm / 2;
  const halfBitMm = bitDiameterMm / 2;

  const armLengthMm = cutMode === 'disc' ? radiusMm + halfBitMm : radiusMm - halfBitMm;

  if (cutMode === 'hole' && armLengthMm <= 0) {
    throw new RangeError('hole mode requires a positive arm length');
  }

  const circumferenceMm = Math.PI * targetDiameterMm;
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  const pivotOffsetMm = pivotHoleDiameterMm / 2;

  return {
    armLengthMm: Math.round(armLengthMm * 10) / 10,
    circumferenceMm: Math.round(circumferenceMm * 10) / 10,
    areaMm2: Math.round(areaMm2 * 10) / 10,
    pivotOffsetMm: Math.round(pivotOffsetMm * 10) / 10,
  };
}
