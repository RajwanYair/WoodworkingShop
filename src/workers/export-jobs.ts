/**
 * BOM and DXF worker entry points. Imported by the optimizer feature so these
 * workers stay out of the main store chunk.
 */
import { runPackedTextJob } from './job-runner';
import BomWorker from './bom-export.worker?worker';
import DxfWorker from './dxf-export.worker?worker';
import type { BomWorkerInput } from './bom-export.worker';
import type { DxfWorkerInput } from './dxf-export.worker';

export interface DxfExportPayload {
  readonly dxf: string;
  readonly filename: string;
}

export function runBomExport(input: BomWorkerInput, signal?: AbortSignal): Promise<string | null> {
  return runPackedTextJob('bom', 'bom', input, signal, () => new BomWorker()).then((packed) => packed?.text ?? null);
}

export function runDxfExport(input: DxfWorkerInput, signal?: AbortSignal): Promise<DxfExportPayload | null> {
  return runPackedTextJob('dxf', 'dxf', input, signal, () => new DxfWorker()).then((packed) => {
    if (!packed) return null;
    return { dxf: packed.text, filename: packed.filename ?? 'sheets.dxf' };
  });
}
