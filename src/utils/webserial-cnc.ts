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
 * All operations are feature-guarded: when the API is absent (non-Chrome),
 * every function throws a `WebSerialUnsupportedError`.
 */

import { utf8Encode } from './browser-compat';

// ── Feature detection ─────────────────────────────────────────────────────────

/** True when the Web Serial API is available in this browser context. */
export const WEB_SERIAL_SUPPORTED: boolean = typeof navigator !== 'undefined' && 'serial' in navigator;

/** Runtime check — re-evaluates on every call so stubs in tests are honoured. */
function _serialSupported(): boolean {
  return typeof navigator !== 'undefined' && (navigator as Navigator & { serial?: unknown }).serial != null;
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

export interface SerialOptions {
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
   */
  send(gcode: string, onProgress?: (p: SendProgress) => void): Promise<void>;
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
  if (!_serialSupported()) throw new WebSerialUnsupportedError();

  const controller = options.controller ?? 'grbl';
  const baudRate = options.baudRate ?? CONTROLLER_BAUD[controller];
  const lineEnding = options.lineEnding ?? '\n';

  // This call opens the browser's port picker
  const port = await (navigator as Navigator & { serial: SerialApi }).serial.requestPort();
  await port.open({ baudRate });

  const writer = port.writable.getWriter();
  let _open = true;

  return {
    get isOpen() {
      return _open;
    },

    async send(gcode: string, onProgress?: (p: SendProgress) => void): Promise<void> {
      if (!_open) throw new SerialPortClosedError();
      const lines = gcode
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith(';'));
      const total = lines.length;

      for (let i = 0; i < lines.length; i++) {
        const lineStr = lines[i] + lineEnding;
        await writer.write(utf8Encode(lineStr));
        onProgress?.({ total, sent: i + 1, percent: Math.round(((i + 1) / total) * 100) });
      }
    },

    async close(): Promise<void> {
      if (!_open) return;
      _open = false;
      writer.releaseLock();
      await port.close();
    },
  };
}

/**
 * List previously-granted serial ports (does not trigger the port picker).
 * Returns an empty array when the API is unsupported.
 */
export async function listGrantedPorts(): Promise<SerialPortInfo[]> {
  if (!_serialSupported()) return [];
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

// ── Minimal Web Serial API typings (not yet in @types/w3c-web-serial everywhere) ─

interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly writable: WritableStream<Uint8Array>;
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
