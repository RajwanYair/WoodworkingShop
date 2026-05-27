/**
 * Workshop Safety Checker — Sprint 175
 *
 * Validates workshop tool configurations for clearance zones,
 * detects unsafe placements, recommends PPE, and computes safety scores.
 */

/** Tool type in the workshop. */
export type ToolType =
  | 'table-saw'
  | 'band-saw'
  | 'router-table'
  | 'jointer'
  | 'planer'
  | 'drill-press'
  | 'miter-saw'
  | 'lathe'
  | 'sander'
  | 'hand-tool';

/** PPE category. */
export type PpeCategory =
  | 'safety-glasses'
  | 'hearing-protection'
  | 'dust-mask'
  | 'respirator'
  | 'face-shield'
  | 'push-stick'
  | 'anti-kickback'
  | 'gloves';

/** A workshop tool with position and dimensions. */
export interface WorkshopTool {
  /** Unique tool identifier. */
  readonly id: string;
  /** Tool type. */
  readonly type: ToolType;
  /** Tool name/label. */
  readonly label: string;
  /** X position in workshop (mm from origin). */
  readonly x: number;
  /** Y position in workshop (mm from origin). */
  readonly y: number;
  /** Tool footprint width (mm). */
  readonly width: number;
  /** Tool footprint depth (mm). */
  readonly depth: number;
}

/** A safety violation. */
export interface SafetyViolation {
  /** Violation severity. */
  readonly severity: 'warning' | 'critical';
  /** Which tool(s) are involved. */
  readonly toolIds: readonly string[];
  /** Human-readable violation message. */
  readonly message: string;
  /** Violation rule code. */
  readonly rule: string;
}

/** PPE recommendation for a tool. */
export interface PpeRecommendation {
  readonly toolId: string;
  readonly toolType: ToolType;
  readonly required: readonly PpeCategory[];
}

/** Full safety check result. */
export interface SafetyResult {
  /** All detected violations. */
  readonly violations: readonly SafetyViolation[];
  /** PPE recommendations per tool. */
  readonly ppeRecommendations: readonly PpeRecommendation[];
  /** Overall safety score (0–100, higher is safer). */
  readonly score: number;
  /** Whether the workshop passes minimum safety threshold (score >= 70). */
  readonly passes: boolean;
}

/** Minimum clearance zones (mm) per tool type (operator side). */
const CLEARANCE_ZONES: Record<ToolType, number> = {
  'table-saw': 2400,
  'band-saw': 1200,
  'router-table': 1500,
  jointer: 1800,
  planer: 2400,
  'drill-press': 900,
  'miter-saw': 2400,
  lathe: 1500,
  sander: 900,
  'hand-tool': 600,
};

/** PPE requirements per tool type. */
const PPE_REQUIREMENTS: Record<ToolType, readonly PpeCategory[]> = {
  'table-saw': ['safety-glasses', 'hearing-protection', 'dust-mask', 'push-stick', 'anti-kickback'],
  'band-saw': ['safety-glasses', 'hearing-protection', 'dust-mask'],
  'router-table': ['safety-glasses', 'hearing-protection', 'dust-mask', 'push-stick'],
  jointer: ['safety-glasses', 'hearing-protection', 'dust-mask', 'push-stick'],
  planer: ['safety-glasses', 'hearing-protection', 'dust-mask'],
  'drill-press': ['safety-glasses', 'dust-mask'],
  'miter-saw': ['safety-glasses', 'hearing-protection', 'dust-mask', 'face-shield'],
  lathe: ['face-shield', 'dust-mask'],
  sander: ['safety-glasses', 'dust-mask', 'respirator'],
  'hand-tool': ['safety-glasses'],
};

/** Noise levels (dB) for hearing protection threshold. */
const NOISE_LEVELS: Record<ToolType, number> = {
  'table-saw': 100,
  'band-saw': 90,
  'router-table': 95,
  jointer: 92,
  planer: 100,
  'drill-press': 80,
  'miter-saw': 105,
  lathe: 85,
  sander: 88,
  'hand-tool': 60,
};

/**
 * Returns the required clearance zone for a tool type (mm).
 * @param toolType - The tool type
 * @returns Clearance distance in mm
 */
export function getToolClearance(toolType: ToolType): number {
  return CLEARANCE_ZONES[toolType];
}

/**
 * Returns the noise level of a tool in dB.
 * @param toolType - The tool type
 * @returns Noise level in decibels
 */
export function getNoiseLevel(toolType: ToolType): number {
  return NOISE_LEVELS[toolType];
}

/**
 * Computes axis-aligned bounding box distance between two tools.
 * Returns 0 if they overlap.
 * @param a - First tool
 * @param b - Second tool
 * @returns Minimum distance in mm between the two tool footprints
 */
function toolDistance(a: WorkshopTool, b: WorkshopTool): number {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.depth;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.depth;

  const dx = Math.max(0, Math.max(a.x - bRight, b.x - aRight));
  const dy = Math.max(0, Math.max(a.y - bBottom, b.y - aBottom));

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks clearance zone violations between tools.
 */
function checkClearanceViolations(tools: readonly WorkshopTool[]): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  for (let i = 0; i < tools.length; i++) {
    for (let j = i + 1; j < tools.length; j++) {
      const a = tools[i];
      const b = tools[j];
      const dist = toolDistance(a, b);
      const requiredA = CLEARANCE_ZONES[a.type];
      const requiredB = CLEARANCE_ZONES[b.type];
      const minRequired = Math.min(requiredA, requiredB);

      if (dist < minRequired) {
        const severity = dist < minRequired * 0.5 ? 'critical' : 'warning';
        violations.push({
          severity,
          toolIds: [a.id, b.id],
          message: `Insufficient clearance between "${a.label}" and "${b.label}": ${Math.round(dist)}mm (need ${minRequired}mm)`,
          rule: 'clearance-zone',
        });
      }
    }
  }

  return violations;
}

/**
 * Checks for overlapping tool footprints.
 */
function checkOverlaps(tools: readonly WorkshopTool[]): SafetyViolation[] {
  const violations: SafetyViolation[] = [];

  for (let i = 0; i < tools.length; i++) {
    for (let j = i + 1; j < tools.length; j++) {
      const a = tools[i];
      const b = tools[j];
      const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
      const overlapY = a.y < b.y + b.depth && a.y + a.depth > b.y;

      if (overlapX && overlapY) {
        violations.push({
          severity: 'critical',
          toolIds: [a.id, b.id],
          message: `Tool footprints overlap: "${a.label}" and "${b.label}"`,
          rule: 'overlap',
        });
      }
    }
  }

  return violations;
}

/**
 * Checks for excessive cumulative noise from adjacent high-dB tools.
 */
function checkNoiseHazards(tools: readonly WorkshopTool[]): SafetyViolation[] {
  const violations: SafetyViolation[] = [];
  const loudTools = tools.filter((t) => NOISE_LEVELS[t.type] >= 95);

  if (loudTools.length >= 3) {
    violations.push({
      severity: 'warning',
      toolIds: loudTools.map((t) => t.id),
      message: `${loudTools.length} high-noise tools (≥95 dB) in workshop — consider sound barriers`,
      rule: 'noise-accumulation',
    });
  }

  return violations;
}

/**
 * Generates PPE recommendations for all tools.
 * @param tools - Array of workshop tools
 * @returns PPE recommendations for each tool
 */
export function recommendPpe(tools: readonly WorkshopTool[]): PpeRecommendation[] {
  return tools.map((tool) => ({
    toolId: tool.id,
    toolType: tool.type,
    required: PPE_REQUIREMENTS[tool.type],
  }));
}

/**
 * Computes a safety score (0–100) based on violations.
 * @param violations - Detected violations
 * @param toolCount - Total number of tools in the workshop
 * @returns Score between 0 and 100
 */
export function computeSafetyScore(violations: readonly SafetyViolation[], toolCount: number): number {
  if (toolCount === 0) return 100;

  let penalty = 0;
  for (const v of violations) {
    penalty += v.severity === 'critical' ? 25 : 10;
  }

  return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Performs a full safety check on the workshop layout.
 *
 * @param tools - Array of workshop tools with positions and dimensions
 * @returns Safety check result with violations, PPE recommendations, and score
 * @throws RangeError if tools array is empty
 */
export function checkWorkshopSafety(tools: readonly WorkshopTool[]): SafetyResult {
  if (tools.length === 0) {
    throw new RangeError('checkWorkshopSafety: tools array must not be empty');
  }

  const violations: SafetyViolation[] = [
    ...checkOverlaps(tools),
    ...checkClearanceViolations(tools),
    ...checkNoiseHazards(tools),
  ];

  const ppeRecommendations = recommendPpe(tools);
  const score = computeSafetyScore(violations, tools.length);

  return {
    violations,
    ppeRecommendations,
    score,
    passes: score >= 70,
  };
}
