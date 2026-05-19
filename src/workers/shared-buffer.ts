/**
 * shared-buffer.ts — SharedArrayBuffer zero-copy investigation utility (Phase 2)
 *
 * SharedArrayBuffer enables zero-copy data exchange between the main thread and
 * Web Workers via a shared region of memory. However, it is only available when
 * the page is *cross-origin isolated*, which requires the server to send two
 * HTTP response headers:
 *
 *   Cross-Origin-Opener-Policy:  same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 *
 * Without these headers `crossOriginIsolated` is `false` and any attempt to
 * construct a `SharedArrayBuffer` will throw a `SecurityError` (or the
 * constructor may be `undefined` in older browsers).
 *
 * The GitHub Pages deployment used by this project does **not** set these
 * headers, so `trySharedArrayBuffer` will return `null` in production.
 * The worker pipeline falls back to the standard structured-clone transfer
 * path automatically.
 *
 * To enable cross-origin isolation locally, launch Vite with:
 *   npx vite --config vite.config.ts --open
 * and add the following to vite.config.ts `server.headers`:
 *   'Cross-Origin-Opener-Policy': 'same-origin'
 *   'Cross-Origin-Embedder-Policy': 'require-corp'
 */

/**
 * Attempt to allocate a SharedArrayBuffer of `size` bytes.
 *
 * Returns the buffer on success, or `null` when:
 * - `SharedArrayBuffer` is not defined (browser lacks support)
 * - the page is not cross-origin isolated (`crossOriginIsolated === false`)
 * - allocation fails for any other reason (e.g. out of memory)
 *
 * @param size  Requested byte length (must be ≥ 0)
 */
export function trySharedArrayBuffer(size: number): SharedArrayBuffer | null {
  if (size < 0) return null;

  // Feature detection — older browsers and non-isolated contexts may lack this.
  if (typeof SharedArrayBuffer === 'undefined') return null;

  // The crossOriginIsolated global is `false` when COOP/COEP headers are absent.
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) return null;

  try {
    return new SharedArrayBuffer(size);
  } catch {
    return null;
  }
}

/**
 * Returns `true` when the page context meets all requirements for
 * SharedArrayBuffer usage (cross-origin isolated + feature present).
 */
export function isSharedArrayBufferAvailable(): boolean {
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    (typeof crossOriginIsolated === 'undefined' || crossOriginIsolated === true)
  );
}
