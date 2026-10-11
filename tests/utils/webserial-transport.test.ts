import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectToMachine,
  disconnectFromMachine,
  isWebSerialAvailable,
  streamGcodeLines,
  WebSerialUnsupportedError,
} from '../../src/utils/webserial-cnc';
import type { SerialPortHandle } from '../../src/utils/webserial-cnc';
import { DEFAULT_SERIAL_PROFILE } from '../../src/engine/webserial-v2';
import type { WebSerialProfile } from '../../src/engine/webserial-v2';

interface SerialApiStub {
  requestPort: ReturnType<typeof vi.fn<() => Promise<SerialPortHandle>>>;
}

const originalSerialDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serial');

function createPort() {
  const written: Uint8Array[] = [];
  const write = vi.fn((chunk: Uint8Array) => {
    written.push(chunk);
  });
  const writable = new WritableStream<Uint8Array>({ write });
  const port: SerialPortHandle = {
    open: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    writable,
    readable: null,
  };

  return { port, written, write };
}

function stubSerialApi(port: SerialPortHandle): SerialApiStub {
  const api = { requestPort: vi.fn(async () => port) };
  Object.defineProperty(navigator, 'serial', { value: api, configurable: true });
  return api;
}

beforeEach(() => {
  Reflect.deleteProperty(navigator, 'serial');
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serial');
  if (originalSerialDescriptor) Object.defineProperty(navigator, 'serial', originalSerialDescriptor);
});

describe('isWebSerialAvailable', () => {
  it('returns false when the browser does not expose the Serial API', () => {
    expect(isWebSerialAvailable()).toBe(false);
  });

  it('returns true when the browser exposes the Serial API', () => {
    const { port } = createPort();
    stubSerialApi(port);

    expect(isWebSerialAvailable()).toBe(true);
  });
});

describe('connectToMachine', () => {
  it('rejects when the Serial API is unavailable', async () => {
    await expect(connectToMachine(DEFAULT_SERIAL_PROFILE)).rejects.toBeInstanceOf(WebSerialUnsupportedError);
  });

  it('requests and opens a port with the complete profile defaults', async () => {
    const { port } = createPort();
    const serial = stubSerialApi(port);

    await expect(connectToMachine({ baudRate: 57600 })).resolves.toBe(port);

    expect(serial.requestPort).toHaveBeenCalledOnce();
    expect(port.open).toHaveBeenCalledWith({
      baudRate: 57600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      bufferSize: 4096,
    });
  });

  it('passes explicit profile options through to the selected port', async () => {
    const { port } = createPort();
    stubSerialApi(port);
    const profile: WebSerialProfile = { baudRate: 9600, dataBits: 7, stopBits: 2, parity: 'even', bufferSize: 128 };

    await connectToMachine(profile);

    expect(port.open).toHaveBeenCalledWith(profile);
  });

  it('propagates a port-picker rejection', async () => {
    const serial = { requestPort: vi.fn(async () => Promise.reject(new Error('Picker cancelled'))) };
    Object.defineProperty(navigator, 'serial', { value: serial, configurable: true });

    await expect(connectToMachine(DEFAULT_SERIAL_PROFILE)).rejects.toThrow('Picker cancelled');
  });
});

describe('streamGcodeLines', () => {
  it('writes newline-terminated UTF-8 lines and reports progress', async () => {
    const { port, written, write } = createPort();
    const progress: Array<[number, number]> = [];

    await streamGcodeLines(port, ['G28', 'G1 X10'], (sent, total) => progress.push([sent, total]));

    expect(written.map((chunk) => new TextDecoder().decode(chunk))).toEqual(['G28\n', 'G1 X10\n']);
    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('stops before writing when the abort signal is already set', async () => {
    const { port, write } = createPort();
    const controller = new AbortController();
    controller.abort();

    await streamGcodeLines(port, ['G28'], undefined, controller.signal);

    expect(write).not.toHaveBeenCalled();
  });

  it('throws when the port has no writable stream', async () => {
    const { port } = createPort();
    const closedPort: SerialPortHandle = { ...port, writable: null };

    await expect(streamGcodeLines(closedPort, ['G28'])).rejects.toThrow(
      'Serial port is not writable. Is it still open?',
    );
  });
});

describe('disconnectFromMachine', () => {
  it('closes the port', async () => {
    const { port } = createPort();

    await disconnectFromMachine(port);

    expect(port.close).toHaveBeenCalledOnce();
  });

  it('ignores an error when the port is already closed', async () => {
    const { port } = createPort();
    port.close = vi.fn(async () => Promise.reject(new Error('Already closed')));

    await expect(disconnectFromMachine(port)).resolves.toBeUndefined();
  });
});
