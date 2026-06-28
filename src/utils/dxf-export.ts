import type { CutSheet, CutRect } from '../engine/types';
import { triggerDownload } from './download';
import { appendChecksumToDxf } from './checksum';
import { DXF_SCHEMA_VERSION } from '../engine/export-schema';
import {
  buildDxfHeader,
  buildDxfClasses,
  buildDxfTables,
  buildDxfBlocks,
  buildDxfObjects,
  addPartDimensions,
  addRect,
  addLabel,
} from './dxf-builders';

/**
 * Convert a material key to a valid DXF layer name.
 * DXF layer names must be Γëñ 255 chars, no spaces, uppercase recommended.
 * Prefix with `MAT_` to distinguish from SHEET/PARTS/LABELS layers.
 *
 * @example materialLayerName('plywood-17') ΓåÆ 'MAT_PLYWOOD-17'
 */
export function materialLayerName(material: string): string {
  return `MAT_${material.toUpperCase().replace(/\s+/g, '_').slice(0, 248)}`;
}

export function cutSheetToDxf(sheet: CutSheet): string {
  const generatedAt = new Date().toISOString();
  const matLayer = materialLayerName(sheet.material);

  const layerDefs: Array<[string, number]> = [
    ['SHEET', 7], // white
    [matLayer, 3], // green ΓÇö per-material parts layer
    ['LABELS', 5], // blue
    ['PARTS', 3], // green ΓÇö legacy fallback (kept for compatibility)
    ['GRAIN_CONFLICT', 1], // red ΓÇö grain-direction conflicts
    ['ROTATION_LOCKED', 6], // magenta ΓÇö rotation-locked parts
    ['EDGE_BANDED', 4], // cyan ΓÇö parts requiring edge banding
    ['DIMENSIONS', 2], // yellow ΓÇö dimension annotations
  ];

  const lines: string[] = [];

  // ΓöÇΓöÇ Metadata comments (before first SECTION) ΓöÇΓöÇ
  lines.push(
    '999',
    'Cabinet Planner DXF Export',
    '999',
    `Version: ${__APP_VERSION__}`,
    '999',
    `Schema: ${DXF_SCHEMA_VERSION}`,
    '999',
    `Generated: ${generatedAt}`,
    '999',
    `Sheet: ${sheet.sheetIndex + 1}  Material: ${sheet.material}  Thickness: ${sheet.thickness}mm`,
    '999',
    `Parts: ${sheet.parts.length}`,
  );

  lines.push(...buildDxfHeader());
  lines.push(...buildDxfClasses());
  lines.push(...buildDxfTables(layerDefs));
  lines.push(...buildDxfBlocks());

  // ΓöÇΓöÇ ENTITIES section ΓöÇΓöÇ
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // Sheet outline
  addRect(lines, 0, 0, sheet.sheetWidth, sheet.sheetLength, 'SHEET');

  for (const part of sheet.parts) {
    let partLayer: string;
    if (part.grainConflict === true) {
      partLayer = 'GRAIN_CONFLICT';
    } else if (part.rotationLocked === true) {
      partLayer = 'ROTATION_LOCKED';
    } else {
      partLayer = matLayer;
    }
    addRect(lines, part.x, part.y, part.width, part.length, partLayer);
    if (part.edgeBanding && part.edgeBanding.trim().length > 0) {
      addRect(lines, part.x, part.y, part.width, part.length, 'EDGE_BANDED');
    }
    addLabel(lines, part, 'LABELS');
    addPartDimensions(lines, part);
  }

  lines.push('0', 'ENDSEC');

  lines.push(...buildDxfObjects());

  // ΓöÇΓöÇ EOF ΓöÇΓöÇ
  lines.push('0', 'EOF');

  return lines.join('\n');
}

export async function downloadDxfForSheet(sheet: CutSheet, filename: string): Promise<void> {
  const body = cutSheetToDxf(sheet);
  const content = await appendChecksumToDxf(body);
  triggerDownload(content, 'application/dxf', filename);
}

/** Download all sheets as a single combined DXF with embedded SHA-256 checksum. */
export async function downloadAllSheetsDxf(sheets: CutSheet[], projectName: string): Promise<void> {
  const lines: string[] = [];
  const spacing = 100; // mm gap between sheets

  // Collect unique material layer names
  const matLayers = [...new Set(sheets.map((s) => materialLayerName(s.material)))];

  const layerDefs: Array<[string, number]> = [
    ['SHEET', 7],
    ['LABELS', 5],
    ['PARTS', 3],
    ['DIMENSIONS', 2],
    ...matLayers.map((ml): [string, number] => [ml, 3]),
  ];

  lines.push(...buildDxfHeader());
  lines.push(...buildDxfClasses());
  lines.push(...buildDxfTables(layerDefs));
  lines.push(...buildDxfBlocks());

  // ENTITIES
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  let yOffset = 0;
  for (const sheet of sheets) {
    const matLayer = materialLayerName(sheet.material);
    addRect(lines, 0, yOffset, sheet.sheetWidth, sheet.sheetLength, 'SHEET');

    for (const part of sheet.parts) {
      const shifted: CutRect = { ...part, y: part.y + yOffset };
      addRect(lines, shifted.x, shifted.y, shifted.width, shifted.length, matLayer);
      addLabel(lines, shifted, 'LABELS');
      addPartDimensions(lines, part, yOffset);
    }

    yOffset += sheet.sheetLength + spacing;
  }

  lines.push('0', 'ENDSEC');

  lines.push(...buildDxfObjects());

  lines.push('0', 'EOF');

  const body = lines.join('\n');
  const content = await appendChecksumToDxf(body);
  triggerDownload(content, 'application/dxf', `${projectName}-cut-sheets.dxf`);
}
