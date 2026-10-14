/**
 * Tool Maintenance Scheduler — Sprint 178
 *
 * Schedules periodic maintenance for workshop tools based on usage intervals,
 * calendar time, and condition thresholds. Generates upcoming maintenance
 * windows and overdue alerts.
 */

/** Maintenance interval type. */
export type IntervalUnit = 'hours' | 'days' | 'cuts';

/** Maintenance priority. */
export type MaintenancePriority = 'critical' | 'high' | 'normal' | 'low';

/** Maintenance task status. */
export type MaintenanceStatus = 'upcoming' | 'due' | 'overdue' | 'completed';

/** A maintenance schedule rule for a tool. */
export interface MaintenanceRule {
  /** Unique rule identifier. */
  readonly id: string;
  /** Tool identifier this rule applies to. */
  readonly toolId: string;
  /** Description of the maintenance task. */
  readonly task: string;
  /** Interval value between maintenance. */
  readonly interval: number;
  /** Interval unit. */
  readonly unit: IntervalUnit;
  /** Priority of this maintenance task. */
  readonly priority: MaintenancePriority;
}

/** Current usage/time state of a tool. */
export interface ToolUsageState {
  /** Tool identifier. */
  readonly toolId: string;
  /** Cumulative runtime hours. */
  readonly totalHours: number;
  /** Days since tool was first used. */
  readonly totalDays: number;
  /** Total number of cuts made. */
  readonly totalCuts: number;
  /** Hours/days/cuts since last maintenance per rule. */
  readonly sinceLastMaintenance: Record<string, number>;
}

/** A scheduled maintenance event. */
export interface MaintenanceEvent {
  /** The rule that triggered this event. */
  readonly rule: MaintenanceRule;
  /** Current status of the maintenance. */
  readonly status: MaintenanceStatus;
  /** Usage remaining until due (negative means overdue). */
  readonly remaining: number;
  /** Percentage of interval elapsed (0–100+). */
  readonly percentElapsed: number;
}

/** Full maintenance schedule result. */
export interface MaintenanceScheduleResult {
  /** All scheduled events sorted by urgency. */
  readonly events: readonly MaintenanceEvent[];
  /** Events that are overdue. */
  readonly overdue: readonly MaintenanceEvent[];
  /** Events that are currently due (within 10% of interval). */
  readonly due: readonly MaintenanceEvent[];
  /** Total number of active rules. */
  readonly totalRules: number;
  /** Overall health score (0–100, penalized by overdue items). */
  readonly healthScore: number;
}

/**
 * Determines maintenance status based on elapsed percentage.
 * @param percentElapsed - Percentage of interval elapsed
 * @returns The maintenance status
 */
function getStatus(percentElapsed: number): MaintenanceStatus {
  if (percentElapsed >= 100) return 'overdue';
  if (percentElapsed >= 90) return 'due';
  return 'upcoming';
}

/**
 * Gets the current usage value for a rule from the tool state.
 * @param rule - The maintenance rule
 * @param state - Current tool usage state
 * @returns Usage since last maintenance
 */
function getUsageSinceLast(rule: MaintenanceRule, state: ToolUsageState): number {
  if (rule.id in state.sinceLastMaintenance) {
    return state.sinceLastMaintenance[rule.id];
  }
  // Fallback: use total usage as if never maintained
  switch (rule.unit) {
    case 'hours':
      return state.totalHours;
    case 'days':
      return state.totalDays;
    case 'cuts':
      return state.totalCuts;
  }
}

/**
 * Computes the maintenance schedule for a single tool.
 * @param rules - Maintenance rules for the tool
 * @param state - Current usage state of the tool
 * @returns Array of maintenance events
 */
function computeToolEvents(rules: readonly MaintenanceRule[], state: ToolUsageState): MaintenanceEvent[] {
  return rules.map((rule) => {
    const usage = getUsageSinceLast(rule, state);
    const percentElapsed = (usage / rule.interval) * 100;
    const remaining = rule.interval - usage;

    return {
      rule,
      status: getStatus(percentElapsed),
      remaining,
      percentElapsed: Math.round(percentElapsed * 100) / 100,
    };
  });
}

/** Priority weight for health score calculation. */
const PRIORITY_WEIGHTS: Record<MaintenancePriority, number> = {
  critical: 30,
  high: 20,
  normal: 10,
  low: 5,
};

/**
 * Computes a health score based on overdue/due maintenance events.
 * @param events - All maintenance events
 * @returns Score 0–100 (100 = no overdue, all upcoming)
 */
export function computeHealthScore(events: readonly MaintenanceEvent[]): number {
  if (events.length === 0) return 100;

  let penalty = 0;
  for (const event of events) {
    if (event.status === 'overdue') {
      penalty += PRIORITY_WEIGHTS[event.rule.priority];
    } else if (event.status === 'due') {
      penalty += PRIORITY_WEIGHTS[event.rule.priority] * 0.5;
    }
  }

  return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Generates a full maintenance schedule across all tools.
 *
 * @param rules - All maintenance rules
 * @param states - Current usage states for all tools
 * @returns Maintenance schedule result with events sorted by urgency
 * @throws RangeError if rules array is empty
 * @throws RangeError if a rule references a tool with no usage state
 */
export function generateMaintenanceSchedule(
  rules: readonly MaintenanceRule[],
  states: readonly ToolUsageState[],
): MaintenanceScheduleResult {
  if (rules.length === 0) {
    throw new RangeError('generateMaintenanceSchedule: rules array must not be empty');
  }

  const stateMap = new Map(states.map((s) => [s.toolId, s]));

  for (const rule of rules) {
    if (!stateMap.has(rule.toolId)) {
      throw new RangeError(`generateMaintenanceSchedule: no usage state for tool "${rule.toolId}"`);
    }
  }

  // Group rules by tool
  const rulesByTool = new Map<string, MaintenanceRule[]>();
  for (const rule of rules) {
    const existing = rulesByTool.get(rule.toolId) ?? [];
    existing.push(rule);
    rulesByTool.set(rule.toolId, existing);
  }

  // Compute events
  const allEvents: MaintenanceEvent[] = [];
  for (const [toolId, toolRules] of rulesByTool) {
    const state = stateMap.get(toolId)!;
    allEvents.push(...computeToolEvents(toolRules, state));
  }

  // Sort by urgency: overdue first, then due, then upcoming (by remaining asc)
  const statusOrder: Record<MaintenanceStatus, number> = {
    overdue: 0,
    due: 1,
    upcoming: 2,
    completed: 3,
  };
  allEvents.sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    return a.remaining - b.remaining;
  });

  const overdue = allEvents.filter((e) => e.status === 'overdue');
  const due = allEvents.filter((e) => e.status === 'due');
  const healthScore = computeHealthScore(allEvents);

  return {
    events: allEvents,
    overdue,
    due,
    totalRules: rules.length,
    healthScore,
  };
}

/**
 * Returns only the most urgent event for each tool.
 *
 * @param result - Full maintenance schedule result
 * @returns One event per tool (the most urgent)
 */
export function getMostUrgentPerTool(result: MaintenanceScheduleResult): MaintenanceEvent[] {
  const seen = new Set<string>();
  const urgent: MaintenanceEvent[] = [];

  for (const event of result.events) {
    if (!seen.has(event.rule.toolId)) {
      seen.add(event.rule.toolId);
      urgent.push(event);
    }
  }

  return urgent;
}
