/**
 * Shared browser-compatibility helpers.
 *
 * These helpers keep browser-sensitive globals in one place so the rest of
 * the codebase can stay easier to lint and test.
 */

export type QueryRecord = Record<string, string>;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface MediaRecorderConstructorLike {
  isTypeSupported(mimeType: string): boolean;
  new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
}

function decodeQueryComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value.replace(/\+/g, ' ');
  }
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

/** Encode a string as UTF-8 bytes without relying on `TextEncoder`. */
export function utf8Encode(value: string): Uint8Array {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index++) {
    const first = value.charCodeAt(index);
    let codePoint = first;

    if (first >= 0xd800 && first <= 0xdbff && index + 1 < value.length) {
      const second = value.charCodeAt(index + 1);
      if (second >= 0xdc00 && second <= 0xdfff) {
        codePoint = ((first - 0xd800) << 10) + (second - 0xdc00) + 0x10000;
        index++;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return new Uint8Array(bytes);
}

export function utf8ByteLength(value: string): number {
  return utf8Encode(value).byteLength;
}

/**
 * Encode a string as an `ArrayBuffer` suitable for Web Crypto `digest` input.
 */
export function utf8ArrayBuffer(value: string): ArrayBuffer {
  const encoded = utf8Encode(value);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getFetch(): FetchLike | null {
  const candidate = (globalThis as Record<string, unknown>)['fetch'];
  return typeof candidate === 'function' ? (candidate as FetchLike) : null;
}

export function parseQueryString(search: string): QueryRecord {
  const source = search.startsWith('?') ? search.slice(1) : search;
  const params: QueryRecord = {};
  if (!source) return params;

  for (const segment of source.split('&')) {
    if (!segment) continue;
    const equalsIndex = segment.indexOf('=');
    const rawKey = equalsIndex < 0 ? segment : segment.slice(0, equalsIndex);
    const rawValue = equalsIndex < 0 ? '' : segment.slice(equalsIndex + 1);
    const key = decodeQueryComponent(rawKey);
    if (!key) continue;
    params[key] = decodeQueryComponent(rawValue);
  }

  return params;
}

export function serializeQueryRecord(params: QueryRecord): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === '') continue;
    parts.push(`${encodeQueryComponent(key)}=${encodeQueryComponent(value)}`);
  }
  return parts.join('&');
}

export function getQueryValue(search: string, key: string): string | null {
  const params = parseQueryString(search);
  return Object.prototype.hasOwnProperty.call(params, key) ? params[key]! : null;
}

export function getMediaRecorderConstructor(): MediaRecorderConstructorLike | null {
  const candidate = (globalThis as Record<string, unknown>)['MediaRecorder'];
  return typeof candidate === 'function' ? (candidate as MediaRecorderConstructorLike) : null;
}
