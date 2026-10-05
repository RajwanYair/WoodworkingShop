import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCamera } from '../../src/hooks/useCamera';

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

function setMediaDevices(mediaDevices: MediaDevices | undefined): void {
  if (mediaDevices === undefined) {
    Reflect.deleteProperty(navigator, 'mediaDevices');
  } else {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mediaDevices });
  }
}

afterEach(() => {
  if (originalMediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  } else {
    Reflect.deleteProperty(navigator, 'mediaDevices');
  }
  Reflect.deleteProperty(window, 'Capacitor');
});

describe('useCamera', () => {
  it('captures web camera permission failures as an observable error state', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    const { result } = renderHook(() => useCamera());

    await act(async () => result.current.startCamera());

    expect(getUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' }, audio: false });
    expect(result.current).toMatchObject({ status: 'error', error: 'Permission denied', isSupported: true });
  });

  it('reports unsupported web camera access without requesting a stream', async () => {
    setMediaDevices(undefined);
    const { result } = renderHook(() => useCamera());

    await act(async () => result.current.startCamera());

    expect(result.current).toMatchObject({
      status: 'error',
      error: 'Camera not supported',
      isNative: false,
      isSupported: false,
    });
  });

  it('starts and stops a web stream, stopping every media track', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    setMediaDevices({ getUserMedia } as unknown as MediaDevices);
    const { result } = renderHook(() => useCamera());

    await act(async () => result.current.startCamera());
    expect(result.current.status).toBe('active');

    act(() => result.current.stopCamera());
    expect(stop).toHaveBeenCalledOnce();
    expect(result.current.status).toBe('idle');
  });

  it('stops every web camera track when the hook unmounts', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(stream) } as unknown as MediaDevices);
    const { result, unmount } = renderHook(() => useCamera());

    await act(async () => result.current.startCamera());
    unmount();

    expect(stop).toHaveBeenCalledOnce();
  });

  it('stops a stream that resolves after the hook unmounts', async () => {
    let completeRequest: ((stream: MediaStream) => void) | undefined;
    const request = new Promise<MediaStream>((resolve) => {
      completeRequest = resolve;
    });
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    setMediaDevices({ getUserMedia: vi.fn(() => request) } as unknown as MediaDevices);
    const { result, unmount } = renderHook(() => useCamera());

    const pendingStart = result.current.startCamera();
    unmount();
    await act(async () => {
      completeRequest?.(stream);
      await request;
    });
    await pendingStart;

    expect(stop).toHaveBeenCalledOnce();
  });
});
