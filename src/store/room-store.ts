import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoomCabinet, RoomLayout, RoomWall } from '../engine/types';
import { generateDefaultWalls, snapToWall, clampToRoom } from '../engine/room-planner';

interface RoomState {
  layouts: RoomLayout[];
  activeLayoutId: string | null;

  // Layout CRUD
  addLayout: (layout: RoomLayout) => void;
  removeLayout: (id: string) => void;
  setActiveLayout: (id: string | null) => void;
  updateRoomDimensions: (layoutId: string, width: number, depth: number, height: number) => void;

  // Wall management
  addWall: (layoutId: string, wall: RoomWall) => void;
  removeWall: (layoutId: string, wallId: string) => void;
  updateWall: (layoutId: string, wallId: string, updates: Partial<Omit<RoomWall, 'id'>>) => void;

  // Cabinet placement
  addCabinetToRoom: (layoutId: string, cabinet: RoomCabinet) => void;
  removeCabinetFromRoom: (layoutId: string, cabinetId: string) => void;
  updateCabinetPosition: (layoutId: string, cabinetId: string, x: number, y: number) => void;
  snapCabinetToWall: (layoutId: string, cabinetId: string) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      layouts: [],
      activeLayoutId: null,

      addLayout: (layout) =>
        set((s) => ({
          layouts: [
            ...s.layouts,
            {
              ...layout,
              roomHeight: layout.roomHeight || 2400,
              walls: layout.walls?.length ? layout.walls : generateDefaultWalls(layout.roomWidth, layout.roomDepth),
            },
          ],
        })),

      removeLayout: (id) =>
        set((s) => ({
          layouts: s.layouts.filter((l) => l.id !== id),
          activeLayoutId: s.activeLayoutId === id ? null : s.activeLayoutId,
        })),

      setActiveLayout: (id) => set({ activeLayoutId: id }),

      updateRoomDimensions: (layoutId, width, depth, height) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === layoutId
              ? {
                  ...l,
                  roomWidth: width,
                  roomDepth: depth,
                  roomHeight: height,
                  walls: generateDefaultWalls(width, depth),
                }
              : l,
          ),
        })),

      addWall: (layoutId, wall) =>
        set((s) => ({
          layouts: s.layouts.map((l) => (l.id === layoutId ? { ...l, walls: [...(l.walls || []), wall] } : l)),
        })),

      removeWall: (layoutId, wallId) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === layoutId ? { ...l, walls: (l.walls || []).filter((w) => w.id !== wallId) } : l,
          ),
        })),

      updateWall: (layoutId, wallId, updates) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === layoutId
              ? { ...l, walls: (l.walls || []).map((w) => (w.id === wallId ? { ...w, ...updates } : w)) }
              : l,
          ),
        })),

      addCabinetToRoom: (layoutId, cabinet) =>
        set((s) => ({
          layouts: s.layouts.map((l) => (l.id === layoutId ? { ...l, cabinets: [...l.cabinets, cabinet] } : l)),
        })),

      removeCabinetFromRoom: (layoutId, cabinetId) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === layoutId ? { ...l, cabinets: l.cabinets.filter((c) => c.id !== cabinetId) } : l,
          ),
        })),

      updateCabinetPosition: (layoutId, cabinetId, x, y) =>
        set((s) => {
          const layout = s.layouts.find((l) => l.id === layoutId);
          if (!layout) return s;
          const cab = layout.cabinets.find((c) => c.id === cabinetId);
          if (!cab) return s;
          const clamped = clampToRoom(x, y, cab.width, cab.depth, layout);
          return {
            layouts: s.layouts.map((l) =>
              l.id === layoutId
                ? {
                    ...l,
                    cabinets: l.cabinets.map((c) => (c.id === cabinetId ? { ...c, x: clamped.x, y: clamped.y } : c)),
                  }
                : l,
            ),
          };
        }),

      snapCabinetToWall: (layoutId, cabinetId) => {
        const state = get();
        const layout = state.layouts.find((l) => l.id === layoutId);
        if (!layout) return;
        const cab = layout.cabinets.find((c) => c.id === cabinetId);
        if (!cab) return;
        const snapped = snapToWall(cab.x, cab.y, cab.width, cab.depth, layout);
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === layoutId
              ? {
                  ...l,
                  cabinets: l.cabinets.map((c) => (c.id === cabinetId ? { ...c, x: snapped.x, y: snapped.y } : c)),
                }
              : l,
          ),
        }));
      },
    }),
    { name: 'room-layouts' },
  ),
);
