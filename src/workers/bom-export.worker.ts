/**
 * BOM Export Web Worker (v3.17.0)
 *
 * Accepts: BomExportMessage
 * Responds: BomExportResult
 *
 * Running the CSV/DXF generation off the main thread prevents UI jank for
 * large multi-cabinet projects.
 */

import { generateBomCsv } from '../utils/bom-export';
import type { Part, HardwareItem, Lang } from '../engine/types';

export interface BomWorkerInput {
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[]; notes?: string }[];
  lang: Lang;
}

export interface BomWorkerOutput {
  type: 'done' | 'error';
  csv?: string;
  errorMessage?: string;
}

self.onmessage = (e: MessageEvent<BomWorkerInput>) => {
  try {
    const { cabinets, lang } = e.data;
    const csv = generateBomCsv(cabinets, lang);
    self.postMessage({ type: 'done', csv } satisfies BomWorkerOutput);
  } catch (err) {
    self.postMessage({
      type: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
    } satisfies BomWorkerOutput);
  }
};
