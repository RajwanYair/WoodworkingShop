import type { CutSheet, CutRect } from '../engine/types';
import { triggerDownload } from './download';

/**
 * Convert a material key to a valid DXF layer name.
 * DXF layer names must be ≤ 255 chars, no spaces, uppercase recommended.
 * Prefix with `MAT_` to distinguish from SHEET/PARTS/LABELS layers.
 *
 * @example materialLayerName('plywood-17') → 'MAT_PLYWOOD-17'
 */
export function materialLayerName(material: string): string {
  return `MAT_${material.toUpperCase().replace(/\s+/g, '_').slice(0, 248)}`;
}

/**
 * Generate a minimal DXF (AutoCAD R12) string for a cut sheet.
 * Each part is drawn as a LWPOLYLINE rectangle with a TEXT label.
 * Sheet outline is drawn on layer "SHEET", labels on "LABELS".
 * Parts are drawn on a per-material layer (e.g. "MAT_PLYWOOD-17") so CAM
 * software can assign separate toolpaths per material.
 * All units are millimeters.
 */
export function cutSheetToDxf(sheet: CutSheet): string {
  const lines: string[] = [];

  // ── File metadata (comments before first SECTION) ──
  const generatedAt = new Date().toISOString();
  lines.push(
    `999`,
    `Cabinet Planner DXF Export`,
    `999`,
    `Version: ${__APP_VERSION__}`,
    `999`,
    `Schema: dxf-r12-v1`,
    `999`,
    `Generated: ${generatedAt}`,
    `999`,
    `Sheet: ${sheet.sheetIndex + 1}  Material: ${sheet.material}  Thickness: ${sheet.thickness}mm`,
    `999`,
    `Parts: ${sheet.parts.length}`,
  );

  // ── HEADER section ──
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$INSUNITS', '70', '4'); // 4 = millimeters
  lines.push('0', 'ENDSEC');

  // ── TABLES section (layers) ──
  const matLayer = materialLayerName(sheet.material);
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '5');
  addLayer(lines, 'SHEET', 7);           // white
  addLayer(lines, matLayer, 3);          // green — per-material parts layer
  addLayer(lines, 'LABELS', 5);          // blue
  addLayer(lines, 'PARTS', 3);           // green — legacy fallback layer (kept for compatibility)
  addLayer(lines, 'GRAIN_CONFLICT', 1);  // red — grain-direction conflicts (Sprint 70)
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // ── ENTITIES section ──
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // Sheet outline
  addRect(lines, 0, 0, sheet.sheetWidth, sheet.sheetLength, 'SHEET');

  // Parts on per-material layer (grain-conflicted parts on GRAIN_CONFLICT layer)
  for (const part of sheet.parts) {
    const partLayer = part.grainConflict === true ? 'GRAIN_CONFLICT' : matLayer;
    addRect(lines, part.x, part.y, part.width, part.length, partLayer);
    addLabel(lines, part, 'LABELS');
  }

  lines.push('0', 'ENDSEC');

  // ── EOF ──
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
    '4', // vertex count
    '70',
    '1', // closed polyline
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

function addLabel(lines: string[], part: CutRect, layer: string) {
  const cx = part.x + part.width / 2;
  const cy = part.y + part.length / 2;
  const fontSize = Math.min(20, Math.min(part.width, part.length) * 0.25);
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
    String(fontSize), // text height
    '1',
    `${part.partId} ${part.width}x${part.length}`,
    '72',
    '1', // horizontal center
    '73',
    '2', // vertical center
    '11',
    String(cx),
    '21',
    String(cy),
    '31',
    '0',
  );
}

/** Trigger DXF download for all sheets as individual files, or combine into one. */
export function downloadDxfForSheet(sheet: CutSheet, filename: string) {
  const content = cutSheetToDxf(sheet);
  triggerDownload(content, 'application/dxf', filename);
}

/** Download all sheets as a single combined DXF (sheets stacked vertically with spacing) */
export function downloadAllSheetsDxf(sheets: CutSheet[], projectName: string) {
  const lines: string[] = [];
  const spacing = 100; // mm gap between sheets

  // Collect unique material layer names
  const matLayers = [...new Set(sheets.map((s) => materialLayerName(s.material)))];

  // HEADER
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$INSUNITS', '70', '4');
  lines.push('0', 'ENDSEC');

  // TABLES — one layer per material + SHEET, LABELS, PARTS
  const totalLayers = 3 + matLayers.length;
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(totalLayers));
  addLayer(lines, 'SHEET', 7);
  addLayer(lines, 'LABELS', 5);
  addLayer(lines, 'PARTS', 3); // legacy fallback
  for (const ml of matLayers) {
    addLayer(lines, ml, 3);
  }
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // ENTITIES
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  let yOffset = 0;
  for (const sheet of sheets) {
    const matLayer = materialLayerName(sheet.material);
    // Sheet outline
    addRect(lines, 0, yOffset, sheet.sheetWidth, sheet.sheetLength, 'SHEET');

    // Parts on per-material layer, offset by current yOffset
    for (const part of sheet.parts) {
      const shifted: CutRect = { ...part, y: part.y + yOffset };
      addRect(lines, shifted.x, shifted.y, shifted.width, shifted.length, matLayer);
      addLabel(lines, shifted, 'LABELS');
    }

    yOffset += sheet.sheetLength + spacing;
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  const content = lines.join('\n');
  triggerDownload(content, 'application/dxf', `${projectName}-cut-sheets.dxf`);
}
