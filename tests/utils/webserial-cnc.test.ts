/**
 * WebSerial CNC Sender — Future Horizons / Sprint 12
 *
 * Tests for src/utils/webserial-cnc.ts
 * Uses vi.stubGlobal to simulate Web Serial API presence/absence.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
  WEB_SERIAL_SUPPORTED,
  WebSerialUnsupportedError,
  SerialPortClosedError,
  openSerialPort,
  listGrantedPorts,
  getDefaultBaudRate,
} from '../../src/utils/webserial-cnc';

// ── Web Serial API mock ───────────────────────────────────────────────────────

function makeWritableStream() {
  const written: Uint8Array[] = [];
  const writer = {
    write: vi.fn(async (chunk: Uint8Array) => { written.push(chunk); }),
    releaseLock: vi.fn(),
  };
  return {
    getWriter: () => writer,
    _written: written,
  };
}

function makeSerialPort(writableStream = makeWritableStream()) {
  return {
    open: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    writable: writableStream,
    readable: {} as ReadableStream,
    getInfo: vi.fn(() => ({ usbVendorId: 0x1234, usbProductId: 0xABCD })),
    _written: writableStream._written,
  };
}

function makeSerialApi(port = makeSerialPort()) {
  return {
    requestPort: vi.fn(async () => port),
    getPorts: vi.fn(async () => [port]),
    _port: port,
  };
}

function stubSerialApi(api = makeSerialApi()) {
  Object.defineProperty(navigator, 'serial', { value: api, configurable: true });
  return api;
}

// ── WEB_SERIAL_SUPPORTED ──────────────────────────────────────────────────────

describe('WEB_SERIAL_SUPPORTED', () => {
  it('is a boolean', () => {
    expect(typeof WEB_SERIAL_SUPPORTED).toBe('boolean');
  });
});

// ── getDefaultBaudRate ────────────────────────────────────────────────────────

describe('getDefaultBaudRate', () => {
  it('returns 115200 for grbl', () => {
    expect(getDefaultBaudRate('grbl')).toBe(115200);
  });

  it('returns 9600 for linuxcnc', () => {
    expect(getDefaultBaudRate('linuxcnc')).toBe(9600);
  });

  it('returns 9600 for mach3', () => {
    expect(getDefaultBaudRate('mach3')).toBe(9600);
  });

  it('returns 115200 for smoothie', () => {
    expect(getDefaultBaudRate('smoothie')).toBe(115200);
  });

  it('returns 115200 for tinyg', () => {
    expect(getDefaultBaudRate('tinyg')).toBe(115200);
  });

  it('returns 115200 for custom', () => {
    expect(getDefaultBaudRate('custom')).toBe(115200);
  });
});

// ── WebSerialUnsupportedError ─────────────────────────────────────────────────

describe('WebSerialUnsupportedError', () => {
  it('is an Error subclass', () => {
    expect(new WebSerialUnsupportedError()).toBeInstanceOf(Error);
  });

  it('has the correct name', () => {
    expect(new WebSerialUnsupportedError().name).toBe('WebSerialUnsupportedError');
  });
});

describe('SerialPortClosedError', () => {
  it('is an Error subclass', () => {
    expect(new SerialPortClosedError()).toBeInstanceOf(Error);
  });
});

// ── openSerialPort — unsupported environment ──────────────────────────────────

describe('openSerialPort when Web Serial API absent', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'serial', { value: undefined, configurable: true });
  });

  it('throws WebSerialUnsupportedError', async () => {
    await expect(openSerialPort()).rejects.toBeInstanceOf(WebSerialUnsupportedError);
  });
});

// ── openSerialPort — supported environment ────────────────────────────────────

describe('openSerialPort when Web Serial API present', () => {
  let api: ReturnType<typeof makeSerialApi>;
  let port: ReturnType<typeof makeSerialPort>;

  beforeEach(() => {
    port = makeSerialPort();
    api = makeSerialApi(port);
    stubSerialApi(api);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'serial', { value: undefined, configurable: true });
  });

  it('calls requestPort()', async () => {
    const session = await openSerialPort();
    expect(api.requestPort).toHaveBeenCalled();
    await session.close();
  });

  it('opens the port with the correct baud rate', async () => {
    const session = await openSerialPort({ baudRate: 9600 });
    expect(port.open).toHaveBeenCalledWith({ baudRate: 9600 });
    await session.close();
  });

  it('uses controller-default baud rate when baudRate not given', async () => {
    const session = await openSerialPort({ controller: 'mach3' });
    expect(port.open).toHaveBeenCalledWith({ baudRate: 9600 });
    await session.close();
  });

  it('isOpen is true after open, false after close', async () => {
    const session = await openSerialPort();
    expect(session.isOpen).toBe(true);
    await session.close();
    expect(session.isOpen).toBe(false);
  });

  it('send() writes encoded lines', async () => {
    const session = await openSerialPort();
    await session.send('G28\nG1 X10 F500');
    const decoder = new TextDecoder();
    const sent = port._written.map((b) => decoder.decode(b)).join('');
    expect(sent).toContain('G28');
    expect(sent).toContain('G1 X10 F500');
    await session.close();
  });

  it('send() skips blank lines and comments', async () => {
    const session = await openSerialPort();
    await session.send('\n; this is a comment\nG28\n\n');
    expect(port._written).toHaveLength(1); // only G28
    await session.close();
  });

  it('send() calls onProgress with correct fractions', async () => {
    const session = await openSerialPort();
    const progress: number[] = [];
    await session.send('G28\nG1 X10', (p) => progress.push(p.percent));
    expect(progress).toEqual([50, 100]);
    await session.close();
  });

  it('send() throws SerialPortClosedError after close()', async () => {
    const session = await openSerialPort();
    await session.close();
    await expect(session.send('G28')).rejects.toBeInstanceOf(SerialPortClosedError);
  });

  it('close() is idempotent', async () => {
    const session = await openSerialPort();
    await session.close();
    await expect(session.close()).resolves.toBeUndefined();
  });
});

// ── listGrantedPorts ──────────────────────────────────────────────────────────

describe('listGrantedPorts', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'serial', { value: undefined, configurable: true });
  });

  it('returns empty array when API absent', async () => {
    Object.defineProperty(navigator, 'serial', { value: undefined, configurable: true });
    expect(await listGrantedPorts()).toEqual([]);
  });

  it('returns port info array when API present', async () => {
    const port = makeSerialPort();
    stubSerialApi(makeSerialApi(port));
    const result = await listGrantedPorts();
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('usbVendorId');
  });
});
