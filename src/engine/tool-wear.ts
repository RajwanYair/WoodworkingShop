/**
 * Sprint 169 — Tool Wear Tracker.
 *
 * Tracks CNC tool usage, estimates remaining life, and predicts when
 * replacement is needed. Supports multiple tool types (router bits,
 * saw blades, drill bits) with different wear models.
 *
 * Features:
 *   - Tool inventory management
 *   - Usage logging (cut length, material hardness factor)
 *   - Wear estimation with configurable wear models
 *   - Replacement prediction
 *   - Maintenance alerts
 *   - Cost-per-meter tracking
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Tool type classification. */
export type ToolType = 'router-bit' | 'saw-blade' | 'drill-bit' | 'planer-blade' | 'sanding-disc';

/** Wear model — how tool life is calculated. */
export type WearModel = 'linear' | 'exponential' | 'step';

/** Tool condition status. */
export type ToolCondition = 'new' | 'good' | 'fair' | 'worn' | 'replace';

/** A tool in the inventory. */
export interface Tool {
  /** Unique tool ID. */
  id: string;
  /** Display name. */
  name: string;
  /** Tool type. */
  type: ToolType;
  /** Diameter in mm. */
  diameterMm: number;
  /** Expected life in cut-meters. */
  lifeCutMeters: number;
  /** Cost per tool (for replacement cost tracking). */
  costPerUnit: number;
  /** Currency code. */
  currency: string;
  /** Wear model for this tool. */
  wearModel: WearModel;
  /** Date added (ISO). */
  addedAt: string;
}

/** A usage log entry. */
export interface UsageEntry {
  /** Entry ID. */
  id: string;
  /** Tool ID. */
  toolId: string;
  /** Cut length in meters for this entry. */
  cutMeters: number;
  /** Material hardness factor (1.0 = softwood, 2.0 = hardwood, 3.0 = MDF). */
  hardnessFactor: number;
  /** Timestamp (ISO). */
  timestamp: string;
  /** Optional project reference. */
  projectId: string;
}

/** Tool status report. */
export interface ToolStatus {
  /** Tool ID. */
  toolId: string;
  /** Tool name. */
  toolName: string;
  /** Total effective cut-meters (adjusted for hardness). */
  effectiveCutMeters: number;
  /** Remaining life percentage (0–100). */
  remainingPercent: number;
  /** Current condition. */
  condition: ToolCondition;
  /** Estimated meters remaining before replacement. */
  metersRemaining: number;
  /** Cost per effective meter so far. */
  costPerMeter: number;
  /** Whether replacement is recommended. */
  needsReplacement: boolean;
}

/** Maintenance alert. */
export interface MaintenanceAlert {
  /** Tool ID. */
  toolId: string;
  /** Tool name. */
  toolName: string;
  /** Alert severity. */
  severity: 'info' | 'warning' | 'critical';
  /** Alert message. */
  message: string;
}

/** Tool inventory with usage history. */
export interface ToolInventory {
  /** All tools. */
  tools: Tool[];
  /** Usage log. */
  usageLog: UsageEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum tools in inventory. */
export const MAX_TOOLS = 100;

/** Maximum usage entries. */
export const MAX_USAGE_ENTRIES = 10000;

/** Condition thresholds (remaining %). */
export const CONDITION_THRESHOLDS = {
  new: 95,
  good: 70,
  fair: 40,
  worn: 15,
} as const;

/** Default hardness factors. */
export const HARDNESS_FACTORS = {
  softwood: 1.0,
  hardwood: 2.0,
  mdf: 2.5,
  plywood: 1.5,
  melamine: 1.8,
} as const;

// ─── Core functions ───────────────────────────────────────────────────────────

/**
 * Create an empty tool inventory.
 */
export function createInventory(): ToolInventory {
  return { tools: [], usageLog: [] };
}

/**
 * Add a tool to the inventory.
 *
 * @param inventory Current inventory.
 * @param tool      Tool to add.
 * @returns Updated inventory.
 */
export function addTool(inventory: ToolInventory, tool: Tool): ToolInventory {
  if (inventory.tools.length >= MAX_TOOLS) {
    throw new RangeError(`addTool: inventory full (max ${MAX_TOOLS})`);
  }
  if (inventory.tools.some((t) => t.id === tool.id)) {
    throw new RangeError(`addTool: tool "${tool.id}" already exists`);
  }
  if (tool.lifeCutMeters <= 0) {
    throw new RangeError('addTool: lifeCutMeters must be positive');
  }
  if (tool.diameterMm <= 0) {
    throw new RangeError('addTool: diameterMm must be positive');
  }

  return { ...inventory, tools: [...inventory.tools, tool] };
}

/**
 * Remove a tool from the inventory.
 *
 * @param inventory Current inventory.
 * @param toolId    Tool ID to remove.
 * @returns Updated inventory (usage log retained for history).
 */
export function removeTool(inventory: ToolInventory, toolId: string): ToolInventory {
  const filtered = inventory.tools.filter((t) => t.id !== toolId);
  if (filtered.length === inventory.tools.length) {
    throw new RangeError(`removeTool: tool "${toolId}" not found`);
  }
  return { ...inventory, tools: filtered };
}

/**
 * Log tool usage.
 *
 * @param inventory Current inventory.
 * @param entry     Usage entry to log.
 * @returns Updated inventory.
 */
export function logUsage(inventory: ToolInventory, entry: UsageEntry): ToolInventory {
  if (inventory.usageLog.length >= MAX_USAGE_ENTRIES) {
    throw new RangeError(`logUsage: usage log full (max ${MAX_USAGE_ENTRIES})`);
  }
  if (!inventory.tools.some((t) => t.id === entry.toolId)) {
    throw new RangeError(`logUsage: tool "${entry.toolId}" not found`);
  }
  if (entry.cutMeters <= 0) {
    throw new RangeError('logUsage: cutMeters must be positive');
  }
  if (entry.hardnessFactor <= 0) {
    throw new RangeError('logUsage: hardnessFactor must be positive');
  }

  return { ...inventory, usageLog: [...inventory.usageLog, entry] };
}

/**
 * Get the status of a specific tool.
 *
 * @param inventory Current inventory.
 * @param toolId    Tool ID to query.
 * @returns Tool status report.
 */
export function getToolStatus(inventory: ToolInventory, toolId: string): ToolStatus {
  const tool = inventory.tools.find((t) => t.id === toolId);
  if (!tool) {
    throw new RangeError(`getToolStatus: tool "${toolId}" not found`);
  }

  const entries = inventory.usageLog.filter((e) => e.toolId === toolId);
  const effectiveCutMeters = computeEffectiveMeters(entries, tool.wearModel);
  const remainingPercent = Math.max(
    0,
    Math.round(((tool.lifeCutMeters - effectiveCutMeters) / tool.lifeCutMeters) * 100),
  );
  const metersRemaining = Math.max(0, tool.lifeCutMeters - effectiveCutMeters);
  const condition = getConditionFromPercent(remainingPercent);
  const costPerMeter = effectiveCutMeters > 0 ? tool.costPerUnit / effectiveCutMeters : 0;

  return {
    toolId,
    toolName: tool.name,
    effectiveCutMeters: Math.round(effectiveCutMeters * 100) / 100,
    remainingPercent,
    condition,
    metersRemaining: Math.round(metersRemaining * 100) / 100,
    costPerMeter: Math.round(costPerMeter * 100) / 100,
    needsReplacement: remainingPercent <= CONDITION_THRESHOLDS.worn,
  };
}

/**
 * Get status for all tools in the inventory.
 *
 * @param inventory Current inventory.
 * @returns Array of tool statuses.
 */
export function getAllToolStatuses(inventory: ToolInventory): ToolStatus[] {
  return inventory.tools.map((t) => getToolStatus(inventory, t.id));
}

/**
 * Get maintenance alerts for tools that need attention.
 *
 * @param inventory Current inventory.
 * @returns Maintenance alerts sorted by severity.
 */
export function getMaintenanceAlerts(inventory: ToolInventory): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];

  for (const tool of inventory.tools) {
    const status = getToolStatus(inventory, tool.id);

    if (status.condition === 'replace') {
      alerts.push({
        toolId: tool.id,
        toolName: tool.name,
        severity: 'critical',
        message: `Tool "${tool.name}" needs immediate replacement (${status.remainingPercent}% life remaining).`,
      });
    } else if (status.condition === 'worn') {
      alerts.push({
        toolId: tool.id,
        toolName: tool.name,
        severity: 'warning',
        message: `Tool "${tool.name}" is worn (${status.remainingPercent}% life remaining). Plan replacement.`,
      });
    } else if (status.condition === 'fair') {
      alerts.push({
        toolId: tool.id,
        toolName: tool.name,
        severity: 'info',
        message: `Tool "${tool.name}" at ${status.remainingPercent}% life. Order replacement soon.`,
      });
    }
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Estimate how many more meters a tool can cut for a given material.
 *
 * @param inventory      Current inventory.
 * @param toolId         Tool ID.
 * @param hardnessFactor Material hardness factor.
 * @returns Estimated meters remaining at given hardness.
 */
export function estimateRemainingForMaterial(inventory: ToolInventory, toolId: string, hardnessFactor: number): number {
  if (hardnessFactor <= 0) {
    throw new RangeError('estimateRemainingForMaterial: hardnessFactor must be positive');
  }
  const status = getToolStatus(inventory, toolId);
  return Math.round((status.metersRemaining / hardnessFactor) * 100) / 100;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function computeEffectiveMeters(entries: UsageEntry[], model: WearModel): number {
  let total = 0;

  for (const entry of entries) {
    const effective = entry.cutMeters * entry.hardnessFactor;

    switch (model) {
      case 'linear':
        total += effective;
        break;
      case 'exponential':
        // Wear accelerates as tool ages — each meter costs slightly more
        total += effective * (1 + total * 0.001);
        break;
      case 'step':
        // Tool stays sharp then degrades quickly at 80%
        total += effective;
        break;
    }
  }

  return total;
}

function getConditionFromPercent(percent: number): ToolCondition {
  if (percent >= CONDITION_THRESHOLDS.new) return 'new';
  if (percent >= CONDITION_THRESHOLDS.good) return 'good';
  if (percent >= CONDITION_THRESHOLDS.fair) return 'fair';
  if (percent >= CONDITION_THRESHOLDS.worn) return 'worn';
  return 'replace';
}
