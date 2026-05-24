/**
 * Sprint 42 — Hardware specification engine.
 *
 * Provides a catalogue of standard cabinet hardware items (hinges, drawer
 * runners, handles, shelf pins, cam-locks, etc.) with their dimensional
 * specs and calculates the quantity required for a given cabinet
 * configuration.
 *
 * This module complements the existing hardware.ts (which focuses on
 * Blum / Hettich hardware ordering codes).  This engine focuses on
 * QUANTITY CALCULATION for BOM generation.
 *
 * Pure function — no React, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type HardwareCategory =
  | 'hinge'
  | 'drawer-runner'
  | 'handle'
  | 'shelf-pin'
  | 'cam-lock'
  | 'back-panel-clip'
  | 'leg-adjuster';

export interface HardwareCatalogueItem {
  id: string;
  category: HardwareCategory;
  name: { en: string; he: string };
  /** Nominal spec, e.g. "110° soft-close, Ø35mm cup". */
  spec: string;
  /** Unit cost hint (informational only; pricing set at project level). */
  unitCostHint?: number;
}

export interface HardwareQuantityInput {
  /** Number of doors in the cabinet. */
  doorCount: number;
  /** Number of drawers in the cabinet. */
  drawerCount: number;
  /** Number of adjustable shelves. */
  adjustableShelfCount: number;
  /** Number of fixed shelves (require cam-lock dowels). */
  fixedShelfCount: number;
  /** Number of handles / knobs (one per door + one per drawer by default). */
  handleCount?: number;
  /** Number of back panels. */
  backPanelCount: number;
  /** True when the cabinet has adjustable legs. */
  hasAdjustableLegs: boolean;
  /** Number of legs (4 for freestanding, 0 if wall-hung). */
  legCount: number;
}

export interface HardwareBomLine {
  hardwareId: string;
  category: HardwareCategory;
  name: { en: string; he: string };
  quantity: number;
  unit: 'pcs' | 'pairs';
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

export const HARDWARE_CATALOGUE: Record<string, HardwareCatalogueItem> = {
  'hinge-blum-110': {
    id: 'hinge-blum-110',
    category: 'hinge',
    name: { en: 'Blum Clip-Top 110° soft-close hinge', he: 'ציר Blum Clip-Top 110° סגירה רכה' },
    spec: 'Blum 71T3590, Ø35mm cup, 110°, soft-close',
  },
  'drawer-runner-blum-tandembox': {
    id: 'drawer-runner-blum-tandembox',
    category: 'drawer-runner',
    name: { en: 'Blum Tandem drawer runner', he: 'מסילת מגירה Blum Tandem' },
    spec: 'Blum Tandem 560H, full-extension, soft-close',
  },
  'shelf-pin-5mm': {
    id: 'shelf-pin-5mm',
    category: 'shelf-pin',
    name: { en: 'Shelf support pin 5 mm', he: 'סיכת תמיכת מדף 5 מ"מ' },
    spec: 'Ø5mm zinc-alloy shelf pin',
  },
  'cam-lock-15mm': {
    id: 'cam-lock-15mm',
    category: 'cam-lock',
    name: { en: 'Cam lock 15 mm', he: 'נעילת קאם 15 מ"מ' },
    spec: 'Ø15mm cam connector + bolt',
  },
  'back-clip-standard': {
    id: 'back-clip-standard',
    category: 'back-panel-clip',
    name: { en: 'Back panel clip', he: 'קליפס לוח גב' },
    spec: 'Plastic back panel retaining clip',
  },
  'handle-bar-128mm': {
    id: 'handle-bar-128mm',
    category: 'handle',
    name: { en: 'Bar handle 128mm cc', he: 'ידית בר 128 מ"מ' },
    spec: 'Bar handle, 128mm centre-to-centre, stainless steel',
  },
  'leg-adjuster-60mm': {
    id: 'leg-adjuster-60mm',
    category: 'leg-adjuster',
    name: { en: 'Adjustable cabinet leg 60–90 mm', he: 'רגל מתכווננת 60–90 מ"מ' },
    spec: 'Plastic adjustable leg, 60–90mm, M8 thread',
  },
};

// ─── Quantity calculator ──────────────────────────────────────────────────────

/**
 * Calculate the hardware BOM for a single cabinet configuration.
 *
 * Rules applied:
 *   - Hinges : 2 hinges per door (doors ≤ 900 mm height); returns pairs.
 *   - Drawer runners : 1 pair per drawer.
 *   - Shelf pins : 4 pins per adjustable shelf.
 *   - Cam locks : 4 per fixed shelf (front + back, each side).
 *   - Back panel clips : 4 per back panel.
 *   - Handles : 1 per door + 1 per drawer (or override via input).
 *   - Leg adjusters : legCount (when hasAdjustableLegs=true).
 */
export function calculateHardwareBom(config: HardwareQuantityInput): HardwareBomLine[] {
  const lines: HardwareBomLine[] = [];

  if (config.doorCount > 0) {
    lines.push({
      hardwareId: 'hinge-blum-110',
      category: 'hinge',
      name: HARDWARE_CATALOGUE['hinge-blum-110'].name,
      quantity: config.doorCount * 2,
      unit: 'pcs',
    });
  }

  if (config.drawerCount > 0) {
    lines.push({
      hardwareId: 'drawer-runner-blum-tandembox',
      category: 'drawer-runner',
      name: HARDWARE_CATALOGUE['drawer-runner-blum-tandembox'].name,
      quantity: config.drawerCount,
      unit: 'pairs',
    });
  }

  if (config.adjustableShelfCount > 0) {
    lines.push({
      hardwareId: 'shelf-pin-5mm',
      category: 'shelf-pin',
      name: HARDWARE_CATALOGUE['shelf-pin-5mm'].name,
      quantity: config.adjustableShelfCount * 4,
      unit: 'pcs',
    });
  }

  if (config.fixedShelfCount > 0) {
    lines.push({
      hardwareId: 'cam-lock-15mm',
      category: 'cam-lock',
      name: HARDWARE_CATALOGUE['cam-lock-15mm'].name,
      quantity: config.fixedShelfCount * 4,
      unit: 'pcs',
    });
  }

  if (config.backPanelCount > 0) {
    lines.push({
      hardwareId: 'back-clip-standard',
      category: 'back-panel-clip',
      name: HARDWARE_CATALOGUE['back-clip-standard'].name,
      quantity: config.backPanelCount * 4,
      unit: 'pcs',
    });
  }

  const handleQty = config.handleCount ?? config.doorCount + config.drawerCount;
  if (handleQty > 0) {
    lines.push({
      hardwareId: 'handle-bar-128mm',
      category: 'handle',
      name: HARDWARE_CATALOGUE['handle-bar-128mm'].name,
      quantity: handleQty,
      unit: 'pcs',
    });
  }

  if (config.hasAdjustableLegs && config.legCount > 0) {
    lines.push({
      hardwareId: 'leg-adjuster-60mm',
      category: 'leg-adjuster',
      name: HARDWARE_CATALOGUE['leg-adjuster-60mm'].name,
      quantity: config.legCount,
      unit: 'pcs',
    });
  }

  return lines;
}

/** Sum total hardware piece count across all BOM lines. */
export function totalHardwarePieces(bom: HardwareBomLine[]): number {
  return bom.reduce((s, l) => s + l.quantity, 0);
}
