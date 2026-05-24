/**
 * Phase 13 / Sprint 19 — Export integrity checksums.
 * SHA-256 via Web Crypto API (available in modern browsers and Vitest / Node ≥ 16).
 */

/**
 * Compute a SHA-256 digest of a UTF-8 string.
 * Returns the hex string (64 lowercase characters).
 */
export async function sha256Hex(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Insert a SHA-256 checksum comment into a DXF string immediately before the
 * closing `0\nEOF` marker.  The hash covers the DXF body *without* the hash
 * line itself, so recipients can verify by stripping the last comment line and
 * recomputing.
 */
export async function appendChecksumToDxf(dxf: string): Promise<string> {
  const hash = await sha256Hex(dxf);
  // Insert before the final \n0\nEOF (DXF group 0, entity EOF)
  return dxf.replace(/\n0\nEOF$/, `\n999\n; SHA-256: ${hash}\n0\nEOF`);
}

/**
 * Append a SHA-256 checksum comment line to a G-code string.
 * The hash covers the G-code content *without* the appended checksum line.
 */
export async function appendChecksumToGcode(gcode: string): Promise<string> {
  const hash = await sha256Hex(gcode);
  return `${gcode}\n; SHA-256: ${hash}`;
}
