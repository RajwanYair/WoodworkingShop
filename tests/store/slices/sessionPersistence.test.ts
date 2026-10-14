import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../../src/engine/materials/materials';
import {
  createCabinetSessionRecord,
  readCabinetSessionRecord,
  type CabinetSessionSnapshot,
} from '../../../src/store/slices/sessionPersistence';

const snapshot: CabinetSessionSnapshot = {
  cabinets: [{ name: 'Cabinet 1', config: { ...DEFAULT_CONFIG } }],
  activeCabinetIndex: 0,
  projectName: 'Workshop',
  projectNotes: 'Cut to fit',
  sawKerf: 4,
  autoCoNest: true,
  materialPriceOverrides: { oak: 20 },
  edgeBandingRate: 3,
  hardwarePriceOverrides: {},
  hardwareQtyOverrides: {},
  sheetSizeOverrides: { oak: { width: 1220, length: 2440 } },
  labourRate: 75,
  labourHours: 2,
  finishCost: 10,
  rotationLockedPartIds: { shelf: true },
};

describe('cabinet session persistence', () => {
  it('round-trips independently versioned project, optimizer, and lock slices', () => {
    const record = createCabinetSessionRecord(snapshot);

    expect(record.formatVersion).toBe(1);
    expect(record.slices.project.version).toBe(1);
    expect(record.slices.optimizer.version).toBe(1);
    expect(record.slices.rotationLocks.version).toBe(1);
    expect(readCabinetSessionRecord(record)).toEqual(snapshot);
  });

  it.each([
    { ...createCabinetSessionRecord(snapshot), formatVersion: 2 },
    {
      ...createCabinetSessionRecord(snapshot),
      slices: { ...createCabinetSessionRecord(snapshot).slices, project: { version: 2, value: {} } },
    },
  ])('rejects unsupported session versions', (record) => {
    expect(readCabinetSessionRecord(record)).toBeNull();
  });

  it('rejects invalid cabinet and optimizer payloads', () => {
    const record = createCabinetSessionRecord(snapshot);
    const invalid = {
      ...record,
      slices: {
        ...record.slices,
        project: { ...record.slices.project, value: { ...record.slices.project.value, cabinets: [] } },
      },
    };

    expect(readCabinetSessionRecord(invalid)).toBeNull();
  });
});
