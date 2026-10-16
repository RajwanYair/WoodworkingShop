/**
 * Plain-data text payloads for worker results.
 * Large text is transferred as bytes. SharedArrayBuffer is used only when the
 * page is cross-origin isolated; otherwise the caller transfers an ArrayBuffer.
 */

export const WORKER_INPUT_SCHEMA_VERSION = 1;
export const EXPORT_SHARED_BUFFER_BYTES = 2_097_152;

export interface WorkerProgress {
  readonly jobId: string;
  readonly completed: number;
  readonly total: number;
}

export interface PackedText {
  readonly shared: boolean;
  readonly byteLength: number;
  readonly bytes?: Uint8Array;
  readonly filename?: string;
}

function encodeUtf8(text: string): Uint8Array {
  const encoded = new TextEncoder().encode(text);
  const copy = new Uint8Array(encoded.byteLength);
  copy.set(encoded);
  return copy;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Write `text` into `shared` when it fits. The shared buffer is not transferred.
 * Callers must only pass a buffer allocated while `crossOriginIsolated` is true.
 */
export function packText(text: string, shared: SharedArrayBuffer | undefined, filename?: string): PackedText {
  const bytes = encodeUtf8(text);
  if (shared && shared.byteLength >= bytes.byteLength + 4) {
    new DataView(shared).setUint32(0, bytes.byteLength, true);
    new Uint8Array(shared).set(bytes, 4);
    return { shared: true, byteLength: bytes.byteLength, filename };
  }
  return { shared: false, byteLength: bytes.byteLength, bytes, filename };
}

export function unpackText(packed: PackedText, shared: SharedArrayBuffer | undefined): string {
  if (packed.shared) {
    if (!shared) throw new Error('Missing shared export buffer');
    return decodeUtf8(new Uint8Array(shared, 4, packed.byteLength));
  }
  if (!packed.bytes) throw new Error('Missing export bytes');
  return decodeUtf8(packed.bytes);
}
