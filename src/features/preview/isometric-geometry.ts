/** Isometric projection helpers: convert (x, y, z) → SVG (sx, sy).
 *  Uses standard 30° isometric angles: cos30 ≈ 0.866, sin30 = 0.5 */
export function iso(x: number, y: number, z: number): [number, number] {
  const sx = (x - z) * 0.866;
  const sy = (x + z) * 0.5 - y;
  return [sx, sy];
}

export function isoQuad(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  p4: [number, number, number],
): string {
  const pts = [p1, p2, p3, p4].map(([x, y, z]) => iso(x, y, z));
  return pts.map(([sx, sy]) => `${sx},${sy}`).join(' ');
}

/** Simple brightness adjustment for hex colors */
export function adjustBrightness(hex: string, amount: number): string {
  const num = Number.parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
