/**
 * Phase 11 — optimizerSettingsSlice unit tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createOptimizerSettingsSlice,
  type OptimizerSettingsSlice,
  type OptimizerSettingsSession,
} from '../../../src/store/slices/optimizerSettingsSlice';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeSlice(
  session: OptimizerSettingsSession | null = null,
  onRescheduleOpt = vi.fn(),
  onRescheduleCost = vi.fn(),
) {
  let state: OptimizerSettingsSlice;
  const set = (
    partial: Partial<OptimizerSettingsSlice> | ((s: OptimizerSettingsSlice) => Partial<OptimizerSettingsSlice>),
  ) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...patch };
  };
  const get = () => state;
  state = createOptimizerSettingsSlice(
    set as Parameters<typeof createOptimizerSettingsSlice>[0],
    get as Parameters<typeof createOptimizerSettingsSlice>[1],
    session,
    onRescheduleOpt,
    onRescheduleCost,
  );
  return { get: () => state, onRescheduleOpt, onRescheduleCost };
}

// ── initial state ─────────────────────────────────────────────────────────────

describe('createOptimizerSettingsSlice — initial state', () => {
  it('defaults sawKerf to 4 mm', () => {
    expect(makeSlice().get().sawKerf).toBe(4);
  });

  it('hydrates sawKerf from session', () => {
    expect(makeSlice({ sawKerf: 6 }).get().sawKerf).toBe(6);
  });

  it('defaults materialPriceOverrides to {}', () => {
    expect(makeSlice().get().materialPriceOverrides).toEqual({});
  });

  it('hydrates materialPriceOverrides from session', () => {
    expect(makeSlice({ materialPriceOverrides: { plywood: 120 } }).get().materialPriceOverrides).toEqual({ plywood: 120 });
  });

  it('defaults edgeBandingRate to 3', () => {
    expect(makeSlice().get().edgeBandingRate).toBe(3);
  });

  it('defaults labourRate to 75', () => {
    expect(makeSlice().get().labourRate).toBe(75);
  });

  it('defaults labourHours to 0', () => {
    expect(makeSlice().get().labourHours).toBe(0);
  });

  it('defaults finishCost to 0', () => {
    expect(makeSlice().get().finishCost).toBe(0);
  });
});

// ── setSawKerf ────────────────────────────────────────────────────────────────

describe('createOptimizerSettingsSlice — setSawKerf', () => {
  it('sets a valid kerf value', () => {
    const { get } = makeSlice();
    get().setSawKerf(5);
    expect(get().sawKerf).toBe(5);
  });

  it('clamps negative to 0', () => {
    const { get } = makeSlice();
    get().setSawKerf(-1);
    expect(get().sawKerf).toBe(0);
  });

  it('clamps above 8 to 8', () => {
    const { get } = makeSlice();
    get().setSawKerf(99);
    expect(get().sawKerf).toBe(8);
  });

  it('calls onRescheduleOpt with new kerf and current overrides', () => {
    const { get, onRescheduleOpt } = makeSlice({ sheetSizeOverrides: { plywood: { width: 2440, length: 1220 } } });
    get().setSawKerf(3);
    expect(onRescheduleOpt).toHaveBeenCalledWith(3, { plywood: { width: 2440, length: 1220 } });
  });
});

// ── setMaterialPriceOverride ──────────────────────────────────────────────────

describe('createOptimizerSettingsSlice — setMaterialPriceOverride', () => {
  it('adds an override', () => {
    const { get } = makeSlice();
    get().setMaterialPriceOverride('plywood18', 110);
    expect(get().materialPriceOverrides['plywood18']).toBe(110);
  });

  it('removes an override when price is null', () => {
    const { get } = makeSlice({ materialPriceOverrides: { plywood18: 100 } });
    get().setMaterialPriceOverride('plywood18', null);
    expect(get().materialPriceOverrides['plywood18']).toBeUndefined();
  });

  it('calls onRescheduleCost with updated overrides', () => {
    const { get, onRescheduleCost } = makeSlice();
    get().setMaterialPriceOverride('mdf12', 80);
    expect(onRescheduleCost).toHaveBeenCalledWith({ materialPriceOverrides: { mdf12: 80 } });
  });
});

// ── setEdgeBandingRate ────────────────────────────────────────────────────────

describe('createOptimizerSettingsSlice — setEdgeBandingRate', () => {
  it('sets a valid rate', () => {
    const { get } = makeSlice();
    get().setEdgeBandingRate(5);
    expect(get().edgeBandingRate).toBe(5);
  });

  it('clamps negative to 0', () => {
    const { get } = makeSlice();
    get().setEdgeBandingRate(-2);
    expect(get().edgeBandingRate).toBe(0);
  });

  it('calls onRescheduleCost', () => {
    const { get, onRescheduleCost } = makeSlice();
    get().setEdgeBandingRate(4);
    expect(onRescheduleCost).toHaveBeenCalledWith({ edgeBandingRate: 4 });
  });
});

// ── setLabourRate / setLabourHours / setFinishCost ────────────────────────────

describe('createOptimizerSettingsSlice — labour & finish', () => {
  it('setLabourRate clamps negative', () => {
    const { get } = makeSlice();
    get().setLabourRate(-5);
    expect(get().labourRate).toBe(0);
  });

  it('setLabourHours clamps negative', () => {
    const { get } = makeSlice();
    get().setLabourHours(-1);
    expect(get().labourHours).toBe(0);
  });

  it('setFinishCost clamps negative', () => {
    const { get } = makeSlice();
    get().setFinishCost(-100);
    expect(get().finishCost).toBe(0);
  });

  it('setLabourRate calls onRescheduleCost', () => {
    const { get, onRescheduleCost } = makeSlice();
    get().setLabourRate(100);
    expect(onRescheduleCost).toHaveBeenCalledWith({ labourRate: 100 });
  });
});

// ── setHardwarePriceOverride ──────────────────────────────────────────────────

describe('createOptimizerSettingsSlice — setHardwarePriceOverride', () => {
  it('adds a price override', () => {
    const { get } = makeSlice();
    get().setHardwarePriceOverride('hinge', 12);
    expect(get().hardwarePriceOverrides['hinge']).toBe(12);
  });

  it('clamps negative price to 0', () => {
    const { get } = makeSlice();
    get().setHardwarePriceOverride('hinge', -5);
    expect(get().hardwarePriceOverrides['hinge']).toBe(0);
  });

  it('removes override when null', () => {
    const { get } = makeSlice({ hardwarePriceOverrides: { hinge: 10 } });
    get().setHardwarePriceOverride('hinge', null);
    expect(get().hardwarePriceOverrides['hinge']).toBeUndefined();
  });
});

// ── setSheetSizeOverride ──────────────────────────────────────────────────────

describe('createOptimizerSettingsSlice — setSheetSizeOverride', () => {
  it('adds a sheet size override', () => {
    const { get } = makeSlice();
    get().setSheetSizeOverride('plywood18', { width: 2440, length: 1220 });
    expect(get().sheetSizeOverrides['plywood18']).toEqual({ width: 2440, length: 1220 });
  });

  it('removes override when null', () => {
    const { get } = makeSlice({ sheetSizeOverrides: { plywood18: { width: 2440, length: 1220 } } });
    get().setSheetSizeOverride('plywood18', null);
    expect(get().sheetSizeOverrides['plywood18']).toBeUndefined();
  });

  it('calls onRescheduleOpt with new kerf and updated overrides', () => {
    const { get, onRescheduleOpt } = makeSlice({ sawKerf: 3 });
    get().setSheetSizeOverride('mdf12', { width: 3000, length: 1500 });
    expect(onRescheduleOpt).toHaveBeenCalledWith(3, { mdf12: { width: 3000, length: 1500 } });
  });
});

// ── setHardwareQtyOverride ────────────────────────────────────────────────────

describe('createOptimizerSettingsSlice — setHardwareQtyOverride', () => {
  it('adds a qty override', () => {
    const { get } = makeSlice();
    get().setHardwareQtyOverride('hinge', 4);
    expect(get().hardwareQtyOverrides['hinge']).toBe(4);
  });

  it('clamps negative to 0', () => {
    const { get } = makeSlice();
    get().setHardwareQtyOverride('hinge', -2);
    expect(get().hardwareQtyOverrides['hinge']).toBe(0);
  });

  it('removes override when null', () => {
    const { get } = makeSlice({ hardwareQtyOverrides: { hinge: 2 } });
    get().setHardwareQtyOverride('hinge', null);
    expect(get().hardwareQtyOverrides['hinge']).toBeUndefined();
  });
});
