import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock zustand persist middleware as a passthrough so localStorage isn't needed
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<typeof import('zustand/middleware')>('zustand/middleware');
  return {
    ...actual,
    persist: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

import { useRoomStore } from '../../src/store/room-store';
import type { RoomLayout, RoomCabinet } from '../../src/engine/types';

const makeLayout = (id: string): RoomLayout => ({
  id,
  name: `Room ${id}`,
  roomWidth: 3000,
  roomDepth: 4000,
  cabinets: [],
});

const makeCabinet = (id: string, x = 0, y = 0): RoomCabinet => ({
  id,
  name: `Cabinet ${id}`,
  x,
  y,
  width: 600,
  depth: 580,
});

describe('useRoomStore', () => {
  beforeEach(() => {
    useRoomStore.setState({ layouts: [], activeLayoutId: null });
  });

  it('starts with an empty layouts list', () => {
    expect(useRoomStore.getState().layouts).toHaveLength(0);
    expect(useRoomStore.getState().activeLayoutId).toBeNull();
  });

  it('addLayout appends a new layout', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    expect(useRoomStore.getState().layouts).toHaveLength(1);
    expect(useRoomStore.getState().layouts[0].id).toBe('L1');
  });

  it('removeLayout deletes the layout and clears activeLayoutId if it matches', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    useRoomStore.getState().setActiveLayout('L1');
    useRoomStore.getState().removeLayout('L1');
    expect(useRoomStore.getState().layouts).toHaveLength(0);
    expect(useRoomStore.getState().activeLayoutId).toBeNull();
  });

  it('addCabinetToRoom places a cabinet inside the correct layout', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    useRoomStore.getState().addCabinetToRoom('L1', makeCabinet('C1', 100, 200));
    const layout = useRoomStore.getState().layouts.find((l) => l.id === 'L1')!;
    expect(layout.cabinets).toHaveLength(1);
    expect(layout.cabinets[0].x).toBe(100);
    expect(layout.cabinets[0].y).toBe(200);
  });

  it('removeCabinetFromRoom removes only the matching cabinet', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    useRoomStore.getState().addCabinetToRoom('L1', makeCabinet('C1'));
    useRoomStore.getState().addCabinetToRoom('L1', makeCabinet('C2'));
    useRoomStore.getState().removeCabinetFromRoom('L1', 'C1');
    const layout = useRoomStore.getState().layouts.find((l) => l.id === 'L1')!;
    expect(layout.cabinets).toHaveLength(1);
    expect(layout.cabinets[0].id).toBe('C2');
  });

  it('updateCabinetPosition mutates x and y of the target cabinet', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    useRoomStore.getState().addCabinetToRoom('L1', makeCabinet('C1', 0, 0));
    useRoomStore.getState().updateCabinetPosition('L1', 'C1', 450, 800);
    const cab = useRoomStore.getState().layouts[0].cabinets[0];
    expect(cab.x).toBe(450);
    expect(cab.y).toBe(800);
  });

  it('setActiveLayout updates activeLayoutId', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    useRoomStore.getState().setActiveLayout('L1');
    expect(useRoomStore.getState().activeLayoutId).toBe('L1');
  });

  it('removeLayout with non-matching activeLayoutId keeps activeLayoutId unchanged', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    useRoomStore.getState().addLayout(makeLayout('L2'));
    useRoomStore.getState().setActiveLayout('L2');
    useRoomStore.getState().removeLayout('L1');
    expect(useRoomStore.getState().activeLayoutId).toBe('L2');
  });

  it('RoomCabinet supports optional rotation field', () => {
    useRoomStore.getState().addLayout(makeLayout('L1'));
    const rotated: RoomCabinet = { ...makeCabinet('C1'), rotation: 90 };
    useRoomStore.getState().addCabinetToRoom('L1', rotated);
    expect(useRoomStore.getState().layouts[0].cabinets[0].rotation).toBe(90);
  });
});
