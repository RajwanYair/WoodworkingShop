/**
 * DXF Export Web Worker.
 * Comlink `run()` returns DXF bytes. SharedArrayBuffer is used only when the
 * caller supplies one allocated under cross-origin isolation.
 */

import * as Comlink from 'comlink';
import { cutSheetToDxf } from '../utils/dxf-export';
import type { CutSheet } from '../engine/core/types';
import { WORKER_INPUT_SCHEMA_VERSION, packText, type PackedText, type WorkerProgress } from './text-payload';

export interface DxfWorkerInput {
  mode: 'single' | 'all';
  sheets: CutSheet[];
  /** Only used in 'single' mode */
  sheetIndex?: number;
  projectName: string;
}

interface ExportChannel {
  inputSchemaVersion: number;
  sharedBuffer?: SharedArrayBuffer;
  reportProgress?: (progress: WorkerProgress) => void;
}

const SHEET_SPACING = 100; // mm gap between sheets in combined DXF

function buildCombinedDxf(sheets: CutSheet[]): string {
  const lines: string[] = [];
  let yOffset = 0;

  // HEADER
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$INSUNITS', '70', '4'); // millimeters
  lines.push('0', 'ENDSEC');

  // TABLES (layers)
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '3');
  addLayer(lines, 'SHEET', 7);
  addLayer(lines, 'PARTS', 3);
  addLayer(lines, 'LABELS', 5);
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // ENTITIES
  lines.push('0', 'SECTION', '2', 'ENTITIES');
  for (const sheet of sheets) {
    // Sheet outline translated by yOffset
    addRect(lines, 0, yOffset, sheet.sheetWidth, sheet.sheetLength, 'SHEET');
    for (const part of sheet.parts) {
      addRect(lines, part.x, part.y + yOffset, part.width, part.length, 'PARTS');
      addLabel(lines, part, yOffset, 'LABELS');
    }
    yOffset += sheet.sheetLength + SHEET_SPACING;
  }
  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');
  return lines.join('\n');
}

function addLayer(lines: string[], name: string, color: number) {
  lines.push('0', 'LAYER', '2', name, '70', '0', '62', String(color), '6', 'CONTINUOUS');
}

function addRect(lines: string[], x: number, y: number, w: number, h: number, layer: string) {
  lines.push(
    '0',
    'LWPOLYLINE',
    '8',
    layer,
    '90',
    '4',
    '70',
    '1',
    '10',
    String(x),
    '20',
    String(y),
    '10',
    String(x + w),
    '20',
    String(y),
    '10',
    String(x + w),
    '20',
    String(y + h),
    '10',
    String(x),
    '20',
    String(y + h),
  );
}

function addLabel(
  lines: string[],
  part: { x: number; y: number; width: number; length: number; label: string },
  yOffset: number,
  layer: string,
) {
  const cx = part.x + part.width / 2;
  const cy = part.y + part.length / 2 + yOffset;
  const text = `${part.label} (${part.width}×${part.length})`;
  lines.push(
    '0',
    'TEXT',
    '8',
    layer,
    '10',
    String(cx),
    '20',
    String(cy),
    '30',
    '0',
    '40',
    '10', // text height
    '1',
    text,
    '72',
    '1',
    '73',
    '2',
    '11',
    String(cx),
    '21',
    String(cy),
    '31',
    '0',
  );
}

function buildDxf(input: DxfWorkerInput): { dxf: string; filename: string } {
  if (input.mode === 'single') {
    const idx = input.sheetIndex ?? 0;
    const sheet = input.sheets[idx];
    if (!sheet) throw new Error(`Sheet index ${idx} out of range`);
    const mat = sheet.material.replace(/\W/g, '-');
    return {
      dxf: cutSheetToDxf(sheet),
      filename: `${input.projectName}-sheet-${idx + 1}-${mat}.dxf`,
    };
  }
  return {
    dxf: buildCombinedDxf(input.sheets),
    filename: `${input.projectName}-cut-sheets-all.dxf`,
  };
}

function run(input: DxfWorkerInput, channel?: ExportChannel): PackedText {
  if (channel && channel.inputSchemaVersion !== WORKER_INPUT_SCHEMA_VERSION) {
    throw new Error(`Unsupported worker input schema ${channel.inputSchemaVersion}`);
  }
  channel?.reportProgress?.({ jobId: 'dxf', completed: 0, total: 1 });
  const { dxf, filename } = buildDxf(input);
  channel?.reportProgress?.({ jobId: 'dxf', completed: 1, total: 1 });
  const packed = packText(dxf, channel?.sharedBuffer, filename);
  return packed.bytes ? Comlink.transfer(packed, [packed.bytes.buffer]) : packed;
}

Comlink.expose({ run });
