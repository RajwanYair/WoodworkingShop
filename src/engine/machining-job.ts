/**
 * Sprint 155 — Cabinet-to-machining center direct link prototype.
 *
 * Bridges the cut optimizer output (placed parts) and G-code toolpath generator
 * to produce a complete machining job definition that can be sent to a CNC
 * controller via the WebSerial CNC sender.
 *
 * The MachiningJob encapsulates:
 *   - Job metadata (name, material, date)
 *   - Tool setup (end-mill diameter, pass depth, feeds/speeds)
 *   - Ordered list of machining operations (profile cuts, dados, drill holes)
 *   - Estimated total machining time
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 */

import type { MachineProfile } from './machine-profiles';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Type of machining operation. */
export type OperationType = 'profile-cut' | 'dado' | 'rabbet' | 'drill' | 'pocket';

/** A single machining operation within a job. */
export interface MachiningOperation {
  /** Unique operation ID within the job. */
  id: string;
  /** Operation type determines toolpath strategy. */
  type: OperationType;
  /** Part label / ID this operation belongs to. */
  partId: string;
  /** Part label for display. */
  partLabel: string;
  /** Cut depth (mm). */
  depth: number;
  /** Cut width (mm) — for dados/rabbets. */
  width?: number;
  /** X start position on sheet (mm). */
  x: number;
  /** Y start position on sheet (mm). */
  y: number;
  /** Length of the cut path (mm). */
  length: number;
  /** Whether this is along the grain direction. */
  alongGrain: boolean;
  /** Estimated time for this operation (seconds). */
  estimatedTimeSec: number;
}

/** Tool setup parameters derived from machine profile. */
export interface ToolSetup {
  /** End-mill diameter (mm). */
  toolDiameter: number;
  /** Maximum depth per pass (mm). */
  passDepth: number;
  /** XY feed rate (mm/min). */
  feedRate: number;
  /** Z plunge rate (mm/min). */
  plungeRate: number;
  /** Spindle speed (RPM). */
  spindleRpm: number;
  /** Safe retract height (mm). */
  safeZ: number;
}

/** A part to be machined (input from cut optimizer). */
export interface MachinablePart {
  /** Part ID. */
  id: string;
  /** Display label. */
  label: string;
  /** Width (mm) — across sheet. */
  width: number;
  /** Length (mm) — along grain. */
  length: number;
  /** Material thickness (mm). */
  thickness: number;
  /** X position on the sheet. */
  x: number;
  /** Y position on the sheet. */
  y: number;
  /** Whether the part needs a dado (e.g. shelf housing). */
  dados?: DadoSpec[];
  /** Whether the part needs drill holes (e.g. shelf pin holes). */
  drillHoles?: DrillHoleSpec[];
}

/** Specification for a dado/groove to route into a part. */
export interface DadoSpec {
  /** Offset from part edge to dado center (mm). */
  offset: number;
  /** Dado width (mm). */
  width: number;
  /** Dado depth (mm). */
  depth: number;
  /** Direction: 'across' (perpendicular to grain) or 'along' (parallel to grain). */
  direction: 'across' | 'along';
}

/** Specification for a drill hole. */
export interface DrillHoleSpec {
  /** X offset from part bottom-left (mm). */
  x: number;
  /** Y offset from part bottom-left (mm). */
  y: number;
  /** Hole diameter (mm). */
  diameter: number;
  /** Hole depth (mm). */
  depth: number;
}

/** Complete machining job ready for CNC transmission. */
export interface MachiningJob {
  /** Job identifier. */
  id: string;
  /** Job name (derived from project/cabinet name). */
  name: string;
  /** Material being cut. */
  material: string;
  /** Sheet dimensions. */
  sheetWidth: number;
  sheetLength: number;
  /** Timestamp when job was created. */
  createdAt: string;
  /** Machine profile used for this job. */
  machineProfileId: string;
  /** Tool setup derived from profile. */
  toolSetup: ToolSetup;
  /** Ordered list of operations. */
  operations: MachiningOperation[];
  /** Total estimated machining time (seconds). */
  totalTimeSec: number;
  /** Number of tool passes needed (total across all operations). */
  totalPasses: number;
}

/** Job generation options. */
export interface JobOptions {
  /** Job name override (defaults to 'Untitled Job'). */
  name?: string;
  /** Material name for metadata. */
  material?: string;
  /** Sheet width (mm). */
  sheetWidth: number;
  /** Sheet length (mm). */
  sheetLength: number;
  /** Whether to include profile cuts around each part. */
  includeProfileCuts?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum operation time estimate (seconds) — accounts for spindle ramp-up. */
const MIN_OPERATION_TIME_SEC = 2;

/** Additional time per tool retract/plunge cycle (seconds). */
const RETRACT_PENALTY_SEC = 1.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0;

/** Generate a sequential operation ID. */
function nextOpId(): string {
  return `op-${++_idCounter}`;
}

/** Reset ID counter (for testing). */
export function resetIdCounter(): void {
  _idCounter = 0;
}

/**
 * Estimate machining time for a linear cut.
 *
 * @param pathLength Length of the cut path (mm).
 * @param depth      Total cut depth (mm).
 * @param passDepth  Depth per pass (mm).
 * @param feedRate   XY feed rate (mm/min).
 * @param plungeRate Z plunge rate (mm/min).
 */
function estimateTime(
  pathLength: number,
  depth: number,
  passDepth: number,
  feedRate: number,
  plungeRate: number,
): number {
  const passes = Math.ceil(depth / passDepth);
  const cutTime = (pathLength / feedRate) * passes * 60; // seconds
  const plungeTime = (depth / plungeRate) * 60 + (passes - 1) * RETRACT_PENALTY_SEC;
  return Math.max(MIN_OPERATION_TIME_SEC, cutTime + plungeTime);
}

// ─── Tool setup extraction ────────────────────────────────────────────────────

/**
 * Extract tool setup from a machine profile.
 */
export function extractToolSetup(profile: MachineProfile): ToolSetup {
  return {
    toolDiameter: profile.toolDiameter,
    passDepth: profile.passDepth,
    feedRate: profile.feedRate,
    plungeRate: profile.plungeRate,
    spindleRpm: profile.spindleRpm,
    safeZ: profile.safeZ,
  };
}

// ─── Operation generators ─────────────────────────────────────────────────────

/**
 * Generate a profile cut operation (full-depth perimeter cut to separate part from sheet).
 */
function generateProfileCut(part: MachinablePart, setup: ToolSetup): MachiningOperation {
  const perimeter = 2 * (part.width + part.length);
  const timeSec = estimateTime(perimeter, part.thickness, setup.passDepth, setup.feedRate, setup.plungeRate);

  return {
    id: nextOpId(),
    type: 'profile-cut',
    partId: part.id,
    partLabel: part.label,
    depth: part.thickness,
    x: part.x,
    y: part.y,
    length: perimeter,
    alongGrain: false,
    estimatedTimeSec: timeSec,
  };
}

/**
 * Generate dado routing operations for a part.
 */
function generateDadoOps(part: MachinablePart, setup: ToolSetup): MachiningOperation[] {
  if (!part.dados || part.dados.length === 0) return [];

  return part.dados.map((dado) => {
    const pathLength = dado.direction === 'across' ? part.width : part.length;
    const timeSec = estimateTime(pathLength, dado.depth, setup.passDepth, setup.feedRate, setup.plungeRate);

    return {
      id: nextOpId(),
      type: 'dado' as const,
      partId: part.id,
      partLabel: part.label,
      depth: dado.depth,
      width: dado.width,
      x: part.x + (dado.direction === 'along' ? dado.offset : 0),
      y: part.y + (dado.direction === 'across' ? dado.offset : 0),
      length: pathLength,
      alongGrain: dado.direction === 'along',
      estimatedTimeSec: timeSec,
    };
  });
}

/**
 * Generate drill hole operations for a part.
 */
function generateDrillOps(part: MachinablePart, setup: ToolSetup): MachiningOperation[] {
  if (!part.drillHoles || part.drillHoles.length === 0) return [];

  return part.drillHoles.map((hole) => {
    const plungeTime = (hole.depth / setup.plungeRate) * 60;
    const timeSec = Math.max(MIN_OPERATION_TIME_SEC, plungeTime + RETRACT_PENALTY_SEC);

    return {
      id: nextOpId(),
      type: 'drill' as const,
      partId: part.id,
      partLabel: part.label,
      depth: hole.depth,
      x: part.x + hole.x,
      y: part.y + hole.y,
      length: 0, // drill = no lateral movement
      alongGrain: false,
      estimatedTimeSec: timeSec,
    };
  });
}

// ─── Job generation ───────────────────────────────────────────────────────────

/**
 * Generate a complete machining job from a set of parts and a machine profile.
 *
 * @param parts   Parts placed on the sheet (from cut optimizer).
 * @param profile Machine profile for the target CNC.
 * @param options Job options (name, material, sheet size).
 * @returns Complete MachiningJob ready for CNC submission.
 */
export function generateMachiningJob(
  parts: MachinablePart[],
  profile: MachineProfile,
  options: JobOptions,
): MachiningJob {
  resetIdCounter();

  const toolSetup = extractToolSetup(profile);
  const operations: MachiningOperation[] = [];
  let totalPasses = 0;

  for (const part of parts) {
    // Profile cuts (perimeter)
    if (options.includeProfileCuts !== false) {
      const profileOp = generateProfileCut(part, toolSetup);
      operations.push(profileOp);
      totalPasses += Math.ceil(part.thickness / toolSetup.passDepth);
    }

    // Dado operations
    const dadoOps = generateDadoOps(part, toolSetup);
    for (const op of dadoOps) {
      operations.push(op);
      totalPasses += Math.ceil(op.depth / toolSetup.passDepth);
    }

    // Drill operations
    const drillOps = generateDrillOps(part, toolSetup);
    for (const op of drillOps) {
      operations.push(op);
      totalPasses += Math.ceil(op.depth / toolSetup.passDepth);
    }
  }

  const totalTimeSec = operations.reduce((sum, op) => sum + op.estimatedTimeSec, 0);

  return {
    id: `job-${Date.now()}`,
    name: options.name ?? 'Untitled Job',
    material: options.material ?? 'Unknown',
    sheetWidth: options.sheetWidth,
    sheetLength: options.sheetLength,
    createdAt: new Date().toISOString(),
    machineProfileId: profile.id,
    toolSetup,
    operations,
    totalTimeSec,
    totalPasses,
  };
}

/**
 * Validate that a machining job can run on the target machine.
 * Checks that parts fit the sheet and tool diameter covers dado widths.
 *
 * @returns Array of error messages (empty = valid).
 */
export function validateMachiningJob(job: MachiningJob): string[] {
  const errors: string[] = [];

  for (const op of job.operations) {
    if (op.x < 0 || op.y < 0) {
      errors.push(`Operation ${op.id} (${op.partLabel}) has negative coordinates.`);
    }
    if (op.type === 'profile-cut') {
      // Check part fits on sheet (approximate from x + part perimeter context)
      // We only have x,y from the operation — validate they are within bounds
      if (op.x > job.sheetWidth || op.y > job.sheetLength) {
        errors.push(`Operation ${op.id} (${op.partLabel}) starts outside sheet bounds.`);
      }
    }
    if (op.type === 'dado' && op.width != null && op.width < job.toolSetup.toolDiameter) {
      errors.push(
        `Dado ${op.id} width (${op.width} mm) is narrower than tool diameter (${job.toolSetup.toolDiameter} mm).`,
      );
    }
  }

  return errors;
}
