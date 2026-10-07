/**
 * WebSerial CNC Sender — Future Horizons / Sprint 12
 *
 * Sends G-code directly to a CNC controller over the Web Serial API.
 * Feature-flagged: the module exports a compile-time constant
 * `WEB_SERIAL_SUPPORTED` that callers can use to gate the UI.
 *
 * Protocol:
 *   1. User calls `openSerialPort(options)` — pops the browser port picker.
 *   2. Returns a `CncSerialSession` handle.
 *   3. Caller calls `session.send(gcode)` to stream lines one-by-one.
 *   4. Caller calls `session.close()` when done.
 *
 * Supported controllers (baud rate defaults):
 *   - Grbl  : 115200
 *   - LinuxCNC / Mach3 via plugin: 9600
 *   - Smoothieboard : 115200
 *   - TinyG : 115200
 *
 * API-dependent operations throw a `WebSerialUnsupportedError` when the API
 * is absent; feature-detection helpers remain safe to call.
 */

import { utf8Encode } from './browser-compat';
import { DEFAULT_SERIAL_PROFILE } from '../engine/webserial-v2';
import type { WebSerialProfile } from '../engine/webserial-v2';

// ── Feature detection ─────────────────────────────────────────────────────────

/** True when the Web Serial API is available in this browser context. */
export const WEB_SERIAL_SUPPORTED: boolean = typeof navigator !== 'undefined' && 'serial' in navigator;

/** Runtime check — re-evaluates on every call so stubs in tests are honoured. */
export function isWebSerialAvailable(): boolean {
  return typeof navigator !== 'undefined' && (navigator as Navigator & { serial?: unknown }).serial != null;
}

/** Browser serial-port handle used by the CNC transport adapter. */
export interface SerialPortHandle {
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

// ── Error types ───────────────────────────────────────────────────────────────

export class WebSerialUnsupportedError extends Error {
  constructor() {
    super('Web Serial API is not available in this browser. Use Chrome 89+ or Edge 89+.');
    this.name = 'WebSerialUnsupportedError';
  }
}

export class SerialPortClosedError extends Error {
  constructor() {
    super('Serial port is not open.');
    this.name = 'SerialPortClosedError';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** Known CNC controller presets. */
export type CncController = 'grbl' | 'linuxcnc' | 'mach3' | 'smoothie' | 'tinyg' | 'custom';

export interface SerialOptions extends Partial<WebSerialProfile> {
  /** Baud rate (default: 115200). */
  baudRate?: number;
  /** CNC controller hint — used to set default baud rate and line ending. */
  controller?: CncController;
  /** Line ending appended to each G-code line. Default: '\n'. */
  lineEnding?: '\n' | '\r\n';
}

export interface SendProgress {
  /** Total number of G-code lines in the current job. */
  total: number;
  /** Number of lines sent so far. */
  sent: number;
  /** 0–100 % */
  percent: number;
}

/** Live CNC serial session returned by {@link openSerialPort}. */
export interface CncSerialSession {
  /**
   * Send a G-code string to the CNC controller.
   * Lines are sent one at a time with an optional inter-line delay.
   * @param gcode  Raw G-code string (multi-line allowed).
   * @param onProgress  Optional progress callback.
   * @param signal  Optional cancellation signal.
   */
  send(gcode: string, onProgress?: (p: SendProgress) => void, signal?: AbortSignal): Promise<void>;
  /** Close the serial port and release resources. */
  close(): Promise<void>;
  /** Whether the port is still open. */
  readonly isOpen: boolean;
}

// ── Baud rate presets ─────────────────────────────────────────────────────────

const CONTROLLER_BAUD: Record<CncController, number> = {
  grbl: 115200,
  linuxcnc: 9600,
  mach3: 9600,
  smoothie: 115200,
  tinyg: 115200,
  custom: 115200,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Open a serial port to a CNC controller.
 * Triggers the browser's port picker dialog.
 *
 * @throws {@link WebSerialUnsupportedError} when the API is unavailable.
 * @throws When the user dismisses the port picker.
 */
export async function openSerialPort(options: SerialOptions = {}): Promise<CncSerialSession> {
  const controller = options.controller ?? 'grbl';
  const baudRate = options.baudRate ?? CONTROLLER_BAUD[controller];
  const lineEnding = options.lineEnding ?? '\n';
  const port = await connectToMachine({ ...DEFAULT_SERIAL_PROFILE, ...options, baudRate });
  let _open = true;

  return {
    get isOpen() {
      return _open;
    },

    async send(gcode: string, onProgress?: (p: SendProgress) => void, signal?: AbortSignal): Promise<void> {
      if (!_open) throw new SerialPortClosedError();
      const lines = gcode
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith(';'));
      const total = lines.length;
      await streamGcodeLines(
        port,
        lines,
        (sent) => onProgress?.({ total, sent, percent: Math.round((sent / total) * 100) }),
        signal,
        lineEnding,
      );
    },

    async close(): Promise<void> {
      if (!_open) return;
      _open = false;
      await disconnectFromMachine(port);
    },
  };
}

/**
 * List previously-granted serial ports (does not trigger the port picker).
 * Returns an empty array when the API is unsupported.
 */
export async function listGrantedPorts(): Promise<SerialPortInfo[]> {
  if (!isWebSerialAvailable()) return [];
  const ports = await (navigator as Navigator & { serial: SerialApi }).serial.getPorts();
  return ports.map((p) => {
    try {
      return p.getInfo();
    } catch {
      return {};
    }
  });
}

/**
 * Return the recommended baud rate for a known CNC controller.
 * Returns 115200 for unknown / custom controllers.
 */
export function getDefaultBaudRate(controller: CncController): number {
  return CONTROLLER_BAUD[controller] ?? 115200;
}

/**
 * Open the browser port picker and connect using a machine profile.
 *
 * @param profile Serial connection settings.
 * @returns The opened browser serial port.
 * @throws {@link WebSerialUnsupportedError} when Web Serial is unavailable.
 */
export async function connectToMachine(profile: WebSerialProfile): Promise<SerialPortHandle> {
  if (!isWebSerialAvailable()) throw new WebSerialUnsupportedError();
  const port = await (navigator as Navigator & { serial: SerialApi }).serial.requestPort();
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
 * Stream G-code lines to an open serial port, yielding between writes for UI progress.
 *
 * @param port Open serial port.
 * @param lines G-code lines without trailing line endings.
 * @param onProgress Called after each written line with sent and total counts.
 * @param signal Optional cancellation signal.
 * @param lineEnding Line ending appended to each line.
 * @returns Resolves when all lines are written or cancellation is requested.
 * @throws Error when the port has no writable stream.
 */
export async function streamGcodeLines(
  port: SerialPortHandle,
  lines: readonly string[],
  onProgress?: (sent: number, total: number) => void,
  signal?: AbortSignal,
  lineEnding = '\n',
): Promise<void> {
  if (!port.writable) throw new Error('Serial port is not writable. Is it still open?');
  const writer = port.writable.getWriter();
  try {
    for (let index = 0; index < lines.length; index++) {
      if (signal?.aborted) break;
      await writer.write(utf8Encode(lines[index] + lineEnding));
      onProgress?.(index + 1, lines.length);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    writer.releaseLock();
  }
}

/**
 * Close a serial port, ignoring errors from ports already closed by the browser.
 *
 * @param port Serial port to close.
 * @returns Resolves after close is attempted.
 */
export async function disconnectFromMachine(port: SerialPortHandle): Promise<void> {
  try {
    await port.close();
  } catch {
    // The browser may already have closed the port.
  }
}

// ── Minimal Web Serial API typings (not yet in @types/w3c-web-serial everywhere) ─

interface SerialPort extends SerialPortHandle {
  readonly readable: ReadableStream<Uint8Array>;
  getInfo(): SerialPortInfo;
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface SerialApi {
  requestPort(): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}
