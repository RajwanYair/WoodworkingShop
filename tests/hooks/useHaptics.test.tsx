import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useHaptics } from '../../src/hooks/useHaptics';

const originalVibrate = Object.getOwnPropertyDescriptor(navigator, 'vibrate');

function setVibrate(vibrate: ((pattern: VibratePattern) => boolean) | undefined): void {
  if (vibrate === undefined) {
    Reflect.deleteProperty(navigator, 'vibrate');
  } else {
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
  }
}

afterEach(() => {
  if (originalVibrate) {
    Object.defineProperty(navigator, 'vibrate', originalVibrate);
  } else {
    Reflect.deleteProperty(navigator, 'vibrate');
  }
  Reflect.deleteProperty(window, 'Capacitor');
});

describe('useHaptics', () => {
  it('maps web feedback to vibration patterns when supported', () => {
    const vibrate = vi.fn(() => true);
    setVibrate(vibrate);
    const { result } = renderHook(() => useHaptics());

    expect(result.current.isAvailable).toBe(true);
    result.current.impact('heavy');
    result.current.notification('warning');
    result.current.selectionChanged();

    expect(vibrate.mock.calls).toEqual([[40], [[20, 30, 20]], [5]]);
  });

  it('uses native haptics when a Capacitor plugin is available', () => {
    const haptics = {
      impact: vi.fn().mockResolvedValue(undefined),
      notification: vi.fn().mockResolvedValue(undefined),
      selectionChanged: vi.fn().mockResolvedValue(undefined),
      vibrate: vi.fn().mockResolvedValue(undefined),
    };
    Object.defineProperty(window, 'Capacitor', {
      configurable: true,
      value: { isNativePlatform: () => true, Plugins: { Haptics: haptics } },
    });
    const vibrate = vi.fn(() => true);
    setVibrate(vibrate);
    const { result } = renderHook(() => useHaptics());

    expect(result.current.isAvailable).toBe(true);
    result.current.impact('light');
    result.current.notification('error');
    result.current.selectionChanged();

    expect(haptics.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
    expect(haptics.notification).toHaveBeenCalledWith({ type: 'ERROR' });
    expect(haptics.selectionChanged).toHaveBeenCalledOnce();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('is a safe no-op when neither native nor web haptics are available', () => {
    setVibrate(undefined);
    const { result } = renderHook(() => useHaptics());

    expect(result.current.isAvailable).toBe(false);
    expect(() => {
      result.current.impact();
      result.current.notification();
      result.current.selectionChanged();
    }).not.toThrow();
  });
});
