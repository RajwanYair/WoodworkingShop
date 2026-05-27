import { describe, it, expect } from 'vitest';
import {
  createInventory,
  addTool,
  removeTool,
  logUsage,
  getToolStatus,
  getAllToolStatuses,
  getMaintenanceAlerts,
  estimateRemainingForMaterial,
  MAX_TOOLS,
  CONDITION_THRESHOLDS,
  HARDNESS_FACTORS,
} from '../../src/engine/tool-wear';
import type { Tool, UsageEntry } from '../../src/engine/tool-wear';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = () => `tw-${++idCounter}`;

function makeTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: nextId(),
    name: '6mm Spiral Upcut',
    type: 'router-bit',
    diameterMm: 6,
    lifeCutMeters: 1000,
    costPerUnit: 45,
    currency: 'USD',
    wearModel: 'linear',
    addedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeUsage(toolId: string, overrides: Partial<UsageEntry> = {}): UsageEntry {
  return {
    id: nextId(),
    toolId,
    cutMeters: 50,
    hardnessFactor: HARDNESS_FACTORS.softwood,
    timestamp: '2025-01-15T10:00:00.000Z',
    projectId: 'proj-1',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('tool-wear', () => {
  describe('createInventory', () => {
    it('creates an empty inventory', () => {
      const inv = createInventory();
      expect(inv.tools).toHaveLength(0);
      expect(inv.usageLog).toHaveLength(0);
    });
  });

  describe('addTool / removeTool', () => {
    it('adds and removes a tool', () => {
      const tool = makeTool({ id: 'bit-1' });
      let inv = createInventory();
      inv = addTool(inv, tool);
      expect(inv.tools).toHaveLength(1);

      inv = removeTool(inv, 'bit-1');
      expect(inv.tools).toHaveLength(0);
    });

    it('rejects duplicate tool ID', () => {
      const tool = makeTool({ id: 'dup' });
      const inv = addTool(createInventory(), tool);
      expect(() => addTool(inv, makeTool({ id: 'dup' }))).toThrow(RangeError);
    });

    it('rejects non-positive lifeCutMeters', () => {
      expect(() => addTool(createInventory(), makeTool({ lifeCutMeters: 0 }))).toThrow(RangeError);
    });

    it('rejects non-positive diameterMm', () => {
      expect(() => addTool(createInventory(), makeTool({ diameterMm: -1 }))).toThrow(RangeError);
    });

    it('rejects removing non-existent tool', () => {
      expect(() => removeTool(createInventory(), 'ghost')).toThrow(RangeError);
    });

    it('rejects exceeding MAX_TOOLS', () => {
      let inv = createInventory();
      for (let i = 0; i < MAX_TOOLS; i++) {
        inv = addTool(inv, makeTool({ id: `t-${i}` }));
      }
      expect(() => addTool(inv, makeTool({ id: 'overflow' }))).toThrow(RangeError);
    });
  });

  describe('logUsage', () => {
    it('logs usage for an existing tool', () => {
      const tool = makeTool({ id: 'bit-1' });
      let inv = addTool(createInventory(), tool);
      inv = logUsage(inv, makeUsage('bit-1'));
      expect(inv.usageLog).toHaveLength(1);
    });

    it('rejects logging for non-existent tool', () => {
      const inv = createInventory();
      expect(() => logUsage(inv, makeUsage('ghost'))).toThrow(RangeError);
    });

    it.each([
      { field: 'cutMeters', value: 0 },
      { field: 'cutMeters', value: -5 },
      { field: 'hardnessFactor', value: 0 },
      { field: 'hardnessFactor', value: -1 },
    ])('rejects non-positive $field ($value)', ({ field, value }) => {
      const tool = makeTool({ id: 'bit-1' });
      const inv = addTool(createInventory(), tool);
      expect(() => logUsage(inv, makeUsage('bit-1', { [field]: value }))).toThrow(RangeError);
    });
  });

  describe('getToolStatus', () => {
    it('returns new status for unused tool', () => {
      const tool = makeTool({ id: 'fresh', lifeCutMeters: 1000 });
      const inv = addTool(createInventory(), tool);
      const status = getToolStatus(inv, 'fresh');

      expect(status.effectiveCutMeters).toBe(0);
      expect(status.remainingPercent).toBe(100);
      expect(status.condition).toBe('new');
      expect(status.needsReplacement).toBe(false);
    });

    it('computes wear with linear model', () => {
      const tool = makeTool({ id: 'lin', lifeCutMeters: 100, wearModel: 'linear' });
      let inv = addTool(createInventory(), tool);
      inv = logUsage(inv, makeUsage('lin', { cutMeters: 30, hardnessFactor: 1.0 }));
      inv = logUsage(inv, makeUsage('lin', { cutMeters: 20, hardnessFactor: 2.0 }));

      const status = getToolStatus(inv, 'lin');
      // 30*1 + 20*2 = 70 effective meters
      expect(status.effectiveCutMeters).toBe(70);
      expect(status.remainingPercent).toBe(30);
      expect(status.condition).toBe('worn');
    });

    it('computes wear with exponential model', () => {
      const tool = makeTool({ id: 'exp', lifeCutMeters: 1000, wearModel: 'exponential' });
      let inv = addTool(createInventory(), tool);
      inv = logUsage(inv, makeUsage('exp', { cutMeters: 100, hardnessFactor: 1.0 }));
      inv = logUsage(inv, makeUsage('exp', { cutMeters: 100, hardnessFactor: 1.0 }));

      const status = getToolStatus(inv, 'exp');
      // Exponential should accumulate more than 200
      expect(status.effectiveCutMeters).toBeGreaterThan(200);
    });

    it('marks tool for replacement at low life', () => {
      const tool = makeTool({ id: 'old', lifeCutMeters: 100, wearModel: 'linear' });
      let inv = addTool(createInventory(), tool);
      inv = logUsage(inv, makeUsage('old', { cutMeters: 90, hardnessFactor: 1.0 }));

      const status = getToolStatus(inv, 'old');
      expect(status.remainingPercent).toBe(10);
      expect(status.needsReplacement).toBe(true);
      expect(status.condition).toBe('replace');
    });

    it('rejects non-existent tool', () => {
      expect(() => getToolStatus(createInventory(), 'ghost')).toThrow(RangeError);
    });
  });

  describe('getAllToolStatuses', () => {
    it('returns statuses for all tools', () => {
      let inv = createInventory();
      inv = addTool(inv, makeTool({ id: 'a' }));
      inv = addTool(inv, makeTool({ id: 'b' }));

      const statuses = getAllToolStatuses(inv);
      expect(statuses).toHaveLength(2);
    });
  });

  describe('getMaintenanceAlerts', () => {
    it('returns no alerts for new tools', () => {
      let inv = createInventory();
      inv = addTool(inv, makeTool({ id: 'new' }));
      expect(getMaintenanceAlerts(inv)).toHaveLength(0);
    });

    it('returns critical alert for depleted tool', () => {
      const tool = makeTool({ id: 'dead', lifeCutMeters: 100, wearModel: 'linear' });
      let inv = addTool(createInventory(), tool);
      inv = logUsage(inv, makeUsage('dead', { cutMeters: 95, hardnessFactor: 1.0 }));

      const alerts = getMaintenanceAlerts(inv);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].severity).toBe('critical');
    });

    it('sorts alerts by severity (critical first)', () => {
      let inv = createInventory();
      inv = addTool(inv, makeTool({ id: 'fair-tool', lifeCutMeters: 100, wearModel: 'linear' }));
      inv = addTool(inv, makeTool({ id: 'dead-tool', lifeCutMeters: 100, wearModel: 'linear' }));
      inv = logUsage(inv, makeUsage('fair-tool', { cutMeters: 65, hardnessFactor: 1.0 }));
      inv = logUsage(inv, makeUsage('dead-tool', { cutMeters: 95, hardnessFactor: 1.0 }));

      const alerts = getMaintenanceAlerts(inv);
      expect(alerts[0].severity).toBe('critical');
    });
  });

  describe('estimateRemainingForMaterial', () => {
    it('estimates remaining meters adjusted for hardness', () => {
      const tool = makeTool({ id: 'est', lifeCutMeters: 1000, wearModel: 'linear' });
      let inv = addTool(createInventory(), tool);
      inv = logUsage(inv, makeUsage('est', { cutMeters: 200, hardnessFactor: 1.0 }));

      // 800 meters remaining, hardwood factor 2.0 → 400 effective meters
      const remaining = estimateRemainingForMaterial(inv, 'est', HARDNESS_FACTORS.hardwood);
      expect(remaining).toBe(400);
    });

    it('rejects non-positive hardness factor', () => {
      const inv = addTool(createInventory(), makeTool({ id: 'x' }));
      expect(() => estimateRemainingForMaterial(inv, 'x', 0)).toThrow(RangeError);
    });
  });

  describe('CONDITION_THRESHOLDS', () => {
    it('has proper ordering', () => {
      expect(CONDITION_THRESHOLDS.new).toBeGreaterThan(CONDITION_THRESHOLDS.good);
      expect(CONDITION_THRESHOLDS.good).toBeGreaterThan(CONDITION_THRESHOLDS.fair);
      expect(CONDITION_THRESHOLDS.fair).toBeGreaterThan(CONDITION_THRESHOLDS.worn);
    });
  });
});
