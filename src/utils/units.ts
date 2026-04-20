export type UnitSystem = 'metric' | 'imperial';

const MM_PER_INCH = 25.4;

/** Convert millimeters to inches (rounded to 1/16") */
export function mmToInches(mm: number): string {
  const inches = mm / MM_PER_INCH;
  // Show fractional inches (nearest 1/16)
  const whole = Math.floor(inches);
  const frac = inches - whole;
  const sixteenths = Math.round(frac * 16);
  if (sixteenths === 0) return `${whole}"`;
  if (sixteenths === 16) return `${whole + 1}"`;
  // Simplify fraction
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(sixteenths, 16);
  const num = sixteenths / g;
  const den = 16 / g;
  return whole > 0 ? `${whole}-${num}/${den}"` : `${num}/${den}"`;
}

/** Convert millimeters to a display string based on unit system */
export function formatDim(mm: number, units: UnitSystem): string {
  if (units === 'imperial') return mmToInches(mm);
  return `${mm} mm`;
}

/** Slider step in mm for the given unit system */
export function sliderStep(units: UnitSystem): number {
  // Imperial: step by ~1/4" ≈ 6.35mm, round to 6mm for clean values
  return units === 'imperial' ? 6 : 10;
}
