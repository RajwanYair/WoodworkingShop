import type { CabinetConfig } from '../../engine/types';
import type { CabinetEntry } from '../../store/cabinet-store';

export interface ProjectExport {
  version: 1;
  projectName?: string;
  projectNotes?: string;
  cabinets: CabinetEntry[];
}

export interface CabinetExport {
  version: 1;
  cabinet: CabinetEntry;
}

export function triggerJsonDownload(payload: unknown, fileName: string): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildProjectExport(
  cabinets: CabinetEntry[],
  projectNameText: string,
  projectNotesText: string,
): ProjectExport {
  return {
    version: 1,
    projectName: projectNameText.trim() || undefined,
    projectNotes: projectNotesText.trim() || undefined,
    cabinets,
  };
}

export function buildCabinetExport(cabinet: CabinetEntry): CabinetExport {
  return {
    version: 1,
    cabinet,
  };
}

/** Minimal validation - checks that required numeric fields exist and are in range */
export function isValidConfig(obj: unknown): obj is CabinetConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c.width === 'number' &&
    Number.isFinite(c.width) &&
    c.width > 0 &&
    typeof c.height === 'number' &&
    Number.isFinite(c.height) &&
    c.height > 0 &&
    typeof c.depth === 'number' &&
    Number.isFinite(c.depth) &&
    c.depth > 0 &&
    typeof c.shelfCount === 'number' &&
    Number.isFinite(c.shelfCount) &&
    typeof c.carcassMaterial === 'string' &&
    typeof c.backPanelMaterial === 'string'
  );
}

export function isProjectExport(obj: unknown): obj is ProjectExport {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  if (p.version !== 1 || !Array.isArray(p.cabinets) || p.cabinets.length === 0) return false;
  return p.cabinets.every((c: unknown) => {
    if (typeof c !== 'object' || c === null) return false;
    const cab = c as Record<string, unknown>;
    return typeof cab.name === 'string' && isValidConfig(cab.config);
  });
}

export function isCabinetExport(obj: unknown): obj is CabinetExport {
  if (typeof obj !== 'object' || obj === null) return false;
  const p = obj as Record<string, unknown>;
  if (p.version !== 1 || typeof p.cabinet !== 'object' || p.cabinet === null) return false;
  const cab = p.cabinet as Record<string, unknown>;
  return typeof cab.name === 'string' && isValidConfig(cab.config);
}
