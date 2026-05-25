/**
 * Sprint 75 — Machine profile registry.
 *
 * Pre-built profiles for the most common hobbyist and professional CNC
 * controllers. Each profile captures the serial connection settings AND the
 * recommended G-code generation parameters so the WebSerialPanel and the
 * GcodePreviewModal can share one source of truth.
 *
 * Pure TypeScript — no React, no DOM.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** All supported controller firmware identifiers. */
export type ControllerFirmware = 'grbl' | 'linuxcnc' | 'mach3' | 'smoothie' | 'tinyg' | 'marlin';

/** Spindle speed hint (RPM) for common router bit types. */
export interface SpindleHint {
  /** Rough cutting feed (mm/min). */
  feedRate: number;
  /** Plunge feed (mm/min). */
  plungeRate: number;
  /** Recommended spindle speed (RPM). */
  spindleRpm: number;
}

/** A fully-qualified machine profile. */
export interface MachineProfile {
  /** Unique slug, used as dictionary key and stored in project JSON. */
  id: string;
  /** Human-readable machine name. */
  name: string;
  /** Short description of the machine. */
  description: string;
  /** Controller firmware. */
  firmware: ControllerFirmware;
  // ── Serial connection ──
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: 'none' | 'even' | 'odd';
  // ── G-code generation defaults ──
  /** Safe retract height above material (mm). */
  safeZ: number;
  /** Maximum depth per pass (mm). */
  passDepth: number;
  /** Standard end-mill diameter (mm). */
  toolDiameter: number;
  /** XY cutting feed rate (mm/min). */
  feedRate: number;
  /** Z plunge feed rate (mm/min). */
  plungeRate: number;
  /** Default spindle speed (RPM, 0 = not used / manual). */
  spindleRpm: number;
  /** Whether to emit G2/G3 arc commands (firmware must support). */
  useArcs: boolean;
  /** Recommended work-holding: tabs, clamps, etc. */
  workHolding: string;
  /** Spindle hints keyed by typical router bit type. */
  hints?: Record<string, SpindleHint>;
}

/** Ordered list of all profile IDs. */
export const MACHINE_PROFILE_IDS = [
  'grbl-generic',
  'shapeoko-3',
  'x-carve-1000',
  'genmitsu-3018',
  'longmill',
  'linuxcnc-generic',
  'mach3-generic',
  'smoothieboard',
  'tinyg',
  'marlin-cnc',
] as const;

export type MachineProfileId = (typeof MACHINE_PROFILE_IDS)[number];

// ── Profile registry ──────────────────────────────────────────────────────────

export const MACHINE_PROFILES: Record<MachineProfileId, MachineProfile> = {
  'grbl-generic': {
    id: 'grbl-generic',
    name: 'Grbl (generic)',
    description: 'Any Grbl-flashed Arduino/Uno controller with standard settings.',
    firmware: 'grbl',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 5,
    passDepth: 3,
    toolDiameter: 6,
    feedRate: 1500,
    plungeRate: 600,
    spindleRpm: 18000,
    useArcs: true,
    workHolding: 'tabs',
  },
  'shapeoko-3': {
    id: 'shapeoko-3',
    name: 'Carbide3D Shapeoko 3',
    description: 'Shapeoko 3 with Carbide Motion / Grbl. 406×406 mm work area.',
    firmware: 'grbl',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 5,
    passDepth: 2,
    toolDiameter: 6.35,
    feedRate: 1200,
    plungeRate: 500,
    spindleRpm: 18000,
    useArcs: true,
    workHolding: 'tabs',
    hints: {
      plywood: { feedRate: 1200, plungeRate: 500, spindleRpm: 16000 },
      mdf: { feedRate: 1500, plungeRate: 600, spindleRpm: 18000 },
    },
  },
  'x-carve-1000': {
    id: 'x-carve-1000',
    name: 'Inventables X-Carve 1000mm',
    description: 'X-Carve 1000mm with DeWalt spindle and Grbl firmware.',
    firmware: 'grbl',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 5,
    passDepth: 2.5,
    toolDiameter: 6.35,
    feedRate: 1800,
    plungeRate: 600,
    spindleRpm: 16000,
    useArcs: true,
    workHolding: 'tabs',
  },
  'genmitsu-3018': {
    id: 'genmitsu-3018',
    name: 'Sainsmart Genmitsu 3018',
    description: 'Budget 3018 router with Grbl 1.1. 300×180×45 mm work area.',
    firmware: 'grbl',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 3,
    passDepth: 1,
    toolDiameter: 3.175,
    feedRate: 800,
    plungeRate: 300,
    spindleRpm: 10000,
    useArcs: false,
    workHolding: 'clamps',
  },
  longmill: {
    id: 'longmill',
    name: 'Sienci LongMill MK2',
    description: 'LongMill MK2 with Grbl firmware. Available in 12×12 to 48×30 inch sizes.',
    firmware: 'grbl',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 5,
    passDepth: 3,
    toolDiameter: 6,
    feedRate: 2000,
    plungeRate: 800,
    spindleRpm: 18000,
    useArcs: true,
    workHolding: 'tabs',
  },
  'linuxcnc-generic': {
    id: 'linuxcnc-generic',
    name: 'LinuxCNC (generic)',
    description: 'LinuxCNC via serial/USB with a Mesa or Pico CNC board.',
    firmware: 'linuxcnc',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 8,
    passDepth: 4,
    toolDiameter: 6,
    feedRate: 2500,
    plungeRate: 1000,
    spindleRpm: 24000,
    useArcs: true,
    workHolding: 'vacuum',
  },
  'mach3-generic': {
    id: 'mach3-generic',
    name: 'Mach3 (generic)',
    description: 'Mach3 via USB/parallel port adapter on a Windows CNC router.',
    firmware: 'mach3',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 8,
    passDepth: 4,
    toolDiameter: 8,
    feedRate: 3000,
    plungeRate: 1200,
    spindleRpm: 20000,
    useArcs: true,
    workHolding: 'vacuum',
  },
  smoothieboard: {
    id: 'smoothieboard',
    name: 'Smoothieboard',
    description: 'Smoothieboard v1/v2 running Smoothieware firmware.',
    firmware: 'smoothie',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 5,
    passDepth: 3,
    toolDiameter: 6,
    feedRate: 2000,
    plungeRate: 800,
    spindleRpm: 20000,
    useArcs: true,
    workHolding: 'tabs',
  },
  tinyg: {
    id: 'tinyg',
    name: 'TinyG',
    description: 'Synthetos TinyG v8 or g2core motion controller.',
    firmware: 'tinyg',
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 5,
    passDepth: 3,
    toolDiameter: 6,
    feedRate: 2000,
    plungeRate: 800,
    spindleRpm: 18000,
    useArcs: true,
    workHolding: 'tabs',
  },
  'marlin-cnc': {
    id: 'marlin-cnc',
    name: 'Marlin CNC mode',
    description: 'Marlin 2.x firmware with CNC spindle mode enabled (e.g. large-format DIY routers).',
    firmware: 'marlin',
    baudRate: 250000,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    safeZ: 5,
    passDepth: 2,
    toolDiameter: 6,
    feedRate: 1500,
    plungeRate: 600,
    spindleRpm: 15000,
    useArcs: false,
    workHolding: 'clamps',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return a profile by ID, or `undefined` if the ID is not registered.
 */
export function getMachineProfile(id: string): MachineProfile | undefined {
  return MACHINE_PROFILES[id as MachineProfileId];
}

/**
 * Return the default profile used when no selection is stored.
 */
export function getDefaultMachineProfile(): MachineProfile {
  return MACHINE_PROFILES['grbl-generic'];
}
