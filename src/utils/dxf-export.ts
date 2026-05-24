import type { CutSheet, CutRect } from '../engine/types';
import { triggerDownload } from './download';
import { appendChecksumToDxf } from './checksum';

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

// ── Phase 13 / Sprint 3 — DXF layer standard compliance ──────────────────────
// Upgraded from DXF R12 to AC1015 (AutoCAD 2000), the minimum version that
// LibreCAD, DraftSight, and AutoCAD LT fully support.  Changes:
//   - $ACADVER = AC1015 in HEADER
//   - Required CLASSES, BLOCKS, OBJECTS sections added
//   - Full TABLES: VPORT, LTYPE, LAYER, STYLE, VIEW, UCS, APPID, DIMSTYLE, BLOCK_RECORD
//   - DIMENSION entities for each part's width and height (layer: DIMENSIONS)

/** Build the HEADER section for AC1015-compliant DXF. */
function buildDxfHeader(extraVars: string[] = []): string[] {
  return [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$ACADVER',
    '1',
    'AC1015',
    '9',
    '$DWGCODEPAGE',
    '3',
    'ANSI_1252',
    '9',
    '$INSUNITS',
    '70',
    '4', // 4 = millimetres
    '9',
    '$MEASUREMENT',
    '70',
    '1', // 1 = metric
    ...extraVars,
    '0',
    'ENDSEC',
  ];
}

/** Build an empty CLASSES section (required for AC1015+). */
function buildDxfClasses(): string[] {
  return ['0', 'SECTION', '2', 'CLASSES', '0', 'ENDSEC'];
}

/** Build a full TABLES section with all required sub-tables. */
function buildDxfTables(layerDefs: Array<[string, number]>): string[] {
  const lines: string[] = ['0', 'SECTION', '2', 'TABLES'];

  // VPORT — one active viewport (*Active)
  lines.push('0', 'TABLE', '2', 'VPORT', '70', '1');
  lines.push('0', 'VPORT', '2', '*Active', '70', '0');
  lines.push('0', 'ENDTAB');

  // LTYPE — CONTINUOUS line type
  lines.push('0', 'TABLE', '2', 'LTYPE', '70', '1');
  lines.push('0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0');
  lines.push('0', 'ENDTAB');

  // LAYER
  lines.push('0', 'TABLE', '2', 'LAYER', '70', String(layerDefs.length));
  for (const [name, color] of layerDefs) {
    addLayer(lines, name, color);
  }
  lines.push('0', 'ENDTAB');

  // STYLE — Standard text style
  lines.push('0', 'TABLE', '2', 'STYLE', '70', '1');
  lines.push(
    '0',
    'STYLE',
    '2',
    'Standard',
    '70',
    '0',
    '40',
    '0.0',
    '41',
    '1.0',
    '50',
    '0.0',
    '71',
    '0',
    '42',
    '0.2',
    '3',
    'arial.shx',
    '4',
    '',
  );
  lines.push('0', 'ENDTAB');

  // VIEW — empty
  lines.push('0', 'TABLE', '2', 'VIEW', '70', '0');
  lines.push('0', 'ENDTAB');

  // UCS — empty
  lines.push('0', 'TABLE', '2', 'UCS', '70', '0');
  lines.push('0', 'ENDTAB');

  // APPID — ACAD application ID (required for R2000+)
  lines.push('0', 'TABLE', '2', 'APPID', '70', '1');
  lines.push('0', 'APPID', '2', 'ACAD', '70', '0');
  lines.push('0', 'ENDTAB');

  // DIMSTYLE — Standard dimension style
  lines.push('0', 'TABLE', '2', 'DIMSTYLE', '70', '1');
  lines.push(
    '0',
    'DIMSTYLE',
    '2',
    'Standard',
    '70',
    '0',
    '3',
    '',
    '4',
    '',
    '40',
    '1.0',
    '41',
    '3.0',
    '42',
    '1.0',
    '43',
    '9.0',
    '44',
    '1.0',
    '140',
    '3.0',
    '147',
    '1.0',
    '73',
    '0',
    '74',
    '0',
    '77',
    '0',
    '78',
    '0',
    '170',
    '0',
    '171',
    '2',
    '172',
    '0',
    '173',
    '0',
    '174',
    '0',
    '175',
    '0',
    '176',
    '0',
    '177',
    '0',
    '178',
    '0',
  );
  lines.push('0', 'ENDTAB');

  // BLOCK_RECORD — required for R2000+ (references MODEL_SPACE and PAPER_SPACE)
  lines.push('0', 'TABLE', '2', 'BLOCK_RECORD', '70', '2');
  lines.push('0', 'BLOCK_RECORD', '2', '*Model_Space');
  lines.push('0', 'BLOCK_RECORD', '2', '*Paper_Space');
  lines.push('0', 'ENDTAB');

  lines.push('0', 'ENDSEC');
  return lines;
}

/** Build a minimal BLOCKS section (MODEL_SPACE + PAPER_SPACE required in R2000+). */
function buildDxfBlocks(): string[] {
  return [
    '0',
    'SECTION',
    '2',
    'BLOCKS',
    '0',
    'BLOCK',
    '8',
    '0',
    '2',
    '*Model_Space',
    '70',
    '0',
    '10',
    '0.0',
    '20',
    '0.0',
    '30',
    '0.0',
    '3',
    '*Model_Space',
    '1',
    '',
    '0',
    'ENDBLK',
    '0',
    'BLOCK',
    '8',
    '0',
    '2',
    '*Paper_Space',
    '70',
    '0',
    '10',
    '0.0',
    '20',
    '0.0',
    '30',
    '0.0',
    '3',
    '*Paper_Space',
    '1',
    '',
    '0',
    'ENDBLK',
    '0',
    'ENDSEC',
  ];
}

/** Build a minimal OBJECTS section (required for AC1015+). */
function buildDxfObjects(): string[] {
  return ['0', 'SECTION', '2', 'OBJECTS', '0', 'DICTIONARY', '3', 'ACAD_GROUP', '350', '0', '0', 'ENDSEC'];
}

/**
 * Add linear DIMENSION entities for a part's width (horizontal) and height
 * (vertical) on the DIMENSIONS layer. Uses AC1015 AcDbAlignedDimension.
 *
 * @param dimOffset  Extra offset (mm) for multi-sheet stacking (y-offset).
 */
function addPartDimensions(lines: string[], part: CutRect, dimOffset = 0): void {
  const x = part.x;
  const y = part.y + dimOffset;
  const w = part.width;
  const h = part.length;
  const dimGap = 8; // mm between part edge and dimension line

  // ── Horizontal dimension (width) — below the part ──
  const hdY = y - dimGap; // dimension line y (below, since y grows upward in DXF)
  lines.push(
    '0',
    'DIMENSION',
    '8',
    'DIMENSIONS',
    '2',
    '*Model_Space',
    '10',
    String(x + w),
    '20',
    String(hdY),
    '30',
    '0.0', // def point (2nd ext)
    '11',
    String(x + w / 2),
    '21',
    String(hdY - 3),
    '31',
    '0.0', // text midpoint
    '70',
    '0', // 0 = rotated (horizontal)
    '1',
    '', // empty = auto measurement
    '3',
    'Standard',
    '100',
    'AcDbAlignedDimension',
    '13',
    String(x),
    '23',
    String(y),
    '33',
    '0.0', // 1st ext line origin
    '14',
    String(x + w),
    '24',
    String(y),
    '34',
    '0.0', // 2nd ext line origin
    '50',
    '0.0', // rotation angle = 0° (horizontal)
  );

  // ── Vertical dimension (height) — to the right of the part ──
  const vdX = x + w + dimGap;
  lines.push(
    '0',
    'DIMENSION',
    '8',
    'DIMENSIONS',
    '2',
    '*Model_Space',
    '10',
    String(vdX),
    '20',
    String(y + h),
    '30',
    '0.0', // def point (2nd ext)
    '11',
    String(vdX + 3),
    '21',
    String(y + h / 2),
    '31',
    '0.0', // text midpoint
    '70',
    '1', // 1 = aligned
    '1',
    '', // empty = auto measurement
    '3',
    'Standard',
    '100',
    'AcDbAlignedDimension',
    '13',
    String(x + w),
    '23',
    String(y),
    '33',
    '0.0', // 1st ext line origin
    '14',
    String(x + w),
    '24',
    String(y + h),
    '34',
    '0.0', // 2nd ext line origin
    '50',
    '90.0', // rotation angle = 90° (vertical)
  );
}

/**
 * Generate a DXF (AutoCAD 2000 / AC1015) string for a cut sheet.
 * Each part is drawn as a LWPOLYLINE rectangle with TEXT label and
 * linear DIMENSION entities for width and height.
 * Sheet outline on layer "SHEET", labels on "LABELS", parts on a
 * per-material layer (e.g. "MAT_PLYWOOD-17").
 * All units are millimeters.
 */
export function cutSheetToDxf(sheet: CutSheet): string {
  const generatedAt = new Date().toISOString();
  const matLayer = materialLayerName(sheet.material);

  const layerDefs: Array<[string, number]> = [
    ['SHEET', 7], // white
    [matLayer, 3], // green — per-material parts layer
    ['LABELS', 5], // blue
    ['PARTS', 3], // green — legacy fallback (kept for compatibility)
    ['GRAIN_CONFLICT', 1], // red — grain-direction conflicts
    ['ROTATION_LOCKED', 6], // magenta — rotation-locked parts
    ['EDGE_BANDED', 4], // cyan — parts requiring edge banding
    ['DIMENSIONS', 2], // yellow — dimension annotations
  ];

  const lines: string[] = [];

  // ── Metadata comments (before first SECTION) ──
  lines.push(
    '999',
    'Cabinet Planner DXF Export',
    '999',
    `Version: ${__APP_VERSION__}`,
    '999',
    'Schema: dxf-ac1015-v2',
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

  // ── ENTITIES section ──
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

/** Trigger DXF download for a single sheet, embedding a SHA-256 checksum comment. */
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
