import type { CabinetEntry } from './cabinetTypes';

export interface CabinetSessionSnapshot {
  cabinets: CabinetEntry[];
  activeCabinetIndex: number;
  projectName: string;
  projectNotes?: string;
  sawKerf: number;
  autoCoNest?: boolean;
  materialPriceOverrides: Record<string, number>;
  edgeBandingRate: number;
  hardwarePriceOverrides: Record<string, number>;
  hardwareQtyOverrides: Record<string, number>;
  sheetSizeOverrides: Record<string, { width: number; length: number }>;
  labourRate: number;
  labourHours: number;
  finishCost: number;
  rotationLockedPartIds?: Record<string, boolean>;
}

interface VersionedSlice<T> {
  version: 1;
  value: T;
}

export interface CabinetSessionRecord {
  formatVersion: 1;
  slices: {
    project: VersionedSlice<
      Pick<CabinetSessionSnapshot, 'cabinets' | 'activeCabinetIndex' | 'projectName' | 'projectNotes'>
    >;
    optimizer: VersionedSlice<
      Pick<
        CabinetSessionSnapshot,
        | 'sawKerf'
        | 'autoCoNest'
        | 'materialPriceOverrides'
        | 'edgeBandingRate'
        | 'hardwarePriceOverrides'
        | 'hardwareQtyOverrides'
        | 'sheetSizeOverrides'
        | 'labourRate'
        | 'labourHours'
        | 'finishCost'
      >
    >;
    rotationLocks: VersionedSlice<NonNullable<CabinetSessionSnapshot['rotationLockedPartIds']>>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'boolean');
}

function isSheetSizeRecord(value: unknown): value is Record<string, { width: number; length: number }> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.width === 'number' &&
        Number.isFinite(entry.width) &&
        typeof entry.length === 'number' &&
        Number.isFinite(entry.length),
    )
  );
}

function isCabinetList(value: unknown): value is CabinetEntry[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isRecord(entry) && typeof entry.name === 'string' && isRecord(entry.config))
  );
}

export function createCabinetSessionRecord(snapshot: CabinetSessionSnapshot): CabinetSessionRecord {
  const { cabinets, activeCabinetIndex, projectName, projectNotes, rotationLockedPartIds, ...optimizer } = snapshot;

  return {
    formatVersion: 1,
    slices: {
      project: { version: 1, value: { cabinets, activeCabinetIndex, projectName, projectNotes } },
      optimizer: { version: 1, value: optimizer },
      rotationLocks: { version: 1, value: rotationLockedPartIds ?? {} },
    },
  };
}

export function readCabinetSessionRecord(value: unknown): CabinetSessionSnapshot | null {
  if (!isRecord(value) || value.formatVersion !== 1 || !isRecord(value.slices)) return null;
  const { project, optimizer, rotationLocks } = value.slices;
  if (!isRecord(project) || !isRecord(optimizer) || !isRecord(rotationLocks)) return null;
  if (project.version !== 1 || optimizer.version !== 1 || rotationLocks.version !== 1) return null;
  if (!isRecord(project.value) || !isRecord(optimizer.value) || !isRecord(rotationLocks.value)) return null;

  const projectValue = project.value;
  const optimizerValue = optimizer.value;
  const settingsNumbers = [
    optimizerValue.sawKerf,
    optimizerValue.edgeBandingRate,
    optimizerValue.labourRate,
    optimizerValue.labourHours,
    optimizerValue.finishCost,
  ];
  if (
    !isCabinetList(projectValue.cabinets) ||
    !Number.isInteger(projectValue.activeCabinetIndex) ||
    (projectValue.activeCabinetIndex as number) < 0 ||
    (projectValue.activeCabinetIndex as number) >= projectValue.cabinets.length ||
    typeof projectValue.projectName !== 'string' ||
    (projectValue.projectNotes !== undefined && typeof projectValue.projectNotes !== 'string') ||
    !settingsNumbers.every((entry) => typeof entry === 'number' && Number.isFinite(entry)) ||
    (optimizerValue.autoCoNest !== undefined && typeof optimizerValue.autoCoNest !== 'boolean') ||
    !isNumberRecord(optimizerValue.materialPriceOverrides) ||
    !isNumberRecord(optimizerValue.hardwarePriceOverrides) ||
    !isNumberRecord(optimizerValue.hardwareQtyOverrides) ||
    !isSheetSizeRecord(optimizerValue.sheetSizeOverrides) ||
    !isBooleanRecord(rotationLocks.value)
  ) {
    return null;
  }

  return {
    ...projectValue,
    ...optimizerValue,
    rotationLockedPartIds: rotationLocks.value,
  } as CabinetSessionSnapshot;
}
