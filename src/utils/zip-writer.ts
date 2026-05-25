/**
 * Sprint 86 — Minimal PKZIP (no-compression / stored) writer.
 *
 * Generates a valid ZIP archive from in-memory file entries without any
 * external dependencies.  Compression method 0 (STORED) is used for
 * all entries so no deflate library is required.
 *
 * Reference: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 * (PKWARE Application Note — APPNOTE 6.3.10)
 */

// ─── CRC-32 ───────────────────────────────────────────────────────────────────

/** Pre-computed CRC-32 lookup table (IEEE 802.3 polynomial 0xEDB88320). */
const CRC32_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Encoding helpers ─────────────────────────────────────────────────────────

const TEXT_ENCODER = new TextEncoder();

function encodeStr(s: string): Uint8Array {
  return TEXT_ENCODER.encode(s);
}

/** Write a little-endian uint16 at `offset` into `view`. */
function writeU16(view: DataView, offset: number, v: number): void {
  view.setUint16(offset, v, true);
}

/** Write a little-endian uint32 at `offset` into `view`. */
function writeU32(view: DataView, offset: number, v: number): void {
  view.setUint32(offset, v, true);
}

// ─── ZIP constants ────────────────────────────────────────────────────────────

const SIG_LOCAL = 0x04034b50; // Local file header signature
const SIG_CENTRAL = 0x02014b50; // Central directory header signature
const SIG_EOCD = 0x06054b50; // End of central directory signature
const METHOD_STORED = 0; // No compression
const VERSION_NEEDED = 20; // Version 2.0 needed (STORED method)
const VERSION_MADE = 0x0314; // Version 3.20 made by Unix
const DOS_DATE = 0x0000; // DOS date = 0 (no modification date)
const DOS_TIME = 0x0000;

// ─── Public API ───────────────────────────────────────────────────────────────

/** A single file entry to be included in the ZIP archive. */
export interface ZipEntry {
  /** Path + filename inside the archive (UTF-8). */
  name: string;
  /** Raw file data. */
  data: Uint8Array;
}

/**
 * Build a ZIP archive from an array of file entries.
 *
 * @returns A `Uint8Array` containing the complete ZIP file.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  const offsets: number[] = [];
  let localSize = 0;

  for (const entry of entries) {
    const nameBytes = encodeStr(entry.name);
    const dataSize = entry.data.length;
    const crc = crc32(entry.data);

    // ── Local file header (30 + nameLen bytes) ──
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    writeU32(lv, 0, SIG_LOCAL);
    writeU16(lv, 4, VERSION_NEEDED);
    writeU16(lv, 6, 0x0800); // General-purpose bit flag: bit 11 = UTF-8 filename
    writeU16(lv, 8, METHOD_STORED);
    writeU16(lv, 10, DOS_TIME);
    writeU16(lv, 12, DOS_DATE);
    writeU32(lv, 14, crc);
    writeU32(lv, 18, dataSize); // Compressed size (= uncompressed for STORED)
    writeU32(lv, 22, dataSize); // Uncompressed size
    writeU16(lv, 26, nameBytes.length);
    writeU16(lv, 28, 0); // Extra field length
    localHeader.set(nameBytes, 30);

    offsets.push(localSize);
    localSize += localHeader.length + dataSize;
    localHeaders.push(localHeader);
    localHeaders.push(entry.data);

    // ── Central directory record (46 + nameLen bytes) ──
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    writeU32(cv, 0, SIG_CENTRAL);
    writeU16(cv, 4, VERSION_MADE);
    writeU16(cv, 6, VERSION_NEEDED);
    writeU16(cv, 8, 0x0800); // UTF-8 flag
    writeU16(cv, 10, METHOD_STORED);
    writeU16(cv, 12, DOS_TIME);
    writeU16(cv, 14, DOS_DATE);
    writeU32(cv, 16, crc);
    writeU32(cv, 20, dataSize);
    writeU32(cv, 24, dataSize);
    writeU16(cv, 28, nameBytes.length);
    writeU16(cv, 30, 0); // Extra field length
    writeU16(cv, 32, 0); // File comment length
    writeU16(cv, 34, 0); // Disk number start
    writeU16(cv, 36, 0); // Internal attributes
    writeU32(cv, 38, 0); // External attributes
    writeU32(cv, 42, offsets[offsets.length - 1]!); // Relative offset of local header
    central.set(nameBytes, 46);
    centralHeaders.push(central);
  }

  const centralSize = centralHeaders.reduce((s, c) => s + c.length, 0);

  // ── End of central directory record (22 bytes) ──
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  writeU32(ev, 0, SIG_EOCD);
  writeU16(ev, 4, 0); // Disk number
  writeU16(ev, 6, 0); // Disk with central directory
  writeU16(ev, 8, entries.length); // Entries on this disk
  writeU16(ev, 10, entries.length); // Total entries
  writeU32(ev, 12, centralSize); // Central directory size
  writeU32(ev, 16, localSize); // Central directory offset
  writeU16(ev, 20, 0); // Comment length

  // ── Assemble final buffer ──
  const totalSize = localSize + centralSize + eocd.length;
  const out = new Uint8Array(totalSize);
  let pos = 0;

  for (const chunk of localHeaders) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  for (const chunk of centralHeaders) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  out.set(eocd, pos);

  return out;
}

/**
 * Trigger a browser download of `data` as `filename`.
 */
export function downloadZip(data: Uint8Array, filename: string): void {
  // Copy into a plain ArrayBuffer to satisfy Blob's type constraint
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  const blob = new Blob([ab], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
