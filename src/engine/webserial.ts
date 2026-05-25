/**
 * Sprint 74 — WebSerial API integration helpers.
 *
 * Pure TypeScript — no React, no DOM side-effects.
 * All WebSerial interaction is wrapped here so the UI layer can remain thin.
 *
 * Browser support: Chrome/Edge 89+, Opera 76+. Not available in Firefox or Safari.
 * Use `isWebSerialAvailable()` for progressive-enhancement guards.
 */

// ── Minimal Web Serial API typings (not in every @types/lib version) ──────────

interface SerialPortHandle {
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: string;
    bufferSize?: number;
  }): Promise<void>;
  close(): Promise<void>;
  readonly writable: WritableStream<Uint8Array> | null;
  readonly readable: ReadableStream<Uint8Array> | null;
}

interface SerialNavigator {
  requestPort(): Promise<SerialPortHandle>;
}

// ── Public types ──────────────────────────────────────────────────────────────

/** Connection lifecycle state machine. */
export type WebSerialState = 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error';

/** Serial-port profile sent to `requestPort` / `open`. */
export interface WebSerialProfile {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  /** Receive buffer size in bytes (default 4096). */
  bufferSize?: number;
}

/** Default CNC / 3D-printer profile. */
export const DEFAULT_SERIAL_PROFILE: Readonly<WebSerialProfile> = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  bufferSize: 4096,
} as const;

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true when the Web Serial API is available in this browser context. */
export function isWebSerialAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Ask the browser to present the port-picker and open the chosen port.
 *
 * @throws {Error} when the user cancels the picker, access is denied, or
 *   the Web Serial API is unavailable.
 */
export async function connectToMachine(profile: WebSerialProfile): Promise<SerialPortHandle> {
  if (!isWebSerialAvailable()) {
    throw new Error('WebSerial API is not available in this browser.');
  }
  const serial = (navigator as Navigator & { serial: SerialNavigator }).serial;
  const port = await serial.requestPort();
  await port.open({
    baudRate: profile.baudRate,
    dataBits: profile.dataBits ?? 8,
    stopBits: profile.stopBits ?? 1,
    parity: profile.parity ?? 'none',
    bufferSize: profile.bufferSize ?? 4096,
  });
  return port;
}

/**
 * Stream an array of G-code lines to an open serial port.
 *
 * Each line is sent followed by `\n`. After every line the function yields
 * control via a microtask so callers can update progress UI.
 *
 * @param port       An already-opened port handle.
 * @param lines      Array of G-code strings (without trailing newlines).
 * @param onProgress Optional callback fired after each line with `(sent, total)`.
 * @param signal     Optional `AbortSignal` — stops streaming when aborted.
 */
export async function streamGcodeLines(
  port: SerialPortHandle,
  lines: readonly string[],
  onProgress?: (sent: number, total: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!port.writable) {
    throw new Error('Serial port is not writable. Is it still open?');
  }
  const writer = port.writable.getWriter();
  const encoder = new TextEncoder();
  try {
    for (let i = 0; i < lines.length; i++) {
      if (signal?.aborted) break;
      await writer.write(encoder.encode(lines[i] + '\n'));
      onProgress?.(i + 1, lines.length);
      // Yield to the event loop so React can re-render progress
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    }
  } finally {
    writer.releaseLock();
  }
}

/**
 * Close a serial port gracefully.
 * Safe to call even if the port is already closed.
 */
export async function disconnectFromMachine(port: SerialPortHandle): Promise<void> {
  try {
    await port.close();
  } catch {
    // Port may already be closed; silently ignore.
  }
}
