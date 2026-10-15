/**
 * BOM Export Web Worker.
 * Comlink `run()` returns CSV bytes. SharedArrayBuffer is used only when the
 * caller supplies one allocated under cross-origin isolation.
 */

import * as Comlink from 'comlink';
import { generateBomCsv } from '../utils/bom-export';
import type { Part, HardwareItem, Lang } from '../engine/core/types';
import { WORKER_INPUT_SCHEMA_VERSION, packText, type PackedText, type WorkerProgress } from './text-payload';

export interface BomWorkerInput {
  cabinets: { name: string; parts: Part[]; hardware: HardwareItem[]; notes?: string }[];
  lang: Lang;
  /** Full i18next locale for column header translation (e.g. 'es', 'de', 'fr', 'ar'). */
  locale?: string;
}

interface ExportChannel {
  inputSchemaVersion: number;
  sharedBuffer?: SharedArrayBuffer;
  reportProgress?: (progress: WorkerProgress) => void;
}

function run(input: BomWorkerInput, channel?: ExportChannel): PackedText {
  if (channel && channel.inputSchemaVersion !== WORKER_INPUT_SCHEMA_VERSION) {
    throw new Error(`Unsupported worker input schema ${channel.inputSchemaVersion}`);
  }
  channel?.reportProgress?.({ jobId: 'bom', completed: 0, total: 1 });
  const csv = generateBomCsv(input.cabinets, input.lang, input.locale);
  channel?.reportProgress?.({ jobId: 'bom', completed: 1, total: 1 });
  const packed = packText(csv, channel?.sharedBuffer);
  return packed.bytes ? Comlink.transfer(packed, [packed.bytes.buffer]) : packed;
}

Comlink.expose({ run });
