import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractToolSetup,
  generateMachiningJob,
  validateMachiningJob,
  resetIdCounter,
} from '../../src/engine/machining-job';
import type { MachinablePart } from '../../src/engine/machining-job';
import type { MachineProfile } from '../../src/engine/machine-profiles';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROFILE: MachineProfile = {
  id: 'test-cnc',
  name: 'Test CNC',
  description: 'Test profile',
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
};

const SIMPLE_PART: MachinablePart = {
  id: 'side-panel',
  label: 'Side Panel',
  width: 400,
  length: 700,
  thickness: 18,
  x: 10,
  y: 10,
};

const PART_WITH_DADOS: MachinablePart = {
  id: 'shelf-housing',
  label: 'Shelf Housing',
  width: 500,
  length: 600,
  thickness: 18,
  x: 0,
  y: 0,
  dados: [
    { offset: 150, width: 18, depth: 9, direction: 'across' },
    { offset: 300, width: 18, depth: 9, direction: 'across' },
  ],
};

const PART_WITH_DRILLS: MachinablePart = {
  id: 'shelf-side',
  label: 'Shelf Side',
  width: 300,
  length: 700,
  thickness: 18,
  x: 420,
  y: 10,
  drillHoles: [
    { x: 37, y: 100, diameter: 5, depth: 12 },
    { x: 37, y: 200, diameter: 5, depth: 12 },
    { x: 37, y: 300, diameter: 5, depth: 12 },
  ],
};

const JOB_OPTIONS = { sheetWidth: 2440, sheetLength: 1220, name: 'Test Cabinet', material: '18mm Birch Plywood' };

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetIdCounter();
});

describe('extractToolSetup', () => {
  it('extracts correct fields from machine profile', () => {
    const setup = extractToolSetup(PROFILE);
    expect(setup.toolDiameter).toBe(6);
    expect(setup.passDepth).toBe(3);
    expect(setup.feedRate).toBe(1500);
    expect(setup.plungeRate).toBe(600);
    expect(setup.spindleRpm).toBe(18000);
    expect(setup.safeZ).toBe(5);
  });
});

describe('generateMachiningJob', () => {
  it('generates job with profile cuts for simple part', () => {
    const job = generateMachiningJob([SIMPLE_PART], PROFILE, JOB_OPTIONS);
    expect(job.name).toBe('Test Cabinet');
    expect(job.material).toBe('18mm Birch Plywood');
    expect(job.machineProfileId).toBe('test-cnc');
    expect(job.sheetWidth).toBe(2440);
    expect(job.sheetLength).toBe(1220);
    expect(job.operations.length).toBeGreaterThanOrEqual(1);
    expect(job.operations[0].type).toBe('profile-cut');
  });

  it('computes perimeter length for profile cut', () => {
    const job = generateMachiningJob([SIMPLE_PART], PROFILE, JOB_OPTIONS);
    const profileOp = job.operations.find((op) => op.type === 'profile-cut')!;
    expect(profileOp.length).toBe(2 * (400 + 700)); // 2200mm
  });

  it('includes dado operations', () => {
    const job = generateMachiningJob([PART_WITH_DADOS], PROFILE, JOB_OPTIONS);
    const dados = job.operations.filter((op) => op.type === 'dado');
    expect(dados).toHaveLength(2);
    expect(dados[0].depth).toBe(9);
    expect(dados[0].width).toBe(18);
  });

  it('includes drill operations', () => {
    const job = generateMachiningJob([PART_WITH_DRILLS], PROFILE, JOB_OPTIONS);
    const drills = job.operations.filter((op) => op.type === 'drill');
    expect(drills).toHaveLength(3);
    expect(drills[0].length).toBe(0); // drill has no lateral movement
    expect(drills[0].depth).toBe(12);
  });

  it('calculates total passes correctly', () => {
    const job = generateMachiningJob([SIMPLE_PART], PROFILE, JOB_OPTIONS);
    // 18mm thickness, 3mm passDepth = 6 passes for profile cut
    expect(job.totalPasses).toBe(6);
  });

  it('totalTimeSec is sum of all operation times', () => {
    const job = generateMachiningJob([SIMPLE_PART, PART_WITH_DADOS], PROFILE, JOB_OPTIONS);
    const expectedTotal = job.operations.reduce((sum, op) => sum + op.estimatedTimeSec, 0);
    expect(job.totalTimeSec).toBeCloseTo(expectedTotal, 5);
  });

  it('uses default name and material when not provided', () => {
    const job = generateMachiningJob([SIMPLE_PART], PROFILE, { sheetWidth: 2440, sheetLength: 1220 });
    expect(job.name).toBe('Untitled Job');
    expect(job.material).toBe('Unknown');
  });

  it('can skip profile cuts with includeProfileCuts=false', () => {
    const job = generateMachiningJob([PART_WITH_DADOS], PROFILE, { ...JOB_OPTIONS, includeProfileCuts: false });
    const profileCuts = job.operations.filter((op) => op.type === 'profile-cut');
    expect(profileCuts).toHaveLength(0);
    // But dados still present
    const dados = job.operations.filter((op) => op.type === 'dado');
    expect(dados).toHaveLength(2);
  });

  it('handles empty parts array', () => {
    const job = generateMachiningJob([], PROFILE, JOB_OPTIONS);
    expect(job.operations).toHaveLength(0);
    expect(job.totalTimeSec).toBe(0);
    expect(job.totalPasses).toBe(0);
  });

  it('operations have sequential IDs', () => {
    const job = generateMachiningJob([SIMPLE_PART, PART_WITH_DRILLS], PROFILE, JOB_OPTIONS);
    expect(job.operations[0].id).toBe('op-1');
    expect(job.operations[1].id).toBe('op-2');
  });
});

describe('validateMachiningJob', () => {
  it('returns empty array for valid job', () => {
    const job = generateMachiningJob([SIMPLE_PART], PROFILE, JOB_OPTIONS);
    expect(validateMachiningJob(job)).toHaveLength(0);
  });

  it('flags operations with negative coordinates', () => {
    const badPart: MachinablePart = { ...SIMPLE_PART, x: -5, y: -10 };
    const job = generateMachiningJob([badPart], PROFILE, JOB_OPTIONS);
    const errors = validateMachiningJob(job);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('negative coordinates');
  });

  it('flags operations outside sheet bounds', () => {
    const offSheet: MachinablePart = { ...SIMPLE_PART, x: 3000, y: 2000 };
    const job = generateMachiningJob([offSheet], PROFILE, JOB_OPTIONS);
    const errors = validateMachiningJob(job);
    expect(errors.some((e) => e.includes('outside sheet bounds'))).toBe(true);
  });

  it('flags dado narrower than tool diameter', () => {
    const narrowDado: MachinablePart = {
      ...SIMPLE_PART,
      dados: [{ offset: 100, width: 4, depth: 9, direction: 'across' }], // 4mm < 6mm tool
    };
    const job = generateMachiningJob([narrowDado], PROFILE, JOB_OPTIONS);
    const errors = validateMachiningJob(job);
    expect(errors.some((e) => e.includes('narrower than tool diameter'))).toBe(true);
  });

  it('passes when dado width equals tool diameter', () => {
    const exactDado: MachinablePart = {
      ...SIMPLE_PART,
      dados: [{ offset: 100, width: 6, depth: 9, direction: 'across' }],
    };
    const job = generateMachiningJob([exactDado], PROFILE, JOB_OPTIONS);
    const errors = validateMachiningJob(job);
    expect(errors.filter((e) => e.includes('narrower'))).toHaveLength(0);
  });
});

describe('time estimation', () => {
  it('profile cut time increases with material thickness', () => {
    const thin: MachinablePart = { ...SIMPLE_PART, thickness: 9 };
    const thick: MachinablePart = { ...SIMPLE_PART, thickness: 25 };

    resetIdCounter();
    const thinJob = generateMachiningJob([thin], PROFILE, JOB_OPTIONS);
    resetIdCounter();
    const thickJob = generateMachiningJob([thick], PROFILE, JOB_OPTIONS);

    const thinTime = thinJob.operations[0].estimatedTimeSec;
    const thickTime = thickJob.operations[0].estimatedTimeSec;
    expect(thickTime).toBeGreaterThan(thinTime);
  });

  it('estimated time is always positive', () => {
    const job = generateMachiningJob([SIMPLE_PART, PART_WITH_DADOS, PART_WITH_DRILLS], PROFILE, JOB_OPTIONS);
    for (const op of job.operations) {
      expect(op.estimatedTimeSec).toBeGreaterThan(0);
    }
  });
});
