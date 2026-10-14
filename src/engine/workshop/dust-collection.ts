/**
 * Sprint 172 — Dust collection estimator engine.
 *
 * Calculates CFM (cubic feet per minute) airflow requirements for a workshop
 * based on the machines in use and duct layout. Helps woodworkers size their
 * dust collection system appropriately.
 *
 * Pure function — no React, no DOM, no side effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Machine types commonly found in woodworking shops. */
export type MachineType =
  'tablesaw' | 'bandsaw' | 'planer' | 'jointer' | 'router' | 'sander' | 'miter-saw' | 'drill-press' | 'cnc' | 'lathe';

/** Duct shape used in the collection system. */
export type DuctShape = 'round' | 'rectangular';

/** A machine entry in the dust collection plan. */
export interface DustMachine {
  /** Unique identifier for this machine instance. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Machine type determines base CFM requirement. */
  type: MachineType;
  /** Port diameter in inches (typically 4 or 6). */
  portDiameter: number;
  /** Distance from machine port to main trunk in feet. */
  ductRunFeet: number;
  /** Number of 90° elbows in this machine's duct run. */
  elbowCount: number;
}

/** A duct segment in the collection system. */
export interface DuctSegment {
  /** Length in feet. */
  lengthFeet: number;
  /** Inside diameter in inches. */
  diameterInches: number;
  /** Shape of the duct. */
  shape: DuctShape;
  /** Number of 90° elbows in this segment. */
  elbowCount: number;
}

/** Result of a dust collection system sizing calculation. */
export interface DustCollectionResult {
  /** Total CFM required for all simultaneous machines. */
  totalCfmRequired: number;
  /** Per-machine CFM breakdown. */
  machineBreakdown: MachineAirflow[];
  /** Total static pressure loss in inches of water gauge (iwg). */
  staticPressureLoss: number;
  /** Recommended minimum collector HP rating. */
  recommendedHp: number;
  /** Recommended main trunk diameter in inches. */
  recommendedTrunkDiameter: number;
  /** Whether the system is adequately sized. */
  adequate: boolean;
  /** Warning messages for undersized components. */
  warnings: string[];
}

/** Airflow breakdown for a single machine. */
export interface MachineAirflow {
  machineId: string;
  machineName: string;
  type: MachineType;
  cfmRequired: number;
  staticPressureLoss: number;
}

/** Collector specification for sizing recommendations. */
export interface CollectorSpec {
  /** CFM capacity of the collector. */
  cfmCapacity: number;
  /** Horsepower rating. */
  hp: number;
  /** Maximum static pressure in iwg. */
  maxStaticPressure: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Base CFM requirements per machine type.
 * Based on industry-standard dust collection guidelines.
 */
export const BASE_CFM = {
  tablesaw: 350,
  bandsaw: 350,
  planer: 400,
  jointer: 350,
  router: 195,
  sander: 350,
  'miter-saw': 300,
  'drill-press': 150,
  cnc: 400,
  lathe: 250,
} as const satisfies Record<MachineType, number>;

/**
 * Equivalent feet of straight duct per 90° elbow.
 * Standard friction-loss assumption.
 */
const ELBOW_EQUIVALENT_FEET = 5;

/**
 * Friction loss per foot of 4″ duct in iwg.
 * Approximate for standard galvanized spiral duct at typical workshop velocities.
 */
const FRICTION_LOSS_PER_FOOT_4IN = 0.02;

/**
 * Diameter scaling factor for friction loss.
 * Friction loss scales inversely with diameter^1.22 (empirical).
 */
const DIAMETER_EXPONENT = 1.22;

/**
 * CFM per HP approximation for single-stage collectors.
 */
const CFM_PER_HP = 150;

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Calculate the CFM requirement for a single machine.
 * @param machine - Machine entry with type and port diameter.
 * @returns CFM requirement adjusted for port diameter.
 * @throws RangeError if portDiameter is not positive.
 */
export function machineCfm(machine: DustMachine): number {
  if (machine.portDiameter <= 0) {
    throw new RangeError(`machineCfm: portDiameter must be positive, got ${machine.portDiameter}`);
  }
  const baseCfm = BASE_CFM[machine.type];
  // Scale CFM by port area ratio vs standard 4″ port
  const areaRatio = (machine.portDiameter / 4) ** 2;
  return Math.round(baseCfm * Math.min(areaRatio, 2.25));
}

/**
 * Calculate static pressure loss for a machine's duct run.
 * @param machine - Machine with duct run specifications.
 * @returns Static pressure loss in inches of water gauge (iwg).
 * @throws RangeError if ductRunFeet is negative.
 */
export function machineStaticPressure(machine: DustMachine): number {
  if (machine.ductRunFeet < 0) {
    throw new RangeError(`machineStaticPressure: ductRunFeet must not be negative, got ${machine.ductRunFeet}`);
  }
  if (machine.elbowCount < 0) {
    throw new RangeError(`machineStaticPressure: elbowCount must not be negative, got ${machine.elbowCount}`);
  }
  const equivalentLength = machine.ductRunFeet + machine.elbowCount * ELBOW_EQUIVALENT_FEET;
  const diameterFactor = (4 / machine.portDiameter) ** DIAMETER_EXPONENT;
  return Number((equivalentLength * FRICTION_LOSS_PER_FOOT_4IN * diameterFactor).toFixed(3));
}

/**
 * Recommend main trunk diameter based on total CFM.
 * Uses velocity rule: 4000 FPM target for main trunk.
 * @param totalCfm - Total system CFM requirement.
 * @returns Recommended trunk diameter in inches (rounded to nearest standard size).
 */
export function recommendTrunkDiameter(totalCfm: number): number {
  if (totalCfm <= 0) {
    throw new RangeError(`recommendTrunkDiameter: totalCfm must be positive, got ${totalCfm}`);
  }
  // Area = CFM / velocity (4000 FPM), diameter = 2 * sqrt(area / π)
  // Convert area from ft² to in²: multiply by 144
  const areaIn2 = (totalCfm / 4000) * 144;
  const exactDiameter = 2 * Math.sqrt(areaIn2 / Math.PI);
  // Round up to nearest standard duct size (4, 5, 6, 7, 8, 10, 12)
  const standardSizes = [4, 5, 6, 7, 8, 10, 12];
  return standardSizes.find((s) => s >= exactDiameter) ?? 12;
}

/**
 * Calculate recommended HP for the collector.
 * @param totalCfm - Total system CFM.
 * @returns Recommended HP rating.
 */
export function recommendHp(totalCfm: number): number {
  if (totalCfm <= 0) {
    throw new RangeError(`recommendHp: totalCfm must be positive, got ${totalCfm}`);
  }
  const rawHp = totalCfm / CFM_PER_HP;
  // Round up to standard HP ratings
  const standardHp = [1, 1.5, 2, 3, 5, 7.5, 10];
  return standardHp.find((hp) => hp >= rawHp) ?? 10;
}

/**
 * Perform a complete dust collection system sizing calculation.
 * @param machines - All machines to be connected to the system.
 * @param simultaneousMachines - Max number of machines running at once (default: 2).
 * @returns Full system sizing result with recommendations.
 * @throws RangeError if machines array is empty or simultaneousMachines < 1.
 */
export function calculateSystem(machines: readonly DustMachine[], simultaneousMachines = 2): DustCollectionResult {
  if (machines.length === 0) {
    throw new RangeError('calculateSystem: machines array must not be empty');
  }
  if (simultaneousMachines < 1) {
    throw new RangeError(`calculateSystem: simultaneousMachines must be >= 1, got ${simultaneousMachines}`);
  }

  // Calculate per-machine airflow
  const breakdown: MachineAirflow[] = machines.map((m) => ({
    machineId: m.id,
    machineName: m.name,
    type: m.type,
    cfmRequired: machineCfm(m),
    staticPressureLoss: machineStaticPressure(m),
  }));

  // Sort by CFM descending to pick top N for simultaneous use
  const sorted = [...breakdown].sort((a, b) => b.cfmRequired - a.cfmRequired);
  const activeMachines = sorted.slice(0, Math.min(simultaneousMachines, sorted.length));
  const totalCfmRequired = activeMachines.reduce((sum, m) => sum + m.cfmRequired, 0);

  // Static pressure = worst-case (longest run)
  const staticPressureLoss = Math.max(...breakdown.map((m) => m.staticPressureLoss));

  const recommendedTrunkDiameter = recommendTrunkDiameter(totalCfmRequired);
  const recommendedHpValue = recommendHp(totalCfmRequired);

  // Generate warnings
  const warnings: string[] = [];
  for (const m of breakdown) {
    if (m.staticPressureLoss > 6) {
      warnings.push(`${m.machineName}: high static pressure (${m.staticPressureLoss} iwg) — consider shorter duct run`);
    }
  }
  if (totalCfmRequired > 1500) {
    warnings.push('System requires > 1500 CFM — consider two-stage collector or cyclone separator');
  }

  const adequate = warnings.length === 0;

  return {
    totalCfmRequired,
    machineBreakdown: breakdown,
    staticPressureLoss,
    recommendedHp: recommendedHpValue,
    recommendedTrunkDiameter,
    adequate,
    warnings,
  };
}

/**
 * Validate a collector specification against system requirements.
 * @param spec - Collector specs to validate.
 * @param systemResult - Calculated system requirements.
 * @returns Whether the collector is adequate, and any deficiency messages.
 */
export function validateCollector(
  spec: CollectorSpec,
  systemResult: DustCollectionResult,
): { adequate: boolean; deficiencies: string[] } {
  const deficiencies: string[] = [];

  if (spec.cfmCapacity < systemResult.totalCfmRequired) {
    deficiencies.push(`CFM capacity (${spec.cfmCapacity}) is below requirement (${systemResult.totalCfmRequired})`);
  }
  if (spec.maxStaticPressure < systemResult.staticPressureLoss) {
    deficiencies.push(
      `Max static pressure (${spec.maxStaticPressure} iwg) is below system loss (${systemResult.staticPressureLoss} iwg)`,
    );
  }
  if (spec.hp < systemResult.recommendedHp) {
    deficiencies.push(`HP rating (${spec.hp}) is below recommended (${systemResult.recommendedHp})`);
  }

  return { adequate: deficiencies.length === 0, deficiencies };
}
