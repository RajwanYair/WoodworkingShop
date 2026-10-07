import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/room-store';
import type { RoomLayout, RoomCabinet } from '../../engine/types';

/**
 * Sprint 55 — Room Layout Floor-Plan View
 *
 * Renders an SVG top-down floor-plan of the active room layout:
 * - Room outline drawn to scale
 * - Cabinet footprints as labelled rectangles
 * - Room dimensions (mm) annotated on the edges
 *
 * Shown in the Configurator tab below the main panel.
 * Returns an empty-state message when no layouts exist.
 */
const SVG_W = 640;
const SVG_H = 400;
const PAD = 32;

interface CabinetRectProps {
  readonly cab: RoomCabinet;
  readonly index: number;
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly selected: boolean;
}

function CabinetRect({ cab, index, scale, offsetX, offsetY, selected }: CabinetRectProps) {
  const x = offsetX + cab.x * scale;
  const y = offsetY + cab.y * scale;
  const w = cab.width * scale;
  const d = cab.depth * scale;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={d}
        fill="currentColor"
        fillOpacity={0.14}
        stroke="currentColor"
        strokeOpacity={selected ? 1 : 0.8}
        strokeWidth={selected ? 3 : 1.5}
        rx={2}
      />
      <text x={x + w / 2} y={y + d / 2 + 4} textAnchor="middle" fontSize={10} fill="currentColor">
        ({index + 1}) {cab.name}
      </text>
    </g>
  );
}

interface FloorPlanProps {
  readonly layout: RoomLayout;
  readonly updateCabinetPosition: (layoutId: string, cabinetId: string, x: number, y: number) => void;
}

function FloorPlan({ layout, updateCabinetPosition }: FloorPlanProps) {
  const { t } = useTranslation();
  const [selectedCabinetId, setSelectedCabinetId] = useState(layout.cabinets[0]?.id ?? '');
  const drag = useRef<{ cabinetId: string; offsetX: number; offsetY: number; step: number } | null>(null);
  const usableW = SVG_W - 2 * PAD;
  const usableH = SVG_H - 2 * PAD;
  const scale = Math.min(usableW / layout.roomWidth, usableH / layout.roomDepth);

  const roomW = layout.roomWidth * scale;
  const roomH = layout.roomDepth * scale;
  const offsetX = PAD + (usableW - roomW) / 2;
  const offsetY = PAD + (usableH - roomH) / 2;
  const selectedCabinet = layout.cabinets.find((cabinet) => cabinet.id === selectedCabinetId) ?? layout.cabinets[0];

  const getRoomPoint = (clientX: number, clientY: number, svg: SVGSVGElement) => {
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return {
      x: ((clientX - bounds.left) * SVG_W) / bounds.width,
      y: ((clientY - bounds.top) * SVG_H) / bounds.height,
    };
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!(event.target instanceof SVGElement)) return;
    const cabinetId = event.target.closest<SVGGElement>('[data-cabinet-id]')?.dataset.cabinetId;
    const cabinet = layout.cabinets.find((item) => item.id === cabinetId);
    const point = getRoomPoint(event.clientX, event.clientY, event.currentTarget);
    if (!cabinet || !point) return;
    setSelectedCabinetId(cabinet.id);
    drag.current = {
      cabinetId: cabinet.id,
      offsetX: cabinet.x - (point.x - offsetX) / scale,
      offsetY: cabinet.y - (point.y - offsetY) / scale,
      step: event.pointerType === 'pen' ? 1 : 10,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const activeDrag = drag.current;
    if (!activeDrag) return;
    const point = getRoomPoint(event.clientX, event.clientY, event.currentTarget);
    if (!point) return;
    const x = Math.round(((point.x - offsetX) / scale + activeDrag.offsetX) / activeDrag.step) * activeDrag.step;
    const y = Math.round(((point.y - offsetY) / scale + activeDrag.offsetY) / activeDrag.step) * activeDrag.step;
    updateCabinetPosition(layout.id, activeDrag.cabinetId, x, y);
  };

  const handleCabinetKeyDown = (event: KeyboardEvent<SVGGElement>, cabinet: RoomCabinet) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedCabinetId(cabinet.id);
      return;
    }
    const directions: Record<string, [number, number]> = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 1 : 10;
    updateCabinetPosition(layout.id, cabinet.id, cabinet.x + direction[0] * step, cabinet.y + direction[1] * step);
  };

  return (
    <>
      {selectedCabinet && (
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('room.selectCabinet')}</span>
            <select
              aria-label={t('room.selectCabinet')}
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-900 rounded border bg-white px-2 py-1"
              value={selectedCabinet.id}
              onChange={(event) => setSelectedCabinetId(event.target.value)}
            >
              {layout.cabinets.map((cabinet) => (
                <option key={cabinet.id} value={cabinet.id}>
                  {cabinet.name}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ['x', t('room.positionX'), selectedCabinet.x, layout.roomWidth - selectedCabinet.width],
              ['y', t('room.positionY'), selectedCabinet.y, layout.roomDepth - selectedCabinet.depth],
            ] as const
          ).map(([axis, label, value, max]) => (
            <label key={axis} className="flex flex-col gap-1 text-sm">
              <span>{label}</span>
              <input
                aria-label={label}
                className="border-wood-300 dark:border-wood-600 dark:bg-wood-900 w-28 rounded border bg-white px-2 py-1 font-mono"
                type="number"
                min={0}
                max={max}
                step={1}
                value={value}
                onChange={(event) =>
                  updateCabinetPosition(
                    layout.id,
                    selectedCabinet.id,
                    axis === 'x' ? Number(event.target.value) : selectedCabinet.x,
                    axis === 'y' ? Number(event.target.value) : selectedCabinet.y,
                  )
                }
              />
            </label>
          ))}
        </div>
      )}
      <fieldset className="min-w-0">
        <legend className="sr-only">{`${layout.name} ${t('room.floorPlan')}`}</legend>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-900 text-wood-700 dark:text-wood-200 max-h-96 w-full touch-none rounded-lg border"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <rect
            x={offsetX}
            y={offsetY}
            width={roomW}
            height={roomH}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
          <text x={offsetX + roomW / 2} y={offsetY - 8} textAnchor="middle" fontSize={11} fill="currentColor">
            {layout.roomWidth} mm
          </text>
          <text
            x={offsetX - 8}
            y={offsetY + roomH / 2}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
            transform={`rotate(-90, ${offsetX - 8}, ${offsetY + roomH / 2})`}
          >
            {layout.roomDepth} mm
          </text>
          {layout.cabinets.map((cab, index) => (
            <g
              key={cab.id}
              data-cabinet-id={cab.id}
              role="button"
              tabIndex={0}
              aria-label={cab.name}
              aria-pressed={selectedCabinet?.id === cab.id}
              onFocus={() => setSelectedCabinetId(cab.id)}
              onClick={() => setSelectedCabinetId(cab.id)}
              onKeyDown={(event) => handleCabinetKeyDown(event, cab)}
            >
              <title>{cab.name}</title>
              <CabinetRect
                cab={cab}
                index={index}
                scale={scale}
                offsetX={offsetX}
                offsetY={offsetY}
                selected={selectedCabinet?.id === cab.id}
              />
            </g>
          ))}
        </svg>
      </fieldset>
    </>
  );
}

export function RoomLayoutView() {
  const { t } = useTranslation();
  const { layouts, activeLayoutId, updateCabinetPosition } = useRoomStore();

  const layout = layouts.find((l) => l.id === activeLayoutId) ?? layouts[0];

  if (!layout) {
    return (
      <section
        aria-label={t('room.sectionLabel')}
        className="border-wood-200 dark:border-wood-700 rounded-lg border p-4"
      >
        <h3 className="text-wood-600 dark:text-wood-300 mb-2 text-sm font-semibold">{t('room.title')}</h3>
        <p className="text-wood-400 dark:text-wood-500 text-sm">{t('room.empty')}</p>
      </section>
    );
  }

  return (
    <section aria-label={t('room.sectionLabel')} className="border-wood-200 dark:border-wood-700 rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-wood-600 dark:text-wood-300 text-sm font-semibold">
          {t('room.title')}: {layout.name}
        </h3>
        <span className="text-wood-400 dark:text-wood-500 text-xs">
          {layout.roomWidth} × {layout.roomDepth} mm · {layout.cabinets.length} {t('room.cabinets')} ·{' '}
          {(() => {
            const roomArea = layout.roomWidth * layout.roomDepth;
            const cabinetArea = layout.cabinets.reduce((sum, c) => sum + c.width * c.depth, 0);
            return roomArea > 0 ? Math.round((cabinetArea / roomArea) * 100) : 0;
          })()}
          % {t('room.utilized')}
        </span>
      </div>
      <FloorPlan layout={layout} updateCabinetPosition={updateCabinetPosition} />
    </section>
  );
}
