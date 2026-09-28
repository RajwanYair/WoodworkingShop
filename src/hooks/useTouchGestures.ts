import { useRef, useCallback } from 'react';

interface TouchGestureOptions {
  onPinchZoom?: (scale: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/**
 * Provides touch gesture handlers for an element:
 * - Pinch-to-zoom (two fingers)
 * - Swipe left/right (single finger, >60px threshold)
 */
export function useTouchGestures(options: TouchGestureOptions) {
  const startDistance = useRef(0);
  const startScale = useRef(1);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isPinching = useRef(false);
  const isSingleTouchActive = useRef(false);
  const currentScale = useRef(1);

  const getDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      isPinching.current = true;
      isSingleTouchActive.current = false;
      startDistance.current = getDistance(e.touches[0], e.touches[1]);
      startScale.current = currentScale.current;
      e.preventDefault();
    } else if (e.touches.length === 1) {
      isPinching.current = false;
      isSingleTouchActive.current = true;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && isPinching.current && options.onPinchZoom) {
        const dist = getDistance(e.touches[0], e.touches[1]);
        const ratio = dist / startDistance.current;
        const newScale = Math.min(3, Math.max(0.5, startScale.current * ratio));
        currentScale.current = newScale;
        options.onPinchZoom(newScale);
        e.preventDefault();
      }
    },
    [options],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isPinching.current) {
        if (e.touches.length < 2) isPinching.current = false;
        return;
      }
      if (isSingleTouchActive.current && e.touches.length === 0 && e.changedTouches.length === 1) {
        isSingleTouchActive.current = false;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        // Only trigger swipe if horizontal movement > 60px and > vertical movement
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          const onSwipe = dx < 0 ? options.onSwipeLeft : options.onSwipeRight;
          if (onSwipe) {
            currentScale.current = 1;
            options.onPinchZoom?.(1);
            onSwipe();
          }
        }
      }
    },
    [options],
  );

  const onTouchCancel = useCallback(() => {
    isPinching.current = false;
    isSingleTouchActive.current = false;
    startDistance.current = 0;
  }, []);

  const resetZoom = useCallback(() => {
    currentScale.current = 1;
    options.onPinchZoom?.(1);
  }, [options]);

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, resetZoom, scale: currentScale };
}
