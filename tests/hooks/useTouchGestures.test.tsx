import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTouchGestures } from '../../src/hooks/useTouchGestures';

function touchEvent(touches: Array<{ clientX: number; clientY: number }>, changedTouches = touches) {
  return {
    touches,
    changedTouches,
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent;
}

describe('useTouchGestures', () => {
  it('scales a pinch relative to its starting distance and clamps zoom', () => {
    const onPinchZoom = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onPinchZoom }));

    act(() =>
      result.current.onTouchStart(
        touchEvent([
          { clientX: 0, clientY: 0 },
          { clientX: 100, clientY: 0 },
        ]),
      ),
    );
    act(() =>
      result.current.onTouchMove(
        touchEvent([
          { clientX: 0, clientY: 0 },
          { clientX: 400, clientY: 0 },
        ]),
      ),
    );
    expect(onPinchZoom).toHaveBeenLastCalledWith(3);
    expect(result.current.scale.current).toBe(3);

    act(() =>
      result.current.onTouchStart(
        touchEvent([
          { clientX: 0, clientY: 0 },
          { clientX: 100, clientY: 0 },
        ]),
      ),
    );
    act(() =>
      result.current.onTouchMove(
        touchEvent([
          { clientX: 0, clientY: 0 },
          { clientX: 1, clientY: 0 },
        ]),
      ),
    );
    expect(onPinchZoom).toHaveBeenLastCalledWith(0.5);

    act(() => result.current.resetZoom());
    expect(result.current.scale.current).toBe(1);
    expect(onPinchZoom).toHaveBeenLastCalledWith(1);
  });

  it.each([
    [-100, 10, 'left'],
    [100, 10, 'right'],
    [-50, 10, 'none'],
    [-100, 80, 'none'],
  ] as const)('recognizes only qualifying horizontal swipes (%i, %i)', (dx, dy, expected) => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onSwipeLeft, onSwipeRight }));

    act(() => result.current.onTouchStart(touchEvent([{ clientX: 100, clientY: 100 }])));
    act(() => result.current.onTouchEnd(touchEvent([], [{ clientX: 100 + dx, clientY: 100 + dy }])));

    expect(onSwipeLeft).toHaveBeenCalledTimes(expected === 'left' ? 1 : 0);
    expect(onSwipeRight).toHaveBeenCalledTimes(expected === 'right' ? 1 : 0);
  });

  it('does not turn the end of a pinch into a swipe', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onSwipeLeft, onSwipeRight }));

    act(() =>
      result.current.onTouchStart(
        touchEvent([
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]),
      ),
    );
    act(() =>
      result.current.onTouchEnd(touchEvent([{ clientX: 100, clientY: 100 }], [{ clientX: 200, clientY: 100 }])),
    );
    act(() => result.current.onTouchEnd(touchEvent([], [{ clientX: 300, clientY: 100 }])));

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('resets pinch scale when a swipe changes the view', () => {
    const onPinchZoom = vi.fn();
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onPinchZoom, onSwipeLeft }));

    act(() =>
      result.current.onTouchStart(
        touchEvent([
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]),
      ),
    );
    act(() =>
      result.current.onTouchMove(
        touchEvent([
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]),
      ),
    );
    act(() => result.current.onTouchEnd(touchEvent([{ clientX: 100, clientY: 100 }])));
    act(() => result.current.onTouchStart(touchEvent([{ clientX: 100, clientY: 100 }])));
    act(() => result.current.onTouchEnd(touchEvent([], [{ clientX: 0, clientY: 100 }])));

    expect(result.current.scale.current).toBe(1);
    expect(onPinchZoom).toHaveBeenLastCalledWith(1);
    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  it('clears active gestures when touch interaction is cancelled', () => {
    const onPinchZoom = vi.fn();
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useTouchGestures({ onPinchZoom, onSwipeLeft }));

    act(() => result.current.onTouchStart(touchEvent([{ clientX: 100, clientY: 100 }])));
    act(() => result.current.onTouchCancel());
    act(() => result.current.onTouchEnd(touchEvent([], [{ clientX: 300, clientY: 100 }])));
    expect(onSwipeLeft).not.toHaveBeenCalled();

    act(() =>
      result.current.onTouchStart(
        touchEvent([
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]),
      ),
    );
    act(() => result.current.onTouchCancel());
    act(() =>
      result.current.onTouchMove(
        touchEvent([
          { clientX: 100, clientY: 100 },
          { clientX: 300, clientY: 100 },
        ]),
      ),
    );
    expect(onPinchZoom).not.toHaveBeenCalled();
    expect(result.current.scale.current).toBe(1);
  });
});
