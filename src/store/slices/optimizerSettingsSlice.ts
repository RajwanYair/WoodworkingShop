/**
 * Phase 11 — Optimizer Settings Slice
 *
 * Owns the user-configurable optimizer and costing parameters: saw kerf,
 * material/hardware price overrides, edge-banding rate, labour, and per-material
 * sheet-size overrides.  Each action triggers a re-computation via callbacks
 * supplied by the root store (single scheduling authority).
 */

// ─── Slice type ───────────────────────────────────────────────────────────────

export type OptimizerSettingsSlice = {
  // State
  sawKerf: number; // mm, default 4
  materialPriceOverrides: Record<string, number>; // materialKey → ₪ per sheet
  edgeBandingRate: number; // ₪ per meter, default 3
  hardwarePriceOverrides: Record<string, number>; // hw.id → ₪ per unit
  hardwareQtyOverrides: Record<string, number>; // hw.id → user-overridden qty
  sheetSizeOverrides: Record<string, { width: number; length: number }>; // per-material sheet size overrides (mm)
  labourRate: number; // ₪ per hour, default 75
  labourHours: number; // estimated labour hours (user-overrideable)
  finishCost: number; // finish/paint cost in ₪

  // Actions
  setSawKerf: (mm: number) => void;
  setMaterialPriceOverride: (materialKey: string, price: number | null) => void;
  setEdgeBandingRate: (rate: number) => void;
  setHardwarePriceOverride: (id: string, price: number | null) => void;
  setHardwareQtyOverride: (id: string, qty: number | null) => void;
  setSheetSizeOverride: (materialKey: string, size: { width: number; length: number } | null) => void;
  setLabourRate: (rate: number) => void;
  setLabourHours: (hours: number) => void;
  setFinishCost: (cost: number) => void;
  /** Apply a full settings snapshot atomically, triggering a single optimizer + cost re-run. */
  loadSettings: (session: OptimizerSettingsSession) => void;
};

// ─── Slice-local session type (subset used in hydration) ─────────────────────

export interface OptimizerSettingsSession {
  sawKerf?: number;
  materialPriceOverrides?: Record<string, number>;
  edgeBandingRate?: number;
  hardwarePriceOverrides?: Record<string, number>;
  hardwareQtyOverrides?: Record<string, number>;
  sheetSizeOverrides?: Record<string, { width: number; length: number }>;
  labourRate?: number;
  labourHours?: number;
  finishCost?: number;
}

// ─── Slice creator ────────────────────────────────────────────────────────────

type OptSet = (
  partial: Partial<OptimizerSettingsSlice> | ((s: OptimizerSettingsSlice) => Partial<OptimizerSettingsSlice>),
) => void;
type OptGet = () => OptimizerSettingsSlice;

/**
 * Create the optimizer-settings slice.
 *
 * @param set              Zustand `set` from the root store.
 * @param get              Zustand `get` from the root store.
 * @param initialSession   Hydrated session values (may be null on first load).
 * @param onRescheduleOpt  Called when a change requires re-running the optimizer.
 * @param onRescheduleCost Called when a change requires re-computing cost only.
 */
export function createOptimizerSettingsSlice(
  set: OptSet,
  get: OptGet,
  initialSession: OptimizerSettingsSession | null,
  onRescheduleOpt: (sawKerf: number, sheetSizeOverrides: Record<string, { width: number; length: number }>) => void,
  onRescheduleCost: (overrides: Partial<OptimizerSettingsSlice>) => void,
): OptimizerSettingsSlice {
  return {
    // ── Initial state ──
    sawKerf: initialSession?.sawKerf ?? 4,
    materialPriceOverrides: initialSession?.materialPriceOverrides ?? {},
    edgeBandingRate: initialSession?.edgeBandingRate ?? 3,
    hardwarePriceOverrides: initialSession?.hardwarePriceOverrides ?? {},
    hardwareQtyOverrides: initialSession?.hardwareQtyOverrides ?? {},
    sheetSizeOverrides: initialSession?.sheetSizeOverrides ?? {},
    labourRate: initialSession?.labourRate ?? 75,
    labourHours: initialSession?.labourHours ?? 0,
    finishCost: initialSession?.finishCost ?? 0,

    // ── Actions ──
    setSawKerf: (mm) => {
      const sawKerf = Math.max(0, Math.min(8, mm));
      set({ sawKerf });
      onRescheduleOpt(sawKerf, get().sheetSizeOverrides);
    },

    setMaterialPriceOverride: (materialKey, price) =>
      set((state) => {
        const overrides = { ...state.materialPriceOverrides };
        if (price === null) {
          delete overrides[materialKey];
        } else {
          overrides[materialKey] = price;
        }
        onRescheduleCost({ materialPriceOverrides: overrides });
        return { materialPriceOverrides: overrides };
      }),

    setEdgeBandingRate: (rate) => {
      const r = Math.max(0, rate);
      set({ edgeBandingRate: r });
      onRescheduleCost({ edgeBandingRate: r });
    },

    setLabourRate: (rate) => {
      const r = Math.max(0, rate);
      set({ labourRate: r });
      onRescheduleCost({ labourRate: r });
    },

    setLabourHours: (hours) => {
      const h = Math.max(0, hours);
      set({ labourHours: h });
      onRescheduleCost({ labourHours: h });
    },

    setFinishCost: (cost) => {
      const c = Math.max(0, cost);
      set({ finishCost: c });
      onRescheduleCost({ finishCost: c });
    },

    setHardwarePriceOverride: (id, price) =>
      set((state) => {
        const overrides = { ...state.hardwarePriceOverrides };
        if (price === null) {
          delete overrides[id];
        } else {
          overrides[id] = Math.max(0, price);
        }
        onRescheduleCost({ hardwarePriceOverrides: overrides });
        return { hardwarePriceOverrides: overrides };
      }),

    setHardwareQtyOverride: (id, qty) =>
      set((state) => {
        const overrides = { ...state.hardwareQtyOverrides };
        if (qty === null) {
          delete overrides[id];
        } else {
          overrides[id] = Math.max(0, qty);
        }
        onRescheduleCost({ hardwareQtyOverrides: overrides });
        return { hardwareQtyOverrides: overrides };
      }),

    setSheetSizeOverride: (materialKey, size) =>
      set((state) => {
        const sheetSizeOverrides = { ...state.sheetSizeOverrides };
        if (size === null) {
          delete sheetSizeOverrides[materialKey];
        } else {
          sheetSizeOverrides[materialKey] = size;
        }
        onRescheduleOpt(state.sawKerf, sheetSizeOverrides);
        return { sheetSizeOverrides };
      }),

    loadSettings: (session) => {
      const sawKerf = Math.max(0, Math.min(8, session.sawKerf ?? 4));
      const sheetSizeOverrides = session.sheetSizeOverrides ?? {};
      set({
        sawKerf,
        materialPriceOverrides: session.materialPriceOverrides ?? {},
        edgeBandingRate: Math.max(0, session.edgeBandingRate ?? 3),
        hardwarePriceOverrides: session.hardwarePriceOverrides ?? {},
        hardwareQtyOverrides: session.hardwareQtyOverrides ?? {},
        sheetSizeOverrides,
        labourRate: Math.max(0, session.labourRate ?? 75),
        labourHours: Math.max(0, session.labourHours ?? 0),
        finishCost: Math.max(0, session.finishCost ?? 0),
      });
      onRescheduleOpt(sawKerf, sheetSizeOverrides);
      onRescheduleCost({
        materialPriceOverrides: session.materialPriceOverrides ?? {},
        edgeBandingRate: session.edgeBandingRate ?? 3,
        hardwarePriceOverrides: session.hardwarePriceOverrides ?? {},
        hardwareQtyOverrides: session.hardwareQtyOverrides ?? {},
        labourRate: session.labourRate ?? 75,
        labourHours: session.labourHours ?? 0,
        finishCost: session.finishCost ?? 0,
      });
    },
  };
}
