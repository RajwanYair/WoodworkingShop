import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

export function useCabinetOrbit(setWebglIsometric: (value: boolean) => void) {
  const [orbitYaw, setOrbitYaw] = useState(0);
  const [orbitPitch, setOrbitPitch] = useState(0);
  const [orbitZoom, setOrbitZoom] = useState(1);
  const [draggingOrbit, setDraggingOrbit] = useState(false);
  const orbitStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  const handleOrbitStart = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      setWebglIsometric(false);
      orbitStartRef.current = { x: e.clientX, y: e.clientY, yaw: orbitYaw, pitch: orbitPitch };
      setDraggingOrbit(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [orbitPitch, orbitYaw, setWebglIsometric],
  );

  const handleOrbitMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const start = orbitStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    setOrbitYaw(start.yaw + dx * 0.25);
    setOrbitPitch(Math.max(-60, Math.min(60, start.pitch - dy * 0.2)));
  }, []);

  const handleOrbitEnd = useCallback((e: PointerEvent<HTMLDivElement>) => {
    orbitStartRef.current = null;
    setDraggingOrbit(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const handleOrbitWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOrbitZoom((z) => Math.max(0.6, Math.min(2.4, z - e.deltaY * 0.0015)));
  }, []);

  return {
    orbitYaw,
    orbitPitch,
    orbitZoom,
    setOrbitYaw,
    setOrbitPitch,
    setOrbitZoom,
    draggingOrbit,
    handleOrbitStart,
    handleOrbitMove,
    handleOrbitEnd,
    handleOrbitWheel,
  };
}
