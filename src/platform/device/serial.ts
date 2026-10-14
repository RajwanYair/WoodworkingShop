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

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface BrowserSerialPort extends SerialPortHandle {
  getInfo(): SerialPortInfo;
}

interface SerialApi {
  requestPort(): Promise<BrowserSerialPort>;
  getPorts(): Promise<BrowserSerialPort[]>;
}

export interface SerialConnectionProfile {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
}

function getSerialApi(): SerialApi | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { serial?: SerialApi }).serial ?? null;
}

export async function getGrantedSerialPorts(): Promise<SerialPortInfo[]> {
  const serial = getSerialApi();
  if (!serial) return [];
  const ports = await serial.getPorts();
  return ports.map((port) => {
    try {
      return port.getInfo();
    } catch {
      return {};
    }
  });
}

export async function requestSerialPort(profile: SerialConnectionProfile): Promise<SerialPortHandle> {
  const serial = getSerialApi();
  if (!serial) throw new Error('Web Serial API is unavailable');
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
