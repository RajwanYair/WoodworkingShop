import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isCameraSupported,
  isWakeLockSupported,
  isWebSerialSupported,
  isWebGPUSupported,
  isWebVibrationSupported,
  requestEnvironmentCamera,
  stopMediaStream,
  vibrate,
} from '../../../src/platform/device/capabilities';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('platform device capabilities', () => {
  it('detects WebGPU only when an adapter can be acquired', async () => {
    const requestAdapter = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', { gpu: { requestAdapter } });

    await expect(isWebGPUSupported()).resolves.toBe(true);
    expect(requestAdapter).toHaveBeenCalledOnce();

    requestAdapter.mockResolvedValue(null);
    await expect(isWebGPUSupported()).resolves.toBe(false);
  });

  it('detects browser device APIs and requests an environment-facing camera', async () => {
    const stream = {} as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const vibration = vi.fn(() => true);
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
      serial: {},
      vibrate: vibration,
      wakeLock: {},
    });

    expect(isCameraSupported()).toBe(true);
    expect(isWebSerialSupported()).toBe(true);
    expect(isWebVibrationSupported()).toBe(true);
    expect(isWakeLockSupported()).toBe(true);
    await expect(requestEnvironmentCamera()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });
    expect(vibrate([10])).toBe(true);
    expect(vibration).toHaveBeenCalledWith([10]);
  });

  it('reports missing camera APIs and stops each track from an acquired stream', async () => {
    vi.stubGlobal('navigator', {});
    const stop = vi.fn();

    expect(isCameraSupported()).toBe(false);
    expect(isWebSerialSupported()).toBe(false);
    expect(isWebVibrationSupported()).toBe(false);
    expect(isWakeLockSupported()).toBe(false);
    await expect(requestEnvironmentCamera()).rejects.toThrow('Camera not supported');
    expect(vibrate([10])).toBe(false);
    stopMediaStream({ getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledTimes(2);
  });
});
