import type { CutSheet, CutRect } from '../engine/types';

/**
 * Generate a minimal DXF (AutoCAD R12) string for a cut sheet.
 * Each part is drawn as a LWPOLYLINE rectangle with a TEXT label.
 * Sheet outline is drawn on layer "SHEET", parts on "PARTS", labels on "LABELS".
 * All units are millimeters.
 */
export function cutSheetToDxf(sheet: CutSheet): string {
  const lines: string[] = [];

  // ── HEADER section ──
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$INSUNITS', '70', '4'); // 4 = millimeters
  lines.push('0', 'ENDSEC');

  // ── TABLES section (layers) ──
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '3');
  addLayer(lines, 'SHEET', 7);   // white
  addLayer(lines, 'PARTS', 3);   // green
  addLayer(lines, 'LABELS', 5);  // blue
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // ── ENTITIES section ──
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // Sheet outline
  addRect(lines, 0, 0, sheet.sheetWidth, sheet.sheetLength, 'SHEET');

  // Parts
  for (const part of sheet.parts) {
    addRect(lines, part.x, part.y, part.width, part.length, 'PARTS');
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
    '0', 'LWPOLYLINE',
    '8', layer,
    '90', '4',     // vertex count
    '70', '1',     // closed polyline
    '10', String(x),         '20', String(y),
    '10', String(x + w),     '20', String(y),
    '10', String(x + w),     '20', String(y + h),
    '10', String(x),         '20', String(y + h),
  );
}

function addLabel(lines: string[], part: CutRect, layer: string) {
  const cx = part.x + part.width / 2;
  const cy = part.y + part.length / 2;
  const fontSize = Math.min(20, Math.min(part.width, part.length) * 0.25);
  lines.push(
    '0', 'TEXT',
    '8', layer,
    '10', String(cx), '20', String(cy), '30', '0',
    '40', String(fontSize),       // text height
    '1', `${part.partId} ${part.width}x${part.length}`,
    '72', '1',                    // horizontal center
    '73', '2',                    // vertical center
    '11', String(cx), '21', String(cy), '31', '0',
  );
}

/** Trigger DXF download for all sheets as individual files, or combine into one. */
export function downloadDxfForSheet(sheet: CutSheet, filename: string) {
  const content = cutSheetToDxf(sheet);
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download all sheets as a single combined DXF (sheets stacked vertically with spacing) */
export function downloadAllSheetsDxf(sheets: CutSheet[], projectName: string) {
  const lines: string[] = [];
  const spacing = 100; // mm gap between sheets

  // HEADER
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$INSUNITS', '70', '4');
  lines.push('0', 'ENDSEC');

  // TABLES
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '3');
  addLayer(lines, 'SHEET', 7);
  addLayer(lines, 'PARTS', 3);
  addLayer(lines, 'LABELS', 5);
  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');

  // ENTITIES
  lines.push('0', 'SECTION', '2', 'ENTITIES');

  let yOffset = 0;
  for (const sheet of sheets) {
    // Sheet outline
    addRect(lines, 0, yOffset, sheet.sheetWidth, sheet.sheetLength, 'SHEET');

    // Parts offset by current yOffset
    for (const part of sheet.parts) {
      const shifted: CutRect = { ...part, y: part.y + yOffset };
      addRect(lines, shifted.x, shifted.y, shifted.width, shifted.length, 'PARTS');
      addLabel(lines, shifted, 'LABELS');
    }

    yOffset += sheet.sheetLength + spacing;
  }

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}-cut-sheets.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}
