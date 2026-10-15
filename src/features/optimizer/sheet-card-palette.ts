/** Scale factor: mm → SVG px */
export const S = 0.12;

/** Deuteranopia-safe palette (Wong 2011) — distinguishable without red/green */
const CB_PALETTE = ['#0072B2', '#E69F00', '#56B4E9', '#009E73', '#F0E442', '#CC79A7', '#D55E00', '#999999'];

export function cbColor(index: number) {
  return CB_PALETTE[index % CB_PALETTE.length];
}
