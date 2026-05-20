import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoomCabinet, RoomLayout } from '../engine/types';

interface RoomState {
  layouts: RoomLayout[];
  activeLayoutId: string | null;

  // Layout CRUD
  addLayout: (layout: RoomLayout) => void;
  removeLayout: (id: string) => void;
  setActiveLayout: (id: string | null) => void;

  // Cabinet placement
  addCabinetToRoom: (layoutId: string, cabinet: RoomCabinet) => void;
  removeCabinetFromRoom: (layoutId: string, cabinetId: string) => void;
  updateCabinetPosition: (layoutId: string, cabinetId: string, x: number, y: number) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      layouts: [],
      activeLayoutId: null,

      addLayout: (layout) => set((s) => ({ layouts: [...s.layouts, layout] })),

      removeLayout: (id) =>
        set((s) => ({
          layouts: s.layouts.filter((l) => l.id !== id),
          activeLayoutId: s.activeLayoutId === id ? null : s.activeLayoutId,
        })),

      setActiveLayout: (id) => set({ activeLayoutId: id }),

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
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === layoutId
              ? {
                  ...l,
                  cabinets: l.cabinets.map((c) => (c.id === cabinetId ? { ...c, x, y } : c)),
                }
              : l,
          ),
        })),
    }),
    { name: 'room-layouts' },
  ),
);
