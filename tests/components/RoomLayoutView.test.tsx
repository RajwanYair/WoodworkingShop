import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock zustand persist middleware as a passthrough so localStorage isn't needed
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<typeof import('zustand/middleware')>('zustand/middleware');
  return {
    ...actual,
    persist: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

import { RoomLayoutView } from '../../src/components/layout/RoomLayoutView';
import { useRoomStore } from '../../src/store/room-store';

const LAYOUT = {
  id: 'l1',
  name: 'Kitchen',
  roomWidth: 4000,
  roomDepth: 3000,
  cabinets: [
    { id: 'c1', name: 'Base Unit', x: 100, y: 100, width: 600, depth: 580 },
    { id: 'c2', name: 'Wall Unit', x: 800, y: 50, width: 500, depth: 350 },
  ],
};

describe('RoomLayoutView', () => {
  beforeEach(() => {
    useRoomStore.setState({ layouts: [], activeLayoutId: null });
  });

  it('shows empty state when no layouts exist', () => {
    render(<RoomLayoutView />);
    expect(screen.getByRole('region', { name: /room floor plan/i })).toBeInTheDocument();
    expect(screen.getByText(/no room layouts configured/i)).toBeInTheDocument();
  });

  it('renders the section with aria-label', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByRole('region', { name: /room floor plan/i })).toBeInTheDocument();
  });

  it('displays room name and dimensions', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/Kitchen/)).toBeInTheDocument();
    expect(screen.getAllByText(/4000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/3000/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders cabinet labels in the SVG', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/\(1\) Base Unit/)).toBeInTheDocument();
    expect(screen.getByText(/\(2\) Wall Unit/)).toBeInTheDocument();
  });

  it('shows cabinet count', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/2\s+cabinets/)).toBeInTheDocument();
  });

  it('falls back to first layout when activeLayoutId is null', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: null });
    render(<RoomLayoutView />);
    expect(screen.getByText(/Kitchen/)).toBeInTheDocument();
  });

  it('renders SVG floor plan image', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByRole('img', { name: 'Kitchen' })).toBeInTheDocument();
  });

  // Sprint 67 — position numbers in SVG floor plan
  it('Sprint 67: first cabinet shows position (1)', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/\(1\)/)).toBeInTheDocument();
  });

  it('Sprint 67: second cabinet shows position (2)', () => {
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
  });

  it('Sprint 67: single cabinet shows (1) prefix', () => {
    const singleLayout = { ...LAYOUT, cabinets: [LAYOUT.cabinets[0]] };
    useRoomStore.setState({ layouts: [singleLayout], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/\(1\) Base Unit/)).toBeInTheDocument();
  });

  it('Sprint 67: no position number shown when no cabinets', () => {
    const emptyLayout = { ...LAYOUT, cabinets: [] };
    useRoomStore.setState({ layouts: [emptyLayout], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.queryByText(/\(1\)/)).not.toBeInTheDocument();
  });

  // Sprint 74 — floor-area utilization %
  it('Sprint 74: shows utilization % in header', () => {
    // LAYOUT: roomWidth=4000, roomDepth=3000 → roomArea=12,000,000 mm²
    // cab1: 600×580=348,000; cab2: 500×350=175,000 → total=523,000
    // utilPct = round(523000/12000000*100) = round(4.36...) = 4
    useRoomStore.setState({ layouts: [LAYOUT], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/4%\s+utilized/i)).toBeInTheDocument();
  });

  it('Sprint 74: shows 0% when there are no cabinets', () => {
    const emptyLayout = { ...LAYOUT, cabinets: [] };
    useRoomStore.setState({ layouts: [emptyLayout], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/0%\s+utilized/i)).toBeInTheDocument();
  });

  it('Sprint 74: shows 100% when cabinet fills entire room', () => {
    const fullLayout = {
      ...LAYOUT,
      cabinets: [{ id: 'c1', name: 'Full', x: 0, y: 0, width: 4000, depth: 3000 }],
    };
    useRoomStore.setState({ layouts: [fullLayout], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/100%\s+utilized/i)).toBeInTheDocument();
  });

  it('Sprint 74: utilization rounds to nearest integer', () => {
    // One cabinet: 1000×1000=1,000,000 / (4000×3000=12,000,000) = 8.33...% → 8
    const partialLayout = {
      ...LAYOUT,
      cabinets: [{ id: 'c1', name: 'Small', x: 0, y: 0, width: 1000, depth: 1000 }],
    };
    useRoomStore.setState({ layouts: [partialLayout], activeLayoutId: 'l1' });
    render(<RoomLayoutView />);
    expect(screen.getByText(/8%\s+utilized/i)).toBeInTheDocument();
  });
});
